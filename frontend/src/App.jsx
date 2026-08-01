import { useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Splash from "./pages/Splash";
import Activation from "./pages/Activation";
import Home from "./pages/Home";
import Room from "./pages/Room";
import { AppProvider, useApp } from "./state/AppContext";
import { MusicLibraryProvider, useMusicLibrary } from "./state/MusicLibrary";
import { PlayerProvider } from "./state/PlayerContext";
import { PreferencesProvider } from "./state/Preferences";

/** Keeps one audio graph alive across every route. */
function PlayerBridge({ children }) {
  const { recordListen } = useApp();
  const { pushRecent } = useMusicLibrary();

  const onTrackStart = useCallback(
    (track) => {
      recordListen(track);
      pushRecent(track);
    },
    [recordListen, pushRecent],
  );

  return <PlayerProvider onTrackStart={onTrackStart}>{children}</PlayerProvider>;
}

function RequireActivation({ children }) {
  const { isActivated } = useApp();
  return isActivated ? children : <Navigate to="/activate" replace />;
}

/** Providers + route table, router-agnostic so a standalone build can host it. */
export function AppShell() {
  return (
    <PreferencesProvider>
      <AppProvider>
        <MusicLibraryProvider>
          <PlayerBridge>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/activate" element={<Activation />} />

              <Route
                path="/home"
                element={
                  <RequireActivation>
                    <Home />
                  </RequireActivation>
                }
              />

              <Route
                path="/room/:id"
                element={
                  <RequireActivation>
                    <Room />
                  </RequireActivation>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PlayerBridge>
        </MusicLibraryProvider>
      </AppProvider>
    </PreferencesProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
