import * as Message from "../models/Message.js";
import * as Room from "../models/Room.js";
import * as User from "../models/User.js";
import { broadcast } from "../lib/realtime.js";

async function nameMap() {
  const users = await User.list();
  return new Map(users.map((user) => [user.id, user.name]));
}

export async function index(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });

  const names = await nameMap();
  const rows = await Message.list(room.id, Number(req.query.limit) || 120);

  res.json({ messages: rows.map((row) => Message.publicMessage(row, names.get(Number(row.user_id)))) });
}

export async function create(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });

  const kind = req.body?.kind === "track" ? "track" : "text";
  const text = String(req.body?.text || "").trim();

  if (kind === "text" && !text) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  const row = await Message.create({
    roomId: room.id,
    userId: req.user.id,
    kind,
    body: text,
    trackId: kind === "track" ? req.body?.trackId || null : null,
  });

  const message = Message.publicMessage(row, req.user.username);
  broadcast({ type: "message:new", roomId: Number(room.id), message }, Number(room.id));

  res.status(201).json({ message });
}

export async function react(req, res) {
  const emoji = String(req.body?.emoji || "").slice(0, 8);
  if (!emoji) return res.status(400).json({ error: "Emoji is required." });

  const reactions = await Message.addReaction(req.params.messageId, emoji);
  if (!reactions) return res.status(404).json({ error: "Message not found." });

  broadcast(
    { type: "message:reaction", messageId: String(req.params.messageId), reactions },
    Number(req.params.id),
  );

  res.json({ reactions });
}

export async function pin(req, res) {
  const pinned = Boolean(req.body?.pinned);
  await Message.setPinned(req.params.messageId, pinned);

  broadcast(
    { type: "message:pinned", messageId: String(req.params.messageId), pinned },
    Number(req.params.id),
  );

  res.json({ ok: true, pinned });
}

export async function destroy(req, res) {
  const removed = await Message.remove(req.params.messageId, req.user.id);
  if (!removed) return res.status(403).json({ error: "You can only delete your own messages." });

  broadcast(
    { type: "message:deleted", messageId: String(req.params.messageId) },
    Number(req.params.id),
  );

  res.json({ ok: true });
}
