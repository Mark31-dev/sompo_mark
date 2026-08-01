import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import RightRail from "../components/RightRail";
import Toasts from "../components/Toasts";
import {
  CreateRoomModal,
  EditRoomModal,
  PasswordModal,
  ConfirmDeleteModal,
} from "../components/RoomModals";
import RoomGate from "../components/RoomGate";

import HomeView from "../views/HomeView";
import DiscoverView from "../views/DiscoverView";
import MyRoomsView from "../views/MyRoomsView";
import MembersView from "../views/MembersView";
import FavoritesView from "../views/FavoritesView";
import RecentView from "../views/RecentView";
import HistoryView from "../views/HistoryView";
import MusicView from "../views/MusicView";
import ProfileView from "../views/ProfileView";
import SettingsView from "../views/SettingsView";

import { WEATHER } from "../data/seed";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";
import { usePreferences } from "../state/Preferences";
import { dateParts } from "../lib/time";

import { markUnlocked, needsPassword } from "../lib/unlocked";

import "../styles/theme.css";
import "../styles/ui.css";
import "../styles/dashboard.css";
import "../styles/shell.css";
import "../styles/music.css";
import "../styles/settings.css";

const TITLES = {
  home: "Soundtrip. Chat. Connect.",
  discover: "Find a room that fits tonight.",
  rooms: "Everything you host, in one place.",
  members: "Who's around right now.",
  favorites: "The rooms you keep coming back to.",
  recent: "Where you've been lately.",
  history: "What you've been playing.",
};

const FULL_BLEED = new Set(["music", "favsongs", "playlists", "played", "settings", "profile"]);
const BARE = new Set(["settings", "profile"]);

function Dashboard() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const {
    user, isOwner, createRoom, updateRoom, deleteRoom, joinRoom, recordVisit,
    pushToast, verifyRoomPassword,
  } = useApp();
  const { playRoom, toggle, nudge, next, previous, toggleMute } = usePlayer();
  const { prefs } = usePreferences();

  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [securing, setSecuring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [locked, setLocked] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const enterRoom = useCallback(
    (room) => {
      joinRoom(room);
      playRoom(room);
      navigate(`/room/${room.id}`);
    },
    [joinRoom, playRoom, navigate],
  );

  const openRoom = useCallback(
    (room) => {
      if (needsPassword(room, isOwner(room))) {
        setLocked(room);
        return;
      }
      enterRoom(room);
    },
    [isOwner, enterRoom],
  );

  const openRoomPage = useCallback(
    (room) => {
      localStorage.setItem("selectedRoom", JSON.stringify(room));
      recordVisit(room.id);
      navigate(`/room/${room.id}`);
    },
    [navigate, recordVisit],
  );

  const ctl = useMemo(
    () => ({
      setView,
      openRoom,
      openRoomPage,
      openCreate: () => setCreating(true),
      editRoom: setEditing,
      securityRoom: setSecuring,
      confirmDelete: setDeleting,
    }),
    [openRoom, openRoomPage],
  );

  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) return;

      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        event.shiftKey ? next() : nudge(5);
      } else if (event.key === "ArrowLeft") {
        event.shiftKey ? previous() : nudge(-5);
      } else if (event.key.toLowerCase() === "m") {
        toggleMute();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, nudge, next, previous, toggleMute]);

  const { date, weekday } = dateParts(now);

  const viewProps = { ctl, query, category, onCategory: setCategory };

  const views = {
    home: <HomeView {...viewProps} />,
    discover: <DiscoverView {...viewProps} />,
    rooms: <MyRoomsView {...viewProps} />,
    members: <MembersView {...viewProps} />,
    favorites: <FavoritesView {...viewProps} />,
    recent: <RecentView {...viewProps} />,
    history: <HistoryView {...viewProps} />,
    music: <MusicView mode="browse" initialTab="all" />,
    playlists: <MusicView mode="browse" initialTab="playlists" />,
    favsongs: <MusicView mode="liked" />,
    played: <MusicView mode="played" />,
    profile: <ProfileView {...viewProps} />,
    settings: <SettingsView {...viewProps} />,
  };

  const wide = FULL_BLEED.has(view);
  const bare = BARE.has(view);

  const shellClass = [
    "sompo",
    wide ? "is-wide" : "",
    prefs.darkMode ? "" : "is-light",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClass}>
      <Sidebar view={view} onView={setView} onCreateRoom={() => setCreating(true)} />

      <main className={wide ? "sp-main sp-main--flush" : "sp-main"}>
        {!bare && (
          <Topbar
            query={query}
            onQuery={setQuery}
            onOpenRoom={openRoom}
            onView={setView}
            searchRef={searchRef}
          />
        )}

        {!wide && (
          <div className="sp-hero">
            <div>
              <h1>
                Welcome back, <span>{user.name}</span> <span className="sp-wave">👋</span>
              </h1>
              <p>{TITLES[view]}</p>
            </div>

            <div className="sp-datepill">
              <div>
                <b>{date}</b>
                <span className="sp-sep"> • </span>
                {weekday}
              </div>
              <div className="sp-datepill-row">
                <Cloud size={15} />
                {WEATHER.temp}°C
                <span className="sp-sep">•</span>
                {WEATHER.city}
              </div>
            </div>
          </div>
        )}

        {views[view] || views.home}
      </main>

      {!wide && <RightRail onView={setView} />}

      {creating && (
        <CreateRoomModal
          onClose={() => setCreating(false)}
          onCreate={(payload) => {
            const room = createRoom(payload);
            setCreating(false);
            markUnlocked(room.id);
          }}
        />
      )}

      {editing && (
        <EditRoomModal
          room={editing}
          onClose={() => setEditing(null)}
          onSave={(room) => {
            updateRoom(room);
            setEditing(null);
          }}
        />
      )}

      {securing && (
        <PasswordModal
          room={securing}
          onClose={() => setSecuring(null)}
          onSave={(room) => {
            updateRoom(room, "Room security updated");
            setSecuring(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          room={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(room) => {
            deleteRoom(room.id);
            setDeleting(null);
          }}
        />
      )}

      {locked && (
        <RoomGate
          room={locked}
          verify={verifyRoomPassword}
          onClose={() => setLocked(null)}
          onUnlock={(room) => {
            markUnlocked(room.id);
            setLocked(null);
            pushToast(`Unlocked ${room.name}`);
            enterRoom(room);
          }}
        />
      )}

      <Toasts />
    </div>
  );
}

export default Dashboard;
