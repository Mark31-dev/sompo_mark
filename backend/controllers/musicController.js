/**
 * Music catalog backed by Audius. Everything here normalises Audius payloads
 * into the flat track shape the player already understands, so the frontend
 * never learns what a discovery node is.
 */

import axios from "axios";

import { AudiusError, activeNode, get, streamUrl } from "../lib/audius.js";

const SEARCH_TTL = 300_000;
const TRENDING_TTL = 120_000;

const MAX_LIMIT = 100;

/* Proxy keeps the analyser alive; direct saves this server's bandwidth. */
const PROXY_STREAMS = (process.env.AUDIUS_STREAM_MODE || "proxy").toLowerCase() !== "direct";
const PUBLIC_BASE = (process.env.PUBLIC_API_URL || "").replace(/\/$/, "");

/** Card genres on the music screen mapped to real Audius genre strings. */
export const GENRES = [
  { id: "chill", label: "Chill Vibes", audius: "Downtempo", accent: "#38bdf8" },
  { id: "lofi", label: "Lo-fi Beats", audius: "Lo-Fi", accent: "#a855f7" },
  { id: "pop", label: "Pop Hits", audius: "Pop", accent: "#ec4899" },
  { id: "hiphop", label: "Hip Hop", audius: "Hip-Hop/Rap", accent: "#f59e0b" },
  { id: "rock", label: "Rock Classics", audius: "Rock", accent: "#ef4444" },
  { id: "electronic", label: "Electronic", audius: "Electronic", accent: "#22d3ee" },
];

function genreName(id) {
  return GENRES.find((g) => g.id === id)?.audius || null;
}

function clampLimit(value, fallback = 50) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, MAX_LIMIT);
}

