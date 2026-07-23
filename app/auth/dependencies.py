import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.connection import get_db
from app.core.security import decode_access_token
from app.services.employee import EmployeeService
from app.models.employee import Employee, EmployeeRole

# OAuth2 scheme config (pointing to our POST /login endpoint)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)

async def get_current_employee(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Employee:
    """Dependency to retrieve and validate the currently logged-in employee"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    subject = decode_access_token(token)
    if subject is None:
        raise credentials_exception
        
    try:
        employee_id = uuid.UUID(subject)
    except ValueError:
        raise credentials_exception

    employee = await EmployeeService.get_by_id(db, employee_id)
    if employee is None:
        raise credentials_exception
        
    if not employee.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee account is deactivated"
        )
        
    return employee

async def get_current_employee_optional(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[Employee]:
    """Optional dependency to retrieve employee if valid token is provided, without raising 401 if omitted."""
    if not token:
        return None
    subject = decode_access_token(token)
    if subject is None:
        return None
    try:
        employee_id = uuid.UUID(subject)
    except ValueError:
        return None

    employee = await EmployeeService.get_by_id(db, employee_id)
    if employee is None or not employee.active:
        return None

    return employee

async def get_current_admin(
    current_employee: Employee = Depends(get_current_employee)
) -> Employee:
    """Dependency to enforce that the logged-in employee is an administrator"""
    if current_employee.role != EmployeeRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required to perform this action"
        )
    return current_employee
