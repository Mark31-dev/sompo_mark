/**
 * Seed data.
 *
 * This is the offline half of the app: everything the UI needs before the API
 * answers, and everything it keeps working from when the API is down. Rooms
 * created at runtime are merged over DEFAULT_ROOMS in AppContext.
 */

/* Audio lives in public/, so it is referenced by URL rather than imported.
   Going through BASE_URL keeps it correct if the app is ever served from a
   subdirectory instead of the domain root. */
const audio = (file) => `${import.meta.env.BASE_URL}audio/${file}`;

const sunsetLover = audio("sunset-lover.mp3");
const neonAlley = audio("neon-alley.mp3");
const paperPlanes = audio("paper-planes.mp3");
const crowdSurf = audio("crowd-surf.mp3");
const rain3am = audio("3am-rain.mp3");

/** The signed-in identity. Rooms owned by this name show the owner controls. */
export const ME = "Joshua";

export const DEFAULT_PROFILE = {
  name: ME,
  avatarKey: "joshua",
  code: "",
  activatedAt: null,
  serverId: null,
};

export const WEATHER = { temp: 29, city: "Manila" };

export const ACTIVATION_CODES = ["SOMPO2026", "TEAMVIBES", "CHILL-01", "LOFI-2026"];

export const QUOTES = [
  "Music is the shorthand of emotion.",
  "A room is just people agreeing on a soundtrack.",
  "Turn it up until the neighbours join.",
  "Nothing is louder than a shared song at 3am.",
  "Some nights the playlist knows before you do.",
];

/**
 * Home and Discover filter rooms with `active.test(haystack)`, where the
 * haystack is `name genre description` lowercased.
 */
export const CATEGORIES = [
  { id: "all", label: "All", test: () => true },
  { id: "chill", label: "Chill", emoji: "🍃", test: (s) => /chill|lo-?fi|relax|ambient/.test(s) },
  { id: "study", label: "Study", emoji: "📚", test: (s) => /study|focus|deep work|read/.test(s) },
  { id: "gaming", label: "Gaming", emoji: "🎮", test: (s) => /gaming|game|squad|raid/.test(s) },
  { id: "party", label: "Party", emoji: "🎉", test: (s) => /party|hype|dance|club|edm/.test(s) },
  { id: "latenight", label: "Late Night", emoji: "🌙", test: (s) => /late|night|3am|midnight|rain/.test(s) },
];

export const TRACKS = [
  {
    id: "t-sunset",
    title: "Sunset Lover",
    artist: "Petit Biscuit",
    genre: "Chill",
    coverKey: "album",
    src: sunsetLover,
  },
  {
    id: "t-neon",
    title: "Neon Alley",
    artist: "SOMPO Sessions",
    genre: "Lo-fi",
    coverKey: "late",
    src: neonAlley,
  },
  {
    id: "t-paper",
    title: "Paper Planes",
    artist: "SOMPO Sessions",
    genre: "Study",
    coverKey: "study",
    src: paperPlanes,
  },
  {
    id: "t-crowd",
    title: "Crowd Surf",
    artist: "SOMPO Sessions",
    genre: "Party",
    coverKey: "gaming",
    src: crowdSurf,
  },
  {
    id: "t-rain",
    title: "3AM Rain",
    artist: "SOMPO Sessions",
    genre: "Ambient",
    coverKey: "chill",
    src: rain3am,
  },
];

export const DEFAULT_ROOMS = [
  {
    id: 1,
    name: "Chill Vibes",
    genre: "Lo-fi / Relax",
    description: "Slow beats, soft lights, no pressure. Drop in and breathe.",
    quote: "Nothing to prove in here. Just stay a while.",
    coverKey: "chill",
    trackId: "t-sunset",
    owner: ME,
    members: 24,
    locked: false,
    password: "",
    createdAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
  },
  {
    id: 2,
    name: "Gaming Lounge",
    genre: "Gaming / Chat",
    description: "Queue up, talk trash, keep the music loud between matches.",
    quote: "One more game. That is always the lie.",
    coverKey: "gaming",
    trackId: "t-crowd",
    owner: "Renz",
    members: 32,
    locked: false,
    password: "",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 3,
    name: "Study Together",
    genre: "Study / Focus",
    description: "Cameras off, timers on. Fifty minutes then everyone stretches.",
    quote: "Silence, but the kind you share.",
    coverKey: "study",
    trackId: "t-paper",
    owner: ME,
    members: 18,
    locked: true,
    password: "focus",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 4,
    name: "Music Hub",
    genre: "Music / Share",
    description: "Bring one track nobody here has heard. That is the only rule.",
    quote: "Everyone leaves with something new.",
    coverKey: "music",
    trackId: "t-neon",
    owner: "Mika",
    members: 27,
    locked: false,
    password: "",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: 5,
    name: "Late Night",
    genre: "Ambient / Rain",
    description: "For the ones still awake. Rain loops and long conversations.",
    quote: "The best talks happen after midnight.",
    coverKey: "late",
    trackId: "t-rain",
    owner: ME,
    members: 12,
    locked: false,
    password: "",
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
  },
];

export const MEMBERS = [
  { id: 1, name: ME, avatarKey: "joshua", status: "online", roomId: 1, owner: true, isMe: true },
  { id: 2, name: "Alyssa", avatarKey: "alyssa", status: "online", roomId: 1, owner: false },
  { id: 3, name: "Mika", avatarKey: "mika", status: "online", roomId: 4, owner: true },
  { id: 4, name: "Kira", avatarKey: "kira", status: "idle", roomId: 3, owner: false },
  { id: 5, name: "Mark", avatarKey: "mark", status: "online", roomId: 5, owner: false },
  { id: 6, name: "Renz", avatarKey: "renz", status: "offline", roomId: 2, owner: true },
];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const SEED_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Renz started Gaming Lounge",
    body: "32 people are in there right now.",
    at: Date.now() - 12 * MINUTE,
    read: false,
  },
  {
    id: "n2",
    title: "Mika added a track to Music Hub",
    body: "Neon Alley is now the room soundtrack.",
    at: Date.now() - 2 * HOUR,
    read: false,
  },
  {
    id: "n3",
    title: "Study Together starts in 20 minutes",
    body: "Kira set a timer for the focus block.",
    at: Date.now() - 5 * HOUR,
    read: true,
  },
];

export const SEED_MESSAGES = [
  {
    id: "m1",
    from: "Alyssa",
    avatarKey: "alyssa",
    text: "sunset lover on repeat again, sorry not sorry",
    at: Date.now() - 8 * MINUTE,
    unread: true,
  },
  {
    id: "m2",
    from: "Renz",
    avatarKey: "renz",
    text: "lounge is full, hop in when you can",
    at: Date.now() - 40 * MINUTE,
    unread: true,
  },
  {
    id: "m3",
    from: "Mark",
    avatarKey: "mark",
    text: "pushed the settings screen, check it",
    at: Date.now() - 3 * HOUR,
    unread: false,
  },
];
