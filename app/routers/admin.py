import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.connection import get_db
from app.auth.dependencies import get_current_admin
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeRead
from app.services.employee import EmployeeService
from app.models.employee import Employee

router = APIRouter(prefix="/employees", tags=["Admin (Employees)"], dependencies=[Depends(get_current_admin)])

@router.get("", response_model=List[EmployeeRead])
async def list_employees(
    db: AsyncSession = Depends(get_db)
):
    """Retrieve list of all employees (sorted by created date)"""
    employees = await EmployeeService.get_all(db)
    return [EmployeeRead.model_validate(emp) for emp in employees]

@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new employee/admin account"""
    employee = await EmployeeService.create(db, payload)
    return EmployeeRead.model_validate(employee)

@router.put("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update employee details (e.g. change name, password, email, role, or active status)"""
    employee = await EmployeeService.update(db, employee_id, payload)
    return EmployeeRead.model_validate(employee)

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete an employee account"""
    await EmployeeService.delete(db, employee_id)
    return None
