import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Disc3, Flame, LayoutGrid, ListMusic, Loader2, Play, Rows3, Search, User,
} from "lucide-react";

import MusicBar from "../components/MusicBar";
import SongTable from "../components/SongTable";
import useMusicCatalog from "../hooks/useMusicCatalog";
import {
  GENRES, PAGE_SIZE, SORTS,
  fetchArtistTracks, fetchGenreArt, fetchPlaylistTracks, fetchSongs, sortSongs,
} from "../services/musicApi";
import { useMusicLibrary } from "../state/MusicLibrary";
import { usePlayer } from "../state/PlayerContext";

const TABS = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "artists", label: "Artists" },
  { id: "playlists", label: "Playlists" },
  { id: "underground", label: "Underground" },
  { id: "genres", label: "Genres" },
];

const RESOURCE_BY_TAB = {
  all: "songs",
  songs: "songs",
  artists: "artists",
  playlists: "playlists",
  underground: "underground",
};

const SONG_TABS = new Set(["all", "songs", "underground"]);

/** 1 2 3 4 … 40 — collapses the middle once the run gets long. */
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push("gap");
    out.push(page);
    previous = page;
  }
  return out;
}

function GenreCard({ genre, active, onSelect }) {
  const [art, setArt] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchGenreArt(genre.id, { signal: controller.signal })
      .then((url) => !controller.signal.aborted && setArt(url))
      .catch(() => {});
    return () => controller.abort();
  }, [genre.id]);

  return (
    <button
      type="button"
      className={active ? "sp-genre-card is-active" : "sp-genre-card"}
      onClick={() => onSelect(genre.id)}
      style={{ "--accent": genre.accent }}
    >
      <span className="sp-genre-art">
        {art ? <img src={art} alt="" loading="lazy" /> : <ListMusic size={26} />}
      </span>
      <b>{genre.label}</b>
      <span>Trending on Audius</span>
    </button>
  );
}

