import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VisitorStartRequest(BaseModel):
    uuid: Optional[UUID] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class VisitorStartResponse(BaseModel):
    conversation_id: UUID
    visitor_uuid: UUID
    visitor_id: UUID
    display_name: str

class VisitorUpdateRequest(BaseModel):
    uuid: UUID
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class VisitorRead(BaseModel):
    id: UUID
    uuid: UUID
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
