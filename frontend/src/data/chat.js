/**
 * Chat seeds, emoji picker groups and the offline reply generator used when
 * the backend is not running. `pickReply` is seeded off the room id so a room
 * keeps its own voice across a session instead of sounding like every other.
 */

export const EMOJI_GROUPS = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😄", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍",
      "😘", "😜", "🤪", "🤨", "😎", "🥳", "😴", "🤔", "😢", "😭",
      "😤", "😱", "🤯", "🥲", "😌", "🙃", "😬", "🫠",
    ],
  },
  {
    id: "music",
    label: "Music",
    emojis: [
      "🎵", "🎶", "🎧", "🎤", "🎸", "🥁", "🎹", "🎺", "🎻", "📻",
      "💿", "📀", "🔊", "🔉", "🎚️", "🎛️", "🪕", "🎷",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💗",
      "💓", "💞", "💕", "❣️", "💔", "❤️‍🔥",
    ],
  },
  {
    id: "hands",
    label: "Hands",
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🫶",
      "👊", "🤙", "💪", "👌",
    ],
  },
  {
    id: "vibes",
    label: "Vibes",
    emojis: [
      "🔥", "✨", "⭐", "🌙", "☕", "🌧️", "🌊", "🍃", "🌸", "🕯️",
      "🎮", "📚", "💤", "🚀", "🎉", "🌌",
    ],
  },
];

export const QUICK_REACTIONS = ["❤️", "🔥", "😂", "🎧", "👏", "🙌"];

export const ROOM_RULES = [
  "Keep it kind. Disagree with the take, not the person.",
  "No spam, no unsolicited links, no self-promo dumps.",
  "One track request at a time — let the queue breathe.",
  "Spoilers go behind a warning line.",
  "The host has the last word on the soundtrack.",
];

/** Pre-baked openers so a fresh room never looks empty. */
export const SEED_CHATS = {
  1: [
    { author: "system", text: "Welcome to Chill Vibes. Volume down, feet up. 🎧", at: Date.now() - 55 * 60 * 1000 },
    { author: "Alyssa", text: "this track always gets me", at: Date.now() - 41 * 60 * 1000 },
    { author: "Joshua", text: "same. put it on repeat earlier and forgot", at: Date.now() - 38 * 60 * 1000 },
    { author: "Alyssa", text: "no notes 🍃", at: Date.now() - 22 * 60 * 1000 },
  ],
  2: [
    { author: "system", text: "Gaming Lounge is live. Mics optional. 🎮", at: Date.now() - 90 * 60 * 1000 },
    { author: "Renz", text: "queue in 2", at: Date.now() - 48 * 60 * 1000 },
    { author: "Mark", text: "give me one sec, grabbing coffee", at: Date.now() - 45 * 60 * 1000 },
    { author: "Renz", text: "you said that two matches ago", at: Date.now() - 44 * 60 * 1000 },
  ],
  3: [
    { author: "system", text: "Study Together. Fifty minutes on, ten off. 📚", at: Date.now() - 3 * 60 * 60 * 1000 },
    { author: "Kira", text: "timer starts now, see you on the other side", at: Date.now() - 2 * 60 * 60 * 1000 },
    { author: "Joshua", text: "👍", at: Date.now() - 2 * 60 * 60 * 1000 + 30_000 },
  ],
  4: [
    { author: "system", text: "Music Hub. Bring one track nobody here has heard. 🎵", at: Date.now() - 5 * 60 * 60 * 1000 },
    { author: "Mika", text: "dropped neon alley in the queue", at: Date.now() - 70 * 60 * 1000 },
    { author: "Alyssa", text: "ok that bassline is filthy", at: Date.now() - 64 * 60 * 1000 },
  ],
  5: [
    { author: "system", text: "Late Night. Rain loop running. 🌙", at: Date.now() - 20 * 60 * 60 * 1000 },
    { author: "Mark", text: "anyone still up", at: Date.now() - 6 * 60 * 60 * 1000 },
    { author: "Joshua", text: "always", at: Date.now() - 5 * 60 * 60 * 1000 },
  ],
};

const REPLIES = [
  "yeah that one hits",
  "adding this to my list",
  "who picked this, respect",
  "brb, volume going up",
  "this is exactly the mood",
  "ok replay that last bit",
  "how have I never heard this",
  "🔥",
  "queue is unreal tonight",
  "staying for one more",
  "honestly perfect for right now",
  "someone screenshot the tracklist",
];

const cursors = new Map();

/**
 * Walks the reply list per room instead of picking at random, so a room never
 * repeats itself twice in a row the way Math.random() eventually does.
 */
export function pickReply(roomId = "default") {
  const key = String(roomId);
  const start = cursors.get(key) ?? Math.floor(Math.random() * REPLIES.length);
  cursors.set(key, (start + 1) % REPLIES.length);
  return REPLIES[start];
}
