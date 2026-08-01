import { db } from "./models/db.js";
import * as Room from "./models/Room.js";
import * as Message from "./models/Message.js";
import * as User from "./models/User.js";

const OWNERS = ["Joshua", "Renz", "Dana", "Mika"];

const ROOMS = [
  {
    id: 1, name: "Chill Vibes", genre: "Lo-fi / Relax", description: "Relax and enjoy.",
    quote: "Good music, better company.", coverKey: "chill", trackId: "t1",
    locked: true, password: "chill", owner: "Joshua",
    seed: ["Welcome to Chill Vibes! Enjoy the music and good vibes. 🎧"],
  },
  {
    id: 2, name: "Gaming Lounge", genre: "Gaming / Chat", description: "Play. Share. Connect.",
    quote: "Play loud, lose louder.", coverKey: "gaming", trackId: "t2",
    locked: true, password: "gg", owner: "Renz",
    seed: ["Welcome to Gaming Lounge. Mic check, keep it loud. 🎮"],
  },
  {
    id: 3, name: "Study Together", genre: "Study / Focus", description: "Focus with music.",
    quote: "Silence, but with a soundtrack.", coverKey: "study", trackId: "t3",
    locked: true, password: "focus", owner: "Dana",
    seed: ["Study Together is in focus mode. Mics down, timers up. 📚"],
  },
  {
    id: 4, name: "Music Hub", genre: "Music / Share", description: "Discover new sounds.",
    quote: "Drop the track that ruined you.", coverKey: "music", trackId: "t4",
    locked: false, password: "", owner: "Mika",
    seed: ["Music Hub — drop the track that ruined you. 🎵"],
  },
  {
    id: 5, name: "Late Night", genre: "Ambient / Sleep", description: "Nobody talks after 2AM.",
    quote: "Nobody talks after 2AM.", coverKey: "night", trackId: "t5",
    locked: false, password: "", owner: "Renz",
    seed: ["Late Night. Nobody talks after 2AM. 🌙"],
  },
];

/** First-boot demo data so the API matches the shipped frontend seed. */
export async function seedRooms() {
  const existing = await db().all("rooms");
  if (existing.length > 0) return existing;

  const owners = new Map();
  for (const name of OWNERS) {
    owners.set(name, await User.upsert(name, null));
  }

  for (const entry of ROOMS) {
    const owner = owners.get(entry.owner);
    const row = await Room.create(entry, owner.id);

    // Room.create() assigns a timestamp id; keep the demo ids stable instead.
    if (Number(row.id) !== entry.id) {
      await db().update("rooms", { id: row.id }, { id: entry.id });
      await db().update("room_members", { room_id: row.id }, { room_id: entry.id });
    }

    for (const text of entry.seed) {
      await Message.create({ roomId: entry.id, userId: null, kind: "system", body: text });
    }
  }

  console.log(`Seeded ${ROOMS.length} rooms and ${OWNERS.length} users.`);
  return db().all("rooms");
}
