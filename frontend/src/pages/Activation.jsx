import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ShieldX,
  User,
  Lock,
  Users,
  ChevronRight,
  X,
  Headphones,
  MessageCircle,
} from "lucide-react";

import BrandLogo, { BrandWordmark } from "../components/BrandLogo";
import { ACTIVATION_CODES } from "../data/seed";
import { useApp } from "../state/AppContext";

import "../styles/theme.css";
import "../styles/auth.css";

const SKYLINE = [34, 58, 26, 72, 44, 88, 30, 64, 40, 78, 22, 54, 36, 68, 28, 60];

function Activation() {
  const navigate = useNavigate();
  const { activate, isActivated, profile } = useApp();

  const [username, setUsername] = useState(profile.name === "Joshua" ? "" : profile.name);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("form");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [help, setHelp] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (isActivated && stage === "form") navigate("/home", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fail(message) {
    setError(message);
    setShake(true);
    timers.current.push(setTimeout(() => setShake(false), 430));
  }

  async function submit() {
    if (busy) return;

    if (username.trim().length < 2) {
      fail("Enter a username with at least 2 characters.");
      return;
    }
    if (code.trim() === "") {
      fail("Activation code is required.");
      return;
    }

    setBusy(true);
    const result = await activate(username, code);
    setBusy(false);

    if (result.ok) {
      setStage("success");
      timers.current.push(setTimeout(() => navigate("/home", { replace: true }), 1800));
      return;
    }

    setReason(result.error || "");
    setStage("error");
  }

  return (
    <div className="sp-auth">
      <div className="sp-auth-skyline" aria-hidden="true">
        {SKYLINE.map((height, i) => (
          <i key={i} style={{ height: `${height}%` }} />
        ))}
      </div>

      <span className="sp-auth-note is-a">♪</span>
      <span className="sp-auth-note is-b">♫</span>
      <span className="sp-auth-note is-c">♬</span>
      <span className="sp-auth-note is-d">♩</span>

      <div className="sp-auth-inner">
        <header className="sp-auth-brand">
          <BrandLogo size={104} />
          <BrandWordmark size="sm" />
        </header>

        {stage === "form" && (
          <section className={shake ? "sp-auth-card is-shaking" : "sp-auth-card"}>
            <div className="sp-auth-badge">
              <ShieldCheck size={26} />
            </div>

            <h2>Activate Your Account</h2>
            <p className="sp-auth-sub">
              Enter your details below to join <b>SOMPO TEAM</b>.
            </p>

            <label className="sp-auth-label" htmlFor="sompo-username">
              <User size={14} />
              USERNAME
            </label>
            <div className="sp-auth-input">
              <input
                id="sompo-username"
                value={username}
                placeholder="Enter your username"
                autoComplete="username"
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <User size={17} />
            </div>

            <label className="sp-auth-label" htmlFor="sompo-code">
              <Lock size={14} />
              ACTIVATION CODE
            </label>
            <div className="sp-auth-input">
              <input
                id="sompo-code"
                value={code}
                placeholder="Enter your activation code"
                autoComplete="one-time-code"
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <Lock size={17} />
            </div>

            {error && <p className="sp-auth-error">{error}</p>}

            <button type="button" className="sp-auth-submit" onClick={submit} disabled={busy}>
              <Users size={18} />
              {busy ? "CHECKING..." : "JOIN SOMPO TEAM"}
              <ChevronRight size={18} />
            </button>

            <div className="sp-auth-divider">
              <span>Need help?</span>
            </div>

            <div className="sp-auth-help">
  <MessageCircle size={16} />

  <span>
    Don&apos;t have an activation code?
  </span>

  <a
    href="https://www.facebook.com/markherrerodev"
    target="_blank"
    rel="noopener noreferrer"
  >
    Contact support
  </a>
</div>
          </section>
        )}

        {stage === "error" && (
          <section className="sp-auth-card sp-auth-card--dialog">
            <div className="sp-auth-badge is-bad">
              <ShieldX size={28} />
            </div>

            <h2>Invalid Activation Code</h2>
            <p className="sp-auth-sub">
              {reason || (
                <>
                  <b>{code.trim().toUpperCase()}</b> isn&apos;t a valid SOMPO TEAM code.
                </>
              )}
              {" "}Check for typos or ask your team admin.
            </p>

            <button
              type="button"
              className="sp-auth-submit"
              onClick={() => { setCode(""); setStage("form"); }}
            >
              Try Again
            </button>

            <button type="button" className="sp-auth-ghost" onClick={() => setHelp(true)}>
              Contact support
            </button>
          </section>
        )}

        {stage === "success" && (
          <section className="sp-auth-card sp-auth-card--dialog">
            <div className="sp-auth-badge is-ok">
              <Headphones size={28} />
            </div>

            <h2>Welcome to SOMPO TEAM</h2>
            <p className="sp-auth-sub">
              Activation successful. Your space is ready, <b>{username.trim()}</b>.
            </p>

            <div className="sp-auth-bar">
              <span />
            </div>

            <button
              type="button"
              className="sp-auth-submit"
              onClick={() => navigate("/home", { replace: true })}
            >
              Enter Team Room
              <ChevronRight size={18} />
            </button>
          </section>
        )}

        <footer className="sp-auth-footer">
  <span>DEVELOPED BY</span>
  <b>MARK HERRERO</b>
</footer>
      </div>

      {help && (
        <div className="sp-auth-overlay" onClick={() => setHelp(false)}>
          <div className="sp-auth-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sp-auth-close" onClick={() => setHelp(false)}>
              <X size={16} />
            </button>

            <h3>Need a code?</h3>
            <p>
              Activation codes are handed out by your SOMPO TEAM admin. For this
              build, any of these will let you in:
            </p>

            <ul>
              {ACTIVATION_CODES.map((item) => (
                <li key={item}>
                  <code>{item}</code>
                  <button
                    type="button"
                    onClick={() => {
                      setCode(item);
                      setHelp(false);
                      setStage("form");
                    }}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>

            <p className="sp-auth-modal-note">
  Contact:
  <a
    href="https://www.facebook.com/markherrerodev"
    target="_blank"
    rel="noopener noreferrer"
  >
    facebook.com/markherrerodev
  </a>
</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Activation;
