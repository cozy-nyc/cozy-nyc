import { describe, expect, it } from "vitest";
import { normalizeTicketmaster } from "../src/sources/ticketmaster.js";

describe("normalizeTicketmaster", () => {
  const base = {
    id: "abc",
    name: "Some Show",
    dates: { start: { dateTime: "2026-07-11T01:00:00Z" } },
    classifications: [{ segment: { name: "Music" }, genre: { name: "Undefined" } }],
    images: [{ url: "small", width: 100 }, { url: "big", width: 1000 }],
    _embedded: { venues: [{ name: "Bowery Ballroom", location: { longitude: "-73.9935", latitude: "40.7204" } }] },
  };

  it("maps a NYC event", () => {
    const e = normalizeTicketmaster(base)!;
    expect(e).toMatchObject({ source: "ticketmaster", sourceId: "abc", venueName: "Bowery Ballroom", genres: ["music"], imageUrl: "big" });
    expect(e.lat).toBeCloseTo(40.7204);
  });

  it("drops events outside NYC or without coordinates", () => {
    expect(normalizeTicketmaster({ ...base, _embedded: { venues: [{ location: { longitude: "-118.2", latitude: "34.0" } }] } })).toBeNull();
    expect(normalizeTicketmaster({ ...base, _embedded: { venues: [{}] } })).toBeNull();
  });
});
