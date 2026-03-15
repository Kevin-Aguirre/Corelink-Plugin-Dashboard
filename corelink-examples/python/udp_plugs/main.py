import asyncio
import corelink
from corelink.resources import control
from corelink import variables
from corelink.resources.control import request_func

async def main():
    await corelink.connect("Testuser", "Testpassword", "corelink.hpc.nyu.edu", "20012")
    
    # Raw request — bypass retrieve() to see full server response
    request = {
        "function": "listStreams",
        "workspaces": ["Holodeck"],
        "types": [],
        "token": variables.token
    }
    raw = await request_func(request)
    print(f"Raw response: {raw}")

corelink.run(main())
