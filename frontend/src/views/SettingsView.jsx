import { useState } from "react";
import {
  ArrowLeft, Bell, Check, ChevronRight, Code2, GitBranch, Globe, Lock,
  Mail, MessageSquare, Moon, Pencil, Shield, SlidersHorizontal, Smartphone, User,
} from "lucide-react";

import { avatarFor } from "../data/images";
import { useApp } from "../state/AppContext";
import { usePreferences } from "../state/Preferences";

const APP_VERSION = "v1.0.0";

const DEVELOPER = {
  name: "Mark Herrero",
  role: "Developer & Founder",
  avatarKey: "mark",
  chips: [
    { label: "Full Stack Developer", icon: Code2 },
    { label: "UI/UX Designer", icon: Pencil },
    { label: "Problem Solver", icon: Lock },
  ],
  email: "markherrero.dev@gmail.com",
  github: "github.com/markherrero",
  githubUrl: "https://github.com/markherrero",
  site: "markherrero.dev",
  siteUrl: "https://markherrero.dev",
};

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={on ? "sp-toggle is-on" : "sp-toggle"}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

function ToggleRow({ icon: Icon, title, note, on, onChange }) {
  return (
    <div className="sp-set-row">
      <span className="sp-set-icon"><Icon size={17} /></span>
      <div className="sp-set-text">
        <b>{title}</b>
        <p>{note}</p>
      </div>
      <Toggle on={on} onChange={onChange} label={title} />
    </div>
  );
}

function ExpandRow({ icon: Icon, title, note, open, onToggle, children }) {
  return (
    <div className={open ? "sp-set-expand is-open" : "sp-set-expand"}>
      <button type="button" className="sp-set-row sp-set-row--action" onClick={onToggle}>
        <span className="sp-set-icon"><Icon size={17} /></span>
        <div className="sp-set-text">
          <b>{title}</b>
          <p>{note}</p>
        </div>
        <ChevronRight size={18} className="sp-set-chevron" />
      </button>
      {open && <div className="sp-set-drawer">{children}</div>}
    </div>
  );
}

function SettingsView({ ctl }) {
  const { user, pushToast } = useApp();
  const { prefs, setPref, togglePref } = usePreferences();

  const [openRow, setOpenRow] = useState(null);
  const [name, setName] = useState(prefs.displayName || user.name || "");
  const [tagline, setTagline] = useState(prefs.tagline || "");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");

  const row = (id) => setOpenRow((current) => (current === id ? null : id));

  const saveProfile = (event) => {
    event.preventDefault();
    setPref("displayName", name.trim());
    setPref("tagline", tagline.trim());
    pushToast("Profile updated");
    setOpenRow(null);
  };

  const savePassword = (event) => {
    event.preventDefault();

    if (passwords.next.length < 8) {
      setPasswordError("New password needs at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("The two new passwords do not match.");
      return;
    }

    setPasswordError("");
    setPasswords({ current: "", next: "", confirm: "" });
    pushToast("Password changed");
    setOpenRow(null);
  };

  return (
    <div className="sp-settings">
      <div className="sp-settings-bar">
        <button type="button" className="sp-back-pill" onClick={() => ctl.setView("home")}>
          <ArrowLeft size={15} />
          Back to Home
        </button>
        <span className="sp-version-pill">{APP_VERSION}</span>
      </div>

      <header className="sp-settings-head">
        <h1>Settings</h1>
        <p>Manage your preferences and account settings.</p>
      </header>

      <section className="sp-set-card">
        <h3><SlidersHorizontal size={17} /> Preferences</h3>
        <ToggleRow
          icon={Moon}
          title="Dark Mode"
          note="Enable dark mode for the application."
          on={prefs.darkMode}
          onChange={() => togglePref("darkMode")}
        />
      </section>

      <section className="sp-set-card">
        <h3><User size={17} /> Account</h3>

        <ExpandRow
          icon={Pencil}
          title="Edit Profile"
          note="Update your profile information and avatar"
          open={openRow === "profile"}
          onToggle={() => row("profile")}
        >
          <form onSubmit={saveProfile}>
            <label>
              Display name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
            </label>
            <label>
              Tagline
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={60}
                placeholder="Late-night lo-fi and louder"
              />
            </label>
            <button type="submit" className="sp-set-save">
              <Check size={15} />
              Save changes
            </button>
          </form>
        </ExpandRow>

        <ExpandRow
          icon={Lock}
          title="Change Password"
          note="Update your account password"
          open={openRow === "password"}
          onToggle={() => row("password")}
        >
          <form onSubmit={savePassword}>
            <label>
              Current password
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                autoComplete="new-password"
              />
            </label>
            {passwordError && <p className="sp-set-error">{passwordError}</p>}
            <button type="submit" className="sp-set-save">
              <Check size={15} />
              Update password
            </button>
          </form>
        </ExpandRow>

        <ExpandRow
          icon={Shield}
          title="Privacy Settings"
          note="Manage your privacy and visibility"
          open={openRow === "privacy"}
          onToggle={() => row("privacy")}
        >
          <ToggleRow
            icon={User}
            title="Show online status"
            note="Let members see when you are online."
            on={prefs.showOnline}
            onChange={() => togglePref("showOnline")}
          />
          <ToggleRow
            icon={MessageSquare}
            title="Show listening activity"
            note="Share the track you are playing in rooms."
            on={prefs.showListening}
            onChange={() => togglePref("showListening")}
          />
          <ToggleRow
            icon={Mail}
            title="Allow room invites"
            note="Members can invite you to private rooms."
            on={prefs.allowInvites}
            onChange={() => togglePref("allowInvites")}
          />
        </ExpandRow>
      </section>

      <section className="sp-set-card">
        <h3><Bell size={17} /> Notifications</h3>
        <ToggleRow
          icon={Smartphone}
          title="Push Notifications"
          note="Receive notifications for messages and mentions"
          on={prefs.pushNotifications}
          onChange={() => togglePref("pushNotifications")}
        />
        <ToggleRow
          icon={MessageSquare}
          title="Room Activity"
          note="Get notified about room updates and events"
          on={prefs.roomActivity}
          onChange={() => togglePref("roomActivity")}
        />
      </section>

      <section className="sp-set-card">
        <h3><Code2 size={17} /> Developer Info</h3>

        <div className="sp-dev">
          <div className="sp-dev-body">
            <div className="sp-dev-avatar">
              <img src={avatarFor(DEVELOPER.avatarKey, DEVELOPER.name)} alt={DEVELOPER.name} />
              <span className="sp-dev-dot" />
            </div>

            <div className="sp-dev-text">
              <h4>{DEVELOPER.name}</h4>
              <p className="sp-dev-role">{DEVELOPER.role}</p>
              <p>Passionate developer building <b>SOMPO TEAM</b>.</p>
              <p>Focused on creating smooth music,</p>
              <p>chat, and connection experiences.</p>

              <div className="sp-dev-chips">
                {DEVELOPER.chips.map(({ label, icon: Icon }) => (
                  <span key={label}>
                    <Icon size={13} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="sp-dev-links">
            <a href={`mailto:${DEVELOPER.email}`}>
              <Mail size={14} />
              {DEVELOPER.email}
            </a>
            <a href={DEVELOPER.githubUrl} target="_blank" rel="noreferrer">
              <GitBranch size={14} />
              {DEVELOPER.github}
            </a>
            <a href={DEVELOPER.siteUrl} target="_blank" rel="noreferrer">
              <Globe size={14} />
              {DEVELOPER.site}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SettingsView;
