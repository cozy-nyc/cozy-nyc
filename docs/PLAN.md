# Cozy — plan

## The idea

Open cozy at 10pm and you see New York in 2.5D, lit up where things are happening tonight. Brighter, bigger dots mean the spot is popping. Other people walk around the map as avatars. You can click into an event, read what people there are saying, and add your own comment. The music changes as the night goes on and gets busier as you walk toward hot spots.

## Principles

1. **Functional first, pretty later.** Every phase ships something usable in a browser. Visual and audio polish happen in their own phase, on top of a working base.
2. **Web, not a native engine (for now).** See the decision below.
3. **Only use data we're allowed to use.** Scraped data makes the product fragile and creates legal risk (see DATA_SOURCES.md).
4. **One repo, one language.** TypeScript across server, web and shared types, so two engineers can work anywhere in the codebase.

## Key decisions

| Decision | Choice | Why | Revisit when |
|---|---|---|---|
| Rendering | MapLibre GL JS (WebGL) with extruded OSM buildings and a pitched camera | Gives real NYC geography and 2.5D for free, runs on phones, shareable by link | We need custom shaders or characters MapLibre can't draw. Next step is three.js or deck.gl layered on the same map, not a full rewrite |
| Godot | Not for the MVP | Godot's web export is heavy, has no real map/tiles story, and puts the app behind a big download. Fits better as a later "cozy world" mode or a native app | We want a game-like walkable world beyond map scale |
| Backend | Node + Fastify + WebSocket, TypeScript | Shared types with the client, easy to hire for. The old Rust code was a hello world, so nothing is lost | Presence needs to fan out to many thousands of users at once (Rust/Go presence service) |
| Database | Postgres (PGlite embedded in dev) | Real SQL from day one, zero setup locally; PostGIS is ready in docker-compose | — |
| Identity | Guest handle + color in localStorage | Lowest-friction way to make the map feel alive | Phase 2 (accounts) |
| Map tiles | OpenFreeMap (free, no key) | No cost, no key | Traffic grows or we want a custom night style (self-host with Protomaps PMTiles) |

## Phases

### Phase 0 — scaffold ✅ (this commit)
- Monorepo, CI, docs.
- Server: ingestion framework, seed + Ticketmaster sources, events/comments API, WebSocket presence, heat score.
- Web: 2.5D NYC map, event dots sized and colored by heat, event list, detail view with live comments, walkable avatar, other avatars in realtime, time-of-day audio scenes with placeholder synth stems.

### Phase 1 — real MVP (≈ 3–4 weeks, 2 engineers)
Goal: show it to 20 friends on a Friday night.
- [ ] Get a Ticketmaster key; add 1–2 more legitimate sources (see DATA_SOURCES.md: curated Eventbrite organizers, NYC Parks, manual/promoter submissions).
- [ ] De-duplicate the same event across sources (venue + start time + fuzzy title).
- [ ] Venue table: canonical venues with coordinates, events link to them.
- [ ] "Submit an event" form for promoters, with a moderation queue.
- [ ] Rate limiting and basic moderation on comments (length, rate, report button, word filter).
- [ ] Hide comments older than tonight; keep them archived.
- [ ] Mobile layout pass (bottom sheet instead of side panel, touch to walk).
- [ ] Deploy: one server (Fly.io/Railway/Render) + managed Postgres + static web on a CDN. Add Sentry.
- [ ] Basic analytics: daily users, events viewed, comments posted.

### Phase 2 — social
- [ ] Accounts (magic link or Sign in with Apple/Google); keep guest mode.
- [ ] Avatar customization (sprite sheets; still 2D sprites billboarded on the map).
- [ ] "I'm going" / "I'm here" check-ins; feed these into heat.
- [ ] Proximity chat: see messages from avatars near you.
- [ ] Friends and following.
- [ ] Presence scaling: split the map into tiles so clients only receive nearby avatars; Redis pub/sub between server instances.

### Phase 3 — aesthetics
- [x] Panel UI uses the old cozy palette and fonts from comfy/Figma.
- [ ] Custom night map style in the cozy palette (cozy black base, pink/hot accents, glowing venue footprints).
- [ ] Fill in the empty Figma pages (inputs, buttons, navigation, effects) for the map UI.
- [ ] three.js custom layer for avatars, crowds around hot venues, particles and light beams.
- [ ] Day/night lighting tied to the real clock.
- [ ] Commissioned music stems replace the placeholders (see AUDIO.md). Genre-aware layers near venues.

### Phase 4 — maybe
- Godot or native "world" mode, partnerships with RA/promoters, ticketing affiliate revenue, other cities.

## Repo strategy

Everything lives in this one monorepo for now, including the design system (`packages/comfy`, imported from the old `cozy-nyc/comfy` repo with its history).

Why not keep comfy separate yet: cozy is its only user. With two repos, every design change would need a release in comfy and then a version bump in the app. That's slow, and drifting copies are the usual result. Here one PR can change a token and the screens that use it.

When to split it out: when a second, separate project (another city, a native app, a marketing site in another repo) needs it. Then publish `@cozy/comfy` to npm (or GitHub Packages) from this repo, or split it with `git subtree split --prefix=packages/comfy`. The package already has its own `package.json` and exports, so that's a small job.

## Splitting the work between two engineers

- **Engineer A (data + backend):** sources, dedupe, venues, moderation, deploy, presence scaling.
- **Engineer B (client + experience):** map, avatars, mobile, audio engine, visual style.
- The contract between them is `packages/shared`. Change it in its own small PR.

## Open questions

1. ~~What does `comfy` become?~~ It's the design system, living in the monorepo at `packages/comfy` (see "Repo strategy" below).
2. Comment moderation: who reviews reports at 2am?
3. Is "tonight" always 5pm–6am, or should daytime events (gallery openings, markets) show up too?
4. Brand: keep the name "cozy" on a nightlife product?
5. Budget for tiles and hosting once real traffic arrives, and for the composer.
