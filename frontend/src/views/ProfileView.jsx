import { ArrowLeft, Crown, Heart, History, Music, Settings, Users } from "lucide-react";

import Avatar from "../components/Avatar";
import SongTable from "../components/SongTable";
import { useApp } from "../state/AppContext";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePreferences } from "../state/Preferences";

function ProfileView({ ctl }) {
  const { user, rooms, favorites, history, isOwner, onlineCount } = useApp();
  const { likedSongs, recentSongs } = useMusicLibrary();
  const { prefs } = usePreferences();

  const displayName = prefs.displayName?.trim() || user.name;
  const owned = rooms.filter(isOwner).length;

  const stats = [
    { label: "Rooms hosted", value: owned, icon: Music },
    { label: "Favorite rooms", value: favorites.length, icon: Heart },
    { label: "Liked songs", value: likedSongs.length, icon: Heart },
    { label: "Tracks played", value: history.length + recentSongs.length, icon: History },
    { label: "Members online", value: onlineCount, icon: Users },
  ];

  return (
    <div className="sp-settings">
      <div className="sp-settings-bar">
        <button type="button" className="sp-back-pill" onClick={() => ctl.setView("home")}>
          <ArrowLeft size={15} />
          Back to Home
        </button>
        <button type="button" className="sp-version-pill sp-version-pill--btn" onClick={() => ctl.setView("settings")}>
          <Settings size={13} />
          Settings
        </button>
      </div>

      <header className="sp-settings-head">
        <h1>Profile</h1>
        <p>How the rest of the roost sees you.</p>
      </header>

      <section className="sp-set-card">
        <div className="sp-profile-hero">
          <Avatar name={displayName} avatarKey={user.avatarKey} size={92} status="online" />
          <div>
            <h2>
              {displayName}
              {user.owner && <Crown size={17} />}
            </h2>
            <p className="sp-profile-tag">{prefs.tagline?.trim() || "No tagline yet."}</p>
            <span className="sp-profile-since">Member of SOMPO TEAM</span>
          </div>
        </div>

        <div className="sp-profile-stats">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <Icon size={15} />
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sp-set-card">
        <h3><Heart size={17} /> Liked Songs</h3>
        <SongTable
          songs={likedSongs.slice(0, 10)}
          emptyLabel="No favorites yet. Tap the heart on any song."
        />
      </section>
    </div>
  );
}

export default ProfileView;
