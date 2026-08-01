const KEY = "sompo.unlocked";

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isUnlocked(roomId) {
  return load().includes(roomId);
}

export function markUnlocked(roomId) {
  const current = load();
  if (current.includes(roomId)) return;
  sessionStorage.setItem(KEY, JSON.stringify([...current, roomId]));
}

/** A room opens without a prompt when it is public or you own it. */
export function needsPassword(room, isOwner) {
  if (!room?.locked) return false;
  if (isOwner) return false;
  return !isUnlocked(room.id);
}
