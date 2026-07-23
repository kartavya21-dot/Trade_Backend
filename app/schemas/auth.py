import uuid
from pydantic import BaseModel, EmailStr
from app.models.employee import EmployeeRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: EmployeeRole
    employee_id: uuid.UUID
    employee_name: str
