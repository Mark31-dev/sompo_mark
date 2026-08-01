import { Users, Crown, MessageCircle } from "lucide-react";

import Avatar from "../components/Avatar";
import { useApp } from "../state/AppContext";

const LABEL = { online: "Online", busy: "Busy", offline: "Offline" };

function MembersView({ ctl, query }) {
  const { members, rooms, onlineCount, pushToast } = useApp();

  const needle = query.trim().toLowerCase();
  const list = members.filter((m) => m.name.toLowerCase().includes(needle));

  return (
    <>
      <h2 className="sp-section">
        <Users size={18} />
        <span>
          <em>Team</em> Members
        </span>
        <span className="sp-section-note">{onlineCount} of {members.length} online</span>
      </h2>

      <div className="sp-member-grid">
        {list.map((member) => {
          const room = rooms.find((r) => r.id === member.roomId);

          return (
            <div key={member.id} className="sp-member-card">
              <Avatar name={member.name} avatarKey={member.avatarKey} size={54} status={member.status} />

              <div className="sp-member-card-body">
                <h3>
                  {member.name}
                  {member.owner && <Crown size={13} />}
                </h3>
                <p className={`sp-status sp-status--${member.status}`}>{LABEL[member.status]}</p>
                <small>{room ? `In Room: ${room.name}` : "Not in a room"}</small>
              </div>

              <div className="sp-member-card-actions">
                <button
                  type="button"
                  onClick={() => pushToast(`Message sent to ${member.name}`)}
                >
                  <MessageCircle size={14} />
                  Message
                </button>

                {room && (
                  <button type="button" onClick={() => ctl.openRoom(room)}>
                    Join room
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && <div className="sp-empty">Nobody matches that name.</div>}
    </>
  );
}

export default MembersView;
