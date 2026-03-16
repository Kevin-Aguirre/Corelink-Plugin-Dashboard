import corelink
from corelink import processing
import httpx
import os
from corelink_client import connect
from dotenv import load_dotenv
import asyncio
from corelink.resources import control
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")
connected_streams = None

async def byte_to_string(data_bytes, stream_id, header):
    if connected_streams is None or stream_id not in connected_streams:
        return
    try:
        word = data_bytes.decode('utf-8')
        print(f"RECEIVED: {word} | Count: {header.get('count', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")

async def poll_connections(my_receiver_id):
    global connected_streams
    while True:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/connections/{my_receiver_id}")
            stream_ids = response.json().get("stream_ids", [])
            for sid in stream_ids:
                await control.subscribe_to_stream(my_receiver_id, sid)
                if connected_streams is None:
                    connected_streams = set()
                connected_streams.add(sid)
                print(f"Connected to stream {sid}")
        await asyncio.sleep(2)

async def main():
    await connect()
    await corelink.set_data_callback(byte_to_string)

    streamID = await corelink.create_receiver(
        "Holodeck", "udp", "processed-data",
        alert=True,
        echo=True,
        subscribe=True  # no auto-wiring
    )
    await processing.connect_receiver(streamID)

    async with httpx.AsyncClient() as client:
        await client.post(f"{BACKEND_URL}/register", json={
            "stream_id": streamID,
            "role": "receiver",
            "data_type": "processed-data"
        })

    asyncio.create_task(poll_connections(streamID))

    print(f"Receiver ready. streamID: {streamID}")
    await corelink.asyncio.sleep(10000)

corelink.run(main())