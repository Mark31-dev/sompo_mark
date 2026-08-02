import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api, { checkHealth, setToken } from "../services/api";
import realtime from "../services/realtime";
import {
  ACTIVATION_CODES,
  DEFAULT_PROFILE,
  DEFAULT_ROOMS,
  ME,
  MEMBERS,
  SEED_MESSAGES,
  SEED_NOTIFICATIONS,
  TRACKS,
} from "../data/seed";

const AppContext = createContext(null);

const KEYS = {
  profile: "sompo.profile",
  rooms: "sompo.rooms",
  favorites: "sompo.favorites",
  recents: "sompo.recents",
  history: "sompo.history",
  notifications: "sompo.notifications",
  joined: "sompo.joined",
  muted: "sompo.mutedRooms",
};

export const STORAGE_KEYS = KEYS;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedRecents() {
  const hour = 3_600_000;
  return [1, 2, 3, 4, 5].map((roomId, i) => ({
    roomId,
    at: Date.now() - [2, 26, 52, 74, 120][i] * hour,
  }));
}

/** Legacy saves used the literal name "Joshua" for the signed-in owner. */
function migrateRoom(room) {
  const owner = room.owner === "Joshua" || !room.owner ? ME : room.owner;
  return { ...room, owner };
}

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...read(KEYS.profile, {}),
  }));

  

  const [rooms, setRooms] = useState(() => {
    const saved = read(KEYS.rooms, null);
    if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_ROOMS;
    return saved.map(migrateRoom);
  });

  const [favorites, setFavorites] = useState(() => read(KEYS.favorites, [1]));
  const [recents, setRecents] = useState(() => read(KEYS.recents, seedRecents()));
  const [history, setHistory] = useState(() => read(KEYS.history, []));
  const [notifications, setNotifications] = useState(() =>
    read(KEYS.notifications, SEED_NOTIFICATIONS),
  );
  const [mutedRooms, setMutedRooms] = useState(() => read(KEYS.muted, []));
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [joinedRoomId, setJoinedRoomId] = useState(() => read(KEYS.joined, null));
  const [toasts, setToasts] = useState([]);
  const [online, setOnline] = useState(false);

  const toastSeq = useRef(0);

  useEffect(() => write(KEYS.profile, profile), [profile]);
  useEffect(() => write(KEYS.rooms, rooms), [rooms]);
  useEffect(() => write(KEYS.favorites, favorites), [favorites]);
  useEffect(() => write(KEYS.recents, recents), [recents]);
  useEffect(() => write(KEYS.history, history), [history]);
  useEffect(() => write(KEYS.notifications, notifications), [notifications]);
  useEffect(() => write(KEYS.muted, mutedRooms), [mutedRooms]);
  useEffect(() => write(KEYS.joined, joinedRoomId), [joinedRoomId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const health = await checkHealth();
      if (cancelled) return;
      setOnline(Boolean(health));
      if (!health) return;

      const result = await api.listRooms();
      if (cancelled || !result.ok) return;

      setProfile((current) => {
        const serverRooms = result.data.rooms.map((room) => ({
          ...room,
          owner: room.ownerId === current.serverId ? ME : room.owner,
          password: "",
        }));
        setRooms(serverRooms);
        return current;
      });
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
  if (!online) return;

  realtime.connect();

  const off = realtime.subscribe((event) => {
    switch (event.type) {
      case "room:created":
        setRooms((current) => {
          const exists = current.some(
            (room) => Number(room.id) === Number(event.room.id)
          );

          if (exists) return current;

          return [...current, event.room];
        });
        break;

      case "room:updated":
        setRooms((current) =>
          current.map((room) =>
            Number(room.id) === Number(event.room.id)
              ? event.room
              : room
          ),
        );
        break;

      case "room:deleted":
        setRooms((current) =>
          current.filter(
            (room) => room.id !== event.roomId
          ),
        );
        break;

      default:
        break;
    }
  });

  return () => {
    off();
  };
}, [online]);

  const pushToast = useCallback((text, kind = "ok") => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((current) => [...current, { id, text, kind }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2600);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  /* ── account ──────────────────────────────────────────── */

  const activate = useCallback(async (name, code) => {
    const clean = code.trim().toUpperCase();
    const username = name.trim();

    const result = await api.activate(username, clean);

    if (result.ok) {
      setToken(result.data.token);
      setProfile((current) => ({
        ...current,
        name: result.data.user.name || username || current.name,
        serverId: result.data.user.id,
        code: clean,
        activatedAt: Date.now(),
      }));
      return { ok: true };
    }

    // Backend unreachable — fall back to the bundled demo codes.
    if (result.offline) {
      if (!ACTIVATION_CODES.includes(clean)) return { ok: false, error: "That activation code doesn't exist." };
      setProfile((current) => ({
        ...current,
        name: username || current.name,
        code: clean,
        activatedAt: Date.now(),
      }));
      return { ok: true, offline: true };
    }

    return { ok: false, error: result.error };
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setProfile((current) => ({ ...current, code: "", activatedAt: null }));
  }, []);

  /** Private-room check: server-side when live, local compare when offline. */
  const verifyRoomPassword = useCallback(async (room, password) => {
    if (online) {
      const result = await api.joinRoom(room.id, password);
      if (result.ok) return true;
      if (!result.offline) return false;
    }
    return password === room.password;
  }, [online]);

  /* ── rooms ────────────────────────────────────────────── */

  const createRoom = useCallback(
  async ({ name, description, locked, password, coverKey, trackId }) => {

    const payload = {
      name: name.trim(),
      genre: description.trim() || "Custom Room",
      description: description.trim() || "Tap in and listen together.",
      quote: description.trim() || "New room, fresh queue.",
      locked,
      password,
      coverKey: coverKey || "chill",
      trackId: trackId || TRACKS[0].id,
    };

    try {
      const result = await api.createRoom(payload);

console.log("CREATE ROOM RESULT:", result);

if (!result.ok) {
  pushToast(result.error || "Failed creating room", "danger");
  return null;
}

      const newRoom = result.data.room;

pushToast(`"${newRoom.name}" created`);

return newRoom;

    } catch (error) {
      console.error("Create room error:", error);
      pushToast("Failed creating room", "danger");
      return null;
    }

  },
  [pushToast],
);

  const updateRoom = useCallback(
    (updated, message = "Room updated") => {
      setRooms((current) =>
        current.map((room) => (room.id === updated.id ? { ...room, ...updated } : room)),
      );
      if (online) api.updateRoom(updated.id, updated);
      if (message) pushToast(message);
    },
    [pushToast, online],
  );

  const deleteRoom = useCallback(
    (id) => {
      setRooms((current) => current.filter((room) => room.id !== id));
      setFavorites((current) => current.filter((fav) => fav !== id));
      setRecents((current) => current.filter((entry) => entry.roomId !== id));
      setJoinedRoomId((current) => (current === id ? null : current));
      localStorage.removeItem(`sompo.chat.${id}`);
      if (online) api.deleteRoom(id);
      pushToast("Room deleted", "danger");
    },
    [pushToast, online],
  );

  const toggleFavorite = useCallback(
    (id) => {
      setFavorites((current) => {
        const has = current.includes(id);
        pushToast(has ? "Removed from favorites" : "Added to favorites");
        return has ? current.filter((fav) => fav !== id) : [...current, id];
      });
    },
    [pushToast],
  );

  const toggleMuteRoom = useCallback(
    (id) => {
      setMutedRooms((current) => {
        const has = current.includes(id);
        pushToast(has ? "Notifications on" : "Room muted");
        return has ? current.filter((r) => r !== id) : [...current, id];
      });
    },
    [pushToast],
  );

  const recordVisit = useCallback((roomId) => {
    setRecents((current) =>
      [{ roomId, at: Date.now() }, ...current.filter((e) => e.roomId !== roomId)].slice(0, 12),
    );
  }, []);

  const recordListen = useCallback((track) => {
    if (!track) return;
    setHistory((current) =>
      [{ trackId: track.id, at: Date.now() }, ...current.filter((e) => e.trackId !== track.id)]
        .slice(0, 30),
    );
  }, []);

  const joinRoom = useCallback(
    (room) => {
      setJoinedRoomId(room.id);
      recordVisit(room.id);
    },
    [recordVisit],
  );

  const leaveRoom = useCallback(
  async (roomId) => {
    if (online && roomId) {
      await api.leaveRoom(roomId);
    }

    setJoinedRoomId(null);
    pushToast("Left the room");
  },
  [pushToast, online],
);

  const markNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
  }, []);

  const markMessagesRead = useCallback(() => {
    setMessages((current) => current.map((m) => ({ ...m, unread: false })));
  }, []);

  /* ── derived ──────────────────────────────────────────── */

  const members = useMemo(
    () =>
      MEMBERS.map((member) =>
        member.isMe
          ? { ...member, name: profile.name, avatarKey: profile.avatarKey, roomId: joinedRoomId }
          : member,
      ),
    [profile.name, profile.avatarKey, joinedRoomId],
  );

  const onlineCount = useMemo(
    () => members.filter((m) => m.status !== "offline").length,
    [members],
  );

  const isOwner = useCallback((room) => room?.owner === ME, []);
  const ownerName = useCallback(
    (room) => (room?.owner === ME ? profile.name : room?.owner || "Unknown"),
    [profile.name],
  );

  const value = useMemo(
    () => ({
      profile,
      user: { ...profile, owner: true },
      isActivated: Boolean(profile.activatedAt),
      online,
      activate,
      signOut,
      verifyRoomPassword,

      rooms,
      members,
      onlineCount,
      favorites,
      recents,
      history,
      notifications,
      messages,
      mutedRooms,
      toasts,
      joinedRoomId,
      joinedRoom: rooms.find((room) => room.id === joinedRoomId) || null,
      unreadNotifications: notifications.filter((n) => !n.read).length,
      unreadMessages: messages.filter((m) => m.unread).length,

      isOwner,
      ownerName,
      createRoom,
      updateRoom,
      deleteRoom,
      toggleFavorite,
      toggleMuteRoom,
      recordVisit,
      recordListen,
      joinRoom,
      leaveRoom,
      markNotificationsRead,
      markMessagesRead,
      pushToast,
      dismissToast,
    }),
    [
      profile, online, activate, signOut, verifyRoomPassword, rooms, members, onlineCount, favorites, recents,
      history, notifications, messages, mutedRooms, toasts, joinedRoomId, isOwner,
      ownerName, createRoom, updateRoom, deleteRoom, toggleFavorite, toggleMuteRoom,
      recordVisit, recordListen, joinRoom, leaveRoom, markNotificationsRead,
      markMessagesRead, pushToast, dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return ctx;
}