function StatusBlock({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="sp-music-status">
        <Loader2 size={20} className="sp-spin" />
        Pulling tracks from Audius…
      </div>
    );
  }

  if (error) {
    return (
      <div className="sp-music-status is-error">
        <AlertTriangle size={20} />
        <span>{error}</span>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  return null;
}

function MusicView({ mode = "browse", initialTab = "all" }) {
  const { likedSongs, recentSongs, playlists: libraryPlaylists } = useMusicLibrary();
  const { playSongs } = usePlayer();

  const [tab, setTab] = useState(initialTab);
  const [genreId, setGenreId] = useState(null);
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState("popular");
  const [layout, setLayout] = useState("list");
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const [detail, setDetail] = useState(null);
  const [detailSongs, setDetailSongs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const isLibraryMode = mode === "liked" || mode === "played";
  const librarySongs = mode === "liked" ? likedSongs : recentSongs;

  const resource = RESOURCE_BY_TAB[tab] || "songs";
  const catalogEnabled = !isLibraryMode && !detail && Boolean(RESOURCE_BY_TAB[tab]);

  const { items, loading, error, reload } = useMusicCatalog({
    resource,
    query: term,
    genreId,
    enabled: catalogEnabled,
  });

  /** Loading a detail pane is the same shape whatever produced the songs. */
  const openDetail = useCallback((meta, loader) => {
    setDetail(meta);
    setDetailSongs([]);
    setDetailError(null);
    setDetailLoading(true);

    loader()
      .then(setDetailSongs)
      .catch((err) => setDetailError(err.message || "Could not load those tracks."))
      .finally(() => setDetailLoading(false));
  }, []);

  const openAudiusPlaylist = useCallback(
    (playlist) => openDetail(
      { kind: "Playlist", title: playlist.title, subtitle: `${playlist.artist} · ${playlist.trackCount} tracks`, cover: playlist.cover },
      () => fetchPlaylistTracks(playlist.audiusId),
    ),
    [openDetail],
  );

  const openLibraryPlaylist = useCallback(
    (playlist) => {
      if (playlist.songs) {
        setDetail({ kind: "Playlist", title: playlist.label, subtitle: playlist.subtitle, accent: playlist.accent });
        setDetailSongs(playlist.songs);
        setDetailError(null);
        setDetailLoading(false);
        return;
      }
      openDetail(
        { kind: "Playlist", title: playlist.label, subtitle: playlist.subtitle, accent: playlist.accent },
        () => fetchSongs({ genreId: playlist.genreId }),
      );
    },
    [openDetail],
  );

  const openArtist = useCallback(
    (artist) => openDetail(
      { kind: "Artist", title: artist.name, subtitle: `@${artist.handle} · ${artist.followers.toLocaleString()} followers`, cover: artist.cover, round: true },
      () => fetchArtistTracks(artist.audiusId),
    ),
    [openDetail],
  );

  const closeDetail = useCallback(() => {
    setDetail(null);
    setDetailSongs([]);
    setDetailError(null);
  }, []);

  const source = isLibraryMode ? librarySongs : detail ? detailSongs : items;

  const filtered = useMemo(() => {
    if (!isLibraryMode && !detail) return source;
    const needle = term.trim().toLowerCase();
    if (!needle) return source;
    return source.filter(
      (song) =>
        song.title?.toLowerCase().includes(needle) ||
        song.artist?.toLowerCase().includes(needle) ||
        song.album?.toLowerCase().includes(needle),
    );
  }, [source, term, isLibraryMode, detail]);

  const showsSongs = isLibraryMode || Boolean(detail) || SONG_TABS.has(tab);

  const songs = useMemo(
    () => (showsSongs ? sortSongs(filtered, sort) : filtered),
    [filtered, sort, showsSongs],
  );

  const viewKey = `${mode}|${tab}|${genreId ?? ""}|${term.trim()}|${sort}|${detail?.title ?? ""}`;
  const page = pageState.key === viewKey ? pageState.page : 1;
  const setPage = useCallback((value) => setPageState({ key: viewKey, page: value }), [viewKey]);

  const totalPages = Math.max(1, Math.ceil(songs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageSongs = showsSongs ? songs.slice(start, start + PAGE_SIZE) : [];

  const heading = isLibraryMode
    ? mode === "liked" ? "Favorite Songs" : "Recently Played"
    : "Music";
  const subheading = isLibraryMode
    ? mode === "liked" ? "Every track you tapped the heart on." : "The last songs you played, newest first."
    : "Discover and play any song you love.";

  const busy = detail ? detailLoading : loading;
  const failure = detail ? detailError : error;
  const showToolbar = !detail && tab !== "genres" && tab !== "playlists";

  return (
    <div className="sp-music">
      <div className="sp-music-scroll">
        <header className="sp-music-head">
          <h1>{heading}</h1>
          <p>{subheading}</p>
        </header>

        {!isLibraryMode && !detail && (
          <div className="sp-music-tabs">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "sp-pill is-active" : "sp-pill"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {detail && (
          <div className="sp-music-detail">
            <button type="button" className="sp-back-pill" onClick={closeDetail}>
              <ArrowLeft size={15} />
              Back to browse
            </button>
            <div className="sp-detail-head">
              {detail.cover ? (
                <img src={detail.cover} alt="" className={detail.round ? "is-round" : ""} />
              ) : (
                <span className="sp-detail-art" style={{ "--accent": detail.accent || "#a855f7" }}>
                  <ListMusic size={30} />
                </span>
              )}
              <div>
                <span className="sp-detail-kind">{detail.kind}</span>
                <h2>{detail.title}</h2>
                <p>{detail.subtitle}</p>
              </div>
              <button
                type="button"
                className="sp-detail-play"
                disabled={!detailSongs.length}
                onClick={() => playSongs(detailSongs, detailSongs[0]?.id)}
              >
                <Play size={17} fill="currentColor" />
                Play all
              </button>
            </div>
          </div>
        )}

        {!isLibraryMode && !detail && (tab === "all" || tab === "genres") && (
          <>
            <div className={tab === "genres" ? "sp-genre-row is-grid" : "sp-genre-row"}>
              {GENRES.map((genre) => (
                <GenreCard
                  key={genre.id}
                  genre={genre}
                  active={genreId === genre.id}
                  onSelect={(id) => {
                    setGenreId(id === genreId ? null : id);
                    setTab("songs");
                  }}
                />
              ))}
            </div>

            {tab === "all" && (
              <button type="button" className="sp-seeall sp-music-seeall" onClick={() => setTab("genres")}>
                View all
                <ArrowRight size={14} />
              </button>
            )}
          </>
        )}

        {(showToolbar || isLibraryMode || detail) && tab !== "genres" && tab !== "playlists" && (
          <div className="sp-music-toolbar">
            <label className="sp-music-search">
              <Search size={16} />
              <input
                type="search"
                value={term}
                placeholder={isLibraryMode || detail ? "Filter these songs..." : "Search in all music..."}
                onChange={(event) => setTerm(event.target.value)}
              />
            </label>

            <div className="sp-music-tools">
              {showsSongs && (
                <label className="sp-music-sort">
                  Sort by:
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    {SORTS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="sp-music-layout">
                <button
                  type="button"
                  className={layout === "list" ? "is-active" : ""}
                  onClick={() => setLayout("list")}
                  aria-label="List view"
                >
                  <Rows3 size={16} />
                </button>
                <button
                  type="button"
                  className={layout === "grid" ? "is-active" : ""}
                  onClick={() => setLayout("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        <StatusBlock loading={busy} error={failure} onRetry={reload} />

        {!busy && !failure && showsSongs && (
          <>
            <SongTable
              songs={pageSongs}
              startIndex={start}
              layout={layout}
              emptyLabel={
                isLibraryMode
                  ? mode === "liked"
                    ? "No favorites yet. Tap the heart on any song."
                    : "Nothing played yet. Pick a track and it lands here."
                  : "No streamable tracks matched that search."
              }
            />

            {songs.length > 0 && (
              <div className="sp-music-foot">
                <span>
                  Showing {start + 1} to {Math.min(start + PAGE_SIZE, songs.length)} of {songs.length} songs
                </span>

                <div className="sp-pager">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {pageList(safePage, totalPages).map((entry, index) =>
                    entry === "gap" ? (
                      <span key={`gap-${index}`} className="sp-pager-gap">…</span>
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        className={entry === safePage ? "is-active" : ""}
                        onClick={() => setPage(entry)}
                      >
                        {entry}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setPage(safePage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!busy && !failure && !detail && tab === "artists" && (
          <div className="sp-card-grid">
            {items.map((artist) => (
              <button key={artist.id} type="button" className="sp-artist-card" onClick={() => openArtist(artist)}>
                <span className="sp-artist-orb">
                  {artist.cover ? <img src={artist.cover} alt="" loading="lazy" /> : <User size={26} />}
                </span>
                <b title={artist.name}>{artist.name}</b>
                <span>{artist.followers.toLocaleString()} followers</span>
              </button>
            ))}
            {!items.length && (
              <p className="sp-music-empty">Search an artist name to browse their catalog.</p>
            )}
          </div>
        )}

        {!detail && tab === "playlists" && (
          <>
            <h2 className="sp-section">
              <Disc3 size={18} />
              <span>Your <em>Library</em></span>
            </h2>

            <div className="sp-card-grid">
              {libraryPlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className="sp-playlist-card"
                  style={{ "--accent": playlist.accent }}
                  onClick={() => openLibraryPlaylist(playlist)}
                >
                  <span className="sp-playlist-art"><Disc3 size={26} /></span>
                  <b>{playlist.label}</b>
                  <span>{playlist.subtitle}</span>
                </button>
              ))}
            </div>

            <h2 className="sp-section">
              <Flame size={18} />
              <span>From <em>Audius</em></span>
            </h2>

            <label className="sp-music-search sp-music-search--solo">
              <Search size={16} />
              <input
                type="search"
                value={term}
                placeholder="Search community playlists..."
                onChange={(event) => setTerm(event.target.value)}
              />
            </label>

            <StatusBlock loading={loading} error={error} onRetry={reload} />

            {!loading && !error && (
              <div className="sp-card-grid">
                {items.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="sp-album-card"
                    onClick={() => openAudiusPlaylist(playlist)}
                  >
                    <span className="sp-album-art">
                      {playlist.cover
                        ? <img src={playlist.cover} alt="" loading="lazy" />
                        : <Disc3 size={26} />}
                      <i><Play size={16} /></i>
                    </span>
                    <b title={playlist.title}>{playlist.title}</b>
                    <span>{playlist.trackCount} tracks · {playlist.artist}</span>
                  </button>
                ))}
                {!items.length && <p className="sp-music-empty">No playlists matched that search.</p>}
              </div>
            )}
          </>
        )}
      </div>

      <MusicBar onOpenQueue={() => { closeDetail(); setTab("songs"); }} />
    </div>
  );
}

export default MusicView;
