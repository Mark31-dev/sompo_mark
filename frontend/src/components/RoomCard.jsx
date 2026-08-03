import { useState } from "react";
import {
  Lock, Globe, Users, Crown, MoreVertical, Edit3, KeyRound, Trash2,
  Heart, Play, Pause, ExternalLink, Link2,
} from "lucide-react";

import Visualizer from "./Visualizer";
import useClickOutside from "../hooks/useClickOutside";
import { coverFor } from "../data/images";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";

function RoomCard({ room, onOpen, onEdit, onPassword, onDelete, onOpenPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false), menuOpen);

  const { isOwner: ownsRoom, favorites, toggleFavorite, pushToast, roomPresence } = useApp();
  const { trackId, playing, toggle } = usePlayer();

  const isOwner = ownsRoom(room);
  const isFavorite = favorites.includes(room.id);
  const isLive = room.trackId === trackId;
  const isPlaying = isLive && playing;

  function copyInvite(e) {
    e.stopPropagation();
    setMenuOpen(false);
    const invite = `${window.location.origin}/room/${room.id}`;
    navigator.clipboard?.writeText(invite);
    pushToast("Invite link copied");
  }

  return (
    <article className="sp-room" onClick={() => onOpen(room)}>
      <div className="sp-room-cover">
        <img src={coverFor(room.coverKey, room.name)} alt={room.name} loading="lazy" />
        <span className="sp-room-shade" />

        {isLive && (
          <span className="sp-room-live">
            <span className="sp-dot" />
            LIVE
          </span>
        )}

        <Visualizer
          bars={5}
          height={18}
          gap={2}
          className="sp-room-vis"
          idle={!isPlaying}
          band={[0.05, 0.5]}
        />

        <button
          type="button"
          className="sp-room-play"
          title={isPlaying ? "Pause" : "Play room"}
          onClick={(e) => {
            e.stopPropagation();
            if (isLive) toggle();
            else onOpen(room);
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          className={isFavorite ? "sp-room-fav is-on" : "sp-room-fav"}
          title={isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(room.id);
          }}
        >
          <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <div className="sp-room-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sp-room-menu-btn"
            title="Room options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="sp-room-menu" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenPage(room); }}>
                <ExternalLink size={14} />
                Open room page
              </button>

              <button type="button" onClick={copyInvite}>
                <Link2 size={14} />
                Copy invite link
              </button>

              {isOwner && (
                <>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(room); }}>
                    <Edit3 size={14} />
                    Edit room
                  </button>

                  <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPassword(room); }}>
                    <KeyRound size={14} />
                    Change password
                  </button>

                  <button
                    type="button"
                    className="is-danger"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(room); }}
                  >
                    <Trash2 size={14} />
                    Delete room
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sp-room-body">
        <h3>{room.name}</h3>
        <span className="sp-tag">{room.genre}</span>
        <p className="sp-room-desc">{room.description}</p>

        <div className="sp-room-meta">
          <span>
  <Users size={13} />
  {roomPresence?.[room.id] ?? room.members}
</span>
          <span>
            {room.locked ? <Lock size={13} /> : <Globe size={13} />}
            {room.locked ? "Private" : "Public"}
          </span>
          {isOwner && (
            <span className="sp-owner">
              <Crown size={13} />
              Owner
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default RoomCard;
