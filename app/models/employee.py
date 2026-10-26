import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

if TYPE_CHECKING:
    from app.models.conversation import Conversation

class EmployeeRole(str, enum.Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"

class Employee(SQLModel, table=True):
    __tablename__ = "employee"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    name: str = Field(nullable=False)
    email: str = Field(nullable=False, unique=True, index=True)
    password_hash: str = Field(nullable=False)
    role: EmployeeRole = Field(default=EmployeeRole.EMPLOYEE, nullable=False)
    active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)

    # Relationships
    conversations: List["Conversation"] = Relationship(back_populates="assigned_employee")
