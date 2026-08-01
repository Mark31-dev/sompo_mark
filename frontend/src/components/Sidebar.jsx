import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home as HomeIcon,
  Compass,
  Music,
  Users,
  Heart,
  Clock,
  History,
  Headphones,
  ListMusic,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Crown,
  DoorOpen,
} from "lucide-react";

import Avatar from "./Avatar";
import Visualizer from "./Visualizer";
import SidebarPlayer from "./SidebarPlayer";
import useClickOutside from "../hooks/useClickOutside";
import { useApp } from "../state/AppContext";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePlayer } from "../state/PlayerContext";

function NavGroup({ items, view, onView }) {
  return (
    <nav className="sp-nav">
      {items.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          type="button"
          className={view === id ? "sp-nav-item is-active" : "sp-nav-item"}
          onClick={() => onView(id)}
        >
          <Icon size={17} />
          {label}
          {count > 0 && <span className="sp-nav-count">{count}</span>}
        </button>
      ))}
    </nav>
  );
}

function Sidebar({ view, onView, onCreateRoom }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false), menuOpen);

  const { user, rooms, favorites, recents, history, joinedRoom, leaveRoom, isOwner } = useApp();
  const { likedSongs, recentSongs } = useMusicLibrary();
  const { playing } = usePlayer();

  const mine = rooms.filter(isOwner).length;

  const mainNav = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "rooms", label: "My Rooms", icon: Music, count: mine },
    { id: "members", label: "Members", icon: Users },
    { id: "music", label: "Music", icon: Music },
  ];

  const libraryNav = [
    { id: "favsongs", label: "Favorite Songs", icon: Heart, count: likedSongs.length },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "played", label: "Recently Played", icon: Clock, count: recentSongs.length },
    { id: "favorites", label: "Favorite Rooms", icon: Heart, count: favorites.length },
    { id: "recent", label: "Recently Joined", icon: Clock, count: recents.length },
    { id: "history", label: "Listening History", icon: History, count: history.length },
  ];

  const accountNav = [
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="sp-sidebar">
      <div className="sp-brand">
        <span className="sp-brand-icon">
          <Headphones size={19} />
        </span>
        <span className="sp-brand-text">
          <span>SOMPO</span>
          <span>TEAM</span>
        </span>
      </div>

      <div className="sp-side-scroll">
        <p className="sp-side-label">MAIN</p>
        <NavGroup items={mainNav} view={view} onView={onView} />

        <p className="sp-side-label">YOUR LIBRARY</p>
        <NavGroup items={libraryNav} view={view} onView={onView} />

        <p className="sp-side-label">ACCOUNT</p>
        <NavGroup items={accountNav} view={view} onView={onView} />

        {joinedRoom && (
          <div className="sp-joined">
            <div className="sp-joined-head">
              <span className="sp-dot" />
              In room
              <Visualizer bars={8} height={14} gap={2} className="sp-joined-vis" idle={!playing} />
            </div>
            <strong>{joinedRoom.name}</strong>
            <button type="button" onClick={leaveRoom}>
              <DoorOpen size={13} />
              Leave room
            </button>
          </div>
        )}
      </div>

      <div className="sp-side-dock">
        <button type="button" className="sp-create" onClick={onCreateRoom}>
          <Plus size={18} />
          Create Room
        </button>

        <div className="sp-user-wrap" ref={menuRef}>
          {menuOpen && (
            <div className="sp-user-menu">
              <button type="button" onClick={() => { setMenuOpen(false); onView("profile"); }}>
                <User size={14} />
                View profile
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); onView("played"); }}>
                <History size={14} />
                Recently played
              </button>
              <button type="button" className="is-danger" onClick={() => navigate("/")}>
                <LogOut size={14} />
                Log out
              </button>
            </div>
          )}

          <button
            type="button"
            className="sp-user"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Avatar name={user.name} avatarKey={user.avatarKey} size={38} status="online" />
            <span className="sp-user-meta">
              <span className="sp-user-name">
                {user.name}
                {user.owner && <Crown size={13} />}
              </span>
              <span className="sp-user-status">
                <span className="sp-dot" />
                Online
              </span>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>

        <SidebarPlayer onOpen={() => onView("music")} />
      </div>
    </aside>
  );
}

export default Sidebar;
