import { isInNyc } from "@cozy/shared/geo";

/** Guest identity kept in localStorage. Real accounts come later (docs/PLAN.md). */
export interface Identity {
  handle: string;
  color: string;
}

const KEY = "cozy.identity";
const ADJ = ["sleepy", "neon", "lofi", "velvet", "late", "hazy", "warm", "static"];
const NOUN = ["pigeon", "bodega", "subway", "rat", "cab", "stoop", "bagel", "skyline"];

function random(): Identity {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
  const hue = Math.floor(Math.random() * 360);
  return { handle: `${pick(ADJ)}-${pick(NOUN)}`, color: hslToHex(hue, 85, 60) };
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function loadIdentity(): Identity {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Identity | null;
    if (saved?.handle && /^#[0-9a-f]{6}$/i.test(saved.color)) return saved;
  } catch {
    // storage unavailable or corrupt; fall through
  }
  const id = random();
  try {
    localStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    // ignore
  }
  return id;
}

/** Spawn somewhere around the East Village with a little jitter, on land. */
export function spawnPoint() {
  for (let i = 0; i < 20; i++) {
    const p = { lng: -73.9857 + (Math.random() - 0.5) * 0.01, lat: 40.7243 + (Math.random() - 0.5) * 0.01 };
    if (isInNyc(p.lng, p.lat)) return p;
  }
  return { lng: -73.9857, lat: 40.7243 };
}
