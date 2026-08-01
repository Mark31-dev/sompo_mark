/**
 * Image registry.
 *
 * Everything ships from src/assets so Vite fingerprints and inlines the small
 * files at build time. `coverFor` and `avatarFor` never return undefined —
 * an unknown key falls back to a deterministic pick derived from the name, so
 * a room created at runtime always looks like it belongs.
 */

import featuredChill from "../assets/covers/featured_chill_vibes.jpg";
import chillVibes from "../assets/covers/chill_vibes.jpg";
import albumSunsetLover from "../assets/covers/album_sunset_lover.jpg";
import gamingLounge from "../assets/covers/gaming_lounge.jpg";
import studyTogether from "../assets/covers/study_together.jpg";
import musicHub from "../assets/covers/music_hub.jpg";
import lateNight from "../assets/covers/late_night.jpg";

import alyssa from "../assets/avatars/alyssa.jpg";
import joshua from "../assets/avatars/joshua.jpg";
import kira from "../assets/avatars/kira.jpg";
import mark from "../assets/avatars/mark.jpg";
import mika from "../assets/avatars/mika.jpg";
import renz from "../assets/avatars/renz.jpg";

export const COVERS = {
  chill: chillVibes,
  gaming: gamingLounge,
  study: studyTogether,
  music: musicHub,
  late: lateNight,
  featured: featuredChill,
  album: albumSunsetLover,
};

/** Covers a user may pick for a room — `featured` and `album` are reserved. */
export const COVER_KEYS = ["chill", "gaming", "study", "music", "late"];

export const AVATARS = { joshua, alyssa, mika, kira, mark, renz };

export const AVATAR_KEYS = Object.keys(AVATARS);

function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

function pick(list, seed) {
  if (!seed) return list[0];
  return list[hash(String(seed)) % list.length];
}

export function coverFor(key, seed = "") {
  return COVERS[key] || COVERS[pick(COVER_KEYS, seed)];
}

export function avatarFor(key, seed = "") {
  return AVATARS[key] || AVATARS[pick(AVATAR_KEYS, seed)];
}
