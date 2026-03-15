import sys
import time
import threading

import corelink
import cv2
import numpy as np

from corelink import processing

import base64

# corelink.hpc.nyu.edu for remote server
# 127.0.0.1 for local

count = 0

### GOAL ### take callback function and make it process the bytes from the stream ID  to decode into an image
async def byte_to_string(data_bytes , streamID, header):
    # The data_bytes from Corelink is already a byte-string. 
    # Just decode it from utf-8 to see the word.
    try:
        word = data_bytes.decode('utf-8')
        print(f"RECEIVED WORD: {word} | Count: {header.get('count', 'N/A')}")
    except Exception as e:
        print(f"Error decoding data: {e}")

async def main():
    await corelink.connect("Testuser", "Testpassword", "corelink.hpc.nyu.edu", "20012")
    await corelink.set_data_callback(byte_to_string)
    streamID = await corelink.create_receiver("Holodeck", "udp", "testing", alert=True, echo=True)
    
    await processing.connect_receiver(streamID)
    
    #threading.Thread(target=OpenSfm_instructions).start()

    print('connected')
    await corelink.asyncio.sleep(10000)
    print("closing...")

    cap.release()
    cv2.destroyAllWindows()

corelink.run(main())
