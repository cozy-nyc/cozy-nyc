import { NYC_BOUNDS } from "@cozy/shared";

/**
 * Flat projection for the SVG map. At city scale an equirectangular projection
 * with a cos(latitude) correction is indistinguishable from Web Mercator, and
 * it inverts trivially. "World" units: the city is WORLD_W wide, y grows south.
 */
const PAD = 0.03; // degrees of water around the five boroughs
const WEST = NYC_BOUNDS.west - PAD;
const NORTH = NYC_BOUNDS.north + PAD;
const LAT0 = (NYC_BOUNDS.north + NYC_BOUNDS.south) / 2;
const KX = Math.cos((LAT0 * Math.PI) / 180);

export const WORLD_W = 1000;
const S = WORLD_W / ((NYC_BOUNDS.east + PAD - WEST) * KX);
export const WORLD_H = (NORTH - (NYC_BOUNDS.south - PAD)) * S;

/** Meters per world unit, for sizing things in real distance. */
export const METERS_PER_UNIT = 110_540 / S;

export function project(lng: number, lat: number): [number, number] {
  return [(lng - WEST) * KX * S, (NORTH - lat) * S];
}

export function unproject(x: number, y: number): { lng: number; lat: number } {
  return { lng: x / (KX * S) + WEST, lat: NORTH - y / S };
}

const fmt = (n: number) => n.toFixed(2);

function ringPath(ring: number[][], close: boolean): string {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = project(ring[i]![0]!, ring[i]![1]!);
    d += (i === 0 ? "M" : "L") + fmt(x) + " " + fmt(y);
  }
  return close ? d + "Z" : d;
}

export function multiPolygonPath(coords: number[][][][]): string {
  return coords.map((poly) => poly.map((ring) => ringPath(ring, true)).join("")).join("");
}

export function multiLinePath(coords: number[][][]): string {
  return coords.map((line) => ringPath(line, false)).join("");
}

/** Zero-length segments: with round caps and a non-scaling stroke these draw as dots of constant screen size. */
export function pointsPath(points: number[][]): string {
  return points
    .map((p) => {
      const [x, y] = project(p[0]!, p[1]!);
      return `M${fmt(x)} ${fmt(y)}h0`;
    })
    .join("");
}
