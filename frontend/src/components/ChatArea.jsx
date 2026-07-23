import React, { useState, useEffect, useRef } from "react";

export default function ChatArea({
  activeChat,
  messages,
  onSendMessage,
  onAcceptChat,
  onCloseChat,
  employeeId,
  role
}) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  };

  const formatMsgTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 bg-darkbg flex flex-col items-center justify-center text-center p-8">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accentTeal to-accentViolet rounded-full blur opacity-15 animate-pulse"></div>
          <div className="relative bg-cardbg border border-cardborder h-24 w-24 rounded-full flex items-center justify-center text-gray-500 mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-accentTeal" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.083.29.13.597.13.916 0 1.634-1.013 3.014-2.437 3.562l-1.078.415a3.375 3.375 0 01-4.228-2.28L12.5 8.5l-.25-.333m8.0 8.5H19.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to TradeAdmin Live Support</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Select a chat conversation from the left sidebar to start messaging in real-time or accept incoming queries.
        </p>
      </div>
    );
  }

  // Perm checks
  const isWaiting = activeChat.status === "WAITING";
  const isActive = activeChat.status === "ACTIVE";
  const isClosed = activeChat.status === "CLOSED";
  const isAssignedToMe = activeChat.assigned_employee_id === employeeId;
  const canSend = isActive && isAssignedToMe;
  const canClose = isActive && (isAssignedToMe || role === "ADMIN");

  return (
    <div className="flex-1 bg-darkbg flex flex-col h-full">
      {/* Active Chat Header */}
      <div className="px-6 py-4 border-b border-cardborder bg-cardbg flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-bold text-white truncate">
              {activeChat.visitor_display_name}
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isWaiting
                ? "bg-yellow-950/60 border border-yellow-800/40 text-yellow-300"
                : isActive
                ? "bg-green-950/60 border border-green-800/40 text-green-300"
                : "bg-red-950/60 border border-red-800/40 text-red-300"
            }`}>
              {activeChat.status}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {isWaiting 
              ? "Waiting for an agent to accept..."
              : `Assigned Agent: ${activeChat.assigned_employee_name || "Unassigned"}`
            }
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isWaiting && (
            <button
              onClick={() => onAcceptChat(activeChat.id)}
              className="bg-gradient-to-r from-accentTeal to-accentViolet text-darkbg hover:opacity-90 font-semibold px-4 py-2 rounded-xl text-xs shadow-lg transition-opacity"
            >
              Accept Chat
            </button>
          )}

          {canClose && (
            <button
              onClick={() => onCloseChat(activeChat.id)}
              className="bg-red-950/60 border border-red-800/40 text-red-300 hover:bg-red-900/40 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Close Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs py-12">
            <span className="bg-cardborder/40 border border-cardborder px-3 py-1.5 rounded-full">
              No messages in this chat yet.
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === "EMPLOYEE" && msg.sender_employee_id === employeeId;
            const isEmployee = msg.sender_type === "EMPLOYEE";
            
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Bubble Container */}
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                  isMe
                    ? "bg-gradient-to-tr from-accentTeal to-accentViolet text-darkbg rounded-tr-none font-medium"
                    : isEmployee
                    ? "bg-purple-900/30 border border-purple-800/30 text-purple-200 rounded-tl-none"
                    : "bg-cardbg border border-cardborder text-gray-200 rounded-tl-none"
                }`}>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
                
                {/* Message Meta Info */}
                <div className="flex items-center space-x-1.5 mt-1 text-[9px] text-gray-500 px-1">
                  <span>{msg.sender_name}</span>
                  <span>•</span>
                  <span>{formatMsgTime(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Panel */}
      <div className="p-4 border-t border-cardborder bg-cardbg/40">
        <form onSubmit={handleSend} className="relative flex items-center bg-darkbg border border-cardborder rounded-2xl p-1.5">
          <textarea
            rows="1"
            className="flex-1 bg-transparent text-white focus:outline-none placeholder-gray-500 text-xs px-3 py-2 resize-none max-h-24 disabled:opacity-40"
            placeholder={
              isClosed
                ? "This conversation is closed."
                : isWaiting
                ? "Accept the chat to start writing messages."
                : !isAssignedToMe
                ? "Only the assigned agent can reply."
                : "Type a reply... (Enter to send)"
            }
            disabled={!canSend}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            type="submit"
            disabled={!canSend || !inputText.trim()}
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
              canSend && inputText.trim()
                ? "bg-gradient-to-tr from-accentTeal to-accentViolet text-darkbg cursor-pointer hover:scale-105"
                : "bg-cardborder text-gray-600 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
