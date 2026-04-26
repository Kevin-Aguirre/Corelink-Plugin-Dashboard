import time
import corelink
import os
from dotenv import load_dotenv
load_dotenv()

CORELINK_USERNAME    = os.getenv("CORELINK_USERNAME",    "Testuser")
CORELINK_PASSWORD    = os.getenv("CORELINK_PASSWORD",    "Testpassword")
CORELINK_SERVER_HOST = os.getenv("CORELINK_SERVER_HOST", "localhost")
CORELINK_SERVER_PORT = int(os.getenv("CORELINK_SERVER_PORT", "20012"))

async def on_subscriber(message, key):
    print(f"New subscriber on stream: {message}")

async def on_stale(message, key):   pass
async def on_update(message, key):  pass
async def on_dropped(message, key): pass

async def main():
    await corelink.connect(
        CORELINK_USERNAME,
        CORELINK_PASSWORD,
        CORELINK_SERVER_HOST,
        CORELINK_SERVER_PORT,
    )
    await corelink.set_server_callback(on_update,     'update')
    await corelink.set_server_callback(on_stale,      'stale')
    await corelink.set_server_callback(on_subscriber, 'subscriber')
    await corelink.set_server_callback(on_dropped,    'dropped')

    sender_id = await corelink.create_sender("Holodeck", "udp", data_type="testing", metadata="My Sender")
    print(f"Sender ready. ID: {sender_id}")

    words = ['hello', 'corelink', 'world']
    count = 0
    while True:
        for word in words:
            print(f"Sending: {word}")
            await corelink.send(sender_id, word, {"count": count})
            count += 1
        time.sleep(2)

corelink.run(main())
