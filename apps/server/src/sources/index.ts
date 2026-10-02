import { config } from "../config.js";
import type { Repo } from "../db/repo.js";
import { tonightWindow } from "../time.js";
import { seedSource } from "./seed.js";
import { ticketmasterSource } from "./ticketmaster.js";
import type { EventSource } from "./types.js";
import { eventbriteSource, residentAdvisorSource } from "./unsupported.js";

export function allSources(): EventSource[] {
  return [seedSource, ticketmasterSource(config.ticketmasterKey), residentAdvisorSource, eventbriteSource];
}

/** Pulls tonight's events from every enabled source. One failing source doesn't stop the others. */
export async function ingest(repo: Repo, sources: EventSource[], now = new Date()) {
  const window = tonightWindow(now);
  const counts: Record<string, number | string> = {};
  for (const source of sources.filter((s) => s.enabled)) {
    try {
      const events = await source.fetchTonight(window);
      await repo.upsertEvents(events);
      counts[source.id] = events.length;
    } catch (err) {
      counts[source.id] = `error: ${(err as Error).message}`;
    }
  }
  return counts;
}
