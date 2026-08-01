import { COVERS, coverFor } from "../data/images";

/** Remote catalog tracks carry an absolute cover URL; seeded tracks carry a key. */
export function artFor(track, fallbackText = "") {
  if (!track) return coverFor("music", fallbackText);
  if (track.cover) return track.cover;
  if (track.coverKey === "album") return COVERS.album;
  return coverFor(track.coverKey, track.title || fallbackText);
}
