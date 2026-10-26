import enum
import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.employee import Employee
    from app.models.visitor import Visitor

class SenderType(str, enum.Enum):
    VISITOR = "VISITOR"
    EMPLOYEE = "EMPLOYEE"

class Message(SQLModel, table=True):
    __tablename__ = "message"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    conversation_id: uuid.UUID = Field(
        foreign_key="conversation.id",
        nullable=False
    )
    sender_type: SenderType = Field(nullable=False)
    
    sender_employee_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="employee.id",
        nullable=True
    )
    sender_visitor_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="visitor.id",
        nullable=True
    )
    
    message: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False
    )

    # Relationships
    conversation: "Conversation" = Relationship(back_populates="messages")
    sender_employee: Optional["Employee"] = Relationship()
    sender_visitor: Optional["Visitor"] = Relationship(back_populates="messages_sent")
