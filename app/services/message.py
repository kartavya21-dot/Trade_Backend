import uuid
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status
from app.models.message import Message, SenderType
from app.models.conversation import Conversation
from app.schemas.message import MessageRead
from app.services.visitor import VisitorService

class MessageService:
    @staticmethod
    async def create_message(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        sender_type: SenderType,
        sender_id: uuid.UUID,
        message_text: str
    ) -> Message:
        """Create and store a message in the database"""
        # Validate conversation exists
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        res = await db.exec(stmt)
        conversation = res.first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Build message model with the correct foreign key relationship
        message = Message(
            conversation_id=conversation_id,
            sender_type=sender_type,
            message=message_text
        )

        if sender_type == SenderType.EMPLOYEE:
            message.sender_employee_id = sender_id
        else:
            message.sender_visitor_id = sender_id

        db.add(message)
        await db.commit()
        
        # Reload to preload relationships
        stmt_reload = (
            select(Message)
            .where(Message.id == message.id)
            .options(
                selectinload(Message.sender_employee),
                selectinload(Message.sender_visitor)
            )
        )
        res_reload = await db.exec(stmt_reload)
        return res_reload.first()

    @staticmethod
    async def get_messages_for_conversation(
        db: AsyncSession,
        conversation_id: uuid.UUID
    ) -> List[Message]:
        """Fetch all messages for a conversation in order, preloading senders"""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .options(
                selectinload(Message.sender_employee),
                selectinload(Message.sender_visitor)
            )
        )
        result = await db.exec(stmt)
        return list(result.all())

    @staticmethod
    def enrich(message: Message) -> MessageRead:
        """Map Message model to MessageRead schema, resolving sender display names"""
        sender_name = "System"
        
        if message.sender_type == SenderType.VISITOR:
            if message.sender_visitor:
                sender_name = VisitorService.get_display_name(
                    message.sender_visitor.uuid,
                    message.sender_visitor.name
                )
            else:
                sender_name = "Visitor"
        elif message.sender_type == SenderType.EMPLOYEE:
            if message.sender_employee:
                sender_name = message.sender_employee.name
            else:
                sender_name = "Agent"

        return MessageRead(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_type=message.sender_type,
            sender_employee_id=message.sender_employee_id,
            sender_visitor_id=message.sender_visitor_id,
            message=message.message,
            created_at=message.created_at,
            sender_name=sender_name
        )
