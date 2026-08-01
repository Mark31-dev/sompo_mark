import { db } from "./db.js";
import { randomCode } from "../lib/security.js";

const TABLE = "activation_codes";

const SEED = [
  { code: "SOMPO2026", label: "Launch batch", max_uses: 0 },
  { code: "TEAMVIBES", label: "Team invite", max_uses: 0 },
  { code: "CHILL-01", label: "Chill Vibes", max_uses: 50 },
  { code: "LOFI-2026", label: "Lo-fi listeners", max_uses: 50 },
];

export async function seedCodes() {
  const existing = await db().all(TABLE);
  if (existing.length > 0) return existing;

  for (const entry of SEED) {
    await db().insert(TABLE, {
      ...entry,
      used_count: 0,
      active: 1,
      expires_at: null,
      created_at: new Date().toISOString(),
    });
  }
  return db().all(TABLE);
}

export async function listCodes() {
  return db().all(TABLE, {}, { orderBy: "id desc" });
}

export async function createCode({ label = null, maxUses = 0, prefix = "SOMPO" } = {}) {
  return db().insert(TABLE, {
    code: randomCode(prefix),
    label,
    max_uses: Number(maxUses) || 0,
    used_count: 0,
    active: 1,
    expires_at: null,
    created_at: new Date().toISOString(),
  });
}

export async function setActive(id, active) {
  return db().update(TABLE, { id }, { active: active ? 1 : 0 });
}

/** Returns the code row when it may still be redeemed, otherwise a reason. */
export async function redeem(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "empty" };

  const row = await db().one(TABLE, { code });
  if (!row) return { ok: false, reason: "unknown" };
  if (!Number(row.active)) return { ok: false, reason: "disabled" };

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const max = Number(row.max_uses) || 0;
  if (max > 0 && Number(row.used_count) >= max) {
    return { ok: false, reason: "exhausted" };
  }

  await db().increment(TABLE, { id: row.id }, "used_count", 1);
  return { ok: true, code: row };
}
