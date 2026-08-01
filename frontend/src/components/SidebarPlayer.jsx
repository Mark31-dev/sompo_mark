import { Heart, Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { artFor } from "../lib/art";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePlayer } from "../state/PlayerContext";

function SidebarPlayer({ onOpen }) {
  const { track, playing, progress, toggle, next, previous } = usePlayer();
  const { isLiked, toggleLike } = useMusicLibrary();

  const liked = isLiked(track.id);

  return (
    <div className="sp-mini">
      <div className="sp-mini-head">
        <button type="button" className="sp-mini-art" onClick={onOpen} aria-label="Open music">
          <img src={artFor(track)} alt={track.title} />
        </button>

        <div className="sp-mini-meta">
          <b title={track.title}>{track.title}</b>
          <span title={track.artist}>{track.artist}</span>
        </div>

        <button
          type="button"
          className={liked ? "sp-song-heart is-on" : "sp-song-heart"}
          onClick={() => toggleLike(track)}
          aria-label="Toggle favorite"
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="sp-mini-progress">
        <i style={{ width: `${Math.min(progress, 1) * 100}%` }} />
      </div>

      <div className="sp-mini-controls">
        <button type="button" onClick={previous} aria-label="Previous">
          <SkipBack size={15} fill="currentColor" />
        </button>
        <button type="button" className="sp-mini-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" onClick={next} aria-label="Next">
          <SkipForward size={15} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

export default SidebarPlayer;
