import { useEffect, useMemo, useState } from "react";
import { Star, Headphones, Lock, Globe, ArrowRight, Bookmark } from "lucide-react";

import Visualizer from "./Visualizer";
import { COVERS, coverFor } from "../data/images";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";

const ROTATE_MS = 8000;

function FeaturedHero({ onJoin }) {
  const { rooms, favorites, toggleFavorite } = useApp();
  const { trackId, playing } = usePlayer();

  const slides = useMemo(() => rooms.slice(0, 5), [rooms]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  const room = slides[index];
  if (!room) return null;

  const isFavorite = favorites.includes(room.id);
  const isLive = room.trackId === trackId && playing;
  const art = room.id === 1 ? COVERS.featured : coverFor(room.coverKey, room.name);

  return (
    <section
      className="sp-featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="sp-featured-media">
        <img src={art} alt={room.name} key={room.id} />
        <span className="sp-featured-fade" />
        <Visualizer
          bars={64}
          height={70}
          gap={2}
          radius={1}
          className="sp-featured-vis"
          idle={!isLive}
          band={[0, 0.85]}
        />
      </div>

      <div className="sp-featured-body">
        <span className="sp-chip">
          <Star size={12} />
          FEATURED ROOM
        </span>

        <h2>{room.name}</h2>
        <p className="sp-featured-genre">{room.genre}</p>
        <p className="sp-featured-quote">&ldquo;{room.quote || room.description}&rdquo;</p>

        <div className="sp-meta">
          <span>
            <Headphones size={15} />
            {room.members} Members
          </span>
          <span>
            {room.locked ? <Lock size={15} /> : <Globe size={15} />}
            {room.locked ? "Private" : "Public"}
          </span>
        </div>

        <div className="sp-featured-actions">
          <button type="button" className="sp-join" onClick={() => onJoin(room)}>
            Join Room
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            className={isFavorite ? "sp-ghost-btn is-on" : "sp-ghost-btn"}
            title={isFavorite ? "Saved" : "Save room"}
            onClick={() => toggleFavorite(room.id)}
          >
            <Bookmark size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="sp-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.name}`}
              className={i === index ? "is-active" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedHero;
