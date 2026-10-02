# cozy

A live 2.5D map of New York City showing what's popping tonight. Events come from ticketing/listing APIs, people roam the map as avatars, leave comments on events, and the soundtrack shifts through the night.

**Status:** MVP scaffold. It works end to end with ugly visuals. Looks come later.

- Plan & roadmap: [docs/PLAN.md](docs/PLAN.md)
- How it fits together: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Where events come from (and what's legally usable): [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)
- Music system and composer brief: [docs/AUDIO.md](docs/AUDIO.md)

## Quick start

Needs Node 22+ and pnpm 10 (`corepack enable`).

```sh
pnpm install
cp .env.example .env     # optional: add TICKETMASTER_API_KEY for real events
pnpm dev                 # server on :8787, web on :5173
```

Open http://localhost:5173 in two browser windows to see each other's avatars.

No database setup is needed. Without `DATABASE_URL`, the server runs an embedded Postgres (PGlite) in `apps/server/.pglite`. To use real Postgres/PostGIS instead:

```sh
docker compose up -d db
# set DATABASE_URL=postgres://cozy:comfy123@localhost:5432/cozy in .env
```

Controls: WASD / arrows to walk, shift to run, click the map to walk somewhere, F to recenter on yourself, click a dot for details and comments. Use `?hour=2` to hear the 2am music scene at any time.

## Layout

```
apps/server     Fastify API + WebSocket presence, event ingestion, Postgres
apps/web        Vite + React + MapLibre GL (2.5D map), Web Audio engine
packages/shared Types and the realtime protocol, shared by both apps
docs/           Plan, architecture, data sources, audio
```

Common commands: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm --filter @cozy/server ingest`.

`backend/` (Rust/Rocket) and `frontend/` (Create React App) hold the original college-era skeleton. Nothing uses them now, so delete them whenever you want.
