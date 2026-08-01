import { useCallback, useRef, useState } from "react";
import {
  Heart, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle,
  SkipBack, SkipForward, Volume1, Volume2, VolumeX,
} from "lucide-react";

import Visualizer from "./Visualizer";
import { artFor } from "../lib/art";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePlayer } from "../state/PlayerContext";
import { clockTime } from "../lib/time";

/** Docked transport for the music screen. Presentation only — one audio graph
    lives in PlayerContext and every surface reads from it. */
function MusicBar({ onOpenQueue }) {
  const {
    track, playing, loading, currentTime, duration, progress,
    volume, muted, shuffle, repeat,
    toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer();
  const { isLiked, toggleLike } = useMusicLibrary();

  const barRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const ratioFromEvent = useCallback((event) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  }, []);

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setScrubbing(true);
    setScrubValue(ratioFromEvent(event));
  };

  const onPointerMove = (event) => {
    if (!scrubbing) return;
    setScrubValue(ratioFromEvent(event));
  };

  const onPointerUp = (event) => {
    if (!scrubbing) return;
    const ratio = ratioFromEvent(event);
    setScrubbing(false);
    seek(ratio * (duration || 0));
  };

  const shown = scrubbing ? scrubValue : progress;
  const shownTime = scrubbing ? scrubValue * (duration || 0) : currentTime;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const liked = isLiked(track.id);

  return (
    <div className="sp-musicbar">
      <div className="sp-musicbar-top">
        <div className="sp-musicbar-meta">
          <img src={artFor(track)} alt={track.title} />
          <div>
            <b title={track.title}>
              {track.title}
              {playing && <Visualizer bars={4} height={12} gap={2} className="sp-song-vis" idle={false} />}
            </b>
            <span title={track.artist}>{track.artist}</span>
          </div>
          <button
            type="button"
            className={liked ? "sp-song-heart is-on" : "sp-song-heart"}
            onClick={() => toggleLike(track)}
            aria-label="Toggle favorite"
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="sp-musicbar-transport">
          <button
            type="button"
            className={shuffle ? "sp-tr is-on" : "sp-tr"}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={17} />
          </button>
          <button type="button" className="sp-tr" onClick={previous} aria-label="Previous">
            <SkipBack size={19} fill="currentColor" />
          </button>
          <button
            type="button"
            className={loading ? "sp-tr-main is-loading" : "sp-tr-main"}
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button" className="sp-tr" onClick={next} aria-label="Next">
            <SkipForward size={19} fill="currentColor" />
          </button>
          <button
            type="button"
            className={repeat === "off" ? "sp-tr" : "sp-tr is-on"}
            onClick={cycleRepeat}
            aria-label="Repeat"
          >
            <RepeatIcon size={17} />
          </button>
        </div>

        <div className="sp-musicbar-right">
          <button type="button" className="sp-tr" onClick={toggleMute} aria-label="Mute">
            <VolumeIcon size={18} />
          </button>
          <input
            className="sp-musicbar-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={{ "--fill": `${(muted ? 0 : volume) * 100}%` }}
            aria-label="Volume"
          />
          <button type="button" className="sp-tr" onClick={onOpenQueue} aria-label="Queue">
            <ListMusic size={18} />
          </button>
        </div>
      </div>

      <div className="sp-musicbar-seek">
        <span>{clockTime(shownTime)}</span>
        <div
          className="sp-musicbar-track"
          ref={barRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sp-musicbar-fill" style={{ width: `${shown * 100}%` }}>
            <i />
          </div>
        </div>
        <span>{clockTime(duration)}</span>
      </div>
    </div>
  );
}

export default MusicBar;
