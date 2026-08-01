import { Music, Plus, Users, Lock } from "lucide-react";

import RoomGrid from "../components/RoomGrid";
import { useApp } from "../state/AppContext";

function MyRoomsView({ ctl }) {
  const { rooms, isOwner } = useApp();

  const mine = rooms.filter(isOwner);
  const listeners = mine.reduce((sum, room) => sum + room.members, 0);
  const privateCount = mine.filter((room) => room.locked).length;

  return (
    <>
      <h2 className="sp-section">
        <Music size={18} />
        <span>
          <em>My</em> Rooms
        </span>
        <button type="button" className="sp-section-btn" onClick={ctl.openCreate}>
          <Plus size={14} />
          New room
        </button>
      </h2>

      <div className="sp-stats">
        <div className="sp-stat">
          <span>{mine.length}</span>
          <small><Music size={12} /> rooms owned</small>
        </div>
        <div className="sp-stat">
          <span>{listeners}</span>
          <small><Users size={12} /> total members</small>
        </div>
        <div className="sp-stat">
          <span>{privateCount}</span>
          <small><Lock size={12} /> private</small>
        </div>
      </div>

      <RoomGrid rooms={mine} ctl={ctl} empty="You haven't created a room yet." />
    </>
  );
}

export default MyRoomsView;
