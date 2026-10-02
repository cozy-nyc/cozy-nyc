import type { EventSource, NormalizedEvent } from "./types.js";

/**
 * Made-up events at real NYC venues so the map is never empty in dev.
 * Titles are prefixed "[demo]" and the UI badges source=seed.
 * Coordinates are approximate.
 */
const VENUES: { name: string; lng: number; lat: number; genres: string[] }[] = [
  { name: "Elsewhere", lng: -73.9235, lat: 40.7095, genres: ["electronic", "indie"] },
  { name: "Nowadays", lng: -73.9152, lat: 40.7036, genres: ["house", "techno"] },
  { name: "Good Room", lng: -73.9527, lat: 40.7268, genres: ["house", "disco"] },
  { name: "Public Records", lng: -73.9881, lat: 40.6812, genres: ["ambient", "house"] },
  { name: "Bossa Nova Civic Club", lng: -73.9277, lat: 40.6979, genres: ["techno"] },
  { name: "House of Yes", lng: -73.9235, lat: 40.7069, genres: ["party", "performance"] },
  { name: "Knockdown Center", lng: -73.9183, lat: 40.7155, genres: ["techno", "art"] },
  { name: "Baby's All Right", lng: -73.9632, lat: 40.7099, genres: ["indie", "rock"] },
  { name: "Bowery Ballroom", lng: -73.9935, lat: 40.7204, genres: ["indie", "rock"] },
  { name: "Mercury Lounge", lng: -73.9866, lat: 40.7222, genres: ["rock"] },
  { name: "Webster Hall", lng: -73.9893, lat: 40.7317, genres: ["pop", "hip-hop"] },
  { name: "Blue Note", lng: -74.0006, lat: 40.7309, genres: ["jazz"] },
  { name: "Village Vanguard", lng: -74.0016, lat: 40.736, genres: ["jazz"] },
  { name: "Smalls Jazz Club", lng: -74.0027, lat: 40.7344, genres: ["jazz"] },
  { name: "Comedy Cellar", lng: -74.0004, lat: 40.7302, genres: ["comedy"] },
  { name: "Le Bain", lng: -74.008, lat: 40.7409, genres: ["house", "rooftop"] },
  { name: "Apollo Theater", lng: -73.95, lat: 40.81, genres: ["soul", "hip-hop"] },
];

const NAMES = ["Late Shift", "Night Swim", "Basement Hours", "Slow Burn", "Afterglow", "Open Floor", "Low End Theory", "Midnight Mass"];

// Deterministic per-night pseudo-randomness so restarts don't reshuffle the map.
function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 2 ** 32;
}

export const seedSource: EventSource = {
  id: "seed",
  enabled: true,
  async fetchTonight(window) {
    const night = window.start.toISOString().slice(0, 10);
    return VENUES.map((v, i): NormalizedEvent => {
      const r = hash(`${night}:${v.name}`);
      const QUARTER = 15 * 60_000;
      const offset = Math.round(((2 + r * 5.5) * 3_600_000) / QUARTER) * QUARTER; // 7pm–12:30am
      const startsAt = new Date(window.start.getTime() + offset);
      const endsAt = new Date(startsAt.getTime() + Math.round((2 + r * 4) * 4) * QUARTER);
      return {
        source: "seed",
        sourceId: `${night}-${i}`,
        title: `[demo] ${NAMES[Math.floor(r * NAMES.length)]} @ ${v.name}`,
        venueName: v.name,
        lng: v.lng,
        lat: v.lat,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        url: null,
        imageUrl: null,
        genres: v.genres,
        popularity: hash(`${night}:${v.name}:pop`),
      };
    });
  },
};
