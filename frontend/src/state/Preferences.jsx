import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const PreferencesContext = createContext(null);

const STORAGE_KEY = "sompo.prefs";

const DEFAULTS = {
  darkMode: true,
  pushNotifications: true,
  roomActivity: false,
  displayName: "",
  tagline: "",
  showOnline: true,
  showListening: true,
  allowInvites: true,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPref = useCallback((key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }));
  }, []);

  const togglePref = useCallback((key) => {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const value = useMemo(() => ({ prefs, setPref, togglePref }), [prefs, setPref, togglePref]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
