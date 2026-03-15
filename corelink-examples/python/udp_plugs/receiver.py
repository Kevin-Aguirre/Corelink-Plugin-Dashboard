import corelink
from corelink import processing
from corelink.resources import control

streamID = None

async def byte_to_string(data_bytes, stream_id, header):
    print(stream_id, header)
    print('---')
    try:
        word = data_bytes.decode('utf-8')
        print(f"RECEIVED WORD: {word} | Count: {header.get('count', 'N/A')}")
    except Exception as e:
        print(f"Error decoding data: {e}")

async def on_subscriber(message, key):
    print(f"Subscriber [{key}]: {message}")

async def on_update(message, key):
    global streamID
    print(f"Update: {message}")
    sender_stream = message.get('streamID')
    if sender_stream and streamID is not None:
        await control.subscribe_to_stream(streamID, sender_stream)
        print(f"Subscribed to stream {sender_stream}")

async def on_stale(message, key):
    print(f"Stale: {message}")

async def main():
    global streamID
    await corelink.connect("Testuser", "Testpassword", "corelink.hpc.nyu.edu", "20012")
    await corelink.set_data_callback(byte_to_string)

    # Register ALL callbacks BEFORE create_receiver so no events are missed
    await corelink.set_server_callback(on_subscriber, 'subscriber')
    await corelink.set_server_callback(on_update,     'update')
    await corelink.set_server_callback(on_stale,      'stale')

    streamID = await corelink.create_receiver(
        "Holodeck", "udp", "processed-data",
        alert=True,
        echo=True,
        subscribe=True,
        stream_ids=[43379]
    )
    print(f"Receiver streamID: {streamID}")
    await processing.connect_receiver(streamID)
    print('connected and waiting for plugin output...')
    await corelink.asyncio.sleep(10000)

corelink.run(main())
