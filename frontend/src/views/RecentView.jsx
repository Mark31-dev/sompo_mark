import { Clock, ArrowRight, Users } from "lucide-react";

import { coverFor } from "../data/images";
import { useApp } from "../state/AppContext";
import { relativeTime } from "../lib/time";

function RecentView({ ctl }) {
  const { rooms, recents } = useApp();

  const entries = recents
    .map((entry) => ({ entry, room: rooms.find((r) => r.id === entry.roomId) }))
    .filter((item) => item.room);

  return (
    <>
      <h2 className="sp-section">
        <Clock size={18} />
        <span>
          <em>Recently</em> Joined
        </span>
        <span className="sp-section-note">{entries.length} visits</span>
      </h2>

      {entries.length === 0 ? (
        <div className="sp-empty">Nothing here yet. Join a room and it lands here.</div>
      ) : (
        <div className="sp-list">
          {entries.map(({ entry, room }) => (
            <button
              key={room.id}
              type="button"
              className="sp-list-row"
              onClick={() => ctl.openRoom(room)}
            >
              <span className="sp-list-thumb">
                <img src={coverFor(room.coverKey, room.name)} alt={room.name} loading="lazy" />
              </span>

              <span className="sp-list-main">
                <strong>{room.name}</strong>
                <small>{room.genre}</small>
              </span>

              <span className="sp-list-meta">
                <Users size={13} />
                {room.members}
              </span>

              <span className="sp-list-time">{relativeTime(entry.at)}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default RecentView;
