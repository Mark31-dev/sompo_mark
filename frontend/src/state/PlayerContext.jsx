import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TRACKS } from "../data/seed";

const PlayerContext = createContext(null);

const STORAGE_KEY = "sompo.player";
const REGISTRY_MAX = 600;
const MAX_CONSECUTIVE_FAILURES = 4;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function shuffled(ids, keepFirst) {
  const rest = ids.filter((id) => id !== keepFirst);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return keepFirst ? [keepFirst, ...rest] : rest;
}

/** Newest entries win when the catalog registry is trimmed. */
function trimmed(map) {
  if (map.size <= REGISTRY_MAX) return map;
  const entries = [...map.entries()].slice(map.size - REGISTRY_MAX);
  return new Map(entries);
}

export function PlayerProvider({ children, onTrackStart }) {
  const [settings] = useState(loadSettings);

  const [audioEl] = useState(() => {
    if (typeof Audio === "undefined") return null;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.src = TRACKS[0].src;
    return audio;
  });

  const audioRef = useRef(audioEl);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainRef = useRef(null);
  const freqRef = useRef(new Uint8Array(64));
  const waveRef = useRef(new Uint8Array(128));
  const failuresRef = useRef(0);

  const [catalog, setCatalog] = useState(() => new Map());
  const [queue, setQueue] = useState(() => TRACKS.map((t) => t.id));
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(settings.volume ?? 0.75);
  const [muted, setMuted] = useState(settings.muted ?? false);
  const [shuffle, setShuffle] = useState(settings.shuffle ?? false);
  const [repeat, setRepeat] = useState(settings.repeat ?? "all");
  const [ready, setReady] = useState(false);

  const resolveTrack = useCallback(
    (id) => catalog.get(id) || TRACKS.find((t) => t.id === id) || null,
    [catalog],
  );

  const track = useMemo(
    () => catalog.get(trackId) || TRACKS.find((t) => t.id === trackId) || TRACKS[0],
    [catalog, trackId],
  );

  const register = useCallback((songs) => {
    const list = Array.isArray(songs) ? songs : [songs];
    const incoming = list.filter((song) => song?.id && song?.src);
    if (!incoming.length) return;

    setCatalog((current) => {
      const next = new Map(current);
      for (const song of incoming) {
        next.delete(song.id);
        next.set(song.id, song);
      }
      return trimmed(next);
    });
  }, []);

  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    gain.gain.value = muted ? 0 : volume;

    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    gainRef.current = gain;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
    waveRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      setDuration(audio.duration || 0);
      setReady(true);
      setLoading(false);
      failuresRef.current = 0;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume, muted, shuffle, repeat }),
    );
  }, [volume, muted, shuffle, repeat]);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    ensureGraph();
    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume();
    }

    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }, [ensureGraph]);

  const loadTrack = useCallback(
    (nextId, autoplay = true) => {
      const audio = audioRef.current;
      const next = resolveTrack(nextId);
      if (!audio || !next) return;

      if (next.id !== trackId) {
        audio.src = next.src;
        audio.currentTime = 0;
        setTrackId(next.id);
        setCurrentTime(0);
        setDuration(0);
        setLoading(true);
        onTrackStart?.(next);
      }

      if (autoplay) startPlayback();
    },
    [trackId, startPlayback, onTrackStart, resolveTrack],
  );

  /** Replaces the queue with a catalog result set and starts one of its songs. */
  const playSongs = useCallback(
    (songs, startId) => {
      const list = (Array.isArray(songs) ? songs : [songs]).filter((s) => s?.id && s?.src);
      if (!list.length) return;

      const first = list.find((s) => s.id === startId) || list[0];

      setCatalog((current) => {
        const next = new Map(current);
        for (const song of list) {
          next.delete(song.id);
          next.set(song.id, song);
        }
        return trimmed(next);
      });
      setQueue(list.map((s) => s.id));

      const audio = audioRef.current;
      if (!audio) return;

      if (first.id === trackId) {
        startPlayback();
        return;
      }

      audio.src = first.src;
      audio.currentTime = 0;
      setTrackId(first.id);
      setCurrentTime(0);
      setDuration(0);
      setLoading(true);
      onTrackStart?.(first);
      startPlayback();
    },
    [trackId, startPlayback, onTrackStart],
  );

  const playRoom = useCallback(
    (room) => {
      const nextId = room?.trackId && TRACKS.some((t) => t.id === room.trackId)
        ? room.trackId
        : TRACKS[Math.abs(Number(room?.id) || 0) % TRACKS.length].id;

      setQueue(TRACKS.map((t) => t.id));

      if (nextId === trackId) {
        startPlayback();
        return;
      }
      loadTrack(nextId, true);
    },
    [loadTrack, startPlayback, trackId],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) startPlayback();
    else audio.pause();
  }, [startPlayback]);

  const step = useCallback(
    (delta) => {
      const order = shuffle ? shuffled(queue, trackId) : queue;
      if (!order.length) return;
      const index = order.indexOf(trackId);
      const nextIndex = (index + delta + order.length) % order.length;
      loadTrack(order[nextIndex], true);
    },
    [queue, shuffle, trackId, loadTrack],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    step(-1);
  }, [step]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        startPlayback();
        return;
      }

      const order = shuffle ? shuffled(queue, trackId) : queue;
      const index = order.indexOf(trackId);
      const isLast = index === order.length - 1;

      if (isLast && repeat === "off") {
        setPlaying(false);
        return;
      }
      step(1);
    };

    /* A dead preview URL should not stall the queue, but a dead network
       must not spin through the whole result set either. */
    const onError = () => {
      setLoading(false);
      failuresRef.current += 1;
      if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setPlaying(false);
        return;
      }
      step(1);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [repeat, shuffle, queue, trackId, step, startPlayback]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const clamped = Math.min(Math.max(seconds, 0), audio.duration || 0);
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const nudge = useCallback(
    (delta) => seek((audioRef.current?.currentTime || 0) + delta),
    [seek],
  );

  const setVolume = useCallback((value) => {
    const clamped = Math.min(Math.max(value, 0), 1);
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((current) =>
      current === "off" ? "all" : current === "all" ? "one" : "off",
    );
  }, []);

  const getFrequencyData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    analyser.getByteFrequencyData(freqRef.current);
    return freqRef.current;
  }, []);

  const getWaveformData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    analyser.getByteTimeDomainData(waveRef.current);
    return waveRef.current;
  }, []);

  const value = useMemo(
    () => ({
      tracks: TRACKS,
      track,
      trackId,
      queue,
      setQueue,
      playing,
      loading,
      ready,
      currentTime,
      duration,
      progress: duration ? currentTime / duration : 0,
      volume,
      muted,
      shuffle,
      repeat,
      toggle,
      next,
      previous,
      seek,
      nudge,
      setVolume,
      setMuted,
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle: () => setShuffle((s) => !s),
      cycleRepeat,
      loadTrack,
      playRoom,
      playSongs,
      register,
      resolveTrack,
      getFrequencyData,
      getWaveformData,
    }),
    [
      track, trackId, queue, playing, loading, ready, currentTime, duration, volume,
      muted, shuffle, repeat, toggle, next, previous, seek, nudge, setVolume,
      cycleRepeat, loadTrack, playRoom, playSongs, register, resolveTrack,
      getFrequencyData, getWaveformData,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
