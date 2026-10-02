import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import { NYC_BOUNDS, type Avatar, type CozyEvent } from "@cozy/shared";
import { palette } from "@cozy/comfy/tokens";
import type { Identity } from "../identity";

// Free, keyless vector tiles (OpenStreetMap data). Swap for a custom night style later.
const STYLE_URL = import.meta.env.VITE_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/liberty";
const WALK_METERS_PER_SEC = 150; // fast on purpose: crossing Manhattan shouldn't take an hour
const SEND_EVERY_MS = 100;

interface Props {
  identity: Identity;
  position: React.RefObject<{ lng: number; lat: number }>;
  events: CozyEvent[];
  avatars: Avatar[];
  meId: string | null;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onMove(lng: number, lat: number): void;
}

const emptyFc = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });

function eventsFc(events: CozyEvent[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
      properties: { id: e.id, heat: e.heat, venue: e.venueName, selected: e.id === selectedId },
    })),
  };
}

function avatarsFc(avatars: { lng: number; lat: number; handle: string; color: string }[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: avatars.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lng, a.lat] },
      properties: { handle: a.handle, color: a.color },
    })),
  };
}

/** Adds an extrusion layer if the base style doesn't already have 3D buildings. */
function ensureBuildings(map: MlMap) {
  const layers = map.getStyle().layers ?? [];
  if (layers.some((l) => l.type === "fill-extrusion")) return;
  const vectorSource = Object.entries(map.getStyle().sources).find(([, s]) => s.type === "vector")?.[0];
  if (!vectorSource) return;
  const firstSymbol = layers.find((l) => l.type === "symbol")?.id;
  map.addLayer(
    {
      id: "cozy-buildings-3d",
      type: "fill-extrusion",
      source: vectorSource,
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": palette.white,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    },
    firstSymbol,
  );
}

export function CityMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const loaded = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      style: STYLE_URL,
      center: [props.position.current.lng, props.position.current.lat],
      zoom: 15,
      pitch: 60, // the "2.5D" look
      bearing: -29, // align with the Manhattan grid
      maxPitch: 75,
      maxBounds: [
        [NYC_BOUNDS.west - 0.1, NYC_BOUNDS.south - 0.1],
        [NYC_BOUNDS.east + 0.1, NYC_BOUNDS.north + 0.1],
      ],
    });
    mapRef.current = map;
    map.keyboard.disable(); // WASD/arrows drive the avatar instead

    map.on("load", () => {
      ensureBuildings(map);
      map.addSource("events", { type: "geojson", data: emptyFc() });
      map.addSource("avatars", { type: "geojson", data: emptyFc() });
      map.addSource("me", { type: "geojson", data: emptyFc() });

      const heatRadius = ["interpolate", ["linear"], ["get", "heat"], 0, 6, 1, 22] as const;
      const heatColor = ["interpolate", ["linear"], ["get", "heat"], 0, palette.blue, 0.5, palette.pink, 1, palette.hot] as const;
      map.addLayer({
        id: "events-glow",
        type: "circle",
        source: "events",
        paint: { "circle-radius": ["*", 2.2, heatRadius] as never, "circle-color": heatColor as never, "circle-blur": 1, "circle-opacity": 0.45 },
      });
      map.addLayer({
        id: "events-dot",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": heatRadius as never,
          "circle-color": heatColor as never,
          "circle-stroke-color": palette.white,
          "circle-stroke-width": ["case", ["get", "selected"], 3, 1],
          "circle-pitch-alignment": "map",
        },
      });
      map.addLayer({
        id: "events-label",
        type: "symbol",
        source: "events",
        minzoom: 13.5,
        layout: { "text-field": ["get", "venue"], "text-size": 12, "text-offset": [0, 1.6], "text-font": ["Noto Sans Regular"] },
        paint: { "text-color": palette.black, "text-halo-color": palette.white, "text-halo-width": 1.5 },
      });
      for (const [src, stroke, width] of [["avatars", palette.white, 2], ["me", palette.peach, 4]] as const) {
        map.addLayer({
          id: `${src}-dot`,
          type: "circle",
          source: src,
          paint: { "circle-radius": 8, "circle-color": ["get", "color"], "circle-stroke-color": stroke, "circle-stroke-width": width },
        });
        map.addLayer({
          id: `${src}-label`,
          type: "symbol",
          source: src,
          layout: { "text-field": ["get", "handle"], "text-size": 11, "text-offset": [0, -1.6], "text-font": ["Noto Sans Regular"], "text-allow-overlap": true },
          paint: { "text-color": palette.white, "text-halo-color": palette.black, "text-halo-width": 1.5 },
        });
      }
      loaded.current = true;
      syncData();
    });

    map.on("click", "events-dot", (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) propsRef.current.onSelect(id);
      e.preventDefault();
    });
    map.on("mouseenter", "events-dot", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "events-dot", () => (map.getCanvas().style.cursor = ""));

    // Click empty map to walk there.
    let target: { lng: number; lat: number } | null = null;
    map.on("click", (e) => {
      if (e.defaultPrevented) return;
      target = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    });

    const keys = new Set<string>();
    const isTyping = () => ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "");
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "f") map.easeTo({ center: [propsRef.current.position.current.lng, propsRef.current.position.current.lat] });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // Movement loop. Keys move relative to the camera's bearing.
    let last = performance.now();
    let lastSent = 0;
    let raf = 0;
    const step = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const pos = propsRef.current.position.current;
      let dx = 0;
      let dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy += 1;
      if (keys.has("s") || keys.has("arrowdown")) dy -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      const speed = WALK_METERS_PER_SEC * (keys.has("shift") ? 3 : 1) * dt;
      const mPerLng = 111_320 * Math.cos((pos.lat * Math.PI) / 180);
      const mPerLat = 110_540;
      let moved = false;
      if (dx || dy) {
        target = null;
        const b = (map.getBearing() * Math.PI) / 180;
        const len = Math.hypot(dx, dy);
        const east = (dx * Math.cos(b) + dy * Math.sin(b)) / len;
        const north = (dy * Math.cos(b) - dx * Math.sin(b)) / len;
        pos.lng += (east * speed) / mPerLng;
        pos.lat += (north * speed) / mPerLat;
        moved = true;
      } else if (target) {
        const ex = (target.lng - pos.lng) * mPerLng;
        const ny = (target.lat - pos.lat) * mPerLat;
        const dist = Math.hypot(ex, ny);
        const s = Math.min(1, speed / Math.max(dist, 1e-6));
        pos.lng += (target.lng - pos.lng) * s;
        pos.lat += (target.lat - pos.lat) * s;
        if (s >= 1) target = null;
        moved = true;
      }
      if (moved) {
        pos.lng = Math.min(NYC_BOUNDS.east, Math.max(NYC_BOUNDS.west, pos.lng));
        pos.lat = Math.min(NYC_BOUNDS.north, Math.max(NYC_BOUNDS.south, pos.lat));
        if (dx || dy) map.setCenter([pos.lng, pos.lat]);
        syncMe();
        if (t - lastSent > SEND_EVERY_MS) {
          lastSent = t;
          propsRef.current.onMove(pos.lng, pos.lat);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncMe = () => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    const { identity, position } = propsRef.current;
    (map.getSource("me") as GeoJSONSource).setData(avatarsFc([{ ...identity, ...position.current }]));
  };

  const syncData = () => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    const { events, avatars, meId, selectedId } = propsRef.current;
    (map.getSource("events") as GeoJSONSource).setData(eventsFc(events, selectedId));
    (map.getSource("avatars") as GeoJSONSource).setData(avatarsFc(avatars.filter((a) => a.id !== meId)));
    syncMe();
  };

  useEffect(syncData, [props.events, props.avatars, props.meId, props.selectedId]);

  // Fly to the selected event.
  useEffect(() => {
    const e = props.events.find((x) => x.id === props.selectedId);
    if (e) mapRef.current?.easeTo({ center: [e.lng, e.lat], zoom: Math.max(mapRef.current.getZoom(), 15.5) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId]);

  return <div ref={container} className="map" />;
}
