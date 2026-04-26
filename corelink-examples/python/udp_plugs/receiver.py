import corelink
from corelink import processing
from corelink.resources import reqs, variables
import asyncio
import httpx
import os
from dotenv import load_dotenv
load_dotenv()

CORELINK_USERNAME    = os.getenv("CORELINK_USERNAME",    "Testuser")
CORELINK_PASSWORD    = os.getenv("CORELINK_PASSWORD",    "Testpassword")
CORELINK_SERVER_HOST = os.getenv("CORELINK_SERVER_HOST", "localhost")
CORELINK_SERVER_PORT = int(os.getenv("CORELINK_SERVER_PORT", "20012"))
BACKEND_URL          = os.getenv("BACKEND_URL",          "http://localhost:20015")

receiver_id = None

async def on_data(data_bytes, stream_id, header):
    try:
        print(f"RECEIVED: {data_bytes.decode('utf-8')} | Count: {header.get('count', 'N/A')}")
    except Exception as e:
        print(f"Decode error: {e}")

async def on_update(message, key):    pass
async def on_stale(message, key):     pass
async def on_subscriber(message, key): pass
async def on_dropped(message, key):   pass

async def poll_connections(my_receiver_id):
    """Poll the corelink server for dashboard-driven stream connections."""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BACKEND_URL}/api/connections/{my_receiver_id}")
                stream_ids = response.json().get("stream_ids", [])
                for sid in stream_ids:
                    await reqs.request_func({
                        "function": "subscribe",
                        "receiverID": my_receiver_id,
                        "streamIDs": [sid],
                        "token": variables.token
                    })
                    print(f"Connected to stream {sid}")
        except Exception as e:
            print(f"Poll error: {e}")
        await asyncio.sleep(2)

async def main():
    global receiver_id

    await corelink.connect(
        CORELINK_USERNAME,
        CORELINK_PASSWORD,
        CORELINK_SERVER_HOST,
        CORELINK_SERVER_PORT,
    )
    await corelink.set_server_callback(on_update,      'update')
    await corelink.set_server_callback(on_stale,       'stale')
    await corelink.set_server_callback(on_subscriber,  'subscriber')
    await corelink.set_server_callback(on_dropped,     'dropped')

    await corelink.set_data_callback(on_data)

    # subscribe=False — connections are made explicitly via the dashboard
    receiver_id = await corelink.create_receiver(
        workspace="Holodeck",
        protocol="udp",
        data_type="",
        metadata="My Receiver",
        alert=False,
        echo=False,
        subscribe=False,
    )
    await processing.connect_receiver(receiver_id)

    asyncio.create_task(poll_connections(receiver_id))

    print(f"Receiver ready. ID: {receiver_id}. Draw connections on the dashboard to wire streams.")
    await corelink.asyncio.sleep(100000)

corelink.run(main())
