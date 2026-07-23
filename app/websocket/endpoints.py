import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlmodel import select
from app.database.connection import async_session_maker
from app.core.security import decode_access_token
from app.services.employee import EmployeeService
from app.services.conversation import ConversationService
from app.services.message import MessageService
from app.models.message import SenderType
from app.websocket.manager import manager

router = APIRouter(prefix="/ws", tags=["WebSocket API"])

@router.websocket("/visitor/{conversation_id}")
async def websocket_visitor(
    websocket: WebSocket,
    conversation_id: uuid.UUID
):
    """
    WebSocket endpoint for visitors.
    No login required. Identifies conversation by URL path parameter.
    """
    print(f"[WS VISITOR] Connecting conversation: {conversation_id}")
    await manager.connect_visitor(conversation_id, websocket)
    print(f"[WS VISITOR] Connected. Active visitor connections for {conversation_id}: {len(manager.visitor_connections.get(conversation_id, []))}")

    # Send initial status sync to visitor socket
    async with async_session_maker() as db:
        conversation = await ConversationService.get_by_id(db, conversation_id)
        if conversation:
            if conversation.status == "ACTIVE" and conversation.assigned_employee:
                await websocket.send_json({
                    "type": "agent_assigned",
                    "assigned_employee_id": str(conversation.assigned_employee_id),
                    "assigned_employee_name": conversation.assigned_employee.name
                })
    
    try:
        while True:
            # Wait for message from visitor
            data = await websocket.receive_text()
            print(f"[WS VISITOR] Received raw data: {data}")
            
            # Open short-lived DB transaction to save message
            async with async_session_maker() as db:
                conversation = await ConversationService.get_by_id(db, conversation_id)
                if not conversation:
                    print(f"[WS VISITOR] Conversation {conversation_id} not found in DB. Closing socket.")
                    break

                # Parse message payload
                try:
                    payload = json.loads(data)
                    message_text = payload.get("message", "").strip()
                except Exception:
                    # Fallback to raw string if not JSON
                    message_text = data.strip()

                print(f"[WS VISITOR] Parsed text: '{message_text}'")
                if not message_text:
                    continue

                # Save message to DB
                message = await MessageService.create_message(
                    db=db,
                    conversation_id=conversation_id,
                    sender_type=SenderType.VISITOR,
                    sender_id=conversation.visitor_id,
                    message_text=message_text
                )
                print(f"[WS VISITOR] Saved message. ID: {message.id}")
                
                enriched_msg = MessageService.enrich(message)
                event_data = {
                    "type": "message",
                    "message": enriched_msg.model_dump(mode="json")
                }

                # Send back to all visitor's tabs
                print(f"[WS VISITOR] Broadcasting to visitor connections ({conversation_id})...")
                await manager.send_to_visitor(conversation_id, event_data)

                # Send to assigned agent (if exists)
                print(f"[WS VISITOR] Assigned employee ID: {conversation.assigned_employee_id}")
                if conversation.assigned_employee_id:
                    agent_conns = len(manager.agent_connections.get(conversation.assigned_employee_id, []))
                    print(f"[WS VISITOR] Sending to agent. Active agent connections: {agent_conns}")
                    await manager.send_to_agent(conversation.assigned_employee_id, event_data)

    except WebSocketDisconnect:
        print(f"[WS VISITOR] Disconnected conversation: {conversation_id}")
    except Exception as e:
        print(f"[WS VISITOR] Error in loop: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect_visitor(conversation_id, websocket)

@router.websocket("/agent")
async def websocket_agent(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token for authentication")
):
    """
    WebSocket endpoint for employees and admins.
    Requires token as query parameter to authenticate the connection.
    """
    # 1. Validate token BEFORE accepting — reject at protocol level (no accept = no overhead)
    subject = decode_access_token(token)
    if not subject:
        await websocket.close(code=1008)
        return

    try:
        employee_id = uuid.UUID(subject)
    except ValueError:
        await websocket.close(code=1008)
        return

    # Fetch employee using short-lived db session
    async with async_session_maker() as db:
        employee = await EmployeeService.get_by_id(db, employee_id)
        if not employee or not employee.active:
            await websocket.close(code=1008)
            return

    # Auth passed — accept the connection and register
    await websocket.accept()
    await manager.connect_agent(employee_id, websocket)

    try:
        while True:
            # Wait for message from agent
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                conversation_id_str = payload.get("conversation_id")
                message_text = payload.get("message", "").strip()
            except Exception:
                # Invalid format received, send error
                await websocket.send_json({
                    "type": "error",
                    "message": "Message must be a valid JSON with conversation_id and message text."
                })
                continue

            if not conversation_id_str or not message_text:
                continue

            try:
                conversation_id = uuid.UUID(conversation_id_str)
            except ValueError:
                continue

            async with async_session_maker() as db:
                conversation = await ConversationService.get_by_id(db, conversation_id)
                if not conversation:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Conversation not found."
                    })
                    continue

                # Only the assigned agent can send messages.
                # Admin can view, but only assigned employee can send messages.
                if conversation.assigned_employee_id != employee_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "You are not assigned to this conversation."
                    })
                    continue

                # Save message
                message = await MessageService.create_message(
                    db=db,
                    conversation_id=conversation_id,
                    sender_type=SenderType.EMPLOYEE,
                    sender_id=employee_id,
                    message_text=message_text
                )
                
                enriched_msg = MessageService.enrich(message)
                event_data = {
                    "type": "message",
                    "message": enriched_msg.model_dump(mode="json")
                }

                # Send to visitor
                await manager.send_to_visitor(conversation_id, event_data)

                # Send to agent themselves (to sync multiple tabs)
                await manager.send_to_agent(employee_id, event_data)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS AGENT] Error: {e}")
    finally:
        manager.disconnect_agent(employee_id, websocket)

