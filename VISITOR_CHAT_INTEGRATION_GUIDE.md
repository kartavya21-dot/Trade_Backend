# Visitor Live Chat Integration Guide

This guide outlines how to build and integrate the **Visitor Chat Widget** into your main customer-facing website. It covers the required REST endpoints, WebSocket event specifications, session persistence rules, pre-chat registration form workflow, and a complete code example.

---

## 1. Core Architecture & Workflow

1. **Pre-Chat Form First**: When a visitor opens the chat widget for the first time, a **Pre-Chat Form** requests their **Full Name** and **Email Address** before initiating the chat session.
2. **Session Persistence**: Once submitted, the server returns a `visitor_uuid` and `conversation_id` which are saved in `localStorage`. Reusing these identifiers maintains their conversation history across page navigations and browser refreshes without requiring them to fill out the form again.
3. **Dual-Channel Setup**:
   - **HTTP REST API**: Used for starting sessions (`POST /chat/start`), fetching message history (`GET /conversations/{id}/messages?visitor_uuid={uuid}`), and updating visitor details (`POST /visitor/update`).
   - **WebSocket API**: Used for real-time bidirectional messaging (`ws://<host>/ws/visitor/{conversation_id}`) and receiving status notifications (e.g. agent assigned, conversation closed).

---

## 2. API Reference

> **Base Server URL**: `http://localhost:8006` (or your backend domain)  
> **WebSocket URL**: `ws://localhost:8006/ws/visitor/{conversation_id}`

### 2.1 REST Endpoints

#### A. Start / Resume Chat Session (Pre-Chat Submission)
- **Endpoint**: `POST /chat/start`
- **Request Body**:
```json
{
  "uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7", // Optional: Pass existing visitor_uuid from localStorage if available
  "name": "Jane Doe",                           // Required for first-time visitors
  "email": "jane@example.com",                   // Required for first-time visitors
  "phone": "+123456789"                          // Optional
}
```
- **Response (200 OK)**:
```json
{
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "visitor_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "display_name": "Jane Doe"
}
```

> 💡 **Save `visitor_uuid` and `conversation_id` in `localStorage` upon receiving this response.**

---

#### B. Fetch Message History
- **Endpoint**: `GET /conversations/{conversation_id}/messages?visitor_uuid={visitor_uuid}`
- **Query Parameter**: `visitor_uuid` (Recommended for visitors to verify conversation ownership)
- **Response (200 OK)**:
```json
[
  {
    "id": "e6815f84-223c-4b6c-acdf-ee29e7cb9824",
    "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sender_type": "VISITOR",
    "sender_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_name": "Jane Doe",
    "message": "Hello, I have a query regarding my order.",
    "created_at": "2026-07-23T13:10:52.000Z"
  },
  {
    "id": "0882799e-1438-40b7-8099-494cae2475ef",
    "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sender_type": "EMPLOYEE",
    "sender_id": "f5a5b991-1949-4320-be24-e861914bdef0",
    "sender_name": "Support Agent Alex",
    "message": "Hi Jane! I'd be happy to help you with that.",
    "created_at": "2026-07-23T13:11:05.000Z"
  }
]
```

---

#### C. Update Visitor Details
- **Endpoint**: `POST /visitor/update`
- **Request Body**:
```json
{
  "uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1987654321"
}
```

---

### 2.2 WebSocket Endpoint

- **Endpoint**: `ws://localhost:8006/ws/visitor/{conversation_id}`

#### A. Outgoing Visitor Message
Send raw JSON over the WebSocket connection:
```json
{
  "message": "Hello, are you still there?"
}
```

#### B. Incoming Server Events

1. **New Message Received (`message`)**:
   Sent when either the visitor sends a message (echo) or an agent replies.
