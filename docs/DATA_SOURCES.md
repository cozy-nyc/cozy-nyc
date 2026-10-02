# Event data sources

As of Oct 2026. Re-check terms before turning anything on.

| Source | Access | NYC "tonight" search? | Status in code |
|---|---|---|---|
| **Seed** | Ours | Yes | ✅ On. Made-up `[demo]` events at real venues so dev is never empty |
| **Ticketmaster Discovery API v2** | Free key, 5,000 calls/day, 5 req/s | Yes (geoPoint + radius + date range) | ✅ On when `TICKETMASTER_API_KEY` is set. Covers big venues, concerts, comedy, sports |
| **Resident Advisor** | **No public API.** ra.co/graphql is the website's internal endpoint | Technically yes, but unofficial | ⛔ Stub only. Ask RA for a partner feed first; scraping is a ToS risk and can break without warning |
| **Eventbrite** | Public API, but event search was shut off in Feb 2020 | No. Only events by known organizer/venue ID | ⛔ Stub. Feasible with a curated list of NYC organizer IDs |
| **Promoter / user submissions** | Ours | Yes | Phase 1. Probably the best source for underground events RA lists |
| **NYC Open Data / NYC Parks events** | Free | Yes, but many have no coordinates | Phase 1 candidate (needs geocoding) |
| SeatGeek, Dice, Shotgun, Partiful, Bandsintown, Songkick | Varies: closed, partner-only, or artist-centric | Mostly no | Investigate in Phase 1 |

## Adding a source

1. Create `apps/server/src/sources/<name>.ts` that exports an `EventSource`.
2. Keep normalization in a pure function (`normalizeX(raw) → NormalizedEvent | null`) and unit-test it with a captured payload.
3. Drop events outside `NYC_BOUNDS` or without coordinates.
4. Set `popularity` (0–1) from whatever signal the source has (RSVPs, interested counts, sell-through). Use 0.3 if there's none.
5. Register it in `sources/index.ts` and gate it on its API key.

## Heat signals worth adding later
- Check-ins ("I'm here") and RSVPs on cozy itself.
- Source popularity (RA's "interested" count if we get a feed).
- Recency-weighted comment velocity (already partly in).
- Opt-in aggregate foot traffic, much later.

## Map data (not events)

| Data | Source | In repo |
|---|---|---|
| Streets, water, parks, labels | OpenStreetMap via [OpenFreeMap](https://openfreemap.org) vector tiles (free, no key) | fetched live |
| Borough boundaries (shoreline-clipped) | [NYC Open Data gthc-hcne](https://data.cityofnewyork.us/d/gthc-hcne) | `packages/shared/src/geo/nyc-boroughs.json`, simplified with mapshaper |
| Subway lines | [MTA Subway Service Lines, data.ny.gov s692-irgq](https://data.ny.gov/d/s692-irgq) | `packages/shared/src/geo/subway-lines.json`, simplified to 4% |
| Subway stations | [MTA Subway Stations, data.ny.gov 39hk-dx4f](https://data.ny.gov/d/39hk-dx4f) | `packages/shared/src/geo/subway-stations.json` |
