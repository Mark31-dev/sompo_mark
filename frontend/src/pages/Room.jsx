import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Headphones, Lock, Globe, Bell, BellOff, Pin, MoreVertical,
  MessageSquare, Image as ImageIcon, ChevronDown, X, Search, Heart,
  Users, Calendar, Send, Smile, Plus, Play, Pause, Trash2, Shield, Flag,
  LogOut, Crown, Link2, PanelLeft, PanelRight, Music,
} from "lucide-react";

import Avatar from "../components/Avatar";
import EmojiPicker from "../components/EmojiPicker";
import RoomGate from "../components/RoomGate";
import Toasts from "../components/Toasts";
import Visualizer from "../components/Visualizer";
import useClickOutside from "../hooks/useClickOutside";
import useRoomChat from "../hooks/useRoomChat";
import { coverFor } from "../data/images";
import { QUICK_REACTIONS, ROOM_RULES } from "../data/chat";
import { ME, TRACKS } from "../data/seed";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";
import { markUnlocked, needsPassword } from "../lib/unlocked";

import api from "../services/api";

import "../styles/theme.css";
import "../styles/room.css";

const TABS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "media", label: "Media", icon: ImageIcon },
];

const DAY = 86_400_000;

function timeLabel(at) {
  return new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function Room() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    rooms, profile, isOwner, ownerName, favorites, toggleFavorite,
    mutedRooms, toggleMuteRoom, joinRoom, leaveRoom, pushToast, recordVisit,
    online, verifyRoomPassword,
  } = useApp();

  const { trackId, playing, loadTrack, toggle, playRoom } = usePlayer();

  const room = useMemo(
    () => rooms.find((r) => String(r.id) === String(id)),
    [rooms, id],
  );

  const owner = room ? isOwner(room) : false;

const [gated, setGated] = useState(() =>
  room ? needsPassword(room, owner) : false
);

const [realMembers, setRealMembers] = useState([]);

