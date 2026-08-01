import { History, Play, Pause } from "lucide-react";

import { COVERS, coverFor } from "../data/images";
import { TRACKS } from "../data/seed";
import { useApp } from "../state/AppContext";
import { usePlayer } from "../state/PlayerContext";
import { relativeTime } from "../lib/time";

function HistoryView() {
  const { history } = useApp();
  const { trackId, playing, loadTrack, toggle } = usePlayer();

  const entries = history
    .map((entry) => ({ entry, track: TRACKS.find((t) => t.id === entry.trackId) }))
    .filter((item) => item.track);

  return (
    <>
      <h2 className="sp-section">
        <History size={18} />
        <span>
          <em>Listening</em> History
        </span>
        <span className="sp-section-note">{entries.length} tracks</span>
      </h2>

      {entries.length === 0 ? (
        <div className="sp-empty">Play something and it shows up here.</div>
      ) : (
        <div className="sp-list">
          {entries.map(({ entry, track }) => {
            const live = trackId === track.id && playing;

            return (
              <div key={track.id} className="sp-list-row">
                <span className="sp-list-thumb">
                  <img
                    src={track.coverKey === "album" ? COVERS.album : coverFor(track.coverKey, track.title)}
                    alt={track.title}
                    loading="lazy"
                  />
                </span>

                <span className="sp-list-main">
                  <strong>{track.title}</strong>
                  <small>{track.artist} · {track.genre}</small>
                </span>

                <span className="sp-list-time">{relativeTime(entry.at)}</span>

                <button
                  type="button"
                  className="sp-list-play"
                  onClick={() => (trackId === track.id ? toggle() : loadTrack(track.id, true))}
                >
                  {live ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default HistoryView;
