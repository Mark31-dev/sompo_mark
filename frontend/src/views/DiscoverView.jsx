import { useMemo, useState } from "react";
import { Compass } from "lucide-react";

import RoomGrid from "../components/RoomGrid";
import { CATEGORIES } from "../data/seed";
import { useApp } from "../state/AppContext";

const SORTS = [
  { id: "popular", label: "Most members" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A–Z" },
];

function DiscoverView({ ctl, query }) {
  const { rooms } = useApp();
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");

  const results = useMemo(() => {
    const active = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const needle = query.trim().toLowerCase();

    const list = rooms.filter((room) => {
      const haystack = `${room.name} ${room.genre} ${room.description || ""}`.toLowerCase();
      return active.test(haystack) && (needle === "" || haystack.includes(needle));
    });

    const sorted = [...list];
    if (sort === "popular") sorted.sort((a, b) => b.members - a.members);
    if (sort === "new") sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [rooms, category, query, sort]);

  return (
    <>
      <h2 className="sp-section">
        <Compass size={18} />
        <span>
          <em>Discover</em> Rooms
        </span>
        <span className="sp-section-note">{results.length} rooms</span>
      </h2>

      <div className="sp-filters">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? "sp-pill is-active" : "sp-pill"}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
            {item.emoji && <span>{item.emoji}</span>}
          </button>
        ))}

        <div className="sp-sort">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={sort === option.id ? "is-active" : ""}
              onClick={() => setSort(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <RoomGrid rooms={results} ctl={ctl} empty="Nothing matches that search." />
    </>
  );
}

export default DiscoverView;
