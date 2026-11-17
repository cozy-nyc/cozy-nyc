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

- `map/SvgMap.tsx`: the city as one SVG, north-up, drawn from `@cozy/shared/geo` (borough outlines, MTA subway lines and stations) in comfy's subway-map colors. No tiles and no map library. `map/projection.ts` turns lng/lat into flat map units; `map/usePanZoom.ts` handles drag, wheel, pinch, keys and the fly-to animation by writing one transform to the DOM. Events are dots sized and colored by heat; avatars are drawn at their spawn points (walking is off for now, though the server and protocol still support `move`).
- `useRealtime.ts`: WebSocket with automatic reconnect.
- `audio/engine.ts`: layered loop engine (see AUDIO.md). `setMuted()` silences the output without stopping the loops. Energy follows the hottest event within 400 m of the middle of the map.
- `ui/`: `EventFeed` (events sorted by heat), `LocationCard` (address, Google Maps link and venue links, pinned to the selected marker; a bottom sheet on phones), `SocialPanel` (every event's comments in one stream, plus posting), `NewsPanel`, `MapControls` (zoom, layers, mute).
- `mock/`: placeholder venue addresses/links and news posts, until the server has a venue table and a posts API.

## Shared (`packages/shared`)

API types, zod schemas for anything a client sends, the WebSocket protocol, and NYC constants. Both apps import it as TypeScript source, so there's no build step.

## Testing

`pnpm test` runs server tests with vitest against an in-memory PGlite: time windows (including DST), heat, Ticketmaster normalization, the API, and presence.
