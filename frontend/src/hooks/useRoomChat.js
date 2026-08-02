import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SEED_CHATS, pickReply } from "../data/chat";
import { ME } from "../data/seed";
import api from "../services/api";
import realtime from "../services/realtime";

const keyFor = (roomId) => `sompo.chat.${roomId}`;

function hydrate(roomId) {
  try {
    const raw = localStorage.getItem(keyFor(roomId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* fall through to seed */
  }

  const seed = SEED_CHATS[roomId] || [
    { author: "system", text: "Room created. Say something. 🎧", at: Date.now() },
  ];

  return seed.map((message, i) => ({
    id: `s${roomId}-${i}`,
    kind: message.kind || (message.author === "system" ? "system" : "text"),
    reactions: {},
    pinned: false,
    ...message,
  }));
}

function fromServer(row, myId) {
  return {
    id: String(row.id),
    author: row.author === "system" ? "system" : row.authorId === myId ? ME : `srv:${row.authorId}`,
    authorName: row.author === "system" ? null : row.author,
    kind: row.kind,
    text: row.text,
    trackId: row.trackId,
    pinned: Boolean(row.pinned),
    reactions: row.reactions || {},
    at: row.at,
  };
}

/**
 * Per-room chat. Talks to the API and the realtime socket when the backend is
 * up; falls back to localStorage plus simulated replies when it is not.
 */
export default function useRoomChat(roomId, roomMembers, { live = false, myId = null } = {}) {
  const [messages, setMessages] = useState(() => hydrate(roomId));
  const [typing, setTyping] = useState(null);
  const [peers, setPeers] = useState([]);

  const timers = useRef([]);
  const typingTimer = useRef(null);
  const previousRoomRef = useRef(roomId);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const schedule = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
    return id;
  }, []);

  /* ── local mode ─────────────────────────────────────────── */

  useEffect(() => {
  if (live) return;

  if (previousRoomRef.current !== roomId) {
    previousRoomRef.current = roomId;
    setMessages(hydrate(roomId));
    setTyping(null);
  }
}, [roomId, live]);

  useEffect(() => {
    if (live) return;
    localStorage.setItem(keyFor(roomId), JSON.stringify(messages.slice(-200)));
  }, [roomId, messages, live]);

  /* ── live mode ──────────────────────────────────────────── */

  useEffect(() => {
    if (!live) return undefined;

    let cancelled = false;

    (async () => {
      const result = await api.messages(roomId);
      if (cancelled || !result.ok) return;
      setMessages(result.data.messages.map((row) => fromServer(row, myId)));
    })();

    realtime.connect();
    realtime.watch(roomId);

    const off = realtime.subscribe((event) => {
      if (event.roomId !== undefined && Number(event.roomId) !== Number(roomId)) return;

      switch (event.type) {
        case "message:new":
          setMessages((current) => {
            const incoming = fromServer(event.message, myId);
            if (current.some((m) => m.id === incoming.id)) return current;
            return [...current, incoming];
          });
          break;

        case "message:reaction":
          setMessages((current) =>
            current.map((m) =>
              m.id === event.messageId ? { ...m, reactions: event.reactions } : m,
            ),
          );
          break;

        case "message:pinned":
          setMessages((current) =>
            current.map((m) => (m.id === event.messageId ? { ...m, pinned: event.pinned } : m)),
          );
          break;

        case "message:deleted":
  setMessages((current) => current.filter((m) => m.id !== event.messageId));
  break;

  case "presence":
  setPeers(event.users || []);
  break;


case "room:member-joined":

  setMessages((current) => {
    const text = `${event.user.name} joined the room 🎧`;

    const exists = current.some(
      (message) =>
        message.kind === "system" &&
        message.text === text
    );

    if (exists) return current;

    return [
      ...current,
      {
        id: `join-${Date.now()}`,
        kind: "system",
        author: "system",
        text,
        at: Date.now(),
      },
    ];
  });

  break;


case "room:member-left":

  setMessages((current) => [
    ...current,
    {
      id: `leave-${Date.now()}`,
      kind: "system",
      author: "system",
      text: `${event.user.name} left the room 👋`,
      at: Date.now(),
    },
  ]);

  break;


case "typing":
  setTyping(event.on ? event.user : null);
  break;
      }
    });

    return () => {
      cancelled = true;
      off();
      realtime.watch(null);
    };
  }, [live, roomId, myId]);

  /* ── shared actions ─────────────────────────────────────── */

  const append = useCallback((message) => {
    setMessages((current) => [
      ...current,
      {
        id: `m${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: "text",
        reactions: {},
        pinned: false,
        at: Date.now(),
        ...message,
      },
    ]);
  }, []);

  const simulateReply = useCallback(() => {
    const others = (roomMembers || []).filter((m) => !m.isMe && m.status !== "offline");
    if (others.length === 0 || Math.random() > 0.72) return;

    const responder = others[Math.floor(Math.random() * others.length)];
    const think = 700 + Math.random() * 1400;
    const type = 900 + Math.random() * 1500;

    schedule(() => setTyping(responder), think);
    schedule(() => {
      setTyping(null);
      append({ author: responder.id, text: pickReply(roomId) });
    }, think + type);
  }, [roomMembers, roomId, append, schedule]);

  const send = useCallback(
    (text) => {
      const clean = text.trim();
      if (!clean) return false;

      if (live) {
        realtime.typing(false);
        api.sendMessage(roomId, { text: clean });
        return true;
      }

      append({ author: ME, text: clean });
      simulateReply();
      return true;
    },
    [live, roomId, append, simulateReply],
  );

  const shareTrack = useCallback(
    (track) => {
      if (live) {
        api.sendMessage(roomId, { kind: "track", trackId: track.id, text: track.title });
        return;
      }
      append({ author: ME, kind: "track", trackId: track.id, text: track.title });
      simulateReply();
    },
    [live, roomId, append, simulateReply],
  );

  const react = useCallback(
    (messageId, emoji) => {
      if (live) {
        api.reactToMessage(roomId, messageId, emoji);
        return;
      }
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) return message;
          const reactions = { ...(message.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...message, reactions };
        }),
      );
    },
    [live, roomId],
  );

  const togglePin = useCallback(
    (messageId) => {
      const current = messages.find((m) => m.id === messageId);

      if (live) {
        api.pinMessage(roomId, messageId, !current?.pinned);
        return;
      }
      setMessages((list) =>
        list.map((m) => (m.id === messageId ? { ...m, pinned: !m.pinned } : m)),
      );
    },
    [live, roomId, messages],
  );

  const remove = useCallback(
    (messageId) => {
      if (live) {
        api.deleteMessage(roomId, messageId);
        return;
      }
      setMessages((current) => current.filter((message) => message.id !== messageId));
    },
    [live, roomId],
  );

  const notifyTyping = useCallback(() => {
    if (!live) return;
    realtime.typing(true);

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => realtime.typing(false), 1800);
  }, [live]);

  const clear = useCallback(() => {
    if (live) return;
    localStorage.removeItem(keyFor(roomId));
    setMessages(hydrate(roomId));
  }, [live, roomId]);

  const pinned = useMemo(() => messages.filter((m) => m.pinned), [messages]);
  const media = useMemo(() => messages.filter((m) => m.kind === "track"), [messages]);

  return {
    messages, pinned, media, typing, peers,
    send, shareTrack, react, togglePin, remove, clear, notifyTyping,
  };
}
