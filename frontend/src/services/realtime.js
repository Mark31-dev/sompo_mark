import { apiBase, getToken } from "./api.js";

/**
 * Thin WebSocket wrapper with auto-reconnect. Subscribers get every server
 * event; the room hook filters what it cares about.
 */
class Realtime {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.roomId = null;
    this.retry = 0;
    this.timer = null;
    this.connected = false;
  }

  url() {
    return `${apiBase().replace(/^http/, "ws")}/realtime`;
  }

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    try {
      this.socket = new WebSocket(this.url());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.retry = 0;
      this.send({ type: "auth", token: getToken() });
      if (this.roomId !== null) this.send({ type: "room:watch", roomId: this.roomId });
      this.emit({ type: "socket:open" });
    });

    this.socket.addEventListener("message", (event) => {
      try {
        this.emit(JSON.parse(event.data));
      } catch {
        /* ignore malformed frames */
      }
    });

    this.socket.addEventListener("close", () => {
      this.connected = false;
      this.emit({ type: "socket:close" });
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => this.socket?.close());
  }

  scheduleReconnect() {
    if (this.timer) return;
    const delay = Math.min(1000 * 2 ** this.retry, 15_000);
    this.retry += 1;

    this.timer = setTimeout(() => {
      this.timer = null;
      this.connect();
    }, delay);
  }

  send(payload) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  watch(roomId) {
    this.roomId = roomId === null ? null : Number(roomId);
    if (this.roomId !== null) this.send({ type: "room:watch", roomId: this.roomId });
  }

  typing(on) {
    this.send({ type: "typing", on });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const realtime = new Realtime();
export default realtime;
