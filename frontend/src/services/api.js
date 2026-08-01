/**
 * SOMPO TEAM API client.
 *
 * The app is offline-first: every call returns `{ ok, data, error }` and the
 * UI keeps working from localStorage when the backend is not running.
 */

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "sompo.token";

let online = null;
let probe = null;

export function apiBase() {
  return BASE;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isOnline() {
  return online === true;
}

/** Cached health probe — one request, reused by everything. */
export async function checkHealth({ force = false } = {}) {
  if (!force && probe) return probe;

  probe = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${BASE}/api/health`, { signal: controller.signal });
      clearTimeout(timer);

      online = res.ok;
      return res.ok ? res.json() : null;
    } catch {
      online = false;
      return null;
    }
  })();

  return probe;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  if (online === false) return { ok: false, offline: true, error: "Offline" };

  try {
    const token = auth ? getToken() : null;
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    online = true;

    if (!res.ok) return { ok: false, status: res.status, error: data?.error || "Request failed" };
    return { ok: true, status: res.status, data };
  } catch {
    online = false;
    return { ok: false, offline: true, error: "Offline" };
  }
}

export const api = {
  activate: (username, code) =>
    request("/api/activation/verify", { method: "POST", body: { username, code }, auth: false }),

  me: () => request("/api/activation/me"),

  listRooms: () => request("/api/rooms", { auth: false }),
  showRoom: (id) => request(`/api/rooms/${id}`, { auth: false }),
  createRoom: (payload) => request("/api/rooms", { method: "POST", body: payload }),
  updateRoom: (id, patch) => request(`/api/rooms/${id}`, { method: "PATCH", body: patch }),
  deleteRoom: (id) => request(`/api/rooms/${id}`, { method: "DELETE" }),
  joinRoom: (id, password) =>
    request(`/api/rooms/${id}/join`, { method: "POST", body: { password } }),
  leaveRoom: (id) => request(`/api/rooms/${id}/leave`, { method: "POST" }),

  messages: (roomId, limit = 120) =>
    request(`/api/rooms/${roomId}/messages?limit=${limit}`, { auth: false }),
  sendMessage: (roomId, payload) =>
    request(`/api/rooms/${roomId}/messages`, { method: "POST", body: payload }),
  reactToMessage: (roomId, messageId, emoji) =>
    request(`/api/rooms/${roomId}/messages/${messageId}/reactions`, {
      method: "POST", body: { emoji },
    }),
  pinMessage: (roomId, messageId, pinned) =>
    request(`/api/rooms/${roomId}/messages/${messageId}/pin`, {
      method: "PATCH", body: { pinned },
    }),
  deleteMessage: (roomId, messageId) =>
    request(`/api/rooms/${roomId}/messages/${messageId}`, { method: "DELETE" }),
};

export default api;
