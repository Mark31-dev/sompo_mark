import * as Room from "../models/Room.js";
import * as User from "../models/User.js";
import { broadcast } from "../lib/realtime.js";

async function decorate(rows) {
  const users = await User.list();
  const byId = new Map(users.map((user) => [user.id, user.name]));
  return rows.map((row) => Room.publicRoom(row, byId.get(Number(row.owner_id))));
}

export async function index(req, res) {
  res.json({ rooms: await decorate(await Room.list()) });
}

export async function show(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });

  const [decorated] = await decorate([room]);
  const memberRows = await Room.members(room.id);
  const users = await User.list();
  const byId = new Map(users.map((user) => [user.id, user]));

  res.json({
    room: decorated,
    members: memberRows
      .map((row) => ({ ...byId.get(Number(row.user_id)), role: row.role }))
      .filter((member) => member.id),
  });
}

export async function create(req, res) {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Room name is required." });

  if (req.body?.locked && String(req.body?.password || "").trim().length < 3) {
    return res.status(400).json({ error: "Private rooms need a password of at least 3 characters." });
  }

  const row = await Room.create({ ...req.body, name }, req.user.id);

const freshRoom = await Room.find(row.id);

const [room] = await decorate([freshRoom]);

broadcast({ type: "room:created", room });
res.status(201).json({ room });
}

export async function update(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });
  if (Number(room.owner_id) !== req.user.id) {
    return res.status(403).json({ error: "Only the owner can edit this room." });
  }

  await Room.update(room.id, req.body || {});
  const [updated] = await decorate([await Room.find(room.id)]);

  broadcast({ type: "room:updated", room: updated });
  res.json({ room: updated });
}

export async function destroy(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });
  if (Number(room.owner_id) !== req.user.id) {
    return res.status(403).json({ error: "Only the owner can delete this room." });
  }

  await Room.remove(room.id);
  broadcast({ type: "room:deleted", roomId: Number(room.id) });
  res.json({ ok: true });
}

export async function join(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });

  const isOwner = Number(room.owner_id) === req.user.id;

  if (!isOwner && !Room.checkPassword(room, req.body?.password)) {
    return res.status(401).json({ error: "Wrong password." });
  }

  await Room.addMember(room.id, req.user.id);
  const [decorated] = await decorate([await Room.find(room.id)]);

  broadcast({ type: "room:member-joined", roomId: Number(room.id), user: User.publicUser(req.user) },
    Number(room.id));

  res.json({ ok: true, room: decorated });
}

export async function leave(req, res) {
  const room = await Room.find(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found." });

  await Room.removeMember(room.id, req.user.id);
  broadcast(
  {
    type: "room:member-left",
    roomId: Number(room.id),
    userId: req.user.id,
    user: User.publicUser(req.user),
  },
  Number(room.id),
);

  res.json({ ok: true });
}
