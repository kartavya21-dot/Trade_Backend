from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.connection import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.employee import EmployeeService
from app.core.security import verify_password, create_access_token

router = APIRouter(tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate employee/admin and return access token with basic metadata"""
    employee = await EmployeeService.get_by_email(db, payload.email)
    
    if not employee or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not employee.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
        
    token = create_access_token(subject=str(employee.id))
    
    return TokenResponse(
        access_token=token,
        role=employee.role,
        employee_id=employee.id,
        employee_name=employee.name
    )
