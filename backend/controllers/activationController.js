import * as ActivationCode from "../models/ActivationCode.js";
import * as User from "../models/User.js";
import { signToken } from "../lib/security.js";

const REASONS = {
  empty: "Activation code is required.",
  unknown: "That activation code doesn't exist.",
  disabled: "That code has been disabled.",
  expired: "That code has expired.",
  exhausted: "That code has reached its usage limit.",
};

export async function verify(req, res) {
  const username = String(req.body?.username || "").trim();
  const code = String(req.body?.code || "").trim();

  if (username.length < 2) {
    return res.status(400).json({ error: "Username must be at least 2 characters." });
  }

  const result = await ActivationCode.redeem(code);
  if (!result.ok) {
    return res.status(401).json({ error: REASONS[result.reason] || "Invalid code." });
  }

  const user = await User.upsert(username, result.code.id);
  const token = signToken({ uid: user.id, name: user.username, iat: Date.now() });

  res.json({ token, user: User.publicUser(user), code: result.code.code });
}

export async function me(req, res) {
  res.json({ user: User.publicUser(req.user) });
}

export async function index(req, res) {
  res.json({ codes: await ActivationCode.listCodes() });
}

export async function create(req, res) {
  const code = await ActivationCode.createCode({
    label: req.body?.label,
    maxUses: req.body?.maxUses,
    prefix: req.body?.prefix,
  });
  res.status(201).json({ code });
}

export async function toggle(req, res) {
  await ActivationCode.setActive(Number(req.params.id), Boolean(req.body?.active));
  res.json({ ok: true });
}
