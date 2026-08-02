import { db } from "./db.js";
import { hashPassword, verifyPassword } from "../lib/security.js";

const TABLE = "rooms";
const MEMBERS = "room_members";

function mysqlDate() {
  return new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function publicRoom(row, ownerName) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    genre: row.genre,
    description: row.description,
    quote: row.quote,
    coverKey: row.cover_key,
    trackId: row.track_id,
    locked: Boolean(Number(row.locked)),
    members: Number(row.member_count),
    ownerId: Number(row.owner_id),
    owner: ownerName || null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function list() {
  return db().all(TABLE, {}, { orderBy: "created_at asc" });
}

export async function find(id) {
  return db().one(TABLE, { id: Number(id) });
}

export async function create(payload, ownerId) {
  const now = mysqlDate();
  const row = {
    id: payload.id || Date.now(),
    name: payload.name,
    genre: payload.genre || "Custom Room",
    description: payload.description || "",
    quote: payload.quote || payload.description || "",
    cover_key: payload.coverKey || "chill",
    track_id: payload.trackId || "t1",
    locked: payload.locked ? 1 : 0,
    password_hash: payload.locked ? hashPassword(payload.password) : null,
    member_count: 0,
    owner_id: ownerId,
    created_at: now,
  };

  await db().insert(TABLE, row);
  await addMember(row.id, ownerId, "owner");
  return row;
}

export async function update(id, patch) {
  const allowed = {};

  if (patch.name !== undefined) allowed.name = patch.name;
  if (patch.genre !== undefined) allowed.genre = patch.genre;
  if (patch.description !== undefined) allowed.description = patch.description;
  if (patch.quote !== undefined) allowed.quote = patch.quote;
  if (patch.coverKey !== undefined) allowed.cover_key = patch.coverKey;
  if (patch.trackId !== undefined) allowed.track_id = patch.trackId;

  if (patch.locked !== undefined) {
    allowed.locked = patch.locked ? 1 : 0;
    if (!patch.locked) allowed.password_hash = null;
  }
  if (patch.password) allowed.password_hash = hashPassword(patch.password);

  if (Object.keys(allowed).length === 0) return 0;
  return db().update(TABLE, { id: Number(id) }, allowed);
}

export async function remove(id) {
  await db().remove(MEMBERS, { room_id: Number(id) });
  await db().remove("messages", { room_id: Number(id) });
  return db().remove(TABLE, { id: Number(id) });
}

export function checkPassword(room, password) {
  if (!Number(room.locked)) return true;
  return verifyPassword(password, room.password_hash);
}

export async function addMember(roomId, userId, role = "member") {
  const existing = await db().one(MEMBERS, { room_id: Number(roomId), user_id: userId });
  if (existing) return existing;

  const row = await db().insert(MEMBERS, {
    room_id: Number(roomId),
    user_id: userId,
    role,
    joined_at: new Date()
  .toISOString()
  .slice(0, 19)
  .replace("T", " "),
  });

  await db().increment(TABLE, { id: Number(roomId) }, "member_count", 1);
  return row;
}

export async function removeMember(roomId, userId) {
  const removed = await db().remove(MEMBERS, { room_id: Number(roomId), user_id: userId });
  if (removed) await db().increment(TABLE, { id: Number(roomId) }, "member_count", -1);
  return removed;
}

export async function members(roomId) {
  return db().all(MEMBERS, { room_id: Number(roomId) });
}
