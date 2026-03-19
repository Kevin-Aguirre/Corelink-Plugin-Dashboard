PLUGIN_TEMPLATE = """
import corelink
import asyncio
from corelink import processing
from corelink.resources import control
import httpx
import os
from corelink_client import connect
from dotenv import load_dotenv
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
out_sender_id = None
allowed_streams = set()

{process_fn}

async def poll_connections(my_receiver_id):
    global allowed_streams
    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{{BACKEND_URL}}/connections/{{my_receiver_id}}")
                stream_ids = response.json().get("stream_ids", [])
                for sid in stream_ids:
                    await control.subscribe_to_stream(my_receiver_id, sid)
                    allowed_streams.add(sid)
                    print(f"Plugin connected to stream {{sid}}")
        except Exception as e:
            print(f"Poll error: {{e}}")
        await asyncio.sleep(2)

async def main():
    global out_sender_id
    await connect()

    out_sender_id = await corelink.create_sender("Holodeck", "udp", "processed-data")

    async def data_callback(data_bytes, streamID, header):
        global out_sender_id, allowed_streams
        if allowed_streams and streamID not in allowed_streams:
            return
        result = await process(data_bytes, header)
        await corelink.send(out_sender_id, result, header)

    await corelink.set_data_callback(data_callback)

    in_receiver_id = await corelink.create_receiver(
        workspace="Holodeck",
        protocol="udp",
        data_type="testing",
        alert=True,
        echo=True,
        subscribe=False
    )
    await processing.connect_receiver(in_receiver_id)

    async with httpx.AsyncClient() as client:
        await client.post(f"{{BACKEND_URL}}/register", json={{
            "stream_id": out_sender_id,
            "in_receiver_id": in_receiver_id,
            "role": "plugin",
            "data_type": "processed-data",
            "name": "{plugin_name}"
        }})

    asyncio.create_task(poll_connections(in_receiver_id))

    print(f"Plugin ready. out={{out_sender_id}} in={{in_receiver_id}}")
    await corelink.asyncio.sleep(100000)

corelink.run(main())
"""