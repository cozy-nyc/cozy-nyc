import { describe, expect, it } from "vitest";
import { computeHeat, timeFactor } from "../src/heat.js";

const now = new Date("2026-07-10T02:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);

describe("heat", () => {
  it("peaks while the event is on and fades after", () => {
    expect(timeFactor(now, h(-1), h(2))).toBe(1);
    expect(timeFactor(now, h(3), null)).toBeLessThan(1);
    expect(timeFactor(now, h(-5), h(-3))).toBe(0);
  });

  it("goes up with social activity", () => {
    const base = { now, startsAt: h(-1), endsAt: h(2), popularity: 0.3 };
    const quiet = computeHeat({ ...base, commentsLastHour: 0, avatarsNearby: 0 });
    const busy = computeHeat({ ...base, commentsLastHour: 10, avatarsNearby: 8 });
    expect(busy).toBeGreaterThan(quiet);
    expect(busy).toBeLessThanOrEqual(1);
  });
});
