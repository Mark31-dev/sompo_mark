import { WebSocketServer } from "ws";

import { readToken } from "./security.js";
import * as User from "../models/User.js";

const clients = new Set();

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}

/** Fan out to every client, or only those watching one room. */
export function broadcast(payload, roomId = null) {
  clients.forEach((socket) => {
    if (roomId !== null && socket.roomId !== roomId) return;
    send(socket, payload);
  });
}

export function presence(roomId) {
  const seen = new Map();
  clients.forEach((socket) => {
    if (socket.roomId === roomId && socket.user) seen.set(socket.user.id, socket.user);
  });
  return [...seen.values()];
}

export function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: "/realtime" });

  wss.on("connection", (socket) => {
    socket.roomId = null;
    socket.user = null;
    socket.isAlive = true;
    clients.add(socket);

    socket.on("pong", () => { socket.isAlive = true; });

    socket.on("message", async (raw) => {
      let event;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (event.type === "auth") {
        const payload = readToken(event.token);
        const row = payload?.uid ? await User.findById(payload.uid) : null;
        socket.user = row ? User.publicUser(row) : null;
        send(socket, { type: "auth:ok", user: socket.user });
        return;
      }

      if (event.type === "room:watch") {
        const roomId = Number(event.roomId);
        const previous = socket.roomId;
        socket.roomId = roomId;

        if (previous && previous !== roomId) {
          broadcast({ type: "presence", roomId: previous, users: presence(previous) }, previous);
        }
        broadcast({ type: "presence", roomId, users: presence(roomId) }, roomId);
        return;
      }

      if (event.type === "typing" && socket.user && socket.roomId) {
        clients.forEach((peer) => {
          if (peer === socket || peer.roomId !== socket.roomId) return;
          send(peer, { type: "typing", roomId: socket.roomId, user: socket.user, on: Boolean(event.on) });
        });
      }
    });

    socket.on("close", () => {
      const roomId = socket.roomId;
      clients.delete(socket);
      if (roomId) broadcast({ type: "presence", roomId, users: presence(roomId) }, roomId);
    });
  });

  const heartbeat = setInterval(() => {
    clients.forEach((socket) => {
      if (!socket.isAlive) {
        socket.terminate();
        clients.delete(socket);
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));
  return wss;
}

export const connectionCount = () => clients.size;
