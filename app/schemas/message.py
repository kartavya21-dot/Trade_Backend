import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.message import SenderType

class MessageCreate(BaseModel):
    message: str

class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_type: SenderType
    sender_employee_id: Optional[uuid.UUID] = None
    sender_visitor_id: Optional[uuid.UUID] = None
    message: str
    created_at: datetime
    sender_name: str  # Resolves dynamically to visitor name/display name or employee name

    class Config:
        from_attributes = True
        use_enum_values = True
