import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { NewCommentSchema, type CozyEvent } from "@cozy/shared";
import type { Repo, EventRow } from "./db/repo.js";
import { computeHeat } from "./heat.js";
import { Presence } from "./realtime/presence.js";
import { tonightWindow } from "./time.js";

export async function buildApp(repo: Repo, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());
  const presence = new Presence();
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  const toApi = (e: EventRow): CozyEvent => ({
    id: e.id,
    source: e.source,
    sourceId: e.sourceId,
    title: e.title,
    venueName: e.venueName,
    lng: e.lng,
    lat: e.lat,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    url: e.url,
    imageUrl: e.imageUrl,
    genres: e.genres,
    commentCount: e.commentCount,
    heat: computeHeat({
      now: now(),
      startsAt: new Date(e.startsAt),
      endsAt: e.endsAt ? new Date(e.endsAt) : null,
      popularity: e.popularity,
      commentsLastHour: e.commentsLastHour,
      avatarsNearby: presence.countNear(e),
    }),
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/api/events", async () => {
    const window = tonightWindow(now());
    const events = (await repo.listEvents(window)).map(toApi).sort((a, b) => b.heat - a.heat);
    return { window: { start: window.start.toISOString(), end: window.end.toISOString() }, events };
  });

  app.get<{ Params: { id: string } }>("/api/events/:id", async (req, reply) => {
    const e = await repo.getEvent(req.params.id);
    return e ? toApi(e) : reply.code(404).send({ error: "not found" });
  });

  app.get<{ Params: { id: string } }>("/api/events/:id/comments", async (req) => {
    return { comments: await repo.listComments(req.params.id) };
  });

  app.post<{ Params: { id: string } }>("/api/events/:id/comments", async (req, reply) => {
    const parsed = NewCommentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    if (!(await repo.getEvent(req.params.id))) return reply.code(404).send({ error: "not found" });
    const comment = await repo.addComment(req.params.id, parsed.data);
    presence.broadcast({ t: "comment", comment });
    return reply.code(201).send(comment);
  });

  app.get("/ws", { websocket: true }, (socket) => {
    const id = presence.connect({ send: (d) => socket.send(d) });
    socket.on("message", (data) => presence.handle(id, data.toString()));
    socket.on("close", () => presence.disconnect(id));
  });

  const tick = setInterval(() => presence.tick(), 100);
  app.addHook("onClose", async () => clearInterval(tick));

  return { app, presence };
}
