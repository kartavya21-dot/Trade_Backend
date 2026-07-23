import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.connection import get_db
from app.schemas.visitor import VisitorStartRequest, VisitorStartResponse, VisitorUpdateRequest, VisitorRead
from app.services.visitor import VisitorService
from app.services.conversation import ConversationService
from app.models.conversation import Conversation, ConversationStatus
from app.websocket.manager import manager

router = APIRouter(tags=["Visitor API"])

@router.post("/chat/start", response_model=VisitorStartResponse)
async def start_chat(
    payload: VisitorStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start a chat session. Reuses visitor UUID if provided and exists,
    otherwise generates a new one. Creates or retrieves a WAITING/ACTIVE conversation.
    """
    # 1. Fetch or create visitor
    visitor = await VisitorService.get_or_create(
        db,
        v_uuid=payload.uuid,
        name=payload.name,
        phone=payload.phone,
        email=payload.email
    )

    # 2. Get or create active conversation
    conversation = await ConversationService.start_conversation(db, visitor)
    display_name = VisitorService.get_display_name(visitor.uuid, visitor.name)

    # 3. If conversation is brand new WAITING, broadcast to all agents
    if conversation.status == ConversationStatus.WAITING:
        enriched = await ConversationService.enrich(db, conversation)
        await manager.broadcast_to_agents({
            "type": "new_conversation",
            "conversation": enriched.model_dump(mode="json")
        })

    return VisitorStartResponse(
        conversation_id=conversation.id,
        visitor_uuid=visitor.uuid,
        visitor_id=visitor.id,
        display_name=display_name
    )

@router.post("/visitor/update", response_model=VisitorRead)
async def update_visitor(
    payload: VisitorUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update visitor's details (name, email, phone).
    Broadcasts the change in real-time to active agents.
    """
    visitor = await VisitorService.get_by_uuid(db, payload.uuid)
    if not visitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visitor not found"
        )

    # Convert update payload to internal format (omitting the uuid field)
    update_payload = VisitorUpdateRequest(
        uuid=payload.uuid,
        name=payload.name,
        phone=payload.phone,
        email=payload.email
    )
    visitor = await VisitorService.update(db, visitor.id, update_payload)

    # Find active/waiting conversations to broadcast updates
    stmt = select(Conversation).where(
        Conversation.visitor_id == visitor.id,
        Conversation.status.in_([ConversationStatus.WAITING, ConversationStatus.ACTIVE])
    )
    res = await db.exec(stmt)
    conversations = res.all()

    display_name = VisitorService.get_display_name(visitor.uuid, visitor.name)

    for conv in conversations:
        enriched = await ConversationService.enrich(db, conv)
        
        # Broadcast to all agents to update listings
        await manager.broadcast_to_agents({
            "type": "conversation_updated",
            "conversation": enriched.model_dump(mode="json")
        })

        # Send to specific conversation participants
        await manager.send_to_visitor(conv.id, {
            "type": "visitor_updated",
            "visitor": {
                "id": str(visitor.id),
                "uuid": str(visitor.uuid),
                "name": visitor.name,
                "display_name": display_name,
                "phone": visitor.phone,
                "email": visitor.email
            }
        })

    return VisitorRead.model_validate(visitor)