function clampOffset(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function playable(track) {
  return Boolean(
    track
      && track.is_streamable
      && track.is_available
      && !track.is_delete
      && !track.is_unlisted
      && !track.is_stream_gated,
  );
}

function artwork(source, size) {
  if (!source) return "";
  return source[size] || source["480x480"] || source["1000x1000"] || source["150x150"] || "";
}

function primaryGenre(track) {
  return (track.genre || "").split(",")[0].trim();
}

function playbackUrl(track, node) {
  if (!PROXY_STREAMS) return streamUrl(node, track.id);
  return `${PUBLIC_BASE}/api/music/stream/${encodeURIComponent(track.id)}`;
}

function toSong(track, node) {
  return {
    id: `au:${track.id}`,
    audiusId: track.id,
    kind: "song",
    remote: true,
    title: track.title,
    artist: track.user?.name || track.user?.handle || "Unknown artist",
    artistId: track.user?.id || null,
    artistHandle: track.user?.handle || "",
    album: track.album_backlink?.playlist_name || "Single",
    albumId: track.album_backlink?.playlist_id || null,
    genre: primaryGenre(track),
    mood: track.mood || "",
    src: playbackUrl(track, node),
    cover: artwork(track.artwork, "480x480"),
    coverSmall: artwork(track.artwork, "150x150"),
    duration: track.duration || 0,
    plays: track.play_count || 0,
    favorites: track.favorite_count || 0,
    reposts: track.repost_count || 0,
    releasedAt: Date.parse(track.release_date || track.created_at || "") || 0,
    explicit: track.parental_warning_type === "explicit",
    storeUrl: track.permalink ? `https://audius.co${track.permalink}` : "",
  };
}

function toArtist(user) {
  return {
    id: `au-user:${user.id}`,
    audiusId: user.id,
    kind: "artist",
    name: user.name || user.handle,
    handle: user.handle,
    genre: `${user.track_count || 0} tracks`,
    followers: user.follower_count || 0,
    cover: artwork(user.profile_picture, "480x480"),
    storeUrl: user.handle ? `https://audius.co/${user.handle}` : "",
  };
}

function toPlaylist(playlist) {
  return {
    id: `au-list:${playlist.id}`,
    audiusId: playlist.id,
    kind: "playlist",
    title: playlist.playlist_name,
    artist: playlist.user?.name || playlist.user?.handle || "Unknown",
    cover: artwork(playlist.artwork, "480x480"),
    trackCount: playlist.track_count || 0,
    favorites: playlist.favorite_count || 0,
    releasedAt: Date.parse(playlist.created_at || "") || 0,
    storeUrl: playlist.permalink ? `https://audius.co${playlist.permalink}` : "",
  };
}

function songsFrom(list, node) {
  const seen = new Set();
  const songs = [];

  for (const track of list || []) {
    if (!playable(track) || seen.has(track.id)) continue;
    seen.add(track.id);
    songs.push(toSong(track, node));
  }

  return songs;
}

function fail(res, error) {
  if (error instanceof AudiusError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error("[music]", error);
  return res.status(502).json({ error: "The music catalog is unreachable right now." });
}

/** GET /api/music/genres */
export function genres(req, res) {
  res.json({ genres: GENRES.map(({ id, label, accent }) => ({ id, label, accent })) });
}

/**
 * GET /api/music/tracks?query=&genre=&limit=&offset=
 * No query means the trending feed, optionally narrowed to a genre.
 */
export async function tracks(req, res) {
  const query = (req.query.query || "").trim();
  const limit = clampLimit(req.query.limit);
  const offset = clampOffset(req.query.offset);
  const genre = genreName(req.query.genre);

  try {
    const node = await activeNode();

    if (query) {
      const data = await get(
        "/v1/tracks/search",
        { query, limit, offset, genre: genre || undefined },
        { ttl: SEARCH_TTL },
      );
      return res.json({ source: "search", tracks: songsFrom(data.data, node) });
    }

    const data = await get(
      "/v1/tracks/trending",
      { limit, offset, genre: genre || undefined, time: req.query.time || "week" },
      { ttl: TRENDING_TTL },
    );
    return res.json({ source: "trending", tracks: songsFrom(data.data, node) });
  } catch (error) {
    return fail(res, error);
  }
}

/** GET /api/music/underground?limit= */
export async function underground(req, res) {
  try {
    const node = await activeNode();
    const data = await get(
      "/v1/tracks/trending/underground",
      { limit: clampLimit(req.query.limit) },
      { ttl: TRENDING_TTL },
    );
    res.json({ source: "underground", tracks: songsFrom(data.data, node) });
  } catch (error) {
    fail(res, error);
  }
}

/** GET /api/music/tracks/:id */
export async function track(req, res) {
  try {
    const node = await activeNode();
    const data = await get(`/v1/tracks/${encodeURIComponent(req.params.id)}`, {}, { ttl: SEARCH_TTL });

    if (!data?.data || !playable(data.data)) {
      return res.status(404).json({ error: "Track is not streamable." });
    }
    return res.json({ track: toSong(data.data, node) });
  } catch (error) {
    return fail(res, error);
  }
}

/** GET /api/music/artists?query=&limit= */
export async function artists(req, res) {
  const query = (req.query.query || "").trim();
  if (!query) return res.json({ artists: [] });

  try {
    const data = await get(
      "/v1/users/search",
      { query, limit: clampLimit(req.query.limit, 32) },
      { ttl: SEARCH_TTL },
    );
    return res.json({ artists: (data.data || []).map(toArtist) });
  } catch (error) {
    return fail(res, error);
  }
}

/** GET /api/music/artists/:id/tracks */
export async function artistTracks(req, res) {
  try {
    const node = await activeNode();
    const data = await get(
      `/v1/users/${encodeURIComponent(req.params.id)}/tracks`,
      { limit: clampLimit(req.query.limit), sort: "plays" },
      { ttl: SEARCH_TTL },
    );
    return res.json({ tracks: songsFrom(data.data, node) });
  } catch (error) {
    return fail(res, error);
  }
}

/** GET /api/music/playlists?query=&limit= */
export async function playlists(req, res) {
  const query = (req.query.query || "").trim() || "chill";

  try {
    const data = await get(
      "/v1/playlists/search",
      { query, limit: clampLimit(req.query.limit, 32) },
      { ttl: SEARCH_TTL },
    );
    return res.json({ playlists: (data.data || []).map(toPlaylist) });
  } catch (error) {
    return fail(res, error);
  }
}

/** GET /api/music/playlists/:id/tracks */
export async function playlistTracks(req, res) {
  try {
    const node = await activeNode();
    const data = await get(
      `/v1/playlists/${encodeURIComponent(req.params.id)}/tracks`,
      {},
      { ttl: SEARCH_TTL },
    );
    return res.json({ tracks: songsFrom(data.data, node) });
  } catch (error) {
    return fail(res, error);
  }
}

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
];

/**
 * GET /api/music/stream/:id
 *
 * Audius redirects to a content node, and that node sometimes redirects again
 * to R2 object storage which answers WITHOUT an Access-Control-Allow-Origin
 * header. A browser using crossOrigin="anonymous" — which the Web Audio
 * analyser requires — fails the whole load at that hop. Piping the bytes
 * through here puts the response under our own CORS policy, so the visualiser
 * keeps working and seeking still uses real Range requests.
 *
 * Set AUDIUS_STREAM_MODE=direct to hand out node URLs instead and keep the
 * audio bandwidth off this server, at the cost of the analyser.
 */
export async function stream(req, res) {
  /* Media elements cancel Range requests constantly — every seek and every
     track change aborts one. Tie the upstream fetch to the response lifetime
     so those cancellations tear down cleanly instead of surfacing as 502s. */
  const controller = new AbortController();
  const onClientGone = () => controller.abort();
  res.on("close", onClientGone);

  let upstream;
  try {
    const node = await activeNode();

    upstream = await axios.get(streamUrl(node, req.params.id), {
      responseType: "stream",
      maxRedirects: 6,
      timeout: 15_000,
      signal: controller.signal,
      validateStatus: (status) => status < 400,
      headers: {
        ...(req.headers.range ? { Range: req.headers.range } : {}),
        "User-Agent": "SOMPO-TEAM/1.0",
      },
    });
  } catch (error) {
    res.off("close", onClientGone);
    if (controller.signal.aborted || res.destroyed) return undefined;
    if (error.response?.status === 404) return res.status(404).json({ error: "Track not found." });
    return fail(res, error);
  }

  res.status(upstream.status);
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers[name];
    if (value) res.setHeader(name, value);
  }
  if (!upstream.headers["accept-ranges"]) res.setHeader("Accept-Ranges", "bytes");

  upstream.data.on("error", () => {
    if (controller.signal.aborted || res.destroyed || res.writableEnded) return;
    if (!res.headersSent) res.status(502).end();
    else res.destroy();
  });

  return upstream.data.pipe(res);
}
