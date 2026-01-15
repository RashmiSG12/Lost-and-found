import motor.motor_asyncio
import asyncio
import os
import re
from bson.regex import Regex

async def check_user_items():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["lost_and_found"]
    
    username = "Caskey__"
    print(f"--- Checking items for user: '{username}' ---")
    
    # 1. Exact match
    exact = await db.items.find({"submitted_by": username}).to_list(100)
    print(f"Exact matches: {len(exact)}")
    
    # 2. Regex match (the one used in items.py)
    regex_pattern = f"^{re.escape(username)}\\s*$"
    regex_query = {"submitted_by": Regex(regex_pattern, "i")}
    regex_matches = await db.items.find(regex_query).to_list(100)
    print(f"Regex matches ({regex_pattern}): {len(regex_matches)}")
    
    # 3. All items sample
    all_items = await db.items.find().limit(5).to_list(5)
    print(f"\n--- Sample from database (first 5 items) ---")
    for it in all_items:
        print(f"Title: {it.get('title')}, By: '{it.get('submitted_by')}', Status: {it.get('status')}")

if __name__ == "__main__":
    asyncio.run(check_user_items())
