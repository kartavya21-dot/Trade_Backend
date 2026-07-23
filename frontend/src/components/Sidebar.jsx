import React, { useState } from "react";

export default function Sidebar({
  waitingChats,
  activeChats,
  closedChats,
  allChats,
  selectedChatId,
  onSelectChat,
  activeTab,
  setActiveTab,
  role,
  employeeName,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
}) {
  const getBadgeCount = (list) => (list ? list.length : 0);

  const getInitials = (name) => {
    if (!name) return "V";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  const getChatList = () => {
    switch (activeTab) {
      case "waiting":  return waitingChats  || [];
      case "active":   return activeChats   || [];
      case "closed":   return closedChats   || [];
      case "all":      return allChats      || [];
      default:         return [];
    }
  };

  const chats = getChatList();

  // ── Collapsed sidebar ────────────────────────────────────────────────────────
  if (!sidebarOpen) {
    return (
      <div className="w-14 bg-cardbg border-r border-cardborder flex flex-col h-full items-center py-3 space-y-2 transition-all duration-300">
        {/* Expand button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-accentTeal hover:bg-darkbg/50 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-accentTeal to-accentViolet flex items-center justify-center text-darkbg font-bold text-xs">
          {getInitials(employeeName)}
        </div>

        <div className="flex-1" />

        {/* Tab icon buttons */}
        {[
          { tab: "waiting", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", badge: getBadgeCount(waitingChats), title: "Waiting" },
          { tab: "active",  icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", badge: getBadgeCount(activeChats), title: "My Active Chats" },
          { tab: "closed",  icon: "M5 13l4 4L19 7", title: "Closed" },
        ].map(({ tab, icon, badge, title }) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSidebarOpen(true); }}
            title={title}
            className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === tab ? "text-accentTeal bg-accentTeal/10" : "text-gray-500 hover:text-white hover:bg-darkbg/40"
            }`}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            {badge > 0 && (
              <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-accentTeal" />
            )}
          </button>
        ))}

        {role === "ADMIN" && (
          <button
            onClick={() => { setActiveTab("all"); setSidebarOpen(true); }}
            title="All Chats"
            className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === "all" ? "text-purple-300 bg-purple-950/30" : "text-gray-500 hover:text-white hover:bg-darkbg/40"
            }`}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h7" />
            </svg>
          </button>
        )}

        {role === "ADMIN" && (
          <button
            onClick={() => { setActiveTab("employees"); setSidebarOpen(true); }}
            title="Manage Employees"
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === "employees" ? "text-purple-300 bg-purple-950/30" : "text-gray-500 hover:text-white hover:bg-darkbg/40"
            }`}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={onLogout}
          title="Sign Out"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-darkbg/50 transition-colors"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Expanded sidebar ─────────────────────────────────────────────────────────
  return (
    <div className="w-80 bg-cardbg border-r border-cardborder flex flex-col h-full transition-all duration-300">

      {/* Profile Header */}
      <div className="p-4 border-b border-cardborder flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-accentTeal to-accentViolet flex items-center justify-center text-darkbg font-bold">
            {getInitials(employeeName)}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{employeeName}</h3>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
              role === "ADMIN"
                ? "bg-purple-950/60 border border-purple-800/40 text-purple-300"
                : "bg-teal-950/60 border border-teal-800/40 text-teal-300"
            }`}>
              {role}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Collapse button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-accentTeal p-1.5 rounded-lg hover:bg-darkbg/50 transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-darkbg/50 transition-colors"
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className={`grid border-b border-cardborder bg-darkbg/25 text-xs font-semibold ${role === "ADMIN" ? "grid-cols-4" : "grid-cols-3"}`}>
        {[
          { tab: "waiting", label: "Waiting",   badge: getBadgeCount(waitingChats), color: "accentTeal" },
          { tab: "active",  label: "My Chats",  badge: getBadgeCount(activeChats),  color: "accentViolet" },
          { tab: "closed",  label: "Closed",    badge: 0,                            color: "accentTeal" },
        ].map(({ tab, label, badge, color }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-center border-b-2 relative transition-all ${
              activeTab === tab
                ? "border-accentTeal text-accentTeal bg-darkbg/10"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {label}
            {badge > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-${color} text-darkbg font-bold`}>
                {badge}
              </span>
            )}
          </button>
        ))}

        {role === "ADMIN" && (
          <button
            onClick={() => setActiveTab("all")}
            className={`py-3 text-center border-b-2 relative transition-all ${
              activeTab === "all"
                ? "border-purple-400 text-purple-300 bg-darkbg/10"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            All
            {getBadgeCount(allChats) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-purple-700 text-white font-bold">
                {getBadgeCount(allChats)}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Admin sub-tabs */}
      {role === "ADMIN" && (
        <button
          onClick={() => setActiveTab("employees")}
          className={`p-3 border-b border-cardborder text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
            activeTab === "employees"
              ? "bg-purple-950/20 text-purple-300 border-l-4 border-l-accentViolet"
              : "text-gray-400 hover:text-white hover:bg-darkbg/10"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Manage Employees</span>
        </button>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-darkbg/10">
        {activeTab === "employees" ? (
          <div className="text-center text-xs text-gray-400 py-8">
            Configure employee accounts on the right panel.
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-12 flex flex-col items-center justify-center">
            <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>No conversations here</span>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start space-x-3 border ${
                selectedChatId === chat.id
                  ? "bg-accentTeal/10 border-accentTeal/30 text-white"
                  : "bg-transparent border-transparent hover:bg-cardborder/40 text-gray-300"
              }`}
            >
              {/* Avatar + status dot */}
              <div className="relative flex-shrink-0">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  chat.status === "WAITING"
                    ? "bg-yellow-950/60 border border-yellow-800/40 text-yellow-300"
                    : chat.status === "ACTIVE"
                    ? "bg-teal-950/60 border border-teal-800/40 text-teal-300"
                    : "bg-cardborder border border-cardborder text-gray-400"
                }`}>
                  {getInitials(chat.visitor_display_name)}
                </div>
                {chat.status === "ACTIVE" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-cardbg" />
                )}
                {chat.status === "WAITING" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-yellow-400 border-2 border-cardbg animate-pulse" />
                )}
              </div>

              {/* Chat details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold truncate text-white">
                    {chat.visitor_display_name}
                  </h4>
                  <span className="text-[10px] text-gray-500 flex-shrink-0 ml-1">
                    {formatTime(chat.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {chat.visitor_email || "No email provided"}
                </p>

                {/* Assignment info — show on All tab or Active tab */}
                {chat.status === "ACTIVE" && chat.assigned_employee_name && (
                  <p className="text-[9px] text-accentViolet font-semibold mt-1 truncate">
                    Agent: {chat.assigned_employee_name}
                  </p>
                )}
                {chat.status === "WAITING" && (
                  <p className="text-[9px] text-yellow-500 font-semibold mt-1">
                    Awaiting agent
                  </p>
                )}
                {chat.status === "CLOSED" && chat.assigned_employee_name && (
                  <p className="text-[9px] text-gray-500 mt-1 truncate">
                    Handled by: {chat.assigned_employee_name}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
