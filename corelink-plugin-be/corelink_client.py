import corelink
import os
from dotenv import load_dotenv
from util import on_update, on_stale, on_subscriber, on_dropped
load_dotenv()

async def connect():
    await corelink.connect(
        os.getenv("CORELINK_USERNAME"),
        os.getenv("CORELINK_PASSWORD"),
        os.getenv("CORELINK_SERVER_HOST"),
        os.getenv("CORELINK_SERVER_PORT")
    )
    await corelink.set_server_callback(on_update,     'update')
    await corelink.set_server_callback(on_stale,      'stale')
    await corelink.set_server_callback(on_subscriber, 'subscriber')
    await corelink.set_server_callback(on_dropped,    'dropped')