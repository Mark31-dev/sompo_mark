import { useEffect, useRef, useState } from "react";
import { Lock, ShieldX, ShieldCheck, Eye, EyeOff, ArrowRight, Users } from "lucide-react";

import Modal from "./Modal";
import { coverFor } from "../data/images";

const MAX_ATTEMPTS = 5;

/**
 * Password gate for private rooms: prompt → custom error dialog on a wrong
 * code, custom success dialog on the right one, then hand off to the room.
 */
function RoomGate({ room, onClose, onUnlock, verify }) {
  const [stage, setStage] = useState("ask");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function submit() {
    if (busy) return;

    if (password.trim() === "") {
      setShake(true);
      timers.current.push(setTimeout(() => setShake(false), 420));
      return;
    }

    setBusy(true);
    const granted = verify
      ? await verify(room, password)
      : password === room.password;
    setBusy(false);

    if (granted) {
      setStage("success");
      timers.current.push(setTimeout(() => onUnlock(room), 1700));
      return;
    }

    setAttempts((n) => n + 1);
    setStage("error");
  }

  if (stage === "success") {
    return (
      <Modal onClose={() => onUnlock(room)} size="sm">
        <div className="sp-gate sp-gate--success">
          <div className="sp-gate-icon is-ok">
            <ShieldCheck size={30} />
          </div>

          <h2>Access Granted</h2>
          <p>
            Password accepted. Opening <b>{room.name}</b>…
          </p>

          <div className="sp-gate-bar">
            <span />
          </div>

          <button type="button" className="sp-primary-btn" onClick={() => onUnlock(room)}>
            Enter Room
            <ArrowRight size={16} />
          </button>
        </div>
      </Modal>
    );
  }

  if (stage === "error") {
    const locked = attempts >= MAX_ATTEMPTS;

    return (
      <Modal onClose={onClose} size="sm">
        <div className="sp-gate sp-gate--error">
          <div className="sp-gate-icon is-bad">
            <ShieldX size={30} />
          </div>

          <h2>{locked ? "Too Many Attempts" : "Wrong Password"}</h2>
          <p>
            {locked
              ? "Ask the room owner for the code and try again later."
              : `That code doesn't open ${room.name}.`}
          </p>

          <span className="sp-gate-attempts">
            {locked
              ? `${attempts} failed attempts`
              : `Attempt ${attempts} of ${MAX_ATTEMPTS}`}
          </span>

          {!locked && (
            <button
              type="button"
              className="sp-primary-btn"
              onClick={() => {
                setPassword("");
                setStage("ask");
              }}
            >
              Try Again
            </button>
          )}

          <button type="button" className="sp-secondary-btn" onClick={onClose}>
            Back to rooms
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} size="sm">
      <div className={shake ? "sp-gate is-shaking" : "sp-gate"}>
        <div className="sp-gate-art">
          <img src={coverFor(room.coverKey, room.name)} alt={room.name} />
          <span className="sp-gate-art-fade" />
          <span className="sp-gate-lock">
            <Lock size={16} />
          </span>
        </div>

        <h2>{room.name}</h2>
        <p className="sp-gate-sub">
          <Users size={13} />
          {room.members} members · Private room
        </p>

        <div className="sp-field sp-gate-field">
          <label>Room password</label>
          <div className="sp-input-wrap">
            <input
              autoFocus
              type={reveal ? "text" : "password"}
              placeholder="Enter room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button type="button" onClick={() => setReveal((r) => !r)} title="Show password">
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="button" className="sp-primary-btn" onClick={submit} disabled={busy}>
          <Lock size={15} />
          {busy ? "Checking..." : "Unlock Room"}
        </button>
        <button type="button" className="sp-secondary-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export default RoomGate;
