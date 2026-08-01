import { readToken } from "../lib/security.js";
import * as User from "../models/User.js";

/** Bearer token from POST /api/activation/verify. */
export async function requireUser(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? readToken(token) : null;

  if (!payload?.uid) {
    return res.status(401).json({ error: "Activation required." });
  }

  const user = await User.findById(payload.uid);
  if (!user) return res.status(401).json({ error: "Unknown account." });

  await User.touch(user.id);
  req.user = user;
  next();
}

/** Guards the activation-code admin surface (future admin app). */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return res.status(503).json({ error: "ADMIN_KEY is not configured." });
  if (req.get("x-admin-key") !== expected) return res.status(403).json({ error: "Forbidden." });
  next();
}
