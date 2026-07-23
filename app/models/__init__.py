from sqlmodel import SQLModel
from app.models.employee import Employee, EmployeeRole
from app.models.visitor import Visitor
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, SenderType

# Collect metadata from all models
metadata = SQLModel.metadata

__all__ = [
    "SQLModel",
    "metadata",
    "Employee",
    "EmployeeRole",
    "Visitor",
    "Conversation",
    "ConversationStatus",
    "Message",
    "SenderType",
]
