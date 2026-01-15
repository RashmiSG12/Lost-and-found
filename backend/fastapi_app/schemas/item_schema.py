from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ItemBase(BaseModel):
    title: str
    description: str
    category: str
    location: str
    type: str  # 'lost' or 'found'
    date: datetime
    

class ItemCreate(ItemBase):
    pass    

class ItemInDB(ItemBase):
    id: str
    status: str = "pending"  # pending, approved, rejected
    submitted_by: str
    image_path: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    
    model_config = ConfigDict(from_attributes=True)