import React from "react";

export default function Sidebar({
  waitingChats,
  activeChats,
  closedChats,
  selectedChatId,
  onSelectChat,
  activeTab,
  setActiveTab,
  role,
  employeeName,
  onLogout
}) {
  const getBadgeCount = (list) => (list ? list.length : 0);

  const getInitials = (name) => {
    if (!name) return "V";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  const getChatList = () => {
    switch (activeTab) {
      case "waiting":
        return waitingChats;
      case "active":
        return activeChats;
      case "closed":
        return closedChats;
      default:
        return [];
    }
  };

  const chats = getChatList();

  return (
    <div className="w-80 bg-cardbg border-r border-cardborder flex flex-col h-full">
      {/* Employee Profile Header */}
      <div className="p-4 border-b border-cardborder flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accentTeal to-accentViolet flex items-center justify-center text-darkbg font-bold">
            {getInitials(employeeName)}
          </div>
          <div className="overflow-hidden">
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

      {/* Tabs Selector */}
      <div className="grid grid-cols-3 border-b border-cardborder bg-darkbg/25 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("waiting")}
          className={`py-3 text-center border-b-2 relative transition-all ${
            activeTab === "waiting" 
              ? "border-accentTeal text-accentTeal bg-darkbg/10" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Waiting
          {getBadgeCount(waitingChats) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-accentTeal text-darkbg font-bold">
              {getBadgeCount(waitingChats)}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`py-3 text-center border-b-2 relative transition-all ${
            activeTab === "active" 
              ? "border-accentTeal text-accentTeal bg-darkbg/10" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          My Chats
          {getBadgeCount(activeChats) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-accentViolet text-darkbg font-bold">
              {getBadgeCount(activeChats)}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`py-3 text-center border-b-2 relative transition-all ${
            activeTab === "closed" 
              ? "border-accentTeal text-accentTeal bg-darkbg/10" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Closed
        </button>
      </div>

      {/* Admin Panel Tab Toggle */}
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
            Click on settings panel on the right.
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
              {/* Status Indicator */}
              <div className="relative">
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
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-cardbg"></span>
                )}
              </div>

              {/* Chat details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold truncate text-white">
                    {chat.visitor_display_name}
                  </h4>
                  <span className="text-[10px] text-gray-500">
                    {formatTime(chat.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {chat.visitor_email || "No email provided"}
                </p>
                {chat.status === "ACTIVE" && chat.assigned_employee_name && (
                  <p className="text-[9px] text-accentViolet font-semibold mt-1">
                    Assigned: {chat.assigned_employee_name}
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
