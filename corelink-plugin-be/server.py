from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import tempfile
import os
import subprocess
import sys
from plugin_template import PLUGIN_TEMPLATE
import glob

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# registry: { stream_id: { role, data_type, status, in_receiver_id? } }
registry = {}
plugin_processes = {} 
plugin_registered = asyncio.Event()
pending_connections = {}  # { receiver_id: [sender_stream_ids] }
last_registered_plugin_id = None  # ← add this
current_plugin_process = None  # add with other globals

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
        "status":         "active",
        "in_receiver_id": payload.get("in_receiver_id")
    }
    if payload.get("role") == "plugin":
        last_registered_plugin_id = stream_id  # ← add this
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
    code = payload.get("code")
    name = payload.get("name", f"plugin_{len(plugin_processes)}")
    if not code:
        return {"error": "no code provided"}

    # Kill existing process with same name if redeploying
    if name in plugin_processes:
        try:
            plugin_processes[name].kill()
            plugin_processes[name].wait()
        except Exception as e:
            print(f"Failed to kill old plugin {name}: {e}")
        # Remove old registry entry for this name
        old_ids = [k for k, v in registry.items() if v.get("name") == name]
        for pid in old_ids:
            del registry[pid]

    # Clean up tmp files for this plugin name
    for f in glob.glob(os.path.join(os.getcwd(), "tmp*.py")):
        try:
            os.remove(f)
        except:
            pass

    plugin_code = PLUGIN_TEMPLATE.format(process_fn=code, plugin_name=name)
    tmp = tempfile.NamedTemporaryFile(
        mode='w', suffix='.py', delete=False, dir=os.getcwd()
    )
    tmp.write(plugin_code)
    tmp.close()

    plugin_registered.clear()
    last_registered_plugin_id = None

    env = os.environ.copy()
    env["CORELINK_USERNAME"] = os.getenv("CORELINK_USERNAME", "Testuser")
    env["CORELINK_PASSWORD"] = os.getenv("CORELINK_PASSWORD", "Testpassword")
    env["CORELINK_SERVER_HOST"] = os.getenv("CORELINK_SERVER_HOST", "corelink.hpc.nyu.edu")
    env["CORELINK_SERVER_PORT"] = os.getenv("CORELINK_SERVER_PORT", "20012")
    env["BACKEND_URL"] = os.getenv("BACKEND_URL", "http://localhost:8000")

    plugin_processes[name] = subprocess.Popen(
        [sys.executable, tmp.name],
        cwd=os.getcwd(),
        env=env
    )

    try:
        await asyncio.wait_for(plugin_registered.wait(), timeout=10.0)
    except asyncio.TimeoutError:
        return {"error": "plugin failed to register within 10 seconds"}

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