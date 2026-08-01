/* Music catalog client. All catalog traffic goes through our own API, which
   talks to Audius and normalises the payloads. Stream URLs come back as paths
   so the same build works whether the API is on another port or same-origin. */

import { apiBase } from "./api";

const CACHE_TTL = 3 * 60 * 1000;
const CACHE_MAX = 64;

export const PAGE_SIZE = 50;

export class MusicApiError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "MusicApiError";
    this.cause = cause;
  }
}

export const GENRES = [
  { id: "chill", label: "Chill Vibes", accent: "#38bdf8" },
  { id: "lofi", label: "Lo-fi Beats", accent: "#a855f7" },
  { id: "pop", label: "Pop Hits", accent: "#ec4899" },
  { id: "hiphop", label: "Hip Hop", accent: "#f59e0b" },
  { id: "rock", label: "Rock Classics", accent: "#ef4444" },
  { id: "electronic", label: "Electronic", accent: "#22d3ee" },
];

export const SORTS = [
  { id: "popular", label: "Most Popular" },
  { id: "title", label: "Title A–Z" },
  { id: "artist", label: "Artist A–Z" },
  { id: "newest", label: "Newest First" },
  { id: "longest", label: "Longest First" },
];

const cache = new Map();

function cacheRead(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function cacheWrite(key, body) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), body });
}

/** The API returns stream paths; resolve them against wherever the API lives. */
function absolute(url) {
  if (!url) return "";
  return url.startsWith("/") ? `${apiBase()}${url}` : url;
}

function hydrate(song) {
  return { ...song, src: absolute(song.src) };
}

async function request(path, params = {}, signal) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const url = `${apiBase()}/api/music${path}${query.size ? `?${query}` : ""}`;

  const cached = cacheRead(url);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new MusicApiError("Cannot reach the SOMPO music API. Is the backend running?", error);
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new MusicApiError(detail?.error || `Music API returned ${response.status}.`);
  }

  const body = await response.json();
  cacheWrite(url, body);
  return body;
}

export function sortSongs(songs, sortId) {
  const copy = [...songs];

  if (sortId === "popular") copy.sort((a, b) => (b.plays || 0) - (a.plays || 0));
  else if (sortId === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortId === "artist") copy.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
  else if (sortId === "newest") copy.sort((a, b) => b.releasedAt - a.releasedAt);
  else if (sortId === "longest") copy.sort((a, b) => b.duration - a.duration);

  return copy;
}

export async function fetchSongs({ query, genreId, limit = 100, signal } = {}) {
  const body = await request("/tracks", { query, genre: genreId, limit }, signal);
  return (body.tracks || []).map(hydrate);
}

export async function fetchUnderground({ limit = 100, signal } = {}) {
  const body = await request("/underground", { limit }, signal);
  return (body.tracks || []).map(hydrate);
}

export async function fetchArtists({ query, signal } = {}) {
  if (!query?.trim()) return [];
  const body = await request("/artists", { query, limit: 32 }, signal);
  return body.artists || [];
}

export async function fetchArtistTracks(artistId, { signal } = {}) {
  const body = await request(`/artists/${encodeURIComponent(artistId)}/tracks`, { limit: 100 }, signal);
  return (body.tracks || []).map(hydrate);
}

export async function fetchPlaylists({ query, signal } = {}) {
  const body = await request("/playlists", { query: query?.trim() || "chill", limit: 32 }, signal);
  return body.playlists || [];
}

export async function fetchPlaylistTracks(playlistId, { signal } = {}) {
  const body = await request(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {}, signal);
  return (body.tracks || []).map(hydrate);
}

/** Cheap cover for a genre card: first artwork in that genre's trending feed. */
export async function fetchGenreArt(genreId, { signal } = {}) {
  const body = await request("/tracks", { genre: genreId, limit: 1 }, signal);
  return body.tracks?.[0]?.cover || "";
}
