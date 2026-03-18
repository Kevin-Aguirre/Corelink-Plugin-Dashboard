#!/usr/bin/env python3
import httpx
import os
from dotenv import load_dotenv 
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")

async def notify(event: str, data: dict, key: str):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{BACKEND_URL}/event", json={
                "event": event,
                "data": data,
                "key": key
            })
    except Exception as e:
        print('failed to notify backend: ', e)

async def on_update(message, key):
    await notify("update", message, key)

async def on_stale(message, key):
    await notify("stale", message, key)

async def on_subscriber(message, key):
    await notify("subscriber", message, key)

async def on_dropped(message, key):
    await notify("dropped", message, key)