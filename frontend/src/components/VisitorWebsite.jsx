import React from "react";
import VisitorChatWidget from "./VisitorChatWidget";

export default function VisitorWebsite() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-teal-500/20">
              T
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">TradeAdmin</span>
              <span className="text-xs text-teal-400 font-semibold ml-2 px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800/50">
                Visitor Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="/admin_login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all shadow-sm hover:text-white flex items-center space-x-1.5"
            >
              <span>Employee / Admin Portal</span>
              <span>➔</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-800/40 text-teal-300 text-xs font-bold mb-8 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>Real-Time Support Available 24/7</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl">
          Smart Customer Trading & Live Support Experience
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Welcome to our visitor portal! Need instant help or have queries regarding your trades, account, or services? Click the chat bubble in the bottom right corner to start a live conversation with an agent.
        </p>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-xl hover:border-teal-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-800/50 flex items-center justify-center text-teal-400 text-xl font-bold mb-4">
              💬
            </div>
            <h3 className="text-base font-bold text-white mb-2">Instant Chat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No registration or account creation needed. Enter your name and email to connect with an available agent instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-xl hover:border-purple-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800/50 flex items-center justify-center text-purple-400 text-xl font-bold mb-4">
              🔄
            </div>
            <h3 className="text-base font-bold text-white mb-2">Persistent History</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your chat session and message history are automatically remembered so you never lose context when revisiting the page.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-xl hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400 text-xl font-bold mb-4">
              ⚡
            </div>
            <h3 className="text-base font-bold text-white mb-2">Real-Time Routing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Queries are automatically queued and assigned to dedicated support employees for prompt resolutions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} TradeAdmin Platform. All rights reserved.</div>
          <div>
            <a href="/admin_login" className="text-slate-400 hover:text-teal-400 font-semibold transition-colors">
              Employee & Admin Login
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Live Visitor Chat Widget */}
      <VisitorChatWidget />
    </div>
  );
}
