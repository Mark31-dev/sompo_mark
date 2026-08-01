import { useState } from "react";
import { Clock, Heart, MoreHorizontal, Pause, Play, ExternalLink, ListPlus } from "lucide-react";

import Visualizer from "./Visualizer";
import useClickOutside from "../hooks/useClickOutside";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePlayer } from "../state/PlayerContext";
import { clockTime } from "../lib/time";

function RowMenu({ song, onQueue, onClose }) {
  const ref = useClickOutside(onClose, true);

  return (
    <div className="sp-song-menu" ref={ref}>
      <button type="button" onClick={() => { onQueue(song); onClose(); }}>
        <ListPlus size={14} />
        Play next
      </button>
      {song.storeUrl && (
        <a href={song.storeUrl} target="_blank" rel="noreferrer" onClick={onClose}>
          <ExternalLink size={14} />
          Open in store
        </a>
      )}
    </div>
  );
}

function SongTable({ songs, startIndex = 0, layout = "list", emptyLabel = "Nothing here yet." }) {
  const { trackId, playing, playSongs, toggle, setQueue, register } = usePlayer();
  const { isLiked, toggleLike } = useMusicLibrary();
  const [menuFor, setMenuFor] = useState(null);

  const queueNext = (song) => {
    register(song);
    setQueue((current) => {
      const without = current.filter((id) => id !== song.id);
      const at = without.indexOf(trackId);
      return [...without.slice(0, at + 1), song.id, ...without.slice(at + 1)];
    });
  };

  const activate = (song) => {
    if (song.id === trackId) {
      toggle();
      return;
    }
    playSongs(songs, song.id);
  };

  if (!songs.length) {
    return <p className="sp-music-empty">{emptyLabel}</p>;
  }

  if (layout === "grid") {
    return (
      <div className="sp-song-grid">
        {songs.map((song) => {
          const active = song.id === trackId;
          return (
            <article key={song.id} className={active ? "sp-song-card is-active" : "sp-song-card"}>
              <button type="button" className="sp-song-card-art" onClick={() => activate(song)}>
                <img
  src={song.cover || "/icons.svg"}
  alt={song.title}
  loading="lazy"
  onError={(e) => {
    e.currentTarget.src = "/icons.svg";
  }}
/>
                <span className="sp-song-card-play">
                  {active && playing ? <Pause size={18} /> : <Play size={18} />}
                </span>
              </button>
              <h4 title={song.title}>{song.title}</h4>
              <p title={song.artist}>{song.artist}</p>
              <button
                type="button"
                className={isLiked(song.id) ? "sp-song-heart is-on" : "sp-song-heart"}
                onClick={() => toggleLike(song)}
                aria-label="Toggle favorite"
              >
                <Heart size={15} fill={isLiked(song.id) ? "currentColor" : "none"} />
              </button>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sp-song-table">
      <header className="sp-song-row sp-song-head">
        <span>#</span>
        <span>SONG</span>
        <span>ARTIST</span>
        <span>ALBUM</span>
        <span>DURATION</span>
        <span className="sp-song-head-clock"><Clock size={14} /></span>
      </header>

      {songs.map((song, index) => {
        const active = song.id === trackId;
        const liked = isLiked(song.id);

        return (
          <div
            key={song.id}
            className={active ? "sp-song-row is-active" : "sp-song-row"}
            onDoubleClick={() => activate(song)}
          >
            <span className="sp-song-index">
              <b>{startIndex + index + 1}</b>
              <button type="button" onClick={() => activate(song)} aria-label="Play song">
                {active && playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </span>

            <span className="sp-song-main">
              <img
  src={song.coverSmall || song.cover || "/icons.svg"}
  alt={song.title}
  loading="lazy"
  onError={(e)=>{
    e.currentTarget.src="/icons.svg";
  }}
/>
              <span className="sp-song-title">
                <b title={song.title}>{song.title}</b>
                {song.explicit && <em className="sp-song-tag">E</em>}
              </span>
              {active && playing && (
                <Visualizer bars={4} height={13} gap={2} className="sp-song-vis" idle={false} />
              )}
            </span>

            <span className="sp-song-artist" title={song.artist}>{song.artist}</span>
            <span className="sp-song-album" title={song.album}>{song.album}</span>
            <span className="sp-song-time">{clockTime(song.duration)}</span>

            <span className="sp-song-actions">
              <button
                type="button"
                className={liked ? "sp-song-heart is-on" : "sp-song-heart"}
                onClick={() => toggleLike(song)}
                aria-label="Toggle favorite"
              >
                <Heart size={15} fill={liked ? "currentColor" : "none"} />
              </button>

              <span className="sp-song-more">
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === song.id ? null : song.id)}
                  aria-label="More actions"
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuFor === song.id && (
                  <RowMenu song={song} onQueue={queueNext} onClose={() => setMenuFor(null)} />
                )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default SongTable;
