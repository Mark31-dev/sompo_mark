import { useMemo, useState } from "react";
import { Search, Bell, Mail, Music, User, X } from "lucide-react";

import Avatar from "./Avatar";
import Visualizer from "./Visualizer";
import useClickOutside from "../hooks/useClickOutside";
import { useApp } from "../state/AppContext";
import { relativeTime } from "../lib/time";

function Topbar({ query, onQuery, onOpenRoom, onView, searchRef }) {
  const {
    user, rooms, members, notifications, messages,
    unreadNotifications, unreadMessages,
    markNotificationsRead, markMessagesRead,
  } = useApp();

  const [panel, setPanel] = useState(null);
  const panelRef = useClickOutside(() => setPanel(null), panel !== null);
  const resultsRef = useClickOutside(() => setPanel(null), panel === "search");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) return { rooms: [], members: [] };

    return {
      rooms: rooms
        .filter((room) => `${room.name} ${room.genre}`.toLowerCase().includes(needle))
        .slice(0, 4),
      members: members
        .filter((member) => member.name.toLowerCase().includes(needle))
        .slice(0, 3),
    };
  }, [query, rooms, members]);

  const showResults = query.trim().length > 0;
  const hasResults = results.rooms.length + results.members.length > 0;

  function openPanel(name) {
    setPanel((current) => (current === name ? null : name));
    if (name === "bell") markNotificationsRead();
    if (name === "mail") markMessagesRead();
  }

  return (
    <header className="sp-topbar">
      <div className="sp-search-wrap" ref={resultsRef}>
        <div className="sp-search">
          <Search size={17} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onFocus={() => setPanel("search")}
            placeholder="Search rooms, people, or vibes..."
          />
          {query && (
            <button type="button" className="sp-search-clear" onClick={() => onQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        {showResults && panel === "search" && (
          <div className="sp-dropdown sp-dropdown--search">
            {!hasResults && <p className="sp-dropdown-empty">No matches for “{query}”.</p>}

            {results.rooms.length > 0 && (
              <>
                <p className="sp-dropdown-label">ROOMS</p>
                {results.rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className="sp-dropdown-row"
                    onClick={() => { setPanel(null); onOpenRoom(room); }}
                  >
                    <span className="sp-dropdown-icon">
                      <Music size={14} />
                    </span>
                    <span>
                      <strong>{room.name}</strong>
                      <small>{room.genre}</small>
                    </span>
                  </button>
                ))}
              </>
            )}

            {results.members.length > 0 && (
              <>
                <p className="sp-dropdown-label">PEOPLE</p>
                {results.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="sp-dropdown-row"
                    onClick={() => { setPanel(null); onView("members"); }}
                  >
                    <Avatar name={member.name} avatarKey={member.avatarKey} size={26} showStatus={false} />
                    <span>
                      <strong>{member.name}</strong>
                      <small>{member.status}</small>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="sp-top-actions" ref={panelRef}>
        <div className="sp-top-slot">
          <button
            type="button"
            className={panel === "bell" ? "sp-icon-btn is-open" : "sp-icon-btn"}
            title="Notifications"
            onClick={() => openPanel("bell")}
          >
            <Bell size={19} />
            {unreadNotifications > 0 && <span className="sp-badge">{unreadNotifications}</span>}
          </button>

          {panel === "bell" && (
            <div className="sp-dropdown">
              <p className="sp-dropdown-label">NOTIFICATIONS</p>
              {notifications.map((item) => (
                <div key={item.id} className="sp-dropdown-row is-static">
                  <span className="sp-dropdown-icon">
                    <Bell size={14} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                  <em>{relativeTime(item.at)}</em>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-top-slot">
          <button
            type="button"
            className={panel === "mail" ? "sp-icon-btn is-open" : "sp-icon-btn"}
            title="Messages"
            onClick={() => openPanel("mail")}
          >
            <Mail size={19} />
            {unreadMessages > 0 && <span className="sp-badge">{unreadMessages}</span>}
          </button>

          {panel === "mail" && (
            <div className="sp-dropdown">
              <p className="sp-dropdown-label">MESSAGES</p>
              {messages.map((item) => (
                <div key={item.id} className="sp-dropdown-row is-static">
                  <Avatar name={item.from} avatarKey={item.avatarKey} size={28} showStatus={false} />
                  <span>
                    <strong>{item.from}</strong>
                    <small>{item.text}</small>
                  </span>
                  <em>{relativeTime(item.at)}</em>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-top-slot">
          <button
            type="button"
            className="sp-avatar-btn"
            title="Your profile"
            onClick={() => openPanel("me")}
          >
            <Avatar name={user.name} avatarKey={user.avatarKey} size={34} status="online" ring />
          </button>

          {panel === "me" && (
            <div className="sp-dropdown sp-dropdown--right">
              <p className="sp-dropdown-label">SIGNED IN</p>
              <button type="button" className="sp-dropdown-row" onClick={() => { setPanel(null); onView("rooms"); }}>
                <span className="sp-dropdown-icon"><User size={14} /></span>
                <span><strong>{user.name}</strong><small>{user.handle}</small></span>
              </button>
              <button type="button" className="sp-dropdown-row" onClick={() => { setPanel(null); onView("history"); }}>
                <span className="sp-dropdown-icon"><Music size={14} /></span>
                <span><strong>Listening history</strong><small>What you played</small></span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Visualizer bars={26} height={30} gap={2} className="sp-topvis" band={[0, 0.55]} />
    </header>
  );
}

export default Topbar;
