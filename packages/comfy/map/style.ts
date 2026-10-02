import tokens from "../tokens/tokens.json";

/**
 * "Diorama" map style: OpenStreetMap data from OpenFreeMap's vector tiles drawn
 * as a white toy city sitting on flat grey-blue water. Few colors, round line
 * caps, almost no labels, no POI icons, bold subway lines.
 *
 * Pass the NYC mask (a big rectangle with the five boroughs cut out) and only
 * the city stays visible: everything else is painted water-color.
 *
 * Returns a plain MapLibre style object (typed loosely so this package doesn't
 * depend on maplibre-gl).
 */
const c = Object.fromEntries(
  Object.entries(tokens.color.map)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, v]) => [k, (v as { $value: string }).$value]),
) as Record<"water" | "land" | "road" | "block" | "block-shade" | "park" | "subway" | "label" | "sky", string>;

const SRC = "openmaptiles";
const round = { "line-cap": "round", "line-join": "round" } as const;

// Road width in px from z12 to z18: chunky gaps between blocks, by class.
const roadWidth = [
  "interpolate", ["exponential", 1.6], ["zoom"],
  12, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 1.5, ["secondary", "tertiary"], 1, 0.5],
  18, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 34, ["secondary", "tertiary"], 26, 18],
];
const isRoad = ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service", "street"], true, false];
const notTunnel = ["!=", ["get", "brunnel"], "tunnel"];

export const BUILDINGS_LAYER_ID = "cozy-buildings";
export const MASK_SOURCE_ID = "cozy-mask";

export function cozyMapStyle(mask: GeoJSON.FeatureCollection): Record<string, unknown> {
  return {
    version: 8,
    name: "cozy diorama",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SRC]: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      [MASK_SOURCE_ID]: { type: "geojson", data: mask },
    },
    // Low intensity keeps walls bright: the look is a white model, not a shaded render.
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.12, position: [1.2, 200, 30] },
    sky: {
      "sky-color": c.sky,
      "horizon-color": c.water,
      "fog-color": c.water,
      "sky-horizon-blend": 0.7,
      "horizon-fog-blend": 0.8,
      "fog-ground-blend": 0.9,
      "atmosphere-blend": 0,
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
        filter: ["all", isRoad, notTunnel],
        layout: round,
        paint: { "line-color": c.road, "line-width": roadWidth },
      },
      {
        id: "subway",
        type: "line",
        source: SRC,
        "source-layer": "transportation",
        filter: ["all", ["==", ["get", "class"], "transit"], ["==", ["get", "subclass"], "subway"], ["!=", ["get", "brunnel"], "tunnel"]],
        layout: round,
        paint: { "line-color": c.subway, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 6] },
      },
      {
        id: BUILDINGS_LAYER_ID,
        type: "fill-extrusion",
        source: SRC,
        "source-layer": "building",
        minzoom: 13,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 10], 0, c.block, 300, c["block-shade"]],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-vertical-gradient": true,
        },
      },
      // Everything outside the five boroughs becomes water. Drawn after buildings so it covers them too.
      { id: "outside-nyc", type: "fill", source: MASK_SOURCE_ID, paint: { "fill-color": c.water } },
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
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-transform": "lowercase",
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": c.label, "text-halo-color": c.road, "text-halo-width": 1.5 },
      },
      {
        id: "neighborhoods",
        type: "symbol",
        source: SRC,
        "source-layer": "place",
        maxzoom: 15,
        filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter"], true, false],
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-transform": "lowercase" },
        paint: { "text-color": c.label, "text-halo-color": c.land, "text-halo-width": 2 },
      },
    ],
  };
}
