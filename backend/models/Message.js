import { db } from "./db.js";

const TABLE = "messages";

function parseReactions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function publicMessage(row, authorName) {
  return {
    id: String(row.id),
    roomId: Number(row.room_id),
    authorId: row.user_id ? Number(row.user_id) : null,
    author: row.user_id ? authorName || "Guest" : "system",
    kind: row.kind,
    text: row.body,
    trackId: row.track_id || null,
    pinned: Boolean(Number(row.pinned)),
    reactions: parseReactions(row.reactions),
    at: new Date(row.created_at).getTime(),
  };
}

export async function list(roomId, limit = 120) {
  const rows = await db().all(
    TABLE,
    { room_id: Number(roomId) },
    { orderBy: "created_at asc" },
  );
  return rows.slice(-limit);
}

export async function create({ roomId, userId, kind = "text", body = "", trackId = null }) {
  return db().insert(TABLE, {
    room_id: Number(roomId),
    user_id: userId ?? null,
    kind,
    body: String(body).slice(0, 1000),
    track_id: trackId,
    pinned: 0,
    reactions: JSON.stringify({}),
    created_at: new Date().toISOString(),
  });
}

export async function find(id) {
  return db().one(TABLE, { id });
}

export async function setPinned(id, pinned) {
  return db().update(TABLE, { id }, { pinned: pinned ? 1 : 0 });
}

export async function addReaction(id, emoji) {
  const row = await find(id);
  if (!row) return null;

  const reactions = parseReactions(row.reactions);
  reactions[emoji] = (reactions[emoji] || 0) + 1;

  await db().update(TABLE, { id }, { reactions: JSON.stringify(reactions) });
  return reactions;
}

export async function remove(id, userId) {
  const row = await find(id);
  if (!row) return 0;
  if (Number(row.user_id) !== Number(userId)) return 0;
  return db().remove(TABLE, { id });
}
