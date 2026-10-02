import { NYC_TZ } from "@cozy/shared";

/** Hour of the morning at which "tonight" rolls over to the next night. */
const NIGHT_ENDS_HOUR = 6;
const NIGHT_STARTS_HOUR = 17;

function nycParts(t: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(t);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

/** Converts a wall-clock time in New York to a UTC Date (DST-aware). */
export function nycWallTimeToDate(y: number, m: number, d: number, h: number): Date {
  let guess = Date.UTC(y, m - 1, d, h);
  for (let i = 0; i < 2; i++) {
    const p = nycParts(new Date(guess));
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    guess += Date.UTC(y, m - 1, d, h) - asUtc;
  }
  return new Date(guess);
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * "Tonight" in NYC: 5pm until 6am the next morning. Between midnight and 6am
 * we're still in the previous evening's night.
 */
export function tonightWindow(now: Date = new Date()): TimeWindow {
  const p = nycParts(now);
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d));
  if (p.h < NIGHT_ENDS_HOUR) base.setUTCDate(base.getUTCDate() - 1);
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    start: nycWallTimeToDate(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), NIGHT_STARTS_HOUR),
    end: nycWallTimeToDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), NIGHT_ENDS_HOUR),
  };
}
