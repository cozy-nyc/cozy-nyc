import { describe, expect, it } from "vitest";
import { tonightWindow } from "../src/time.js";

describe("tonightWindow", () => {
  it("is 5pm–6am NYC on a summer evening (EDT, UTC-4)", () => {
    const w = tonightWindow(new Date("2026-07-10T23:00:00Z")); // 7pm EDT
    expect(w.start.toISOString()).toBe("2026-07-10T21:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-07-11T10:00:00.000Z");
  });

  it("still means the previous night at 2am", () => {
    const w = tonightWindow(new Date("2026-01-15T07:00:00Z")); // 2am EST
    expect(w.start.toISOString()).toBe("2026-01-14T22:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-01-15T11:00:00.000Z");
  });

  it("handles the DST switch night", () => {
    const w = tonightWindow(new Date("2026-03-07T23:00:00Z")); // Sat 6pm EST, clocks spring forward overnight
    expect(w.start.toISOString()).toBe("2026-03-07T22:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-03-08T10:00:00.000Z"); // 6am EDT
  });
});
