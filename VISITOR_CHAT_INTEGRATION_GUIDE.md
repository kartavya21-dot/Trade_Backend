# Visitor Live Chat Integration Guide

This guide outlines how to integrate the **Visitor Chat Widget** into your customer-facing website. It explains the zero-friction anonymous session workflow, backend REST endpoints, WebSocket events, and provides a complete drop-in React component.

---

## 1. Core Architecture & Workflow

### 🚀 Zero Personal Info Required (Instant Anonymous Chat)
1. **Immediate Chat Access**: Visitors do **not** need to fill out any forms or provide personal information (no name, email, or phone required) to begin chatting.
2. **Unique Anonymous ID**: When a visitor starts a chat, the backend automatically generates a unique `visitor_uuid` and assigns them an anonymous display name based on their unique ID (e.g. `Visitor #7C9E66`).
3. **Session Persistence**: The returned `visitor_uuid` and `conversation_id` are saved in the visitor's browser `localStorage`. When the visitor navigates across pages or returns later, passing their stored `visitor_uuid` instantly restores their conversation and message history.
4. **Agent Updates Info Mid-Chat**: If the customer shares their personal details (name, email, phone) during the conversation, the support team can update the customer's record directly from the support dashboard (`POST /visitor/update`). The backend broadcasts this update in real-time, instantly reflecting the customer's real name across both the agent dashboard and visitor widget.
5. **Session Deletion & Reset**: If a support agent or admin permanently deletes a conversation, the visitor's widget receives a `conversation_deleted` WebSocket event, automatically cleans up `localStorage`, and is immediately ready to start a fresh anonymous session whenever the visitor sends their next message.

---

## 2. API Reference

> **Base Server URL**: `http://localhost:8000` (or your deployed backend URL, e.g. `https://your-backend.up.railway.app`)  
> **WebSocket URL**: `ws://localhost:8000/ws/visitor/{conversation_id}` (or `wss://your-backend.up.railway.app/ws/visitor/{conversation_id}`)

### 2.1 REST Endpoints

#### A. Start / Resume Anonymous Chat Session
- **Endpoint**: `POST /chat/start`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7" // Optional: Pass existing visitor_uuid from localStorage if available, or null for new visitors
}
```
*(No name, email, or phone is required.)*

- **Response (200 OK)**:
```json
{
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "visitor_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "display_name": "Visitor #7C9E66"
}
```

> 💡 **Store both `visitor_uuid` and `conversation_id` in `localStorage` upon receiving this response.**

---

#### B. Fetch Message History
- **Endpoint**: `GET /conversations/{conversation_id}/messages?visitor_uuid={visitor_uuid}`
- **Query Parameter**: `visitor_uuid` (Passed by visitor to verify conversation ownership)
- **Response (200 OK)**:
```json
[
  {
    "id": "e6815f84-223c-4b6c-acdf-ee29e7cb9824",
    "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sender_type": "VISITOR",
    "sender_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_name": "Visitor #7C9E66",
    "message": "Hi, I have a question about pricing.",
    "created_at": "2026-10-26T14:10:52.000Z"
  },
  {
    "id": "0882799e-1438-40b7-8099-494cae2475ef",
    "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sender_type": "EMPLOYEE",
    "sender_id": "f5a5b991-1949-4320-be24-e861914bdef0",
    "sender_name": "Support Agent Alex",
    "message": "Hello! I'd be glad to help with that.",
    "created_at": "2026-10-26T14:11:05.000Z"
  }
]
```

---

#### C. Update Visitor Details (Used by Support Agent)
- **Endpoint**: `POST /visitor/update`
- **Request Headers**: `Content-Type: application/json`, `Authorization: Bearer <agent_token>`
- **Request Body**:
```json
{
  "uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1987654321"
}
```
*When executed by an agent, the server automatically broadcasts a `visitor_updated` event to the visitor's socket and updates their display name across all dashboards.*

---

### 2.2 WebSocket Endpoint

- **Endpoint**: `ws://<backend_host>/ws/visitor/{conversation_id}`  
  *(Use `wss://` in production with HTTPS)*

#### A. Outgoing Visitor Message
Send raw JSON over the WebSocket connection:
```json
{
  "message": "Hello, are you available?"
}
```

#### B. Incoming Server Events

1. **New Message Received (`message`)**:
   Sent whenever a message is posted by the visitor (echo) or an agent replies.
