import boroughs from "./nyc-boroughs.json";
import mask from "./nyc-mask.json";
import subwayLines from "./subway-lines.json";
import subwayStations from "./subway-stations.json";

/**
 * The five boroughs, clipped to the shoreline. Source: NYC Open Data
 * "Borough Boundaries" (gthc-hcne), simplified to ~175 KB with mapshaper.
 */
export const NYC_BOROUGHS = boroughs as unknown as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { boroname: string; borocode: string }>;

/** MTA "Subway Service Lines" (data.ny.gov s692-irgq), simplified. Property `service` is the line letter/number. */
export const SUBWAY_LINES = subwayLines as unknown as GeoJSON.FeatureCollection<GeoJSON.MultiLineString, { service: string }>;

/** MTA "Subway Stations" (data.ny.gov 39hk-dx4f). */
export const SUBWAY_STATIONS = subwayStations as unknown as GeoJSON.FeatureCollection<GeoJSON.Point, { stop_name: string; daytime_routes: string; gtfs_stop_id: string }>;

/** A big rectangle around the city with the five boroughs cut out. Paint it to hide everything that isn't NYC. */
export const NYC_MASK = mask as unknown as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

type Ring = number[][];
interface Poly {
  rings: Ring[];
  bbox: [number, number, number, number];
}

const POLYS: Poly[] = NYC_BOROUGHS.features.flatMap((f) =>
  f.geometry.coordinates.map((rings) => {
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const [x, y] of rings[0]!) {
      w = Math.min(w, x!); e = Math.max(e, x!); s = Math.min(s, y!); n = Math.max(n, y!);
    }
    return { rings, bbox: [w, s, e, n] as [number, number, number, number] };
  }),
);

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > y !== yj! > y && x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

/** True if the point is on land in one of the five boroughs. */
export function isInNyc(lng: number, lat: number): boolean {
  for (const p of POLYS) {
    const [w, s, e, n] = p.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    if (inRing(lng, lat, p.rings[0]!) && !p.rings.slice(1).some((h) => inRing(lng, lat, h))) return true;
  }
  return false;
}
