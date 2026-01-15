from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_DB_URL = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_DB_URL)
db = client["lost_and_found"]
