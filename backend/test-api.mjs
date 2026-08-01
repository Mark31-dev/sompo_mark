/** API + realtime smoke test. Run with the server already listening. */
import WebSocket from "ws";

const BASE = "http://localhost:4000";
const out = {};

async function call(path, { method = "GET", body, token, admin } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(admin ? { "x-admin-key": admin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const bad = await call("/api/activation/verify", {
  method: "POST", body: { username: "Joshua", code: "NOPE" },
});
out.wrong_code = [bad.status, bad.data.error];

const ok = await call("/api/activation/verify", {
  method: "POST", body: { username: "Joshua", code: "sompo2026" },
});
out.right_code = [ok.status, ok.data.user?.name];
const token = ok.data.token;

const me = await call("/api/activation/me", { token });
out.me = [me.status, me.data.user?.name];

const rooms = await call("/api/rooms");
out.rooms = rooms.data.rooms.map((r) => `${r.id}:${r.name}${r.locked ? " 🔒" : ""}`);
out.no_password_leak = !JSON.stringify(rooms.data).includes("password");

const joinBad = await call("/api/rooms/2/join", {
  method: "POST", token, body: { password: "nope" },
});
out.join_wrong = [joinBad.status, joinBad.data.error];

const joinOk = await call("/api/rooms/2/join", {
  method: "POST", token, body: { password: "gg" },
});
out.join_right = [joinOk.status, joinOk.data.room?.members];

// realtime listener before posting so we can prove the broadcast
const socket = new WebSocket("ws://localhost:4000/realtime");
const events = [];
await new Promise((resolve) => socket.on("open", resolve));
socket.on("message", (raw) => events.push(JSON.parse(raw.toString())));
socket.send(JSON.stringify({ type: "auth", token }));
socket.send(JSON.stringify({ type: "room:watch", roomId: 2 }));
await new Promise((r) => setTimeout(r, 300));

const sent = await call("/api/rooms/2/messages", {
  method: "POST", token, body: { text: "backend live na 🎧" },
});
out.post_message = [sent.status, sent.data.message?.text, sent.data.message?.author];
const messageId = sent.data.message?.id;

const shared = await call("/api/rooms/2/messages", {
  method: "POST", token, body: { kind: "track", trackId: "t2", text: "Neon Alley" },
});
out.share_track = [shared.status, shared.data.message?.kind];

await call(`/api/rooms/2/messages/${messageId}/reactions`, {
  method: "POST", token, body: { emoji: "🔥" },
});
const pinned = await call(`/api/rooms/2/messages/${messageId}/pin`, {
  method: "PATCH", token, body: { pinned: true },
});
out.pin = [pinned.status, pinned.data.pinned];

const history = await call("/api/rooms/2/messages");
const mine = history.data.messages.find((m) => m.id === messageId);
out.history_count = history.data.messages.length;
out.persisted = [mine?.text, mine?.reactions, mine?.pinned];

await new Promise((r) => setTimeout(r, 400));
out.socket_events = events.map((e) => e.type);

const del = await call(`/api/rooms/2/messages/${messageId}`, { method: "DELETE", token });
out.delete = del.status;

const noAuth = await call("/api/rooms", { method: "POST", body: { name: "nope" } });
out.unauth_create = [noAuth.status, noAuth.data.error];

const created = await call("/api/rooms", {
  method: "POST", token,
  body: { name: "Poohacz Roost", description: "Terminal-only nights.", locked: true, password: "roost" },
});
out.create_room = [created.status, created.data.room?.name, created.data.room?.owner];

const codes = await call("/api/activation/codes", { admin: "sompo-admin" });
out.admin_codes = [codes.status, codes.data.codes?.map((c) => c.code)];

const newCode = await call("/api/activation/codes", {
  method: "POST", admin: "sompo-admin", body: { label: "QA batch", maxUses: 5 },
});
out.generated_code = [newCode.status, newCode.data.code?.code];

const forbidden = await call("/api/activation/codes", { admin: "wrong" });
out.admin_guard = forbidden.status;

socket.close();
console.log(JSON.stringify(out, null, 1));
