const HOUR = 3_600_000;

export interface HeatInputs {
  now: Date;
  startsAt: Date;
  endsAt: Date | null;
  /** 0..1 popularity signal from the source. */
  popularity: number;
  commentsLastHour: number;
  avatarsNearby: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** How close the event is to "happening right now". */
export function timeFactor(now: Date, startsAt: Date, endsAt: Date | null): number {
  const t = now.getTime();
  const start = startsAt.getTime();
  const end = endsAt?.getTime() ?? start + 4 * HOUR;
  if (t < start) {
    const hoursUntil = (start - t) / HOUR;
    return clamp01(1 - hoursUntil / 5) * 0.8 + 0.2;
  }
  if (t <= end) return 1;
  return clamp01(1 - (t - end) / (2 * HOUR));
}

/**
 * 0..1 score of how much an event is "popping". Deliberately simple and
 * tunable: time proximity, source popularity, and live social activity
 * (comments + avatars standing near the venue).
 */
export function computeHeat(i: HeatInputs): number {
  const social = 1 - Math.exp(-(i.commentsLastHour * 0.5 + i.avatarsNearby) / 5);
  return clamp01(0.5 * timeFactor(i.now, i.startsAt, i.endsAt) + 0.3 * social + 0.2 * clamp01(i.popularity));
}
