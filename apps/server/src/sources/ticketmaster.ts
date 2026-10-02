import { NYC_BOUNDS } from "@cozy/shared";
import type { EventSource, NormalizedEvent } from "./types.js";

/**
 * Ticketmaster Discovery API v2. Free key, 5000 calls/day, 5 req/s.
 * Deep paging is capped at size*page < 1000.
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGE_SIZE = 200;
const MAX_PAGES = 5;

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string }; end?: { dateTime?: string } };
  images?: { url: string; width: number }[];
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  _embedded?: { venues?: { name?: string; location?: { longitude?: string; latitude?: string } }[] };
}

// TM wants second precision with a trailing Z.
const tmDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function normalizeTicketmaster(e: TmEvent): NormalizedEvent | null {
  const venue = e._embedded?.venues?.[0];
  const lng = Number(venue?.location?.longitude);
  const lat = Number(venue?.location?.latitude);
  const start = e.dates?.start?.dateTime;
  if (!start || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < NYC_BOUNDS.west || lng > NYC_BOUNDS.east || lat < NYC_BOUNDS.south || lat > NYC_BOUNDS.north) return null;
  const c = e.classifications?.[0];
  const genres = [c?.segment?.name, c?.genre?.name]
    .filter((g): g is string => !!g && g !== "Undefined")
    .map((g) => g.toLowerCase());
  const image = [...(e.images ?? [])].sort((a, b) => b.width - a.width)[0];
  return {
    source: "ticketmaster",
    sourceId: e.id,
    title: e.name,
    venueName: venue?.name ?? "Unknown venue",
    lng,
    lat,
    startsAt: new Date(start).toISOString(),
    endsAt: e.dates?.end?.dateTime ? new Date(e.dates.end.dateTime).toISOString() : null,
    url: e.url ?? null,
    imageUrl: image?.url ?? null,
    genres,
    popularity: 0.3, // TM gives no attendance signal; neutral prior.
  };
}

export function ticketmasterSource(apiKey: string | null): EventSource {
  return {
    id: "ticketmaster",
    enabled: !!apiKey,
    async fetchTonight(window) {
      const out: NormalizedEvent[] = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const params = new URLSearchParams({
          apikey: apiKey!,
          geoPoint: "dr5ru", // geohash around midtown
          radius: "15",
          unit: "miles",
          startDateTime: tmDate(window.start),
          endDateTime: tmDate(window.end),
          size: String(PAGE_SIZE),
          page: String(page),
          sort: "date,asc",
        });
        const res = await fetch(`${BASE}?${params}`);
        if (!res.ok) throw new Error(`ticketmaster ${res.status}: ${await res.text()}`);
        const body = (await res.json()) as { _embedded?: { events?: TmEvent[] }; page?: { totalPages?: number } };
        for (const e of body._embedded?.events ?? []) {
          const n = normalizeTicketmaster(e);
          if (n) out.push(n);
        }
        if (page + 1 >= (body.page?.totalPages ?? 0)) break;
        await new Promise((r) => setTimeout(r, 250)); // stay well under 5 req/s
      }
      return out;
    },
  };
}
