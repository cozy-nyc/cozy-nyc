import tokens from "../tokens/tokens.json";

/**
 * "Subway map" style: a flat, top-down NYC after the MTA / Vignelli diagram
 * (and Work&Co's redraw of it). White boroughs on grey-blue water, faint
 * streets, bold subway lines in the MTA's official colors, station dots.
 * No buildings, no POI icons, almost no labels.
 *
 * Street and water geometry come from OpenFreeMap's OpenStreetMap vector
 * tiles; subway lines and stations are the MTA's open data, passed in as
 * GeoJSON. The mask (a big rectangle with the five boroughs cut out) paints
 * everything outside NYC water-color.
 *
 * Returns a plain MapLibre style object (typed loosely so this package doesn't
 * depend on maplibre-gl).
 */
const c = Object.fromEntries(
  Object.entries(tokens.color.map)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, v]) => [k, (v as { $value: string }).$value]),
) as Record<"water" | "land" | "road" | "park" | "label" | "station", string>;

/** MTA line colors, keyed by the service letter/number in the MTA "Subway Service Lines" data. */
export const MTA_COLORS: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "5 Peak": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45",
  J: "#996633", Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  S: "#808183", GS: "#808183", FS: "#808183", H: "#808183", SF: "#808183", SR: "#808183", ST: "#808183",
  SIR: "#0039A6", SI: "#0039A6",
};

const SRC = "openmaptiles";
const round = { "line-cap": "round", "line-join": "round" } as const;
const isRoad = ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service", "street"], true, false];
const notTunnel = ["!=", ["get", "brunnel"], "tunnel"];

export const MASK_SOURCE_ID = "cozy-mask";
export const SUBWAY_SOURCE_ID = "cozy-subway";
export const STATIONS_SOURCE_ID = "cozy-stations";

export interface CozyMapData {
  mask: GeoJSON.FeatureCollection;
  subwayLines: GeoJSON.FeatureCollection;
  subwayStations: GeoJSON.FeatureCollection;
}

export function cozyMapStyle(data: CozyMapData): Record<string, unknown> {
  const colorBySer = ["match", ["get", "service"], ...Object.entries(MTA_COLORS).flat(), c.label];
  return {
    version: 8,
    name: "cozy subway",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SRC]: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      [MASK_SOURCE_ID]: { type: "geojson", data: data.mask },
      [SUBWAY_SOURCE_ID]: { type: "geojson", data: data.subwayLines },
      [STATIONS_SOURCE_ID]: { type: "geojson", data: data.subwayStations },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": c.land } },
      { id: "park", type: "fill", source: SRC, "source-layer": "park", paint: { "fill-color": c.park } },
      {
        id: "grass",
        type: "fill",
        source: SRC,
        "source-layer": "landcover",
        filter: ["match", ["get", "class"], ["grass", "wood"], true, false],
        paint: { "fill-color": c.park },
      },
      { id: "water", type: "fill", source: SRC, "source-layer": "water", filter: notTunnel, paint: { "fill-color": c.water } },
      {
        id: "road",
        type: "line",
        source: SRC,
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["all", isRoad, notTunnel],
        layout: round,
        paint: {
          "line-color": c.road,
          "line-width": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            12, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 1, 0.4],
            17, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 12, ["secondary", "tertiary"], 8, 5],
          ],
        },
      },
      // Everything outside the five boroughs becomes water.
      { id: "outside-nyc", type: "fill", source: MASK_SOURCE_ID, paint: { "fill-color": c.water } },
      {
        id: "subway-casing",
        type: "line",
        source: SUBWAY_SOURCE_ID,
        layout: round,
        paint: { "line-color": c.land, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 10, 17, 18] },
      },
      {
        id: "subway",
        type: "line",
        source: SUBWAY_SOURCE_ID,
        layout: round,
        paint: { "line-color": colorBySer, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 6, 17, 12] },
      },
      {
        id: "stations",
        type: "circle",
        source: STATIONS_SOURCE_ID,
        minzoom: 11,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 14, 3.5, 17, 6],
          "circle-color": c.station,
          "circle-stroke-color": c.label,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 14, 1.5],
        },
      },
      {
        id: "station-names",
        type: "symbol",
        source: STATIONS_SOURCE_ID,
        minzoom: 14,
        layout: {
          "text-field": ["get", "stop_name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-anchor": "left",
          "text-offset": [0.8, 0],
          "text-max-width": 8,
        },
        paint: { "text-color": c.label, "text-halo-color": c.land, "text-halo-width": 1.5 },
      },
      {
        id: "street-names",
        type: "symbol",
        source: SRC,
        "source-layer": "transportation_name",
        minzoom: 15,
        filter: ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk"], true, false],
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-transform": "lowercase",
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": c.label, "text-halo-color": c.land, "text-halo-width": 1.5 },
      },
      {
        id: "neighborhoods",
        type: "symbol",
        source: SRC,
        "source-layer": "place",
        maxzoom: 15,
        filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter"], true, false],
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-transform": "uppercase", "text-letter-spacing": 0.15 },
        paint: { "text-color": c.label, "text-halo-color": c.land, "text-halo-width": 2 },
      },
    ],
  };
}
