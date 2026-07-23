import uuid
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps conversation_id (UUID) -> list of active WebSocket connections
        self.visitor_connections: Dict[uuid.UUID, List[WebSocket]] = {}
        # Maps employee_id (UUID) -> list of active WebSocket connections
        self.agent_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect_visitor(self, conversation_id: uuid.UUID, websocket: WebSocket):
        """Accept visitor WebSocket and register the connection"""
        await websocket.accept()
        if conversation_id not in self.visitor_connections:
            self.visitor_connections[conversation_id] = []
        self.visitor_connections[conversation_id].append(websocket)

    def disconnect_visitor(self, conversation_id: uuid.UUID, websocket: WebSocket):
        """Unregister visitor WebSocket"""
        if conversation_id in self.visitor_connections:
            if websocket in self.visitor_connections[conversation_id]:
                self.visitor_connections[conversation_id].remove(websocket)
            if not self.visitor_connections[conversation_id]:
                del self.visitor_connections[conversation_id]

    async def connect_agent(self, employee_id: uuid.UUID, websocket: WebSocket):
        """Register agent WebSocket (websocket already accepted by the endpoint)"""
        if employee_id not in self.agent_connections:
            self.agent_connections[employee_id] = []
        self.agent_connections[employee_id].append(websocket)

    def disconnect_agent(self, employee_id: uuid.UUID, websocket: WebSocket):
        """Unregister agent WebSocket"""
        if employee_id in self.agent_connections:
            if websocket in self.agent_connections[employee_id]:
                self.agent_connections[employee_id].remove(websocket)
            if not self.agent_connections[employee_id]:
                del self.agent_connections[employee_id]

    async def send_to_visitor(self, conversation_id: uuid.UUID, event: dict):
        """Send JSON message payload to all connections of a specific conversation"""
        print(f"[MANAGER] send_to_visitor called for conversation: {conversation_id}")
        if conversation_id in self.visitor_connections:
            print(f"[MANAGER] Found conversation in visitor_connections. Count: {len(self.visitor_connections[conversation_id])}")
            for connection in list(self.visitor_connections[conversation_id]):
                try:
                    await connection.send_json(event)
                    print(f"[MANAGER] Sent successfully to visitor socket.")
                except Exception as e:
                    print(f"[MANAGER] send_to_visitor exception: {e}")
                    # Remove dead connections gracefully
                    self.disconnect_visitor(conversation_id, connection)
        else:
            print(f"[MANAGER] Conversation {conversation_id} not found in active visitor connections!")

    async def send_to_agent(self, employee_id: uuid.UUID, event: dict):
        """Send JSON message payload to all active sockets of a specific employee"""
        print(f"[MANAGER] send_to_agent called for employee: {employee_id}")
        if employee_id in self.agent_connections:
            print(f"[MANAGER] Found employee in agent_connections. Count: {len(self.agent_connections[employee_id])}")
            for connection in list(self.agent_connections[employee_id]):
                try:
                    await connection.send_json(event)
                    print(f"[MANAGER] Sent successfully to agent socket.")
                except Exception as e:
                    print(f"[MANAGER] send_to_agent exception: {e}")
                    # Remove dead connections gracefully
                    self.disconnect_agent(employee_id, connection)
        else:
            print(f"[MANAGER] Employee {employee_id} not found in active agent connections!")

    async def broadcast_to_agents(self, event: dict):
        """Broadcast JSON message payload to all connected employees/admins"""
        print(f"[MANAGER] broadcast_to_agents called.")
        for employee_id, connections in list(self.agent_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_json(event)
                    print(f"[MANAGER] Broadcasted successfully to employee {employee_id}.")
                except Exception as e:
                    print(f"[MANAGER] broadcast_to_agents exception for {employee_id}: {e}")
                    # Remove dead connections gracefully
                    self.disconnect_agent(employee_id, connection)

# Singleton manager instance
manager = ConnectionManager()
