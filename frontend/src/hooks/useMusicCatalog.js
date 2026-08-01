import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchArtists, fetchPlaylists, fetchSongs, fetchUnderground } from "../services/musicApi";

const DEBOUNCE_MS = 350;
const EMPTY = [];

const LOADERS = {
  songs: fetchSongs,
  artists: fetchArtists,
  playlists: fetchPlaylists,
  underground: fetchUnderground,
};

/**
 * Debounced, abortable catalog fetch. Loading is derived from the request key
 * rather than set inside the effect, so a new query reads as loading on the
 * very first render instead of one frame later. `reload` bumps the key so the
 * retry button can refetch identical inputs.
 */
export default function useMusicCatalog({ resource = "songs", query = "", genreId = null, enabled = true }) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, items: EMPTY, error: null });

  const key = useMemo(
    () => (enabled ? `${resource}|${query.trim()}|${genreId ?? ""}|${nonce}` : null),
    [resource, query, genreId, nonce, enabled],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!key) return undefined;

    const load = LOADERS[resource];
    if (!load) return undefined;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      load({ query, genreId, signal: controller.signal })
        .then((items) => {
          if (controller.signal.aborted) return;
          setResult({ key, items, error: null });
        })
        .catch((error) => {
          if (controller.signal.aborted || error.name === "AbortError") return;
          setResult({ key, items: EMPTY, error: error.message || "Something went wrong loading music." });
        });
    }, query.trim() ? DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, resource, query, genreId]);

  const settled = result.key === key;

  return {
    items: settled ? result.items : EMPTY,
    loading: Boolean(key) && !settled,
    error: settled ? result.error : null,
    reload,
  };
}
