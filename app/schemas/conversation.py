import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.conversation import ConversationStatus

class ConversationRead(BaseModel):
    id: uuid.UUID
    visitor_id: uuid.UUID
    visitor_uuid: uuid.UUID
    assigned_employee_id: Optional[uuid.UUID] = None
    status: ConversationStatus
    created_at: datetime
    closed_at: Optional[datetime] = None
    
    # Enrichment fields for dashboard UI
    visitor_name: Optional[str] = None
    visitor_display_name: str
    visitor_phone: Optional[str] = None
    visitor_email: Optional[str] = None
    assigned_employee_name: Optional[str] = None

    class Config:
        from_attributes = True
        use_enum_values = True