const roomMembers = useMemo(() => {
  return realMembers.map((member) => ({
    ...member,
    status: "online",
  }));
}, [realMembers]);

  const chat = useRoomChat(room?.id ?? "none", roomMembers, {
    live: online && !gated,
    myId: profile.serverId ?? null,
  });

  const [tab, setTab] = useState("messages");
  const [range, setRange] = useState("today");
  const [draft, setDraft] = useState("");
  const [now] = useState(() => Date.now());
  const [showEmoji, setShowEmoji] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [banner, setBanner] = useState(true);
  const [memberQuery, setMemberQuery] = useState("");
  const [pane, setPane] = useState("chat");
  

  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useClickOutside(() => setShowEmoji(false), showEmoji);
  const shareRef = useClickOutside(() => setShowShare(false), showShare);
  const moreRef = useClickOutside(() => setShowMore(false), showMore);

  useEffect(() => {
    if (!room) navigate("/home", { replace: true });
  }, [room, navigate]);

  useEffect(() => {
    if (!room || gated) return;
    joinRoom(room);
    recordVisit(room.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, gated]);

  useEffect(() => {
  async function loadMembers() {
    if (!room) return;

    const result = await api.showRoom(room.id);

    if (result.ok) {
      setRealMembers(result.data.members || []);
    }
  }

  loadMembers();
}, [room]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [chat.messages, chat.typing, tab]);

  if (!room) return null;

  if (gated) {
    return (
      <div className="sp-room-page is-gated">
        <RoomGate
          room={room}
          verify={verifyRoomPassword}
          onClose={() => navigate("/home")}
          onUnlock={(unlockedRoom) => {
            markUnlocked(unlockedRoom.id);
            setGated(false);
            playRoom(unlockedRoom);
            pushToast(`Joined ${unlockedRoom.name}`);
          }}
        />
      </div>
    );
  }

  const isFavorite = favorites.includes(room.id);
  const isMuted = mutedRooms.includes(room.id);
  const cover = coverFor(room.coverKey, room.name);
  const onlineMembers = online && chat.peers.length
    ? chat.peers
    : roomMembers.filter((m) => m.status !== "offline");

  const cutoff = now - (range === "today" ? DAY : 365 * DAY);
  const visible = chat.messages.filter((m) => m.at >= cutoff);

  const list =
    tab === "pinned" ? chat.pinned : tab === "media" ? chat.media : visible;

  const filteredMembers = roomMembers.filter((m) =>
    m.name.toLowerCase().includes(memberQuery.trim().toLowerCase()),
  );

  function authorOf(message) {
    if (message.author === "system") {
      return { id: "system", name: "System", avatarKey: null, status: "online" };
    }
    if (message.author === ME) {
      return { id: ME, name: profile.name, avatarKey: profile.avatarKey, status: "online", isMe: true };
    }
    const known = roomMembers.find((m) => m.id === message.author);
    if (known) return known;

    return {
      id: message.author,
      name: message.authorName || "Guest",
      avatarKey: undefined,
      status: "online",
    };
  }

  function submit() {
    if (chat.send(draft)) {
      setDraft("");
      setTab("messages");
      inputRef.current?.focus();
    }
  }

  function insertEmoji(emoji) {
    setDraft((current) => `${current}${emoji}`);
    inputRef.current?.focus();
  }

  function share(track) {
    chat.shareTrack(track);
    loadTrack(track.id, true);
    setShowShare(false);
    setTab("messages");
  }

  function copyInvite() {
    navigator.clipboard?.writeText(`${window.location.origin}/room/${room.id}`);
    pushToast("Invite link copied");
  }

  return (
    <div className={`sp-room-page pane-${pane}`}>
      <header className="sp-rp-top">
        <button type="button" className="sp-rp-back" onClick={() => navigate("/home")}>
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="sp-rp-title">
          <span className="sp-rp-badge">
            <Headphones size={19} />
          </span>
          <div>
            <h1>
              {room.name}
              <span className={room.locked ? "sp-rp-tag is-locked" : "sp-rp-tag"}>
                {room.locked ? <Lock size={11} /> : <Globe size={11} />}
                {room.locked ? "Private" : "Public"}
              </span>
            </h1>
            <p>
              {room.genre}
              <span className={online ? "sp-rp-live is-on" : "sp-rp-live"}>
                <i />
                {online ? "Live" : "Local"}
              </span>
            </p>
          </div>
        </div>

        <div className="sp-rp-actions">
          <button
            type="button"
            className="sp-rp-pane-btn"
            title="Room info"
            onClick={() => setPane(pane === "info" ? "chat" : "info")}
          >
            <PanelLeft size={17} />
          </button>

          <button
            type="button"
            className={isMuted ? "sp-rp-icon is-off" : "sp-rp-icon"}
            title={isMuted ? "Unmute room" : "Mute room"}
            onClick={() => toggleMuteRoom(room.id)}
          >
            {isMuted ? <BellOff size={17} /> : <Bell size={17} />}
          </button>

          <button
            type="button"
            className={tab === "pinned" ? "sp-rp-icon is-on" : "sp-rp-icon"}
            title="Pinned messages"
            onClick={() => setTab("pinned")}
          >
            <Pin size={17} />
          </button>

          <div className="sp-rp-more" ref={moreRef}>
            <button
              type="button"
              className="sp-rp-icon"
              title="More"
              onClick={() => setShowMore((s) => !s)}
            >
              <MoreVertical size={17} />
            </button>

            {showMore && (
              <div className="sp-rp-menu">
                <button type="button" onClick={() => { setShowMore(false); copyInvite(); }}>
                  <Link2 size={14} />
                  Copy invite link
                </button>
                <button type="button" onClick={() => { setShowMore(false); toggleFavorite(room.id); }}>
                  <Heart size={14} />
                  {isFavorite ? "Remove favorite" : "Add to favorites"}
                </button>
                <button type="button" onClick={() => { setShowMore(false); setShowRules(true); }}>
                  <Shield size={14} />
                  Room rules
                </button>
                {!online && (
                  <button
                    type="button"
                    onClick={() => { setShowMore(false); chat.clear(); pushToast("Chat reset"); }}
                  >
                    <Trash2 size={14} />
                    Clear my chat copy
                  </button>
                )}
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => { leaveRoom(); navigate("/home"); }}
                >
                  <LogOut size={14} />
                  Leave room
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sp-rp-pane-btn"
            title="Members"
            onClick={() => setPane(pane === "members" ? "chat" : "members")}
          >
            <PanelRight size={17} />
          </button>
        </div>
      </header>

      <div className="sp-rp-body">
        {/* ── left: room info ─────────────────────────────── */}
        <aside className="sp-rp-info">
          <div className="sp-rp-art">
            <img src={cover} alt={room.name} />
            <span className="sp-rp-art-fade" />
            <span className="sp-rp-art-name">{room.name}</span>
            <Visualizer bars={28} height={26} gap={2} className="sp-rp-art-vis" idle={!playing} />
          </div>

          <h2>About this room</h2>
          <p className="sp-rp-about">{room.quote || room.description}</p>

          <h3>Created by</h3>
          <div className="sp-rp-owner">
            <Avatar
              name={ownerName(room)}
              avatarKey={owner ? profile.avatarKey : undefined}
              size={30}
              status="online"
            />
            <span>{ownerName(room)}</span>
            {owner && <Crown size={13} />}
            <em>Owner</em>
          </div>

          <h3>Room details</h3>
          <dl className="sp-rp-details">
            <div>
              <dt><Calendar size={13} /> Created</dt>
              <dd>{new Date(room.createdAt || now).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}</dd>
            </div>
            <div>
              <dt><Users size={13} /> Members</dt>
              <dd>{room.members}</dd>
            </div>
            <div>
              <dt><Lock size={13} /> Type</dt>
              <dd>{room.locked ? "Private 🔒" : "Public 🌎"}</dd>
            </div>
            <div>
              <dt><Headphones size={13} /> Category</dt>
              <dd>{room.genre}</dd>
            </div>
          </dl>

          <button
            type="button"
            className={isFavorite ? "sp-rp-fav is-on" : "sp-rp-fav"}
            onClick={() => toggleFavorite(room.id)}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "In Favorites" : "Add to Favorites"}
          </button>
        </aside>

        {/* ── centre: chat ────────────────────────────────── */}
        <section className="sp-rp-chat">
          <div className="sp-rp-chat-head">
            <h2>
              <span className="sp-rp-chat-icon">💬</span>
              Chat
            </h2>
          </div>

          <div className="sp-rp-tabs">
            {TABS.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                type="button"
                className={tab === tabId ? "is-active" : ""}
                onClick={() => setTab(tabId)}
              >
                <Icon size={14} />
                {label}
                {tabId === "pinned" && chat.pinned.length > 0 && <b>{chat.pinned.length}</b>}
              </button>
            ))}

            <button
              type="button"
              className="sp-rp-range"
              onClick={() => setRange((r) => (r === "today" ? "all" : "today"))}
            >
              {range === "today" ? "Today" : "All time"}
              <ChevronDown size={14} />
            </button>
          </div>

          {banner && tab === "messages" && (
            <div className="sp-rp-banner">
              <Pin size={15} />
              <div>
                <strong>Welcome to {room.name}!</strong>
                <span>Be kind, respect others, and have a good time.</span>
              </div>
              <button type="button" onClick={() => setBanner(false)}>
                <X size={15} />
              </button>
            </div>
          )}

          <div className="sp-rp-scroll" ref={scrollerRef}>
            {list.length === 0 && (
              <p className="sp-rp-empty">
                {tab === "pinned"
                  ? "Nothing pinned yet. Hover a message and hit the pin."
                  : tab === "media"
                    ? "No tracks shared yet. Use + to drop one."
                    : "No messages in this range. Say something."}
              </p>
            )}

            {list.map((message) => {
              const author = authorOf(message);
              const mine = message.author === ME;
              const isSystem = message.author === "system";
              const track = message.kind === "track"
                ? TRACKS.find((t) => t.id === message.trackId)
                : null;
              const live = track && trackId === track.id && playing;

              return (
                <div
                  key={message.id}
                  className={`sp-msg${mine ? " is-mine" : ""}${isSystem ? " is-system" : ""}`}
                >
                  <span className="sp-msg-avatar">
                    {isSystem ? (
                      <span className="sp-msg-system-icon">
                        <Shield size={14} />
                      </span>
                    ) : (
                      <Avatar
                        name={author.name}
                        avatarKey={author.avatarKey}
                        size={30}
                        status={author.status}
                      />
                    )}
                  </span>

                  <div className="sp-msg-main">
                    <div className="sp-msg-head">
                      <b>{isSystem ? "System" : author.name}</b>
                      {author.owner && <Crown size={11} />}
                      <time>{timeLabel(message.at)}</time>
                      {message.pinned && <Pin size={11} className="sp-msg-pinned" />}
                    </div>

                    {track ? (
                      <div className="sp-msg-track">
                        <img src={coverFor(track.coverKey, track.title)} alt={track.title} />
                        <div>
                          <strong>{track.title}</strong>
                          <small>{track.artist} · {track.genre}</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => (trackId === track.id ? toggle() : loadTrack(track.id, true))}
                        >
                          {live ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      </div>
                    ) : (
                      <p className="sp-msg-bubble">{message.text}</p>
                    )}

                    {Object.keys(message.reactions || {}).length > 0 && (
                      <div className="sp-msg-reactions">
                        {Object.entries(message.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => chat.react(message.id, emoji)}
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isSystem && (
                      <div className="sp-msg-tools">
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            title={`React ${emoji}`}
                            onClick={() => chat.react(message.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          title={message.pinned ? "Unpin" : "Pin message"}
                          onClick={() => chat.togglePin(message.id)}
                        >
                          <Pin size={13} />
                        </button>
                        {mine && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => chat.remove(message.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chat.typing && tab === "messages" && (
              <div className="sp-rp-typing">
                <span><i /><i /><i /></span>
                {chat.typing.name} is typing...
              </div>
            )}
          </div>

          <div className="sp-rp-composer">
            <div className="sp-rp-share" ref={shareRef}>
              <button
                type="button"
                className="sp-rp-plus"
                title="Share a track"
                onClick={() => setShowShare((s) => !s)}
              >
                <Plus size={18} />
              </button>

              {showShare && (
                <div className="sp-rp-share-menu">
                  <p>Share a track</p>
                  {TRACKS.map((track) => (
                    <button key={track.id} type="button" onClick={() => share(track)}>
                      <Music size={14} />
                      <span>
                        <strong>{track.title}</strong>
                        <small>{track.artist}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sp-rp-input">
              <input
                ref={inputRef}
                value={draft}
                placeholder="Type a message..."
                onChange={(e) => {
                  setDraft(e.target.value);
                  chat.notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />

              <div className="sp-rp-emoji-wrap" ref={emojiRef}>
                <button
                  type="button"
                  title="Emoji"
                  onClick={() => setShowEmoji((s) => !s)}
                >
                  <Smile size={18} />
                </button>
                {showEmoji && (
                  <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
                )}
              </div>
            </div>

            <button
              type="button"
              className="sp-rp-send"
              title="Send"
              disabled={draft.trim() === ""}
              onClick={submit}
            >
              <Send size={17} />
            </button>
          </div>
        </section>

        {/* ── right: members ──────────────────────────────── */}
        <aside className="sp-rp-members">
          <h2>Members ({room.members})</h2>

          <div className="sp-rp-search">
            <input
              value={memberQuery}
              placeholder="Search members..."
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            <Search size={15} />
          </div>

          <div className="sp-rp-member-list">
            {filteredMembers.map((member) => (
              <div key={member.id} className="sp-rp-member">
                <Avatar
                  name={member.name}
                  avatarKey={member.avatarKey}
                  size={34}
                  status={member.status}
                />
                <div>
                  <strong>
                    {member.name}
                    {member.owner && <Crown size={12} />}
                  </strong>
                  <small className={`is-${member.status}`}>
                    <i />
                    {member.status === "offline"
                      ? "Offline"
                      : member.status === "busy"
                        ? "Busy"
                        : "Online"}
                  </small>
                </div>
                {member.owner && <em>Owner</em>}
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <p className="sp-rp-empty">Nobody matches that name.</p>
            )}
          </div>

          <button type="button" className="sp-rp-invite" onClick={copyInvite}>
            <Users size={15} />
            Invite Friends
          </button>
        </aside>
      </div>

      <footer className="sp-rp-foot">
        <button type="button" onClick={() => setShowRules(true)}>
          <Shield size={14} />
          Rules
        </button>
        <button type="button" onClick={() => setShowReport(true)}>
          <Flag size={14} />
          Report Room
        </button>

        <span className="sp-rp-foot-online">
          <i />
          {onlineMembers.length} online now
        </span>

        <button
          type="button"
          className="sp-rp-leave"
          onClick={() => { leaveRoom(); navigate("/home"); }}
        >
          Leave Room
          <LogOut size={15} />
        </button>
      </footer>

      {showRules && (
        <div className="sp-rp-overlay" onClick={() => setShowRules(false)}>
          <div className="sp-rp-dialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sp-rp-dialog-close" onClick={() => setShowRules(false)}>
              <X size={16} />
            </button>
            <h3>
              <Shield size={17} />
              Room rules
            </h3>
            <ul>
              {ROOM_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <button type="button" className="sp-rp-dialog-btn" onClick={() => setShowRules(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="sp-rp-overlay" onClick={() => setShowReport(false)}>
          <div className="sp-rp-dialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sp-rp-dialog-close" onClick={() => setShowReport(false)}>
              <X size={16} />
            </button>
            <h3>
              <Flag size={17} />
              Report {room.name}
            </h3>
            <p>Tell us what&apos;s wrong. Reports go to the SOMPO TEAM admins.</p>
            <textarea placeholder="What happened?" />
            <button
              type="button"
              className="sp-rp-dialog-btn"
              onClick={() => { setShowReport(false); pushToast("Report sent to admins"); }}
            >
              Send report
            </button>
          </div>
        </div>
      )}

      <Toasts />
    </div>
  );
}

export default Room;
