import { db } from "./db.js";

const TABLE = "users";

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.username,
    avatarKey: row.avatar_key,
    lastSeenAt: row.last_seen_at,
  };
}

export async function findByName(username) {
  return db().one(TABLE, { username });
}

export async function findById(id) {
  return db().one(TABLE, { id });
}

export async function upsert(username, activationId) {
  const existing = await findByName(username);
  const now = new Date().toISOString();

  if (existing) {
    await db().update(TABLE, { id: existing.id }, { last_seen_at: now });
    return { ...existing, last_seen_at: now };
  }

  return db().insert(TABLE, {
    username,
    avatar_key: "joshua",
    activation_id: activationId ?? null,
    last_seen_at: now,
    created_at: now,
  });
}

export async function touch(id) {
  return db().update(TABLE, { id }, { last_seen_at: new Date().toISOString() });
}

export async function list() {
  return (await db().all(TABLE, {}, { orderBy: "id asc" })).map(publicUser);
}
