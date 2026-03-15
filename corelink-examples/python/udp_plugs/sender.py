import time
import numpy as np
import sys
import corelink

def generate_permutations(s):
    if len(s) <= 1:
        return [s]
    permutations = []
    
    for i, char in enumerate(s):
        remaining = s[:i] + s[i+1:]
        
        for perm in generate_permutations(remaining):
            permutations.append(char + perm)
    
    return permutations

async def main():
    """
    1. connect
    2. create sender 
    3. send
    """
    await corelink.connect("Testuser", "Testpassword", "corelink.hpc.nyu.edu", "20012")
    senderID = await corelink.create_sender("Holodeck", "udp", "testing")
    print("sender ID is ",senderID)
    count = 0
    myDataString = "hello"
    perms = generate_permutations(myDataString)
    while True:
        actNum = np.random.randint(0, len(perms) - 1)
        print("actNum is ", actNum, " and perms[actNum] is ", perms[actNum]) 
        await corelink.send(senderID, perms[actNum], {"count": count})
        count = count + 1
        if (count > 10):
            time.sleep(10)
            count = 0


corelink.run(main())
