import { useState } from "react";
import { Trash2, Lock, Globe, Play, Pause, Check } from "lucide-react";

import Modal from "./Modal";
import { COVERS, COVER_KEYS } from "../data/images";
import { TRACKS } from "../data/seed";
import { usePlayer } from "../state/PlayerContext";

function CoverPicker({ value, onChange }) {
  return (
    <div className="sp-field">
      <label>Cover</label>
      <div className="sp-cover-picker">
        {COVER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={value === key ? "is-active" : ""}
            onClick={() => onChange(key)}
            title={key}
          >
            <img src={COVERS[key]} alt={key} />
            {value === key && <Check size={14} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrackPicker({ value, onChange }) {
  const { loadTrack, trackId, playing, toggle } = usePlayer();

  return (
    <div className="sp-field">
      <label>Room soundtrack</label>
      <div className="sp-track-picker">
        {TRACKS.map((track) => {
          const selected = value === track.id;
          const live = trackId === track.id && playing;

          return (
            <div key={track.id} className={selected ? "sp-track-row is-active" : "sp-track-row"}>
              <button type="button" className="sp-track-pick" onClick={() => onChange(track.id)}>
                <strong>{track.title}</strong>
                <small>{track.artist} · {track.genre}</small>
              </button>

              <button
                type="button"
                className="sp-track-preview"
                title="Preview"
                onClick={() => (trackId === track.id ? toggle() : loadTrack(track.id, true))}
              >
                {live ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreateRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [coverKey, setCoverKey] = useState("chill");
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [error, setError] = useState("");

  function submit() {
    if (name.trim() === "") {
      setError("Room name is required.");
      return;
    }
    if (locked && password.trim().length < 3) {
      setError("Private rooms need a password of at least 3 characters.");
      return;
    }
    onCreate({ name, description, locked, password: password.trim(), coverKey, trackId });
  }

  return (
    <Modal title="Create Room" subtitle="Create a space for your team" onClose={onClose}>
      <div className="sp-field">
        <label>Room Name</label>
        <input
          placeholder="Enter room name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <div className="sp-field">
        <label>Description</label>
        <textarea
          placeholder="What's this room about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <CoverPicker value={coverKey} onChange={setCoverKey} />
      <TrackPicker value={trackId} onChange={setTrackId} />

      <div className="sp-field">
        <label>Privacy</label>
      </div>

      <div className="sp-privacy">
        <button
          type="button"
          className={!locked ? "sp-privacy-card is-active" : "sp-privacy-card"}
          onClick={() => { setLocked(false); setError(""); }}
        >
          <Globe size={18} />
          <div>
            <strong>Open Room</strong>
            <small>Anyone can join</small>
          </div>
        </button>

        <button
          type="button"
          className={locked ? "sp-privacy-card is-active" : "sp-privacy-card"}
          onClick={() => { setLocked(true); setError(""); }}
        >
          <Lock size={18} />
          <div>
            <strong>Private Room</strong>
            <small>Password required</small>
          </div>
        </button>
      </div>

      {locked && (
        <div className="sp-field">
          <label>Room Password</label>
          <input
            type="password"
            placeholder="Create room password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
          />
        </div>
      )}

      {error && <p className="sp-error">{error}</p>}

      <button type="button" className="sp-primary-btn" onClick={submit}>
        Create Room
      </button>
      <button type="button" className="sp-secondary-btn" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}

export function EditRoomModal({ room, onClose, onSave }) {
  const [name, setName] = useState(room.name);
  const [genre, setGenre] = useState(room.genre);
  const [description, setDescription] = useState(room.description || "");
  const [coverKey, setCoverKey] = useState(room.coverKey || "chill");
  const [trackId, setTrackId] = useState(room.trackId || TRACKS[0].id);
  const [error, setError] = useState("");

  function submit() {
    if (name.trim() === "") {
      setError("Room name is required.");
      return;
    }
    onSave({
      ...room,
      name: name.trim(),
      genre: genre.trim() || "Custom Room",
      description: description.trim() || room.description,
      coverKey,
      trackId,
    });
  }

  return (
    <Modal title="Edit Room" subtitle="Update your room details" onClose={onClose}>
      <div className="sp-field">
        <label>Room Name</label>
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
      </div>

      <div className="sp-field">
        <label>Genre</label>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} />
      </div>

      <div className="sp-field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <CoverPicker value={coverKey} onChange={setCoverKey} />
      <TrackPicker value={trackId} onChange={setTrackId} />

      {error && <p className="sp-error">{error}</p>}

      <button type="button" className="sp-primary-btn" onClick={submit}>
        Save Changes
      </button>
      <button type="button" className="sp-secondary-btn" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}

export function PasswordModal({ room, onClose, onSave }) {
  const [password, setPassword] = useState("");
  const [locked, setLocked] = useState(room.locked);
  const [error, setError] = useState("");

  function submit() {
    if (locked && password.trim().length < 3) {
      setError("Password must be at least 3 characters.");
      return;
    }
    onSave({ ...room, locked, password: locked ? password.trim() : "" });
  }

  return (
    <Modal title="Room Security" subtitle={room.name} onClose={onClose}>
      <div className="sp-privacy">
        <button
          type="button"
          className={!locked ? "sp-privacy-card is-active" : "sp-privacy-card"}
          onClick={() => { setLocked(false); setError(""); }}
        >
          <Globe size={18} />
          <div>
            <strong>Open Room</strong>
            <small>No password</small>
          </div>
        </button>

        <button
          type="button"
          className={locked ? "sp-privacy-card is-active" : "sp-privacy-card"}
          onClick={() => { setLocked(true); setError(""); }}
        >
          <Lock size={18} />
          <div>
            <strong>Private Room</strong>
            <small>Password required</small>
          </div>
        </button>
      </div>

      {locked && (
        <div className="sp-field">
          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      )}

      {error && <p className="sp-error">{error}</p>}

      <button type="button" className="sp-primary-btn" onClick={submit}>
        Save Security
      </button>
      <button type="button" className="sp-secondary-btn" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}

export function ConfirmDeleteModal({ room, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose} size="sm">
      <div className="sp-modal-center">
        <div className="sp-modal-icon">
          <Trash2 size={26} />
        </div>

        <h2>Delete Room?</h2>
        <p>
          This removes <b>{room.name}</b> and its history. This cannot be undone.
        </p>

        <div className="sp-modal-actions">
          <button type="button" className="sp-secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="sp-danger-btn" onClick={() => onConfirm(room)}>
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
