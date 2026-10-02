# Architecture

```
            ┌──────────── sources (every 15 min) ────────────┐
            │ seed · ticketmaster · (ra) · (eventbrite) · …   │
            └───────────────────────┬────────────────────────┘
                                    │ NormalizedEvent[]
                                    ▼
┌──────────────┐   HTTP    ┌───────────────────┐    SQL    ┌──────────────┐
│  web (Vite)  │ ────────▶ │ server (Fastify)  │ ────────▶ │  Postgres    │
│  MapLibre    │ ◀──────── │  /api/events      │           │  (PGlite dev)│
│  Web Audio   │    WS     │  /api/.../comments│           └──────────────┘
│              │ ◀───────▶ │  /ws  presence    │
└──────────────┘           └───────────────────┘
```

## Server (`apps/server`)

- `sources/`: one adapter per provider, implementing `EventSource.fetchTonight(window)`. Each adapter returns `NormalizedEvent`s; `ingest()` upserts them by `source:sourceId`. A failing source is logged and doesn't stop the others.
- `time.ts`: the definition of "tonight" (5pm–6am New York time, DST-aware).
- `heat.ts`: the "popping" score from 0 to 1. Currently 50% time proximity, 30% live social activity (comments in the last hour, avatars within 150 m), and 20% source popularity. Computed per request, so it reacts live.
- `realtime/presence.ts`: in-memory avatar positions. Clients send `hello` then `move` (validated with zod, clamped to NYC). The server broadcasts full snapshots every 100 ms when something changed. New comments are broadcast on the same socket.
- `db/`: a minimal `Db` interface that both `pg` and PGlite satisfy, plain SQL migrations in `migrations/`, and a repository module.

### Scaling notes
Full snapshots to everyone work for a few hundred concurrent users. Next steps, in order:
1. Send deltas instead of snapshots.
2. Interest management: bucket avatars by map tile (zoom 14), and have each client subscribe to the tiles in its viewport.
3. Multiple server instances with Redis pub/sub per tile.

## Web (`apps/web`)

- `map/CityMap.tsx`: MapLibre map pitched to 60° and rotated to the Manhattan grid. Adds 3D building extrusions if the base style lacks them. GeoJSON sources hold events, other avatars, and you. A `requestAnimationFrame` loop handles walking: WASD moves relative to the camera, click-to-walk moves toward a target. Positions are sent at 10 Hz.
- `useRealtime.ts`: WebSocket with automatic reconnect.
- `audio/engine.ts`: layered loop engine (see AUDIO.md). Energy follows the hottest event within 400 m of you.
- `ui/EventPanel.tsx`: event list sorted by heat, plus a detail view with live comments.

## Shared (`packages/shared`)

API types, zod schemas for anything a client sends, the WebSocket protocol, and NYC constants. Both apps import it as TypeScript source, so there's no build step.

## Testing

`pnpm test` runs server tests with vitest against an in-memory PGlite: time windows (including DST), heat, Ticketmaster normalization, the API, and presence.
