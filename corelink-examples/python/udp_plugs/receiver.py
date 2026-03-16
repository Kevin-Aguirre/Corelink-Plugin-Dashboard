import corelink
from corelink import processing
import httpx
import os
from corelink_client import connect
from dotenv import load_dotenv 

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")

# ---- DO WHAT YOU WANT WITH CODE HERE, play audio, display, whatever
async def process(data_bytes: bytes, stream_id: int, header: dict):
    word = data_bytes.decode('utf-8')
    print(f"RECEIVED: {word} | Count: {header.get('count', 'N/A')}")
# ------------------------------------------------------------------------

async def main():
    await connect()
    await corelink.set_data_callback(process)

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_URL}/streams")
        streams = response.json()
        plugin_id = next(
            int(k) for k, v in streams.items() if v["role"] == "plugin_out"
        )

    streamID = await corelink.create_receiver(
        "Holodeck", "udp", "processed-data",
        alert=True,
        echo=True,
        subscribe=True,
        stream_ids=[plugin_id]
    )
    print(f"Receiver streamID: {streamID}")
    await processing.connect_receiver(streamID)
    print('connected and waiting for plugin output...')
    await corelink.asyncio.sleep(10000)

corelink.run(main())
