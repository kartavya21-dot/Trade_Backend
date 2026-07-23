import enum
import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.visitor import Visitor
    from app.models.message import Message

class ConversationStatus(str, enum.Enum):
    WAITING = "WAITING"
    ACTIVE = "ACTIVE"

class Conversation(SQLModel, table=True):
    __tablename__ = "conversation"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    visitor_id: uuid.UUID = Field(
        foreign_key="visitor.id",
        nullable=False
    )
    assigned_employee_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="employee.id",
        nullable=True
    )
    status: ConversationStatus = Field(
        default=ConversationStatus.WAITING,
        nullable=False
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False
    )
    closed_at: Optional[datetime] = Field(
        default=None,
        nullable=True
    )

    # Relationships
    visitor: "Visitor" = Relationship(back_populates="conversations")
    assigned_employee: Optional["Employee"] = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(back_populates="conversation")
