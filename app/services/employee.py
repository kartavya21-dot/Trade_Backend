import uuid
from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status
from app.models.employee import Employee, EmployeeRole
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.core.security import get_password_hash

class EmployeeService:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[Employee]:
        """Fetch employee by email"""
        stmt = select(Employee).where(Employee.email == email)
        result = await db.exec(stmt)
        return result.first()

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: uuid.UUID) -> Optional[Employee]:
        """Fetch employee by ID"""
        stmt = select(Employee).where(Employee.id == employee_id)
        result = await db.exec(stmt)
        return result.first()

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Employee]:
        """Fetch all employees ordered by created_at"""
        stmt = select(Employee).order_by(Employee.created_at.desc())
        result = await db.exec(stmt)
        return list(result.all())

    @staticmethod
    async def create(db: AsyncSession, schema: EmployeeCreate) -> Employee:
        """Create new employee with password hashing and email uniqueness check"""
        existing = await EmployeeService.get_by_email(db, schema.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An employee with this email already exists"
            )
        
        employee = Employee(
            name=schema.name,
            email=schema.email,
            password_hash=get_password_hash(schema.password),
            role=schema.role,
            active=True
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        return employee

    @staticmethod
    async def update(db: AsyncSession, employee_id: uuid.UUID, schema: EmployeeUpdate) -> Employee:
        """Update existing employee details"""
        employee = await EmployeeService.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )

        if schema.email is not None and schema.email != employee.email:
            existing = await EmployeeService.get_by_email(db, schema.email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An employee with this email already exists"
                )
            employee.email = schema.email

        if schema.name is not None:
            employee.name = schema.name
        if schema.password is not None:
            employee.password_hash = get_password_hash(schema.password)
        if schema.role is not None:
            employee.role = schema.role
        if schema.active is not None:
            employee.active = schema.active

        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        return employee

    @staticmethod
    async def delete(db: AsyncSession, employee_id: uuid.UUID) -> bool:
        """Delete an employee from database"""
        employee = await EmployeeService.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        await db.delete(employee)
        await db.commit()
        return True
