import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, MessageCircle, Users } from "lucide-react";

import BrandLogo, { BrandWordmark } from "../components/BrandLogo";
import { COVERS } from "../data/images";
import { useApp } from "../state/AppContext";

import "../styles/theme.css";
import "../styles/splash.css";

const FLOATERS = [
  { key: "chill", name: "Chill Vibes", genre: "Lo-fi / Relax", members: 24, className: "is-tl" },
  { key: "gaming", name: "Gaming Lounge", genre: "Gaming / Chat", members: 32, className: "is-bl" },
  { key: "study", name: "Study Together", genre: "Study / Focus", members: 18, className: "is-tr" },
  { key: "music", name: "Music Hub", genre: "Music / Share", members: 27, className: "is-br" },
];

const NOTES = [
  { char: "♪", className: "is-n1" },
  { char: "♫", className: "is-n2" },
  { char: "♩", className: "is-n3" },
  { char: "♬", className: "is-n4" },
];

const WAVE = Array.from({ length: 46 }, (_, i) => {
  const centre = 1 - Math.abs(i - 22.5) / 24;
  const wobble = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7));
  return Math.max(8, Math.round(centre * wobble * 100));
});

const DURATION = 2600;

function Splash() {
  const navigate = useNavigate();
  const { isActivated } = useApp();

  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const ratio = Math.min((now - start) / DURATION, 1);
      setProgress(ratio);
      if (ratio < 1) frame = requestAnimationFrame(tick);
      else finish();
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    navigate(isActivated ? "/home" : "/activate", { replace: true });
  }

  useEffect(() => {
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  });

  return (
    <div className="sp-splash" onClick={finish} role="presentation">
      <div className="sp-splash-stars" />

      {FLOATERS.map((card) => (
        <article key={card.key} className={`sp-float ${card.className}`}>
          <div className="sp-float-art">
            <img src={COVERS[card.key]} alt={card.name} />
          </div>
          <h3>{card.name}</h3>
          <p>{card.genre}</p>
          <small>
            <Users size={11} />
            {card.members}
          </small>
        </article>
      ))}

      {NOTES.map((note) => (
        <span key={note.className} className={`sp-note ${note.className}`}>
          {note.char}
        </span>
      ))}

      <div className="sp-splash-core">
        <BrandLogo size={168} />
        <BrandWordmark size="lg" />

        <div className="sp-splash-wave">
          {WAVE.map((height, i) => (
            <i key={i} style={{ height: `${height}%`, animationDelay: `${(i % 12) * 0.07}s` }} />
          ))}
        </div>

        <p className="sp-splash-status">Loading good vibes...</p>

        <div className="sp-splash-bar">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="sp-splash-feats">
          <div>
            <Headphones size={22} />
            LISTEN
          </div>
          <span />
          <div>
            <MessageCircle size={22} />
            CHAT
          </div>
          <span />
          <div>
            <Users size={22} />
            CONNECT
          </div>
        </div>

        <small className="sp-splash-version">v1.0.0</small>
      </div>
    </div>
  );
}

export default Splash;
