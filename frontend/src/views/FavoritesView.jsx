import { Heart } from "lucide-react";

import RoomGrid from "../components/RoomGrid";
import { useApp } from "../state/AppContext";

function FavoritesView({ ctl }) {
  const { rooms, favorites } = useApp();
  const list = rooms.filter((room) => favorites.includes(room.id));

  return (
    <>
      <h2 className="sp-section">
        <Heart size={18} />
        <span>
          <em>Favorite</em> Rooms
        </span>
        <span className="sp-section-note">{list.length} saved</span>
      </h2>

      <RoomGrid
        rooms={list}
        ctl={ctl}
        empty="No favorites yet. Tap the heart on any room."
      />
    </>
  );
}

export default FavoritesView;
