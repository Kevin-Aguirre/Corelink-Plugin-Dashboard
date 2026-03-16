from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import tempfile
import os 
import subprocess
import sys 
from plugin_template import PLUGIN_TEMPLATE

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

registry = {}
plugin_registered = asyncio.Event()

@app.get("/streams")
async def get_streams():
    return registry

@app.post("/register")
async def register(payload: dict):
    # should probably validate role and data type here? 
    stream_id = payload.get("stream_id")
    registry[stream_id] = {
        "role":      payload.get("role"),
        "data_type": payload.get("data_type"),
        "status":    "active"
    }
    if payload.get("role") == "plugin_out":
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
    """
    payload: {
        "code": "async def process(data_bytes, header):\n    ..."
    }
    """
    code = payload.get("code")
    if not code:
        return {"error": "no code provided"}

    # Write plugin to temp file
    plugin_code = PLUGIN_TEMPLATE.format(process_fn=code)
    tmp = tempfile.NamedTemporaryFile(
        mode='w',
        suffix='.py',
        delete=False,
        dir=os.getcwd()
    )
    tmp.write(plugin_code)
    tmp.close()
    print(f"Spawning plugin from {tmp.name}")

    # Reset event before spawning
    plugin_registered.clear()

    # Spawn plugin as subprocess
    subprocess.Popen(
        [sys.executable, tmp.name],
        cwd=os.getcwd()
    )

    # Wait for plugin to register with backend (timeout 10s)
    try:
        await asyncio.wait_for(plugin_registered.wait(), timeout=10.0)
    except asyncio.TimeoutError:
        return {"error": "plugin failed to register within 10 seconds"}

    # Find the plugin_out stream_id
    plugin_id = next(
        (k for k, v in registry.items() if v["role"] == "plugin_out"),
        None
    )
    return {"status": "ok", "plugin_stream_id": plugin_id}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)