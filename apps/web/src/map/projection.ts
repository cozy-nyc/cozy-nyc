import { CONTROL_POINTS } from "./controlPoints";

/**
 * Places real coordinates on the subway diagram.
 *
 * The diagram stretches Manhattan and squeezes the outer boroughs, so this is a
 * thin-plate spline fitted through the control points: every control point
 * lands exactly where the diagram draws it, and anything in between (a venue
 * two blocks from a station, say) is bent smoothly along with its neighbours.
 *
 * "World" units are the diagram's own: WORLD_W x WORLD_H, y grows south.
 */
export const WORLD_W = 2500;
export const WORLD_H = 2700;

// Work in small, roughly square local units so the maths stays well conditioned.
const KX = Math.cos((40.7 * Math.PI) / 180);
const local = (lng: number, lat: number): [number, number] => [(lng + 74) * KX * 100, (lat - 40.7) * 100];

const kernel = (r2: number) => (r2 === 0 ? 0 : (r2 * Math.log(r2)) / 2);

/** Solve A·X = B for a small dense system (Gauss-Jordan with partial pivoting). B has two columns: x and y. */
function solve(a: number[][], b: [number, number][]): [number, number][] {
  const n = a.length;
  const m = a.map((row, i) => [...row, b[i]![0], b[i]![1]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const pivot = m[c]!;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const row = m[r]!;
      const f = row[c]! / pivot[c]!;
      if (f) for (let k = c; k < n + 2; k++) row[k]! -= f * pivot[k]!;
    }
  }
  return m.map((row, i) => [row[n]! / row[i]!, row[n + 1]! / row[i]!]);
}

const N = CONTROL_POINTS.length;
const P = CONTROL_POINTS.map(([lng, lat]) => local(lng, lat));
const WEIGHTS = (() => {
  const a = Array.from({ length: N + 3 }, () => new Array<number>(N + 3).fill(0));
  const b: [number, number][] = Array.from({ length: N + 3 }, () => [0, 0]);
  for (let i = 0; i < N; i++) {
    const [u, v] = P[i]!;
    for (let j = 0; j < N; j++) a[i]![j] = kernel((u - P[j]![0]) ** 2 + (v - P[j]![1]) ** 2);
    a[i]![N] = a[N]![i] = 1;
    a[i]![N + 1] = a[N + 1]![i] = u;
    a[i]![N + 2] = a[N + 2]![i] = v;
    b[i] = [CONTROL_POINTS[i]![2], CONTROL_POINTS[i]![3]];
  }
  return solve(a, b);
})();

/** Longitude/latitude to a point on the diagram. */
export function project(lng: number, lat: number): [number, number] {
  const [u, v] = local(lng, lat);
  let x = WEIGHTS[N]![0] + WEIGHTS[N + 1]![0] * u + WEIGHTS[N + 2]![0] * v;
  let y = WEIGHTS[N]![1] + WEIGHTS[N + 1]![1] * u + WEIGHTS[N + 2]![1] * v;
  for (let i = 0; i < N; i++) {
    const k = kernel((u - P[i]![0]) ** 2 + (v - P[i]![1]) ** 2);
    x += WEIGHTS[i]![0] * k;
    y += WEIGHTS[i]![1] * k;
  }
  // Far outside the control points the fit can run away; keep things on the sheet.
  return [Math.min(WORLD_W, Math.max(0, x)), Math.min(WORLD_H, Math.max(0, y))];
}
