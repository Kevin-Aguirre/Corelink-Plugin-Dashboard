import corelink
from corelink import processing
import httpx
import os
from corelink_client import connect
from dotenv import load_dotenv 
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")

out_sender_id = None

# ----- PLUGIN CODE HERE ----==
async def process(data_bytes: bytes, header: dict) -> bytes:
    word = data_bytes.decode('utf-8')
    return word.upper()
# ----------------------------

async def main():
    global out_sender_id
    await connect()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_URL}/streams")
        streams = response.json()
        sender_id = next(
            int(k) for k, v in streams.items() if v["role"] == "sender"
        )

    out_sender_id = await corelink.create_sender("Holodeck", "udp", "processed-data")
    print(f"Plugin output sender ID: {out_sender_id}")

    async def data_callback(data_bytes, streamID, header):
        global out_sender_id
        if streamID == out_sender_id:
            return
        result = await process(data_bytes, header)
        await corelink.send(out_sender_id, result, header)
        print(f"Processed: {data_bytes.decode()!r} -> {result!r}")


    await corelink.set_data_callback(data_callback)

    in_receiver_id = await corelink.create_receiver(
        workspace="Holodeck",
        protocol="udp",
        data_type="testing",
        alert=True,
        echo=True,
        subscribe=True,
        stream_ids=[sender_id]
    )

    await processing.connect_receiver(in_receiver_id)

    async with httpx.AsyncClient() as client:
        await client.post(f"{BACKEND_URL}/register", json={
            "stream_id": out_sender_id,
            "role": "plugin_out",
            "data_type": "processed-data"
        })

    await corelink.asyncio.sleep(100000)

corelink.run(main())
