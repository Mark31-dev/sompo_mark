import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, MessageCircle, Users } from "lucide-react";

import BrandLogo, { BrandWordmark } from "../components/BrandLogo";
import { useApp } from "../state/AppContext";

import "../styles/theme.css";
import "../styles/splash.css";

const WAVE = Array.from({ length: 46 }, (_, i) => {
  const centre = 1 - Math.abs(i - 22.5) / 24;
  const wobble = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7));
  return Math.max(8, Math.round(centre * wobble * 100));
});

const DURATION = 4000;

function Splash() {
  const navigate = useNavigate();
  const { isActivated } = useApp();

  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  function finish() {
  if (doneRef.current) return;

  doneRef.current = true;

  const target = isActivated ? "/home" : "/activate";

  navigate(target, {
    replace: true,
  });
}

  useEffect(() => {
  doneRef.current = false;

  const start = performance.now();
  let frame = 0;

    const tick = (now) => {
      const ratio = Math.min(
        (now - start) / DURATION,
        1
      );

      setProgress(ratio);

      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="sp-splash">
      <div className="sp-splash-stars" />

      <div className="sp-splash-core">

        <BrandLogo size={168} />

        <BrandWordmark size="lg" />

        <div className="sp-splash-wave">
          {WAVE.map((height, i) => (
            <i
              key={i}
              style={{
                height: `${height}%`,
                animationDelay: `${(i % 12) * 0.07}s`,
              }}
            />
          ))}
        </div>


        <div className="sp-splash-status">
          <strong>INITIALIZING</strong>
          <span>Please wait...</span>
        </div>


        <div className="sp-splash-bar">
          <span
            style={{
              width: `${Math.round(progress * 100)}%`,
            }}
          />
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


        <small className="sp-splash-version">
          DEVELOPED BY MARK HERRERO
        </small>


      </div>
    </div>
  );
}

export default Splash;