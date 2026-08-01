import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { GENRES } from "../services/musicApi";

const MusicLibraryContext = createContext(null);

const LIKES_KEY = "sompo.music.likes";
const RECENT_KEY = "sompo.music.recent";
const RECENT_MAX = 60;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function MusicLibraryProvider({ children }) {
  const [likedSongs, setLikedSongs] = useState(() => load(LIKES_KEY, []));
  const [recentSongs, setRecentSongs] = useState(() => load(RECENT_KEY, []));

  useEffect(() => {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentSongs));
  }, [recentSongs]);

  const likedIds = useMemo(() => new Set(likedSongs.map((s) => s.id)), [likedSongs]);

  const isLiked = useCallback((id) => likedIds.has(id), [likedIds]);

  const toggleLike = useCallback((song) => {
    if (!song?.id) return;
    setLikedSongs((current) =>
      current.some((s) => s.id === song.id)
        ? current.filter((s) => s.id !== song.id)
        : [song, ...current],
    );
  }, []);

  const pushRecent = useCallback((song) => {
    if (!song?.id || !song?.remote) return;
    setRecentSongs((current) =>
      [song, ...current.filter((s) => s.id !== song.id)].slice(0, RECENT_MAX),
    );
  }, []);

  const clearRecent = useCallback(() => setRecentSongs([]), []);

  const playlists = useMemo(
    () => [
      {
        id: "liked",
        label: "Liked Songs",
        subtitle: `${likedSongs.length} song${likedSongs.length === 1 ? "" : "s"}`,
        accent: "#a855f7",
        songs: likedSongs,
      },
      ...GENRES.map((genre) => ({
        id: genre.id,
        label: genre.label,
        subtitle: "Catalog mix",
        accent: genre.accent,
        genreId: genre.id,
      })),
    ],
    [likedSongs],
  );

  const value = useMemo(
    () => ({ likedSongs, recentSongs, isLiked, toggleLike, pushRecent, clearRecent, playlists }),
    [likedSongs, recentSongs, isLiked, toggleLike, pushRecent, clearRecent, playlists],
  );

  return (
    <MusicLibraryContext.Provider value={value}>{children}</MusicLibraryContext.Provider>
  );
}

export function useMusicLibrary() {
  const ctx = useContext(MusicLibraryContext);
  if (!ctx) throw new Error("useMusicLibrary must be used inside MusicLibraryProvider");
  return ctx;
}
