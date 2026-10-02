import { randomUUID } from "node:crypto";
import type { EventComment, NewComment } from "@cozy/shared";
import type { Db } from "./index.js";
import type { NormalizedEvent } from "../sources/types.js";
import type { TimeWindow } from "../time.js";

export interface EventRow extends NormalizedEvent {
  id: string;
  commentCount: number;
  commentsLastHour: number;
}

interface RawEventRow {
  id: string;
  source: NormalizedEvent["source"];
  source_id: string;
  title: string;
  venue_name: string;
  lng: number;
  lat: number;
  starts_at: Date;
  ends_at: Date | null;
  url: string | null;
  image_url: string | null;
  genres: string[];
  popularity: number;
  comment_count: number | string;
  comments_last_hour: number | string;
}

const EVENT_SELECT = `
  SELECT e.*,
    (SELECT count(*) FROM comments c WHERE c.event_id = e.id) AS comment_count,
    (SELECT count(*) FROM comments c WHERE c.event_id = e.id AND c.created_at > now() - interval '1 hour') AS comments_last_hour
  FROM events e`;

function toEventRow(r: RawEventRow): EventRow {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.source_id,
    title: r.title,
    venueName: r.venue_name,
    lng: r.lng,
    lat: r.lat,
    startsAt: new Date(r.starts_at).toISOString(),
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    url: r.url,
    imageUrl: r.image_url,
    genres: r.genres,
    popularity: r.popularity,
    commentCount: Number(r.comment_count),
    commentsLastHour: Number(r.comments_last_hour),
  };
}

function toComment(r: { id: string; event_id: string; author: string; body: string; created_at: Date }): EventComment {
  return { id: r.id, eventId: r.event_id, author: r.author, body: r.body, createdAt: new Date(r.created_at).toISOString() };
}

export function createRepo(db: Db) {
  return {
    async upsertEvents(events: NormalizedEvent[]): Promise<void> {
      for (const e of events) {
        await db.query(
          `INSERT INTO events (id, source, source_id, title, venue_name, lng, lat, starts_at, ends_at, url, image_url, genres, popularity, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title, venue_name = EXCLUDED.venue_name, lng = EXCLUDED.lng, lat = EXCLUDED.lat,
             starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, url = EXCLUDED.url,
             image_url = EXCLUDED.image_url, genres = EXCLUDED.genres, popularity = EXCLUDED.popularity, updated_at = now()`,
          [
            `${e.source}:${e.sourceId}`, e.source, e.sourceId, e.title, e.venueName, e.lng, e.lat,
            e.startsAt, e.endsAt, e.url, e.imageUrl, JSON.stringify(e.genres), e.popularity,
          ],
        );
      }
    },

    /** Events that overlap the window (an event that started before 5pm and is still going counts). */
    async listEvents(window: TimeWindow): Promise<EventRow[]> {
      const { rows } = await db.query<RawEventRow>(
        `${EVENT_SELECT}
         WHERE e.starts_at < $2 AND coalesce(e.ends_at, e.starts_at + interval '4 hours') > $1
         ORDER BY e.starts_at`,
        [window.start.toISOString(), window.end.toISOString()],
      );
      return rows.map(toEventRow);
    },

    async getEvent(id: string): Promise<EventRow | null> {
      const { rows } = await db.query<RawEventRow>(`${EVENT_SELECT} WHERE e.id = $1`, [id]);
      return rows[0] ? toEventRow(rows[0]) : null;
    },

    async listComments(eventId: string, limit = 100): Promise<EventComment[]> {
      const { rows } = await db.query<Parameters<typeof toComment>[0]>(
        "SELECT * FROM comments WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2",
        [eventId, limit],
      );
      return rows.map(toComment);
    },

    async addComment(eventId: string, c: NewComment): Promise<EventComment> {
      const { rows } = await db.query<Parameters<typeof toComment>[0]>(
        "INSERT INTO comments (id, event_id, author, body) VALUES ($1, $2, $3, $4) RETURNING *",
        [randomUUID(), eventId, c.author, c.body],
      );
      return toComment(rows[0]!);
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;
