# SOMPO TEAM System Plan

## Phase 1 — UI Prototype ✅

- Splash screen
- Activation code screen
- Dashboard (rooms, featured carousel, filters, library views)
- Room chat screen
- Music interface with Web Audio visualisers

## Phase 2 — Backend ✅

- Express 5 API: activation, rooms, membership, messages
- Storage driver: JSON file out of the box, MySQL when configured
- MySQL schema in `database/schema.sql`
- Realtime over WebSocket: messages, reactions, pins, typing, presence
- Salted scrypt room passwords, HMAC session tokens
- Offline-first client fallback to `localStorage`

## Phase 3 — Admin Mobile App

- Activation code generator UI (API ready: `/api/activation/codes`)
- User management and bans
- Room moderation queue from the Report Room flow
- Analytics: listening minutes, room growth, peak hours

## Backlog

- Synced playback position so a room listens together in step
- Voice rooms
- Push notifications for muted/unmuted rooms
- Media tab uploads beyond shared tracks
