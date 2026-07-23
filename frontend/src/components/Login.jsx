import React, { useState } from "react";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed");
      }

      const data = await response.json();
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-darkbg overflow-hidden px-4">
      {/* Background design glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-accentTeal opacity-10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accentViolet opacity-10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-cardbg border border-cardborder rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              <span className="bg-gradient-to-r from-accentTeal to-accentViolet bg-clip-text text-transparent">
                TradeAdmin
              </span>{" "}
              Chat
            </h1>
            <p className="text-gray-400 text-sm">
              Log in to access support queues & live conversations
            </p>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg p-3 text-sm mb-6 flex items-start space-x-2">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full bg-darkbg border border-cardborder text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal focus:border-accentTeal transition-all text-sm"
                placeholder="agent@support.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full bg-darkbg border border-cardborder text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal focus:border-accentTeal transition-all text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-accentTeal to-accentViolet hover:opacity-90 text-darkbg font-semibold rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-accentTeal transition-all duration-300 shadow-lg text-sm mt-2 flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-3 text-darkbg" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
