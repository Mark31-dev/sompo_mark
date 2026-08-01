import { useCallback, useRef, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX,
} from "lucide-react";

import Visualizer from "./Visualizer";
import { artFor } from "../lib/art";
import { usePlayer } from "../state/PlayerContext";
import { clockTime } from "../lib/time";

function NowPlaying() {
  const {
    track, playing, currentTime, duration, progress,
    volume, muted, shuffle, repeat,
    toggle, next, previous, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer();

  const barRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [volumeOpen, setVolumeOpen] = useState(false);

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
  const art = artFor(track);

  return (
    <div className="sp-card">
      <div className="sp-card-head">
        Now Playing
        <span className={playing ? "sp-live" : "sp-live is-idle"}>
          <span className="sp-dot" />
          {playing ? "LIVE" : "PAUSED"}
        </span>
      </div>

      <div className="sp-cover">
        <img src={art} alt={track.title} />
        <Visualizer
          bars={40}
          height={44}
          gap={2}
          radius={1}
          className="sp-cover-vis"
          idle={!playing}
        />
      </div>

      <div className="sp-track">
        <h3>{track.title}</h3>
        <p>{track.artist}</p>
      </div>

      <div
        className={scrubbing ? "sp-progress is-scrubbing" : "sp-progress"}
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shownTime)}
        tabIndex={0}
      >
        <div className="sp-progress-fill" style={{ width: `${shown * 100}%` }} />
      </div>

      <div className="sp-times">
        <span>{clockTime(shownTime)}</span>
        <span>{clockTime(duration)}</span>
      </div>

      <div className="sp-controls">
        <button
          type="button"
          className={shuffle ? "is-on" : ""}
          title="Shuffle"
          onClick={toggleShuffle}
        >
          <Shuffle size={16} />
        </button>

        <button type="button" title="Previous" onClick={previous}>
          <SkipBack size={18} />
        </button>

        <button
          type="button"
          className="sp-play"
          title={playing ? "Pause" : "Play"}
          onClick={toggle}
        >
          {playing ? <Pause size={19} /> : <Play size={19} />}
        </button>

        <button type="button" title="Next" onClick={next}>
          <SkipForward size={18} />
        </button>

        <button
          type="button"
          className={repeat !== "off" ? "is-on" : ""}
          title={`Repeat: ${repeat}`}
          onClick={cycleRepeat}
        >
          <RepeatIcon size={16} />
        </button>
      </div>

      <div className="sp-volume">
        <button
          type="button"
          title="Mute"
          onClick={toggleMute}
          onMouseEnter={() => setVolumeOpen(true)}
        >
          <VolumeIcon size={16} />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          onFocus={() => setVolumeOpen(true)}
          className={volumeOpen ? "is-open" : ""}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

export default NowPlaying;
