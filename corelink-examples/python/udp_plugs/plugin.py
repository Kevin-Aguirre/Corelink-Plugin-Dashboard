import corelink
from corelink import processing
from corelink.resources import control

out_sender_id = None
in_receiver_id = None

async def uppercase_logic(data_bytes, streamID, header):
    global out_sender_id
    if streamID == out_sender_id:
        return
    try:
        word = data_bytes.decode('utf-8')
        processed = word.upper()
        await corelink.send(out_sender_id, processed, header)
        print(f"Processed: {word!r} -> {processed!r}")
    except Exception as e:
        print(f"Error: {e}")

async def on_update(message, key):
    global in_receiver_id
    print(f"Update [{key}]: {message}")
    stream_id = message.get('streamID')
    if stream_id and in_receiver_id is not None:
        await control.subscribe_to_stream(in_receiver_id, stream_id)
        print(f"Subscribed receiver {in_receiver_id} to stream {stream_id}")

async def on_stale(message, key):
    print(f"Stale [{key}]: {message} — staying alive...")

async def on_subscriber(message, key):
    print(f"Subscriber [{key}]: {message}")

async def on_dropped(message, key):
    print(f"Dropped [{key}]: {message}")

async def main():
    global out_sender_id, in_receiver_id

    await corelink.connect("Testuser", "Testpassword", "corelink.hpc.nyu.edu", "20012")

    out_sender_id = await corelink.create_sender("Holodeck", "udp", "processed-data")
    print(f"Plugin output sender ID: {out_sender_id}")

    await corelink.set_data_callback(uppercase_logic)
    await corelink.set_server_callback(on_update,     'update')
    await corelink.set_server_callback(on_stale,      'stale')
    await corelink.set_server_callback(on_subscriber, 'subscriber')
    await corelink.set_server_callback(on_dropped,    'dropped')

    in_receiver_id = await corelink.create_receiver(
        workspace="Holodeck",
        protocol="udp",
        data_type="testing",
        alert=True,
        echo=True,
        subscribe=True
    )
    print(f"Plugin input receiver ID: {in_receiver_id}")

    await processing.connect_receiver(in_receiver_id)
    print("Plugin ready.")

    await corelink.asyncio.sleep(100000)

corelink.run(main())
