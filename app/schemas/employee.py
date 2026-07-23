import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.employee import EmployeeRole

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: EmployeeRole = EmployeeRole.EMPLOYEE

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[EmployeeRole] = None
    active: Optional[bool] = None

class EmployeeRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: EmployeeRole
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