```json
{
  "type": "message",
  "message": {
    "id": "abc123-...",
    "conversation_id": "3fa85f64-...",
    "sender_type": "EMPLOYEE",
    "sender_name": "Support Agent Alex",
    "message": "I have checked your order status.",
    "created_at": "2026-07-23T13:15:00.000Z"
  }
}
```

2. **Agent Assigned (`agent_assigned`)**:
   Sent when a support employee accepts the chat queue.
```json
{
  "type": "agent_assigned",
  "assigned_employee_id": "f5a5b991-...",
  "assigned_employee_name": "Support Agent Alex"
}
```

3. **Conversation Closed (`conversation_closed`)**:
   Sent when the support agent closes the chat session.
```json
{
  "type": "conversation_closed"
}
```

---

## 3. Ready-to-Use React Chat Widget Code

```jsx
import React, { useState, useEffect, useRef } from "react";

const API_BASE_URL = "http://localhost:8006";
const WS_BASE_URL = "ws://localhost:8006";

export default function VisitorChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(
    () => localStorage.getItem("visitor_conversation_id") || null
  );
  const [visitorUuid, setVisitorUuid] = useState(
    () => localStorage.getItem("visitor_uuid") || null
  );
  const [visitorName, setVisitorName] = useState(
    () => localStorage.getItem("visitor_name") || ""
  );
  const [visitorEmail, setVisitorEmail] = useState(
    () => localStorage.getItem("visitor_email") || ""
  );
  const [visitorPhone, setVisitorPhone] = useState(
    () => localStorage.getItem("visitor_phone") || ""
  );
  const [hasSubmittedForm, setHasSubmittedForm] = useState(
    () => !!localStorage.getItem("visitor_conversation_id")
  );

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [agentName, setAgentName] = useState(null);
  const [chatStatus, setChatStatus] = useState("DISCONNECTED"); // DISCONNECTED, CONNECTING, WAITING, ACTIVE, CLOSED
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, hasSubmittedForm]);

  // 1. Fetch message history for existing conversation
  const fetchHistory = async (convId, vUuid) => {
    try {
      const queryParam = vUuid ? `?visitor_uuid=${vUuid}` : "";
      const res = await fetch(`${API_BASE_URL}/conversations/${convId}/messages${queryParam}`);
      if (res.ok) {
        const history = await res.json();
        setMessages(history);
      }
    } catch (err) {
      console.error("Failed to fetch message history:", err);
    }
  };

  // 2. Pre-Chat Form submission handler
  const handleStartChatSession = async (e) => {
    if (e) e.preventDefault();
    if (!visitorName.trim() || !visitorEmail.trim()) return;

    try {
      setIsSubmittingForm(true);
      setChatStatus("CONNECTING");

      const res = await fetch(`${API_BASE_URL}/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: visitorUuid || undefined,
          name: visitorName.trim(),
          email: visitorEmail.trim(),
          phone: visitorPhone.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to start chat session");

      const data = await res.json();
      setConversationId(data.conversation_id);
      setVisitorUuid(data.visitor_uuid);
      setHasSubmittedForm(true);

      localStorage.setItem("visitor_conversation_id", data.conversation_id);
      localStorage.setItem("visitor_uuid", data.visitor_uuid);
      localStorage.setItem("visitor_name", visitorName.trim());
      localStorage.setItem("visitor_email", visitorEmail.trim());

      await fetchHistory(data.conversation_id, data.visitor_uuid);
    } catch (err) {
      console.error("Pre-chat submission error:", err);
      setChatStatus("DISCONNECTED");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // 3. Connect WebSocket when conversationId is available
  useEffect(() => {
    if (!conversationId || !hasSubmittedForm) return;

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
      } else if (data.type === "conversation_closed") {
        setChatStatus("CLOSED");
      }
    };

    ws.onclose = () => {
      setChatStatus((prev) => (prev === "CLOSED" ? "CLOSED" : "DISCONNECTED"));
    };

    return () => {
      if (ws) ws.close();
    };
  }, [conversationId, hasSubmittedForm]);

  // Handle open widget
  const handleToggleWidget = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && conversationId && hasSubmittedForm) {
      fetchHistory(conversationId, visitorUuid);
    }
  };

  // 4. Send Message over WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || chatStatus === "CLOSED") return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      handleStartChatSession();
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        message: inputText.trim(),
      })
    );
    setInputText("");
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, fontFamily: "sans-serif" }}>
      {/* Floating Trigger Button */}
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
          }}
        >
          💬
        </button>
      )}

      {/* Floating Panel */}
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
          {/* Header */}
          <div style={{ padding: "14px 18px", backgroundColor: "#27272a", borderBottom: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ display: "block", fontSize: 14, color: "#ffffff" }}>TradeAdmin Support</strong>
              <small style={{ color: "#a1a1aa", fontSize: 11 }}>
                {!hasSubmittedForm
                  ? "Pre-Chat Registration"
                  : chatStatus === "ACTIVE"
                  ? `Connected with ${agentName || "Agent"}`
                  : chatStatus === "WAITING"
                  ? "Waiting for an available agent..."
                  : "Conversation closed"}
              </small>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Pre-Chat Registration Form */}
          {!hasSubmittedForm ? (
            <form onSubmit={handleStartChatSession} style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#ffffff" }}>👋 Welcome to Support</h3>
                <p style={{ margin: 0, fontSize: 12, color: "#a1a1aa" }}>Please fill in your details below so our support team can assist you right away.</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: "bold", color: "#a1a1aa", marginBottom: 6 }}>FULL NAME *</label>
                <input type="text" required placeholder="e.g. Jane Doe" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", backgroundColor: "#27272a", border: "1px solid #3f3f46", color: "#ffffff", borderRadius: 10, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: "bold", color: "#a1a1aa", marginBottom: 6 }}>EMAIL ADDRESS *</label>
                <input type="email" required placeholder="e.g. jane@example.com" value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", backgroundColor: "#27272a", border: "1px solid #3f3f46", color: "#ffffff", borderRadius: 10, fontSize: 13 }} />
              </div>
              <button type="submit" disabled={isSubmittingForm || !visitorName.trim() || !visitorEmail.trim()} style={{ padding: "12px 16px", backgroundColor: "#0d9488", color: "#ffffff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
                {isSubmittingForm ? "Connecting..." : "Start Chatting →"}
              </button>
            </form>
          ) : (
            /* Active Chat Interface */
            <>
              <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ alignSelf: msg.sender_type === "VISITOR" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <div style={{ backgroundColor: msg.sender_type === "VISITOR" ? "#0d9488" : "#27272a", color: "#fff", padding: "10px 14px", borderRadius: 12, fontSize: 13 }}>{msg.message}</div>
                    <div style={{ fontSize: 9, color: "#71717a", marginTop: 4 }}>{msg.sender_name} • {formatTime(msg.created_at)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: 12, backgroundColor: "#27272a", display: "flex", gap: 8 }}>
                <input type="text" placeholder="Type your message..." value={inputText} onChange={(e) => setInputText(e.target.value)} style={{ flex: 1, padding: "10px 14px", backgroundColor: "#18181b", border: "1px solid #3f3f46", color: "#fff", borderRadius: 10, fontSize: 13 }} />
                <button type="submit" style={{ padding: "10px 16px", backgroundColor: "#0d9488", color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold" }}>Send</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Summary Checklist

- [x] Pre-Chat Registration Form requires Visitor Name & Email before session creation.
- [x] Initial request `POST /chat/start` sends `{ name, email, phone }`.
- [x] Save `visitor_uuid`, `visitor_name`, and `visitor_email` in `localStorage`.
- [x] Fetch history with `GET /conversations/{id}/messages?visitor_uuid={uuid}`.
- [x] Real-time bidirectional WebSocket connection to `ws://localhost:8006/ws/visitor/{id}`.
