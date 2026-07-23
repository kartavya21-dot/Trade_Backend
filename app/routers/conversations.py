import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.connection import get_db
from app.auth.dependencies import get_current_employee, get_current_admin
from app.models.employee import Employee, EmployeeRole
from app.models.conversation import Conversation, ConversationStatus
from app.models.visitor import Visitor
from app.schemas.conversation import ConversationRead
from app.schemas.message import MessageRead
from app.schemas.visitor import VisitorUpdateRequest
from app.services.conversation import ConversationService
from app.services.message import MessageService
from app.services.visitor import VisitorService
from app.websocket.manager import manager

router = APIRouter(prefix="/conversations", tags=["Conversations API"])

class VisitorNameUpdate(BaseModel):
    name: str

@router.get("/waiting", response_model=List[ConversationRead])
async def get_waiting_conversations(
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Retrieve all conversations currently in WAITING status (visible to all agents)"""
    conversations = await ConversationService.get_waiting(db)
    return [await ConversationService.enrich(db, conv) for conv in conversations]

@router.get("/assigned", response_model=List[ConversationRead])
async def get_assigned_conversations(
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Retrieve active conversations assigned to the logged-in agent"""
    conversations = await ConversationService.get_assigned(db, current_employee.id)
    return [await ConversationService.enrich(db, conv) for conv in conversations]

@router.get("/all", response_model=List[ConversationRead])
async def get_all_conversations(
    db: AsyncSession = Depends(get_db),
    current_admin: Employee = Depends(get_current_admin)
):
    """Retrieve all conversations across all statuses (Admin only)"""
    conversations = await ConversationService.get_all(db)
    return [await ConversationService.enrich(db, conv) for conv in conversations]

@router.get("/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Retrieve detailed metadata of a specific conversation (Employee/Admin only)"""
    conversation = await ConversationService.get_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    return await ConversationService.enrich(db, conversation)

@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    visitor_uuid: Optional[uuid.UUID] = Query(None, description="Visitor's local UUID for identity verification"),
    db: AsyncSession = Depends(get_db),
    # Employee check is optional to support visitor retrieving history in postman
    current_employee: Optional[Employee] = Depends(get_current_employee)
):
    """
    Retrieve message logs for a conversation.
    Must be authorized as an employee OR identify as the conversation's visitor via visitor_uuid.
    """
    conversation = await ConversationService.get_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # If not logged in as employee, must verify visitor uuid matches the conversation
    if not current_employee:
        if not visitor_uuid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        visitor = conversation.visitor
        if not visitor or visitor.uuid != visitor_uuid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to conversation history"
            )

    messages = await MessageService.get_messages_for_conversation(db, conversation_id)
    return [MessageService.enrich(msg) for msg in messages]

@router.post("/{conversation_id}/accept", response_model=ConversationRead)
async def accept_chat(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """
    Accept a waiting conversation.
    Ensures concurrency safety via Row-Level locking.
    """
    conversation = await ConversationService.accept_conversation(
        db, conversation_id, current_employee.id
    )
    enriched = await ConversationService.enrich(db, conversation)

    # Broadcast status change to all agents
    await manager.broadcast_to_agents({
        "type": "conversation_updated",
        "conversation": enriched.model_dump(mode="json")
    })

    # Notify the visitor that an agent has joined the chat
    await manager.send_to_visitor(conversation_id, {
        "type": "agent_assigned",
        "assigned_employee_id": str(current_employee.id),
        "assigned_employee_name": current_employee.name,
        "conversation": enriched.model_dump(mode="json")
    })

    return enriched

@router.post("/{conversation_id}/close", response_model=ConversationRead)
async def close_chat(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """
    Close an active conversation.
    Only the assigned employee (or an administrator) can close a chat.
    """
    conversation = await ConversationService.get_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Enforce closure permission (assigned employee or Admin role)
    if (conversation.assigned_employee_id != current_employee.id and 
            current_employee.role != EmployeeRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to close this conversation"
        )

    conversation = await ConversationService.close_conversation(db, conversation_id)
    enriched = await ConversationService.enrich(db, conversation)

    # Broadcast update to agents
    await manager.broadcast_to_agents({
        "type": "conversation_updated",
        "conversation": enriched.model_dump(mode="json")
    })

    # Notify visitor
    await manager.send_to_visitor(conversation_id, {
        "type": "conversation_closed",
        "conversation": enriched.model_dump(mode="json")
    })

    return enriched

@router.put("/{conversation_id}/visitor-name", response_model=ConversationRead)
async def change_visitor_name(
    conversation_id: uuid.UUID,
    payload: VisitorNameUpdate,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """
    Allow an employee or admin to rename the visitor.
    Updates the Visitor record and broadcasts the name change to everyone.
    """
    conversation = await ConversationService.get_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Update visitor's name in DB
    update_payload = VisitorUpdateRequest(uuid=conversation.visitor.uuid, name=payload.name)
    await VisitorService.update(db, conversation.visitor_id, update_payload)

    # Refresh and enrich conversation details
    conversation = await ConversationService.get_by_id(db, conversation_id)
    enriched = await ConversationService.enrich(db, conversation)

    # Broadcast name change to all agents
    await manager.broadcast_to_agents({
        "type": "conversation_updated",
        "conversation": enriched.model_dump(mode="json")
    })

    # Send update directly to the visitor
    await manager.send_to_visitor(conversation_id, {
        "type": "visitor_updated",
        "visitor": {
            "id": str(conversation.visitor.id),
            "uuid": str(conversation.visitor.uuid),
            "name": conversation.visitor.name,
            "display_name": enriched.visitor_display_name,
            "phone": conversation.visitor.phone,
            "email": conversation.visitor.email
        }
    })

    return enriched

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """
    Permanently delete a conversation and all its messages.
    Employees can only delete their own assigned conversations.
    Admins can delete any conversation.
    """
    conversation = await ConversationService.get_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Permission: assigned employee or Admin
    if (conversation.assigned_employee_id != current_employee.id and
            current_employee.role != EmployeeRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this conversation"
        )

    await ConversationService.delete_conversation(db, conversation_id)

    # Notify all agents to remove this conversation from their lists
    await manager.broadcast_to_agents({
        "type": "conversation_deleted",
        "conversation_id": str(conversation_id)
    })

    return None
