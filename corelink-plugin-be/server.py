from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

registry = {}

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)