```json
{
  "type": "message",
  "message": {
    "id": "abc123-...",
    "conversation_id": "3fa85f64-...",
    "sender_type": "EMPLOYEE",
    "sender_name": "Support Agent Alex",
    "message": "I can help you with that!",
    "created_at": "2026-10-26T14:15:00.000Z"
  }
}
```

2. **Agent Assigned (`agent_assigned`)**:
   Sent in real time when a support agent accepts the chat.
```json
{
  "type": "agent_assigned",
  "assigned_employee_id": "f5a5b991-...",
  "assigned_employee_name": "Support Agent Alex"
}
```

3. **Visitor Details Updated (`visitor_updated`)**:
   Sent when a support agent updates the visitor's personal info from the dashboard.
```json
{
  "type": "visitor_updated",
  "visitor": {
    "id": "123e4567-...",
    "uuid": "7c9e6679-...",
    "name": "Jane Doe",
    "display_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1987654321"
  }
}
```

4. **Conversation Deleted (`conversation_deleted`)**:
   Sent when an agent or admin permanently deletes the conversation.
```json
{
  "type": "conversation_deleted",
  "conversation_id": "3fa85f64-..."
}
```

---

## 3. Complete Drop-in React Chat Widget

Below is the complete, self-contained React chat widget component. It requires **no forms**, connects anonymously immediately, handles `localStorage` persistence, auto-scrolls, and listens to real-time status and message events.

