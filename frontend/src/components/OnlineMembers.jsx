import { Crown, ArrowRight } from "lucide-react";

import Avatar from "./Avatar";
import Visualizer from "./Visualizer";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";

function OnlineMembers({ limit = 5, onViewAll }) {
  const { members, rooms, onlineCount, user } = useApp();
  const { playing } = usePlayer();

  const visible = members.filter((m) => m.status !== "offline").slice(0, limit);

  function subtitleFor(member) {
    if (member.id === user.id) return playing ? "Listening" : "Idle";
    const room = rooms.find((r) => r.id === member.roomId);
    if (room) return `In Room: ${room.name}`;
    return member.status === "busy" ? "Busy" : "Online";
  }

  return (
    <div className="sp-card">
      <div className="sp-card-head">
        Online Members
        <span className="sp-count">
          <span className="sp-dot" />
          {onlineCount} online
        </span>
      </div>

      {visible.map((member) => (
        <button key={member.id} type="button" className="sp-member" onClick={onViewAll}>
          <Avatar
            name={member.name}
            avatarKey={member.avatarKey}
            size={32}
            status={member.status}
          />

          <span className="sp-member-meta">
            <span className="sp-member-name">
              {member.name}
              {member.owner && <Crown size={12} />}
            </span>
            <span className="sp-member-sub">{subtitleFor(member)}</span>
          </span>

          {member.id === user.id && (
            <Visualizer bars={5} height={16} gap={2} idle={!playing} className="sp-member-vis" />
          )}
        </button>
      ))}

      <button type="button" className="sp-viewall" onClick={onViewAll}>
        View all members
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default OnlineMembers;
