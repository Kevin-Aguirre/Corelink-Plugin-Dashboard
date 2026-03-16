import time
import numpy as np
import sys
import corelink
from corelink_client import connect
import httpx
import os
from dotenv import load_dotenv 

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")

async def main():
    await connect()
    senderID = await corelink.create_sender("Holodeck", "udp", "testing")
    print("sender ID is ", senderID)
    
    async with httpx.AsyncClient() as client:
        await client.post(f"{BACKEND_URL}/register", json={
            "stream_id": senderID,
            "role": "sender",
            "data_type": "testing"
        })

    count = 0
    perms = ['hello', 'corelink', 'world']
    while True:
        for _ in range(len(perms)):
            actNum = np.random.randint(0, len(perms))
            print("actNum is ", actNum, " and perms[actNum] is ", perms[actNum]) 
            await corelink.send(senderID, perms[actNum], {"count": count})
            count = count + 1
        time.sleep(8)


corelink.run(main())
