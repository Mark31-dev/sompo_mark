import { useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

import { coverFor } from "../data/images";
import { useApp } from "../state/AppContext";
import { relativeTime } from "../lib/time";

function RecentlyJoined({ onOpen }) {
  const trackRef = useRef(null);
  const { rooms, recents } = useApp();

  const entries = recents
    .map((entry) => ({ entry, room: rooms.find((r) => r.id === entry.roomId) }))
    .filter((item) => item.room);

  if (entries.length === 0) {
    return <div className="sp-empty">Nothing here yet. Join a room and it lands here.</div>;
  }

  function scrollBy(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="sp-recent">
      <button type="button" className="sp-recent-nav" onClick={() => scrollBy(-1)} title="Back">
        <ChevronLeft size={18} />
      </button>

      <div className="sp-recent-track" ref={trackRef}>
        {entries.map(({ entry, room }) => (
          <button
            key={room.id}
            type="button"
            className="sp-recent-card"
            onClick={() => onOpen(room)}
          >
            <span className="sp-recent-thumb">
              <img src={coverFor(room.coverKey, room.name)} alt={room.name} loading="lazy" />
            </span>
            <span className="sp-recent-meta">
              <strong>{room.name}</strong>
              <small>{relativeTime(entry.at)}</small>
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="sp-recent-nav" onClick={() => scrollBy(1)} title="Next">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default RecentlyJoined;
