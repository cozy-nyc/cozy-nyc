import { z } from "zod";

/** Rough bounding box of the five boroughs. */
export const NYC_BOUNDS = { west: -74.26, south: 40.49, east: -73.69, north: 40.92 } as const;
export const NYC_CENTER = { lng: -73.9857, lat: 40.7484 } as const;
export const NYC_TZ = "America/New_York";

export type SourceId = "seed" | "ticketmaster" | "ra" | "eventbrite" | "user";

export interface CozyEvent {
  id: string;
  source: SourceId;
  sourceId: string;
  title: string;
  venueName: string;
  lng: number;
  lat: number;
  startsAt: string; // ISO
  endsAt: string | null;
  url: string | null;
  imageUrl: string | null;
  genres: string[];
  /** 0..1 "how much is this popping right now". Computed server side. */
  heat: number;
  commentCount: number;
}

export interface EventComment {
  id: string;
  eventId: string;
  author: string;
  body: string;
  createdAt: string;
}

export const NewCommentSchema = z.object({
  author: z.string().trim().min(1).max(32),
  body: z.string().trim().min(1).max(500),
});
export type NewComment = z.infer<typeof NewCommentSchema>;

// ---- Realtime protocol (WebSocket, JSON) ----

export interface Avatar {
  id: string;
  handle: string;
  color: string;
  lng: number;
  lat: number;
}

const Lng = z.number().min(NYC_BOUNDS.west - 0.5).max(NYC_BOUNDS.east + 0.5);
const Lat = z.number().min(NYC_BOUNDS.south - 0.5).max(NYC_BOUNDS.north + 0.5);

export const ClientMessageSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("hello"),
    handle: z.string().trim().min(1).max(24),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    lng: Lng,
    lat: Lat,
  }),
  z.object({ t: z.literal("move"), lng: Lng, lat: Lat }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type ServerMessage =
  | { t: "welcome"; you: string }
  | { t: "presence"; avatars: Avatar[] }
  | { t: "comment"; comment: EventComment }
  | { t: "events-updated" };
