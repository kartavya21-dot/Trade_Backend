import uuid
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.message import Message

class Visitor(SQLModel, table=True):
    __tablename__ = "visitor"

    id: UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    uuid: UUID = Field(
        default_factory=uuid.uuid4,
        unique=True,
        index=True,
        nullable=False
    )
    name: Optional[str] = Field(default=None, nullable=True)
    phone: Optional[str] = Field(default=None, nullable=True)
    email: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)

    # Relationships
    conversations: List["Conversation"] = Relationship(back_populates="visitor")
    messages_sent: List["Message"] = Relationship(back_populates="sender_visitor")
