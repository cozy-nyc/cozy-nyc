import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate, openDb, type Db } from "../src/db/index.js";
import { createRepo } from "../src/db/repo.js";
import { buildApp } from "../src/app.js";
import { ingest } from "../src/sources/index.js";
import { seedSource } from "../src/sources/seed.js";

const now = new Date("2026-07-11T02:00:00Z"); // 10pm EDT
let db: Db;
let app: Awaited<ReturnType<typeof buildApp>>["app"];
let presence: Awaited<ReturnType<typeof buildApp>>["presence"];

beforeAll(async () => {
  db = await openDb({ databaseUrl: null, pgliteDir: null });
  await migrate(db);
  const repo = createRepo(db);
  await ingest(repo, [seedSource], now);
  ({ app, presence } = await buildApp(repo, { now: () => now }));
});
afterAll(async () => {
  await app.close();
  await db.close();
});

describe("api", () => {
  it("lists tonight's events sorted by heat", async () => {
    const res = await app.inject("/api/events");
    const { events } = res.json();
    expect(events.length).toBeGreaterThan(10);
    for (let i = 1; i < events.length; i++) expect(events[i - 1].heat).toBeGreaterThanOrEqual(events[i].heat);
  });

  it("posts and lists comments, broadcasting them", async () => {
    const sent: string[] = [];
    presence.connect({ send: (d) => sent.push(d) });
    const id = (await app.inject("/api/events")).json().events[0].id;
    const post = await app.inject({ method: "POST", url: `/api/events/${encodeURIComponent(id)}/comments`, payload: { author: "juan", body: "line is around the block" } });
    expect(post.statusCode).toBe(201);
    const { comments } = (await app.inject(`/api/events/${encodeURIComponent(id)}/comments`)).json();
    expect(comments[0].body).toBe("line is around the block");
    expect(sent.some((d) => JSON.parse(d).t === "comment")).toBe(true);
  });

  it("rejects empty comments and unknown events", async () => {
    expect((await app.inject({ method: "POST", url: "/api/events/nope/comments", payload: { author: "a", body: "b" } })).statusCode).toBe(404);
    const id = (await app.inject("/api/events")).json().events[0].id;
    expect((await app.inject({ method: "POST", url: `/api/events/${encodeURIComponent(id)}/comments`, payload: { author: "a", body: "  " } })).statusCode).toBe(400);
  });
});

describe("presence", () => {
  it("tracks avatars and ignores junk", () => {
    const id = presence.connect({ send: () => {} });
    expect(presence.handle(id, "not json")).toBe(false);
    expect(presence.handle(id, JSON.stringify({ t: "move", lng: -73.99, lat: 40.72 }))).toBe(false); // no hello yet
    expect(presence.handle(id, JSON.stringify({ t: "hello", handle: "j", color: "#ff00aa", lng: -73.9935, lat: 40.7204 }))).toBe(true);
    expect(presence.countNear({ lng: -73.9935, lat: 40.7204 })).toBeGreaterThanOrEqual(1);
    expect(presence.handle(id, JSON.stringify({ t: "move", lng: 10, lat: 10 }))).toBe(false); // off the map
    presence.disconnect(id);
  });
});
