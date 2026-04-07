from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import base64
import os
import subprocess
import sys

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# registry: { stream_id: { role, data_type, status, in_receiver_id?, name? } }
registry = {}
plugin_processes  = {}   # name -> subprocess.Popen or docker container id (str)
plugin_registered = asyncio.Event()
pending_connections    = {}   # { receiver_id: [sender_stream_ids] }
last_registered_plugin_id = None
current_plugin_process = None

# Docker image names per language
DOCKER_IMAGES = {
    "python":     "corelink-plugin-python:latest",
    "javascript": "corelink-plugin-javascript:latest",
    "cpp":        "corelink-plugin-cpp:latest",
    "csharp":     "corelink-plugin-csharp:latest",
}

def _docker_available() -> bool:
    try:
        r = subprocess.run(["docker", "info"], capture_output=True, timeout=5)
        return r.returncode == 0
    except Exception:
        return False

def _base_env() -> dict:
    env = os.environ.copy()
    env["CORELINK_USERNAME"]    = os.getenv("CORELINK_USERNAME",    "Testuser")
    env["CORELINK_PASSWORD"]    = os.getenv("CORELINK_PASSWORD",    "Testpassword")
    env["CORELINK_SERVER_HOST"] = os.getenv("CORELINK_SERVER_HOST", "corelink.hpc.nyu.edu")
    env["CORELINK_SERVER_PORT"] = os.getenv("CORELINK_SERVER_PORT", "20012")
    env["BACKEND_URL"]          = os.getenv("BACKEND_URL",          "http://localhost:8000")
    return env


def _spawn_python_subprocess(code_b64: str, name: str) -> subprocess.Popen:
    """Run the Python plugin entrypoint directly (no Docker needed)."""
    import tempfile, glob
    entrypoint = os.path.join(
        os.path.dirname(__file__),
        "../../corelink-server/plugin-runner/clients/python/entrypoint.py"
    )
    entrypoint = os.path.abspath(entrypoint)

    env = _base_env()
    env["PLUGIN_CODE_B64"] = code_b64
    env["PLUGIN_NAME"]     = name

    return subprocess.Popen(
        [sys.executable, entrypoint],
        cwd=os.path.dirname(entrypoint),
        env=env,
    )


def _spawn_javascript_subprocess(code_b64: str, name: str) -> subprocess.Popen:
    """Run the JavaScript plugin entrypoint via node (no Docker needed)."""
    entrypoint = os.path.join(
        os.path.dirname(__file__),
        "../../corelink-server/plugin-runner/clients/javascript/entrypoint.js"
    )
    entrypoint = os.path.abspath(entrypoint)

    env = _base_env()
    env["PLUGIN_CODE_B64"] = code_b64
    env["PLUGIN_NAME"]     = name
    env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

    return subprocess.Popen(
        ["node", entrypoint],
        cwd=os.path.dirname(entrypoint),
        env=env,
    )


def _spawn_docker(language: str, code_b64: str, name: str) -> str:
    """Run a plugin in Docker; returns the container ID."""
    image = DOCKER_IMAGES[language]
    env = _base_env()

    cmd = [
        "docker", "run", "-d", "--rm",
        "--network", "host",
        "-e", f"PLUGIN_CODE_B64={code_b64}",
        "-e", f"PLUGIN_NAME={name}",
        "-e", f"CORELINK_USERNAME={env['CORELINK_USERNAME']}",
        "-e", f"CORELINK_PASSWORD={env['CORELINK_PASSWORD']}",
        "-e", f"CORELINK_SERVER_HOST={env['CORELINK_SERVER_HOST']}",
        "-e", f"CORELINK_SERVER_PORT={env['CORELINK_SERVER_PORT']}",
        "-e", f"BACKEND_URL={env['BACKEND_URL']}",
        image,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"docker run failed: {result.stderr.strip()}")
    return result.stdout.strip()  # container ID


def _kill_process(name: str):
    proc = plugin_processes.pop(name, None)
    if proc is None:
        return
    if isinstance(proc, subprocess.Popen):
        try:
            proc.kill()
            proc.wait()
        except Exception as e:
            print(f"Failed to kill process for {name}: {e}")
    else:
        # Docker container ID string
        try:
            subprocess.run(["docker", "kill", proc], capture_output=True)
        except Exception as e:
            print(f"Failed to kill Docker container {proc}: {e}")


