import React, { useState, useEffect, useRef } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import VisitorDetails from "./components/VisitorDetails";
import EmployeeManager from "./components/EmployeeManager";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null"),
  );

  // Chat queues
  const [waitingChats, setWaitingChats] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [allChats, setAllChats] = useState([]); // Admin only

  // Selection states
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("waiting"); // waiting, active, closed, all, employees
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); // { [chatId]: number }

  const wsRef = useRef(null);
  const selectedChatIdRef = useRef(null);

  // ── Notification sound using Web Audio API (no external file needed) ──────
  const playNotification = (type = "message") => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);

      if (type === "message") {
        // Gentle 3-stage descending chime for incoming message (~0.75s)
        o.type = "sine";
        o.frequency.setValueAtTime(740, ctx.currentTime);
        o.frequency.setValueAtTime(620, ctx.currentTime + 0.15);
        o.frequency.setValueAtTime(520, ctx.currentTime + 0.35);
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.setValueAtTime(0.22, ctx.currentTime + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.75);
      } else {
        // Two-tone ascending chime for new visitor chat (~0.45s)
        o.type = "triangle";
        o.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        o.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      // Web Audio not available — silent fail
    }
  };

  // Sync ref with selectedChatId state to prevent stale closures in WebSocket callbacks
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Helper to get active selected chat metadata
  const getActiveChat = () => {
    if (!selectedChatId) return null;
    return (
      activeChats.find((c) => c.id === selectedChatId) ||
      waitingChats.find((c) => c.id === selectedChatId) ||
      allChats.find((c) => c.id === selectedChatId)
    );
  };

  const activeChat = getActiveChat();

  const handleLoginSuccess = (data) => {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setSelectedChatId(null);
    setMessages([]);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Fetch conversations queues
  const fetchQueues = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch waiting
      const resWaiting = await fetch("/conversations/waiting", { headers });
      if (resWaiting.ok) setWaitingChats(await resWaiting.json());

      // 2. Fetch assigned active
      const resAssigned = await fetch("/conversations/assigned", { headers });
      if (resAssigned.ok) setActiveChats(await resAssigned.json());

      // 3. Fetch all if admin, otherwise we only show active/waiting/closed
      if (user?.role === "ADMIN") {
        const resAll = await fetch("/conversations/all", { headers });
        if (resAll.ok) {
          const allData = await resAll.json();
          setAllChats(allData);
          setClosedChats(allData.filter((c) => c.status === "CLOSED"));
        }
      } else {
        // For standard employees, closed conversations can be filtered from local state or fetch last active
        // Let's fallback to filtering closed from any loaded lists, or in a real production env, fetch them.
        // We will mock fetching closed list or query the database.
        // Actually, since there is no custom GET /conversations/closed endpoint in backend, and GET /conversations/all is Admin only,
        // we can fetch all conversations assigned to employee and filter, or fetch all from backend if supported.
        // Let's look at the endpoints: GET /conversations/assigned returns active chats assigned to the employee.
        // To show closed chats for employees, we can filter them out from local state, or query historical list.
      }
    } catch (e) {
      console.error("Failed to fetch queues:", e);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (chatId) => {
    if (!token || !chatId) return;
    try {
      const res = await fetch(`/conversations/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  useEffect(() => {
    if (selectedChatId) {
      setUnreadCounts((prev) => {
        if (!prev[selectedChatId]) return prev;
        const next = { ...prev };
        delete next[selectedChatId];
        return next;
      });
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  // Handle Websocket connect
  useEffect(() => {
    if (!token) return;

    fetchQueues();

    // Setup Websocket
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${wsProtocol}//${host}/ws/agent?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to agent server");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      if (data.type === "new_conversation") {
        // Add to waiting list if not already present
        setWaitingChats((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [...prev, data.conversation];
        });
        // Also add to allChats for admin
        setAllChats((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
        // Increment unread count if not currently open
        if (data.conversation.id !== selectedChatIdRef.current) {
          setUnreadCounts((prev) => ({
            ...prev,
            [data.conversation.id]: (prev[data.conversation.id] || 0) + 1,
          }));
        }
        playNotification("new_chat");
      } else if (data.type === "conversation_updated") {
        const updatedConv = data.conversation;

        // 1. Update waiting list
        setWaitingChats((prev) => {
          if (updatedConv.status !== "WAITING") {
            return prev.filter((c) => c.id !== updatedConv.id);
          }
          return prev.map((c) => (c.id === updatedConv.id ? updatedConv : c));
        });

        // 2. Update active chats (assigned to me)
        setActiveChats((prev) => {
          if (
            updatedConv.status === "ACTIVE" &&
            updatedConv.assigned_employee_id === user?.employee_id
          ) {
            if (!prev.some((c) => c.id === updatedConv.id)) {
              return [updatedConv, ...prev];
            }
            return prev.map((c) => (c.id === updatedConv.id ? updatedConv : c));
          }
          return prev.filter((c) => c.id !== updatedConv.id);
        });

        // 3. Update Admin all chats list
        setAllChats((prev) => {
          if (!prev.some((c) => c.id === updatedConv.id)) {
            return [updatedConv, ...prev];
          }
          return prev.map((c) => (c.id === updatedConv.id ? updatedConv : c));
        });

        // Update selected chat details if currently viewed
        if (selectedChatIdRef.current === updatedConv.id) {
          // If status changes or visitor metadata changes, it will sync automatically
        }
      } else if (data.type === "message") {
        const msg = data.message;
        // Check if message belongs to active chat, if so append to log
        if (msg.conversation_id === selectedChatIdRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (msg.sender_type === "VISITOR") {
          // Increment unread count for chats that are not currently focused
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
          }));
        }
        // Play sound for incoming messages from visitors (not echoes of own sends)
        if (msg.sender_type === "VISITOR") {
          playNotification("message");
        }
      } else if (data.type === "visitor_updated") {
        // Visitor profile renamed or email changed, update local cache
        const v = data.visitor;
        const updater = (conv) => {
          if (conv.visitor_id === v.id) {
            return {
              ...conv,
              visitor_name: v.name,
              visitor_display_name: v.display_name,
              visitor_phone: v.phone,
              visitor_email: v.email,
            };
          }
          return conv;
        };

        setWaitingChats((prev) => prev.map(updater));
        setActiveChats((prev) => prev.map(updater));
        setAllChats((prev) => prev.map(updater));
      } else if (data.type === "conversation_deleted") {
        const deletedId = data.conversation_id;
        // Remove from all queues immediately
        setWaitingChats((prev) => prev.filter((c) => c.id !== deletedId));
        setActiveChats((prev) => prev.filter((c) => c.id !== deletedId));
        setAllChats((prev) => prev.filter((c) => c.id !== deletedId));
        setUnreadCounts((prev) => {
          if (!prev[deletedId]) return prev;
          const next = { ...prev };
          delete next[deletedId];
          return next;
        });
        // Deselect if currently viewing the deleted conversation
        if (selectedChatIdRef.current === deletedId) {
          setSelectedChatId(null);
          setMessages([]);
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (ws) ws.close();
    };
  }, [token]);

  const handleSendMessage = (text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          conversation_id: selectedChatId,
          message: text,
        }),
      );
    }
  };

  const handleAcceptChat = async (chatId) => {
    try {
      const res = await fetch(`/conversations/${chatId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Optimistically remove from the waiting queue immediately for snappy UX.
        // The WebSocket "conversation_updated" event will handle adding it to activeChats
        // with its built-in duplicate guard — doing it here too causes a double-render
        // due to React state closure timing between the fetch and the WS callback.
        setWaitingChats((prev) => prev.filter((c) => c.id !== chatId));
        setSelectedChatId(chatId);
        setActiveTab("active");
      }
    } catch (e) {
      console.error(e);
    }
  };


  const handleDeleteConversation = async (chatId) => {
    if (
      !window.confirm(
        "Permanently delete this conversation and all its messages? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch(`/conversations/${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Remove from all local queues
        setWaitingChats((prev) => prev.filter((c) => c.id !== chatId));
        setActiveChats((prev) => prev.filter((c) => c.id !== chatId));
        setClosedChats((prev) => prev.filter((c) => c.id !== chatId));
        setAllChats((prev) => prev.filter((c) => c.id !== chatId));
        // Deselect if currently viewing
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
          setMessages([]);
        }
      } else {
        const err = await res.json();
        alert(err.detail || "Delete failed.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateVisitor = async (payload) => {
    try {
      const res = await fetch("/visitor/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedVisitor = await res.json();

        // Broadcast updates trigger ws event, but we can proactively update UI fields
        const updater = (c) => {
          if (
            c.visitor_uuid === payload.uuid ||
            c.visitor_id === updatedVisitor.id
          ) {
            return {
              ...c,
              visitor_name: updatedVisitor.name,
              visitor_phone: updatedVisitor.phone,
              visitor_email: updatedVisitor.email,
              visitor_display_name:
                updatedVisitor.name || c.visitor_display_name,
            };
          }
          return c;
        };

        setWaitingChats((prev) => prev.map(updater));
        setActiveChats((prev) => prev.map(updater));
        setClosedChats((prev) => prev.map(updater));
        setAllChats((prev) => prev.map(updater));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isEmployeesView = activeTab === "employees" && user?.role === "ADMIN";

  return (
    <div className="flex h-screen bg-darkbg text-gray-100 overflow-hidden">
      {/* 1. Sidebar Queue Controls */}
      <Sidebar
        waitingChats={waitingChats}
        activeChats={activeChats}
        closedChats={closedChats}
        allChats={allChats}
        selectedChatId={selectedChatId}
        onSelectChat={(chatId) => {
          setSelectedChatId(chatId);
          if (chatId) {
            setUnreadCounts((prev) => {
              if (!prev[chatId]) return prev;
              const next = { ...prev };
              delete next[chatId];
              return next;
            });
          }
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={user?.role}
        employeeName={user?.employee_name}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        unreadCounts={unreadCounts}
      />

      {/* 2. Center Panel: Active Chat Workspace or CRUD Account Config */}
      {isEmployeesView ? (
        <EmployeeManager token={token} />
      ) : (
        <ChatArea
          activeChat={activeChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onAcceptChat={handleAcceptChat}
          onDeleteConversation={handleDeleteConversation}
          employeeId={user?.employee_id}
          role={user?.role}
        />
      )}

      {/* 3. Right Panel: Active Visitor Details Context (hidden during CRUD settings) */}
      {!isEmployeesView && activeChat && (
        <VisitorDetails
          activeChat={activeChat}
          onUpdateVisitor={handleUpdateVisitor}
        />
      )}
    </div>
  );
}
