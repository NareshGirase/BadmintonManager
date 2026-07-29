import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

async def clear():
    collections = await db.list_collection_names()

    for collection in collections:
        result = await db[collection].delete_many({})
        print(f"Deleted {result.deleted_count} documents from {collection}")

    print("Database cleared successfully")

asyncio.run(clear())