# ── API endpoints ─────────────────────────────────────────────────────────────

@app.get("/streams")
async def get_streams():
    return registry

@app.post("/register")
async def register(payload: dict):
    global last_registered_plugin_id
    stream_id = payload.get("stream_id")
    registry[stream_id] = {
        "role":           payload.get("role"),
        "data_type":      payload.get("data_type"),
        "name":           payload.get("name"),
        "status":         "active",
        "in_receiver_id": payload.get("in_receiver_id"),
    }
    if payload.get("role") == "plugin":
        last_registered_plugin_id = stream_id
        plugin_registered.set()
    print(f"Registered: {registry}")
    return {"status": "registered", "stream_id": stream_id}

@app.post("/event")
async def handle_event(payload: dict):
    event     = payload.get("event")
    data      = payload.get("data", {})
    stream_id = data.get("streamID") or data.get("senderID") or data.get("stream_id")
    if stream_id and stream_id in registry:
        if event in ("stale", "dropped"):
            registry[stream_id]["status"] = event
        elif event == "update":
            registry[stream_id]["status"] = "active"
    print(f"Event [{event}]: {registry}")
    return {"status": "ok"}


@app.post("/plugin")
async def spawn_plugin(payload: dict):
    global last_registered_plugin_id
    code     = payload.get("code", "")
    name     = payload.get("name", f"plugin_{len(plugin_processes)}")
    language = payload.get("language", "python").lower()

    if not code:
        return {"error": "no code provided"}
    if language not in DOCKER_IMAGES:
        return {"error": f"unsupported language: {language}. Choose from {list(DOCKER_IMAGES)}"}

    # Kill existing plugin with same name
    if name in plugin_processes:
        _kill_process(name)
        old_ids = [k for k, v in registry.items() if v.get("name") == name]
        for pid in old_ids:
            del registry[pid]

    code_b64 = base64.b64encode(code.encode()).decode()

    plugin_registered.clear()
    last_registered_plugin_id = None

    try:
        if language == "python":
            plugin_processes[name] = _spawn_python_subprocess(code_b64, name)
        elif language == "javascript":
            plugin_processes[name] = _spawn_javascript_subprocess(code_b64, name)
        else:
            # C++ and C# require Docker
            if not _docker_available():
                return {"error": f"Docker is required to run {language} plugins but is not available."}
            container_id = _spawn_docker(language, code_b64, name)
            plugin_processes[name] = container_id
    except Exception as e:
        return {"error": str(e)}

    try:
        await asyncio.wait_for(plugin_registered.wait(), timeout=30.0)
    except asyncio.TimeoutError:
        _kill_process(name)
        return {"error": "plugin failed to register within 30 seconds"}

    plugin_id = last_registered_plugin_id
    return {"status": "ok", "plugin": {"stream_id": plugin_id, **registry[plugin_id]}}


@app.post("/connect")
async def connect_nodes(payload: dict):
    from_stream_id = payload.get("from_stream_id")
    to_stream_id   = payload.get("to_stream_id")
    to_entry = registry.get(to_stream_id)
    if not to_entry:
        return {"error": f"{to_stream_id} not in registry"}

    receiver_id = to_entry.get("in_receiver_id") or to_stream_id
    if receiver_id not in pending_connections:
        pending_connections[receiver_id] = []
    pending_connections[receiver_id].append(from_stream_id)

    registry[from_stream_id]["connects_to"] = to_stream_id
    registry[to_stream_id]["receives_from"] = from_stream_id

    print(f"Pending connection: {from_stream_id} -> {receiver_id}")
    return {"status": "pending", "from": from_stream_id, "to": receiver_id}

@app.post("/reset-connections/{receiver_id}")
async def reset_connections(receiver_id: int):
    pending_connections.pop(receiver_id, None)
    return {"status": "ok"}

@app.get("/connections/{receiver_id}")
async def get_connections(receiver_id: int):
    stream_ids = pending_connections.pop(receiver_id, [])
    return {"stream_ids": stream_ids}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
