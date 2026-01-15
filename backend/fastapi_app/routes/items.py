from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, status, Query
from fastapi_app.models.user_model import User
from fastapi.responses import JSONResponse
from datetime import datetime, time
import shutil
from typing import Optional
import os
from bson import ObjectId
from bson.regex import Regex
from ..schemas.item_schema import ItemBase, ItemCreate
from ..db.fake_db import mock_items
from fastapi_app.auth.dependencies import get_current_user
from ..db.mongo import db
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ Consistent Path Setup
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
UPLOAD_FOLDER = os.path.abspath(os.path.join(BASE_DIR, "uploads"))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

logger.info(f"📂 Storage Config: Uploads will be saved to: {UPLOAD_FOLDER}")

@router.post("/submit")
async def submit_item(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    date: str = Form(...),
    type: str = Form(...),  # 'lost' or 'found'
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        item_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format")

    filename = None
    if file and file.filename:
        filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        logger.info(f"📸 Saving uploaded image to: {file_path}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        logger.info("ℹ️ No file provided in submission")

    item_dict = {
        "title": title.strip(),
        "description": description.strip(),
        "category": category.strip(),
        "location": location.strip(),
        "type": type.strip(),
        "date": item_date,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "image_path": filename,
        "submitted_by": current_user["username"].strip()
    }

    result = await db.items.insert_one(item_dict)
    if result.inserted_id:
        return {"message": "Item submitted successfully", "id": str(result.inserted_id)}

    raise HTTPException(status_code=500, detail="Failed to submit item")

def format_item(item):
    """Helper to format MongoDB item for JSON response."""
    item["id"] = str(item.get("_id"))
    item["_id"] = str(item.get("_id"))
    if item.get("date") and isinstance(item["date"], datetime):
        item["date"] = item["date"].isoformat()
    if item.get("created_at") and isinstance(item["created_at"], datetime):
        item["created_at"] = item["created_at"].isoformat()
    if item.get("approved_at") and isinstance(item["approved_at"], datetime):
        item["approved_at"] = item["approved_at"].isoformat()
    if item.get("rejected_at") and isinstance(item["rejected_at"], datetime):
        item["rejected_at"] = item["rejected_at"].isoformat()
    return item

@router.get("/my-items")
async def get_my_items(current_user: dict = Depends(get_current_user)):
    try:
        # Get the username from token and clean it up
        raw_username = current_user["username"]
        trimmed_username = raw_username.strip()
        
        logger.info(f"🔍 [RETRIEVAL] Fetching items for user: '{trimmed_username}' (Raw: '{raw_username}')")
        
        # Search for items where submitted_by matches exactly OR has minor whitespace/casing differences
        # We use a regex that handles leading/trailing spaces and is case-insensitive
        escaped_name = re.escape(trimmed_username)
        query = {
            "submitted_by": {"$regex": f"^\\s*{escaped_name}\\s*$", "$options": "i"}
        }
        
        items = await db.items.find(query).to_list(length=100)
        logger.info(f"📊 [RETRIEVAL] Found {len(items)} items for user '{trimmed_username}'")
        
        formatted = []
        for it in items:
            try:
                formatted.append(format_item(it))
            except Exception as e:
                logger.error(f"❌ [FORMAT ERROR]: {e}")
        return formatted
    except Exception as e:
        logger.error(f"❌ [SYSTEM ERROR] In get_my_items: {e}")
        return []

@router.get("/diag/users")
async def diag_users():
    """Diagnostic endpoint to see what usernames are in the DB."""
    try:
        all_users = await db.items.distinct("submitted_by")
        # Also get a count of all items
        total = await db.items.count_documents({})
        return {
            "submitted_by_values": all_users,
            "total_items_in_db": total
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/pending")
async def get_pending_items(current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        pending_items = await db.items.find({"status": "pending"}).to_list(length=100)
        return [format_item(item) for item in pending_items]
    except Exception as e:
        logger.error(f"Unexpected error in get_pending_items: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching pending items")

@router.post("/approve/{item_id}")
async def approve_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.items.update_one(
            {"_id": ObjectId(item_id)},
            {
                "$set": {
                    "status": "approved", 
                    "approved_by": current_user["username"], 
                    "approved_at": datetime.utcnow()
                }
            }
        )
        if result.modified_count == 1:
            return {"message": "Item approved successfully"}
        raise HTTPException(status_code=404, detail="Item not found")
    except Exception as e:
        logger.error(f"Error approving item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error approving item")

@router.post("/reject/{item_id}")
async def reject_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.items.update_one(
            {"_id": ObjectId(item_id)},
            {
                "$set": {
                    "status": "rejected", 
                    "rejected_by": current_user["username"], 
                    "rejected_at": datetime.utcnow()
                }
            }
        )
        if result.modified_count == 1:
            return {"message": "Item rejected successfully"}
        raise HTTPException(status_code=404, detail="Item not found")
    except Exception as e:
        logger.error(f"Error rejecting item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error rejecting item")

@router.get("/approved")
async def get_approved_items():
    try:
        approved_items = await db.items.find({"status": "approved"}).to_list(length=100)
        return [format_item(item) for item in approved_items]
    except Exception as e:
        logger.error(f"Error fetching approved items: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching approved items")

@router.get("/search")
async def search_items(
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None)
):
    try:
        query = {"status": "approved"}
        if category: query["category"] = {"$regex": category, "$options": "i"}
        if location: query["location"] = {"$regex": location, "$options": "i"}
        if date:
            try:
                date_obj = datetime.strptime(date, "%Y-%m-%d")
                query["date"] = {
                    "$gte": datetime.combine(date_obj, datetime.min.time()),
                    "$lt": datetime.combine(date_obj, datetime.max.time())
                }
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        if keyword:
            query["$or"] = [
                {"title": {"$regex": keyword, "$options": "i"}},
                {"description": {"$regex": keyword, "$options": "i"}},
            ]
        
        results = await db.items.find(query).to_list(length=100)
        return [format_item(item) for item in results]
    except Exception as e:
        logger.error(f"Error in search: {str(e)}")
        raise HTTPException(status_code=500, detail="Error performing search")

@router.get("/{item_id}")
async def get_item_by_id(item_id: str):
    try:
        item = await db.items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return format_item(item)
    except Exception as e:
        logger.error(f"Error fetching item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching item")