```jsx
import React, { useState, useEffect, useRef } from "react";

// Replace with your backend URL
const API_BASE_URL = "http://localhost:8000";
const WS_BASE_URL = "ws://localhost:8000";

export default function VisitorChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(
    () => localStorage.getItem("visitor_conversation_id") || null
  );
  const [visitorUuid, setVisitorUuid] = useState(
    () => localStorage.getItem("visitor_uuid") || null
  );
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("visitor_display_name") || "You"
  );

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [agentName, setAgentName] = useState(null);
  const [chatStatus, setChatStatus] = useState("DISCONNECTED"); // DISCONNECTED, CONNECTING, WAITING, ACTIVE

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new message or open
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Reset session helper (used if conversation is deleted or invalidated)
  const resetSession = () => {
    localStorage.removeItem("visitor_conversation_id");
    localStorage.removeItem("visitor_uuid");
    localStorage.removeItem("visitor_display_name");
    setConversationId(null);
    setVisitorUuid(null);
    setDisplayName("You");
    setMessages([]);
    setAgentName(null);
    setChatStatus("DISCONNECTED");
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // 1. Fetch past message history
  const fetchHistory = async (convId, vUuid) => {
    try {
      const queryParam = vUuid ? `?visitor_uuid=${vUuid}` : "";
      const res = await fetch(`${API_BASE_URL}/conversations/${convId}/messages${queryParam}`);
      if (res.ok) {
        const history = await res.json();
        setMessages(history);
      } else if (res.status === 404 || res.status === 401 || res.status === 403) {
        // Conversation deleted or invalid UUID — reset session cleanly
        resetSession();
      }
    } catch (err) {
      console.error("Failed to fetch message history:", err);
    }
  };

  // 2. Start or resume anonymous chat session
  const startOrResumeChat = async () => {
    try {
      setChatStatus("CONNECTING");
      const currentUuid = visitorUuid || localStorage.getItem("visitor_uuid");

      const res = await fetch(`${API_BASE_URL}/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: currentUuid || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to start chat session");

      const data = await res.json();
      setConversationId(data.conversation_id);
      setVisitorUuid(data.visitor_uuid);
      setDisplayName(data.display_name || "You");

      localStorage.setItem("visitor_conversation_id", data.conversation_id);
      localStorage.setItem("visitor_uuid", data.visitor_uuid);
      if (data.display_name) {
        localStorage.setItem("visitor_display_name", data.display_name);
      }

      await fetchHistory(data.conversation_id, data.visitor_uuid);
    } catch (err) {
      console.error("Chat initialization error:", err);
      setChatStatus("DISCONNECTED");
    }
  };

  // 3. Connect WebSocket when conversationId is available
  useEffect(() => {
    if (!conversationId) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/visitor/${conversationId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setChatStatus((prev) => (prev === "ACTIVE" ? "ACTIVE" : "WAITING"));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      } else if (data.type === "agent_assigned") {
        setAgentName(data.assigned_employee_name);
        setChatStatus("ACTIVE");
      } else if (data.type === "visitor_updated") {
        // Support agent updated visitor details from dashboard
        if (data.visitor?.display_name) {
          setDisplayName(data.visitor.display_name);
          localStorage.setItem("visitor_display_name", data.visitor.display_name);
        }
      } else if (data.type === "conversation_deleted") {
        // Conversation deleted by agent — reset session for a fresh start
        resetSession();
      }
    };

    ws.onclose = () => {
      setChatStatus("DISCONNECTED");
    };

    return () => {
      if (ws) ws.close();
    };
  }, [conversationId]);

  // Handle open / toggle widget
  const handleToggleWidget = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      if (!conversationId) {
        startOrResumeChat();
      } else {
        fetchHistory(conversationId, visitorUuid);
      }
    }
  };

  // 4. Send Message over WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startOrResumeChat();
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        message: inputText.trim(),
      })
    );
    setInputText("");
  };

  const formatTime = (timeStr) => {
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, fontFamily: "sans-serif" }}>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={handleToggleWidget}
          style={{
            backgroundColor: "#0d9488",
            color: "#ffffff",
            border: "none",
            borderRadius: "50%",
            width: 60,
            height: 60,
            cursor: "pointer",
            fontSize: 26,
            boxShadow: "0 8px 24px rgba(13, 148, 136, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Chat with Support"
        >
          💬
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          style={{
            width: 360,
            height: 520,
            backgroundColor: "#18181b",
            color: "#f4f4f5",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            border: "1px solid #27272a",
            overflow: "hidden",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "#27272a",
              borderBottom: "1px solid #3f3f46",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                🎧
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 14, color: "#ffffff" }}>
                  Live Support
                </strong>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor:
                        chatStatus === "ACTIVE"
                          ? "#22c55e"
                          : chatStatus === "WAITING"
                          ? "#eab308"
                          : "#9ca3af",
                    }}
                  />
                  <small style={{ color: "#a1a1aa", fontSize: 11 }}>
                    {chatStatus === "ACTIVE"
                      ? `Connected with ${agentName || "Agent"}`
                      : chatStatus === "WAITING"
                      ? "Waiting for an agent..."
                      : "Connecting..."}
                  </small>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 18 }}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#71717a", fontSize: 13, marginTop: 50, lineHeight: 1.5 }}>
                👋 Welcome! <br />
                How can we help you today? Type a message below to start chatting with our team.
              </div>
            ) : (
              messages.map((msg) => {
                const isVisitor = msg.sender_type === "VISITOR";
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isVisitor ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isVisitor ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: isVisitor ? "#0d9488" : "#27272a",
                        color: isVisitor ? "#ffffff" : "#e4e4e7",
                        padding: "10px 14px",
                        borderRadius: isVisitor ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        fontSize: 13,
                        lineHeight: 1.4,
                        border: isVisitor ? "none" : "1px solid #3f3f46",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.message}
                    </div>
                    <div style={{ fontSize: 9, color: "#71717a", marginTop: 4, padding: "0 2px" }}>
                      {isVisitor ? displayName : msg.sender_name || "Agent"} • {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: 12,
              backgroundColor: "#27272a",
              borderTop: "1px solid #3f3f46",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                color: "#ffffff",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                padding: "10px 16px",
                backgroundColor: !inputText.trim() ? "#3f3f46" : "#0d9488",
                color: !inputText.trim() ? "#71717a" : "#ffffff",
                border: "none",
                borderRadius: 10,
                cursor: !inputText.trim() ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: 13,
                transition: "background-color 0.2s ease",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Summary Checklist for Integration

- [x] **No forms**: Calling `POST /chat/start` with `{}` or `{ "uuid": stored_uuid }` creates/resumes the session.
- [x] **Local Persistence**: Save `visitor_uuid` in `localStorage` to reuse across tabs and reloads.
- [x] **Agent Updates Info**: Support agent can update visitor's details at any time using `POST /visitor/update`.
- [x] **Live Updates**: Widget listens to `visitor_updated` WebSocket event to update the visitor's name in real time.
- [x] **Instant Reset on Deletion**: Widget listens to `conversation_deleted` WebSocket event to clean up `localStorage` and reset session state cleanly.
