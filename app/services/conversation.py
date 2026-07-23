import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status
from app.models.conversation import Conversation, ConversationStatus
from app.models.visitor import Visitor
from app.models.employee import Employee
from app.schemas.conversation import ConversationRead
from app.services.visitor import VisitorService

class ConversationService:
    @staticmethod
    async def get_by_id(db: AsyncSession, conversation_id: uuid.UUID) -> Optional[Conversation]:
        """Fetch conversation by ID, preloading visitor and assigned employee"""
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(
                selectinload(Conversation.visitor),
                selectinload(Conversation.assigned_employee)
            )
        )
        result = await db.exec(stmt)
        return result.first()

    @staticmethod
    async def enrich(db: AsyncSession, conversation: Conversation) -> ConversationRead:
        """Enrich conversation model with display names and visitor details for schema mapping"""
        visitor = conversation.visitor
        if not visitor:
            # Fallback query if not preloaded
            stmt = select(Visitor).where(Visitor.id == conversation.visitor_id)
            res = await db.exec(stmt)
            visitor = res.first()

        assigned_employee_name = None
        if conversation.assigned_employee_id:
            employee = conversation.assigned_employee
            if not employee:
                stmt = select(Employee).where(Employee.id == conversation.assigned_employee_id)
                res = await db.exec(stmt)
                employee = res.first()
            if employee:
                assigned_employee_name = employee.name

        v_display_name = ""
        v_name = None
        v_phone = None
        v_email = None
        if visitor:
            v_display_name = VisitorService.get_display_name(visitor.uuid, visitor.name)
            v_name = visitor.name
            v_phone = visitor.phone
            v_email = visitor.email

        return ConversationRead(
            id=conversation.id,
            visitor_id=conversation.visitor_id,
            visitor_uuid=visitor.uuid if visitor else conversation.visitor_id,
            assigned_employee_id=conversation.assigned_employee_id,
            status=conversation.status,
            created_at=conversation.created_at,
            closed_at=conversation.closed_at,
            visitor_name=v_name,
            visitor_display_name=v_display_name,
            visitor_phone=v_phone,
            visitor_email=v_email,
            assigned_employee_name=assigned_employee_name
        )

    @staticmethod
    async def start_conversation(db: AsyncSession, visitor: Visitor) -> Conversation:
        """
        Start a new conversation. If visitor already has an active or waiting
        conversation, reuse it to prevent concurrent open chats for the same visitor.
        """
        stmt = (
            select(Conversation)
            .where(
                Conversation.visitor_id == visitor.id,
                Conversation.status.in_([ConversationStatus.WAITING, ConversationStatus.ACTIVE])
            )
            .options(
                selectinload(Conversation.visitor),
                selectinload(Conversation.assigned_employee)
            )
        )
        result = await db.exec(stmt)
        existing = result.first()
        if existing:
            return existing

        conversation = Conversation(
            visitor_id=visitor.id,
            status=ConversationStatus.WAITING
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        
        # Reload to preload relationships
        return await ConversationService.get_by_id(db, conversation.id)

    @staticmethod
    async def accept_conversation(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        employee_id: uuid.UUID
    ) -> Conversation:
        """
        Accept a waiting conversation.
        Uses PostgreSQL row-locking (with_for_update) to prevent race conditions
        where multiple agents accept the same chat.
        """
        # Lock the row for update
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .with_for_update()
        )
        result = await db.exec(stmt)
        conversation = result.first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if conversation.status != ConversationStatus.WAITING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation is not in WAITING state and cannot be accepted"
            )

        conversation.status = ConversationStatus.ACTIVE
        conversation.assigned_employee_id = employee_id
        db.add(conversation)
        await db.commit()
        
        # Fetch fully loaded conversation
        return await ConversationService.get_by_id(db, conversation_id)

    @staticmethod
    async def close_conversation(db: AsyncSession, conversation_id: uuid.UUID) -> Conversation:
        """Close an active conversation"""
        conversation = await ConversationService.get_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if conversation.status == ConversationStatus.CLOSED:
            return conversation

        conversation.status = ConversationStatus.CLOSED
        conversation.closed_at = datetime.utcnow()
        db.add(conversation)
        await db.commit()
        
        # Return fully loaded
        return await ConversationService.get_by_id(db, conversation_id)

    @staticmethod
    async def get_waiting(db: AsyncSession) -> List[Conversation]:
        """Fetch all conversations in WAITING status"""
        stmt = (
            select(Conversation)
            .where(Conversation.status == ConversationStatus.WAITING)
            .order_by(Conversation.created_at.asc())
            .options(
                selectinload(Conversation.visitor),
                selectinload(Conversation.assigned_employee)
            )
        )
        result = await db.exec(stmt)
        return list(result.all())

    @staticmethod
    async def get_assigned(db: AsyncSession, employee_id: uuid.UUID) -> List[Conversation]:
        """Fetch active conversations assigned to employee"""
        stmt = (
            select(Conversation)
            .where(
                Conversation.assigned_employee_id == employee_id,
                Conversation.status == ConversationStatus.ACTIVE
            )
            .order_by(Conversation.created_at.desc())
            .options(
                selectinload(Conversation.visitor),
                selectinload(Conversation.assigned_employee)
            )
        )
        result = await db.exec(stmt)
        return list(result.all())

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Conversation]:
        """Fetch all conversations sorted by created_at (for admins)"""
        stmt = (
            select(Conversation)
            .order_by(Conversation.created_at.desc())
            .options(
                selectinload(Conversation.visitor),
                selectinload(Conversation.assigned_employee)
            )
        )
        result = await db.exec(stmt)
        return list(result.all())

    @staticmethod
    async def delete_conversation(db: AsyncSession, conversation_id: uuid.UUID) -> bool:
        """Permanently delete a conversation and all its messages"""
        from app.models.message import Message
        from sqlmodel import select as sql_select

        conversation = await ConversationService.get_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Delete all messages belonging to this conversation first
        messages_stmt = sql_select(Message).where(Message.conversation_id == conversation_id)
        msg_result = await db.exec(messages_stmt)
        for message in msg_result.all():
            await db.delete(message)

        # Then delete the conversation itself
        await db.delete(conversation)
        await db.commit()
        return True

