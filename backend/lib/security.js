import crypto from "node:crypto";

const KEYLEN = 32;

/** scrypt hash stored as `salt:derived`, both hex. */
export function hashPassword(plain) {
  if (!plain) return null;
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain, stored) {
  if (!stored) return true;
  if (!plain) return false;

  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;

  const candidate = crypto.scryptSync(plain, salt, KEYLEN);
  const expected = Buffer.from(derived, "hex");

  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

const SECRET = process.env.SESSION_SECRET || "sompo-dev-secret";

/** Stateless session token: base64url(payload).hmac */
export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;

  const [body, mac] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

export function randomCode(prefix = "SOMPO") {
  const tail = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${tail}`;
}
