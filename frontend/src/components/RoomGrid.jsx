import RoomCard from "./RoomCard";

function RoomGrid({ rooms, ctl, empty = "No rooms match that vibe yet." }) {
  if (rooms.length === 0) {
    return <div className="sp-empty">{empty}</div>;
  }

  return (
    <div className="sp-grid">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onOpen={ctl.openRoom}
          onEdit={ctl.editRoom}
          onPassword={ctl.securityRoom}
          onDelete={ctl.confirmDelete}
          onOpenPage={ctl.openRoomPage}
        />
      ))}
    </div>
  );
}

export default RoomGrid;
