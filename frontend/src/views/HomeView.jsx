import { useMemo } from "react";
import { Flame, Clock, ArrowRight } from "lucide-react";

import FeaturedHero from "../components/FeaturedHero";
import RoomGrid from "../components/RoomGrid";
import RecentlyJoined from "../components/RecentlyJoined";
import { CATEGORIES } from "../data/seed";
import { useApp } from "../state/AppContext";

function HomeView({ ctl, query, category, onCategory }) {
  const { rooms } = useApp();

  const filtered = useMemo(() => {
    const active = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const needle = query.trim().toLowerCase();

    return rooms.filter((room) => {
      const haystack = `${room.name} ${room.genre} ${room.description || ""}`.toLowerCase();
      return active.test(haystack) && (needle === "" || haystack.includes(needle));
    });
  }, [rooms, category, query]);

  return (
    <>
      <FeaturedHero onJoin={ctl.openRoom} />

      <div className="sp-filters">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? "sp-pill is-active" : "sp-pill"}
            onClick={() => onCategory(item.id)}
          >
            {item.label}
            {item.emoji && <span>{item.emoji}</span>}
          </button>
        ))}

        <button type="button" className="sp-seeall" onClick={() => ctl.setView("discover")}>
          See all
          <ArrowRight size={14} />
        </button>
      </div>

      <h2 className="sp-section">
        <Flame size={18} />
        <span>
          <em>Popular</em> Rooms
        </span>
      </h2>

      <RoomGrid rooms={filtered} ctl={ctl} />

      <h2 className="sp-section">
        <Clock size={18} />
        <span>Recently Joined</span>
      </h2>

      <RecentlyJoined onOpen={ctl.openRoom} />
    </>
  );
}

export default HomeView;
