/**
 * Audius transport.
 *
 * Audius has no single API host — api.audius.co hands back a pool of discovery
 * nodes and any one of them can be slow or down. Every request goes through
 * `get()`, which walks the pool until one answers and remembers the winner for
 * the next call. Responses are cached by URL so a busy music screen does not
 * hammer the network.
 */

import axios from "axios";

const REGISTRY = "https://api.audius.co";
const FALLBACK_NODES = [
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
];

const NODE_TTL = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;
const CACHE_MAX = 240;

export const APP_NAME = process.env.AUDIUS_APP_NAME || "SOMPO TEAM";

const client = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    Accept: "application/json",
    ...(process.env.AUDIUS_API_KEY ? { "X-API-KEY": process.env.AUDIUS_API_KEY } : {}),
  },
});

let nodes = [...FALLBACK_NODES];
let nodesFetchedAt = 0;
let preferred = 0;

const cache = new Map();

export class AudiusError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "AudiusError";
    this.status = status;
  }
}

async function refreshNodes() {
  if (Date.now() - nodesFetchedAt < NODE_TTL) return nodes;

  try {
    const { data } = await client.get(REGISTRY, { timeout: 4000 });
    const list = Array.isArray(data?.data) ? data.data.filter(Boolean) : [];
    if (list.length) {
      nodes = [...new Set([...list, ...FALLBACK_NODES])];
      preferred = 0;
    }
  } catch {
    /* Registry down: keep whatever pool we already have. */
  }

  nodesFetchedAt = Date.now();
  return nodes;
}

function cacheKey(path, params) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  query.sort();
  return `${path}?${query}`;
}

function cacheRead(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function cacheWrite(key, body, ttl) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { body, expires: Date.now() + ttl });
}

/** Base URL of the node currently answering fastest. */
export async function activeNode() {
  const pool = await refreshNodes();
  return pool[preferred % pool.length];
}

/**
 * GET an Audius v1 path with node failover and response caching.
 * @param {string} path  e.g. "/v1/tracks/trending"
 */
export async function get(path, params = {}, { ttl = 120_000 } = {}) {
  const key = cacheKey(path, params);
  const cached = cacheRead(key);
  if (cached) return cached;

  const pool = await refreshNodes();
  const query = { app_name: APP_NAME, ...params };

  let lastError = null;

  for (let attempt = 0; attempt < pool.length && attempt < 4; attempt += 1) {
    const index = (preferred + attempt) % pool.length;
    const node = pool[index];

    try {
      const { data } = await client.get(`${node}${path}`, { params: query });
      preferred = index;
      cacheWrite(key, data, ttl);
      return data;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        throw new AudiusError(`Audius rejected the request (${status}).`, status);
      }
    }
  }

  throw new AudiusError(
    `No Audius discovery node answered: ${lastError?.message || "unknown error"}`,
  );
}

/** Direct, CORS-open stream URL the browser can hand straight to an <audio>. */
export function streamUrl(node, trackId) {
  return `${node}/v1/tracks/${encodeURIComponent(trackId)}/stream?app_name=${encodeURIComponent(APP_NAME)}`;
}
