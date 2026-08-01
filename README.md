# SOMPO TEAM

Soundtrip. Chat. Connect.

Developer: Mark Herrero

A room-based listening app: activation-code access, public and private rooms,
real-time chat and a shared music player.

## Layout

```
frontend/   Vite + React 19 client (dashboard, room chat, splash, activation)
backend/    Express 5 API + WebSocket realtime
database/   MySQL schema
tools/      make_audio.py — regenerates the bundled soundtrack loops
docs/       system plan
```

## Running

Backend (port 4000):

```bash
cd backend
cp .env.example .env
npm install
npm start
```

It boots with a JSON store at `backend/data/store.json` — no database needed.
Point `DB_HOST` at MySQL in `.env` to switch drivers (import
`database/schema.sql` first).

Frontend (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` if the API is not on `http://localhost:4000`.

## Flow

`/` splash → `/activate` activation code → `/home` dashboard → `/room/:id` chat.

Demo activation codes: `SOMPO2026`, `TEAMVIBES`, `CHILL-01`, `LOFI-2026`.
Private room passwords: Chill Vibes `chill`, Gaming Lounge `gg`,
Study Together `focus`.

## Offline-first

The client works with the API down: rooms, favorites, history and chat fall
back to `localStorage`, and activation checks the bundled code list. When the
API answers, rooms load from the server, the password gate is verified
server-side, and chat runs over the WebSocket — the room header shows
**Live** instead of **Local**.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | storage driver, socket count, uptime |
| POST | `/api/activation/verify` | `{ username, code }` → session token |
| GET | `/api/activation/me` | current account |
| GET/POST/PATCH | `/api/activation/codes` | admin, needs `x-admin-key` |
| GET | `/api/rooms` | list |
| POST | `/api/rooms` | create (auth) |
| PATCH/DELETE | `/api/rooms/:id` | owner only |
| POST | `/api/rooms/:id/join` | `{ password }` for private rooms |
| GET/POST | `/api/rooms/:id/messages` | history / send |
| POST | `/api/rooms/:id/messages/:messageId/reactions` | react |
| PATCH | `/api/rooms/:id/messages/:messageId/pin` | pin / unpin |
| DELETE | `/api/rooms/:id/messages/:messageId` | own messages only |

WebSocket at `ws://localhost:4000/realtime` — `auth`, `room:watch`, `typing`
in; `message:new`, `message:reaction`, `message:pinned`, `message:deleted`,
`presence`, `room:*` out.

Smoke test the whole surface with the server running:

```bash
cd backend && npm run test:api
```

## Security notes

- Room passwords are stored as salted scrypt hashes, never in plaintext, and
  are never included in API responses.
- Session tokens are HMAC-signed with `SESSION_SECRET`.
- Generated SQL only touches whitelisted columns per table.

## Future modules

- Admin app
- Activation code generator UI (API is already there)
- User management
- Analytics

## Music screen (Audius)

The Music screen streams full-length tracks from the Audius network. The
frontend never talks to Audius directly — everything goes through this API,
which picks a healthy discovery node, caches responses and normalises the
payloads into the shape the player already understands.

```
GET /api/music/genres
GET /api/music/tracks?query=&genre=&limit=&offset=   search, or trending with no query
GET /api/music/underground?limit=
GET /api/music/tracks/:id
GET /api/music/artists?query=
GET /api/music/artists/:id/tracks
GET /api/music/playlists?query=
GET /api/music/playlists/:id/tracks
GET /api/music/stream/:id                            piped audio, Range-aware
```

### Why audio is proxied

Audius redirects a stream request to a content node, which sometimes redirects
again to object storage that answers **without** an `Access-Control-Allow-Origin`
header. The Web Audio analyser behind the visualiser requires
`crossOrigin="anonymous"`, and that final hop fails the CORS check — the track
never loads. Piping the bytes through `/api/music/stream/:id` puts the response
under this server's own CORS policy, keeps `Range` requests intact for seeking,
and keeps the visualiser alive.

Set `AUDIUS_STREAM_MODE=direct` in `.env` to hand the browser Audius node URLs
instead. Cheaper on bandwidth, but the visualiser goes idle on the tracks whose
redirect lands without CORS headers.

### Credentials

Audius read endpoints are public. `AUDIUS_API_KEY` is sent as `X-API-KEY` for
rate-limit attribution; the secret and bearer token sit in `.env` unused until
write operations through the Audius SDK are added.

### CORS gotcha

`CORS_ORIGIN` must match the frontend origin **exactly** —
`http://localhost:5173` and `http://127.0.0.1:5173` are different origins to a
browser. Leave it empty during development to accept any origin.

## Screens

| Screen | Route / view | Notes |
|---|---|---|
| Splash | `/` | Floating room cards, click or press any key to skip |
| Activation | `/activate` | Codes seeded in `backend/models/ActivationCode.js` |
| Home | dashboard `home` | Featured hero, category filters, popular rooms |
| Discover / My Rooms / Members | dashboard | Room browsing and membership |
| **Music** | dashboard `music` | Audius catalog, docked transport, paging |
| **Favorite Songs / Playlists / Recently Played** | dashboard | Backed by `MusicLibrary` in localStorage |
| **Profile** | dashboard `profile` | Stats and liked songs |
| **Settings** | dashboard `settings` | Preferences, account, notifications, developer info |
| Room | `/room/:id` | Live chat, reactions, shared player |

Dark mode is a theme-token swap on `.sompo`, so the whole app follows the
Settings toggle without a second stylesheet.

## Seed data

`frontend/src/data/` holds the offline half of the app:

- `images.js` — cover and avatar registry. `coverFor` / `avatarFor` never
  return undefined; an unknown key falls back to a deterministic pick derived
  from the name.
- `seed.js` — default rooms, tracks, members, categories, notifications,
  activation codes. Rooms from the API are merged over these at runtime.
- `chat.js` — emoji groups, quick reactions, room rules, seeded conversations
  and the offline reply generator.

The app runs entirely from this data when the backend is down.
