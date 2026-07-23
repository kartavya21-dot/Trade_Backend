// Centralized configuration for API and WebSocket URLs
// Supports both Vite dev proxy (local) and remote hosted backend via VITE_API_BASE_URL

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const getWsUrl = (path) => {
  const customWsBase = import.meta.env.VITE_WS_BASE_URL;
  if (customWsBase) {
    return `${customWsBase}${path}`;
  }
  // Default to relative window location (supported by Vite proxy and single-domain hosting)
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${wsProtocol}//${host}${path}`;
};
