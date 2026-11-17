import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import type { Avatar, CozyEvent } from "@cozy/shared";
import { NYC_BOROUGHS, SUBWAY_LINES, SUBWAY_STATIONS } from "@cozy/shared/geo";
import { palette, tokens } from "@cozy/comfy/tokens";
import { MTA_COLORS } from "@cozy/comfy/map";
import type { Identity } from "../identity";
import { multiLinePath, multiPolygonPath, pointsPath, project } from "./projection";
import { usePanZoom, type Insets, type View } from "./usePanZoom";

export interface MapLayers {
  subway: boolean;
  stations: boolean;
}

export interface SvgMapHandle {
  zoomIn(): void;
  zoomOut(): void;
  flyTo(lng: number, lat: number, atLeastK?: number): void;
}

interface Props {
  identity: Identity;
  position: React.RefObject<{ lng: number; lat: number }>;
  events: CozyEvent[];
  avatars: Avatar[];
  meId: string | null;
  selectedId: string | null;
  layers: MapLayers;
  getInsets(): Insets;
  onSelect(id: string | null): void;
  onViewChange?(center: { lng: number; lat: number }): void;
  /** Things pinned to a place on the map, like the location card. */
  overlay?(toScreen: (lng: number, lat: number) => { x: number; y: number }, size: { w: number; h: number }): ReactNode;
}

const mapColor = tokens.color.map;
const SELECT_K = 9;
const STATION_LABEL_K = 14;

// ---- Static geometry, projected once ----

const LAND = NYC_BOROUGHS.features.map((f) => multiPolygonPath(f.geometry.coordinates)).join("");

const BOROUGH_LABELS = NYC_BOROUGHS.features.map((f) => {
  // Label the middle of the borough's biggest piece.
  let best: number[][] = [];
  for (const poly of f.geometry.coordinates) if (poly[0]!.length > best.length) best = poly[0]!;
  let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
  for (const [x, y] of best) {
    w = Math.min(w, x!); e = Math.max(e, x!); s = Math.min(s, y!); n = Math.max(n, y!);
  }
  const [x, y] = project((w + e) / 2, (s + n) / 2);
  return { name: f.properties.boroname, x, y };
});

// The MTA data mixes LineString and MultiLineString features, and some services come in more than one feature.
const LINES = SUBWAY_LINES.features.map((f, i) => ({
  key: `${f.properties.service}-${i}`,
  color: MTA_COLORS[f.properties.service] ?? mapColor.label.$value,
  d: multiLinePath(f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates),
}));
const LINES_CASING = LINES.map((l) => l.d).join("");

const STATION_DOTS = pointsPath(SUBWAY_STATIONS.features.map((f) => f.geometry.coordinates));
const STATIONS = SUBWAY_STATIONS.features.map((f) => {
  const [x, y] = project(f.geometry.coordinates[0]!, f.geometry.coordinates[1]!);
  return { id: f.properties.gtfs_stop_id, name: f.properties.stop_name, x, y };
});

const pin = (x: number, y: number, scale = "var(--ik)") => ({ transform: `translate(${x}px, ${y}px) scale(${scale})` });

const BaseLayers = memo(function BaseLayers({ layers }: { layers: MapLayers }) {
  return (
    <>
      <path className="land" d={LAND} fillRule="evenodd" fill={mapColor.land.$value} />
      <g className="borough-labels" aria-hidden="true">
        {BOROUGH_LABELS.map((b) => (
          <text key={b.name} style={pin(b.x, b.y)} textAnchor="middle" fill={mapColor.label.$value}>
            {b.name}
          </text>
        ))}
      </g>
      {layers.subway && (
        <g className="subway" aria-hidden="true">
          <path className="casing" d={LINES_CASING} stroke={mapColor.land.$value} />
          {LINES.map((l) => (
            <path key={l.key} d={l.d} stroke={l.color} />
          ))}
        </g>
      )}
      {layers.stations && (
        <g className="stations" aria-hidden="true">
          <path className="ring" d={STATION_DOTS} stroke={palette.black} />
          <path className="fill" d={STATION_DOTS} stroke={mapColor.station.$value} />
        </g>
      )}
    </>
  );
});

// ---- Heat colour: blue → pink → hot, same ramp the feed's heat bar uses ----

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const RAMP = [hex(palette.blue), hex(palette.pink), hex(palette.hot)] as const;
function heatColor(heat: number): string {
  const t = Math.min(1, Math.max(0, heat)) * 2;
  const a = RAMP[t < 1 ? 0 : 1]!;
  const b = RAMP[t < 1 ? 1 : 2]!;
  const f = t < 1 ? t : t - 1;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * f)).join(" ")})`;
}

export const SvgMap = forwardRef<SvgMapHandle, Props>(function SvgMap(props, handle) {
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const apply = (v: View) => {
    world.current?.setAttribute("transform", `translate(${v.tx} ${v.ty}) scale(${v.k})`);
    const s = svg.current?.style;
    if (!s) return;
    s.setProperty("--ik", String(1 / v.k));
    // Lines and markers grow a little as you zoom in, but far slower than the map does.
    s.setProperty("--lw", `${Math.min(7, 1.3 + v.k * 0.3).toFixed(2)}px`);
    s.setProperty("--ms", Math.min(1.25, 0.5 + v.k * 0.07).toFixed(3));
  };

  const pz = usePanZoom(svg, {
    apply,
    getInsets: () => propsRef.current.getInsets(),
    initial: { ...props.position.current, k: 5 },
  });
  const { view } = pz;

  useImperativeHandle(handle, () => ({
    zoomIn: () => pz.zoomBy(1.6),
    zoomOut: () => pz.zoomBy(1 / 1.6),
    flyTo: pz.flyTo,
  }));

  // Fly to the selected event.
  useEffect(() => {
    const e = props.events.find((x) => x.id === props.selectedId);
    if (e) pz.flyTo(e.lng, e.lat, SELECT_K);
    // Only when the selection changes, not on every events refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId]);

  useEffect(() => {
    props.onViewChange?.(pz.center());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const zoom = view.k < 2.5 ? "far" : view.k < 8 ? "mid" : "near";
  const { w, h } = pz.size.current;

  const stationLabels = useMemo(() => {
    if (!props.layers.stations || view.k < STATION_LABEL_K) return [];
    const x0 = -view.tx / view.k, y0 = -view.ty / view.k;
    const x1 = (w - view.tx) / view.k, y1 = (h - view.ty) / view.k;
    return STATIONS.filter((s) => s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1);
  }, [props.layers.stations, view, w, h]);

  const markers = useMemo(
    () =>
      props.events
        .map((e) => {
          const [x, y] = project(e.lng, e.lat);
          return { e, x, y, r: 5 + e.heat * 9, color: heatColor(e.heat) };
        })
        // Hotter on top, selected on top of everything.
        .sort((a, b) => Number(a.e.id === props.selectedId) - Number(b.e.id === props.selectedId) || a.e.heat - b.e.heat),
    [props.events, props.selectedId],
  );

  const others = props.avatars.filter((a) => a.id !== props.meId);
  const me = project(props.position.current.lng, props.position.current.lat);

  const select = (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation();
    if (!pz.dragged.current) props.onSelect(id);
  };

  const toScreen = (lng: number, lat: number) => {
    const [x, y] = project(lng, lat);
    return { x: x * view.k + view.tx, y: y * view.k + view.ty };
  };

  return (
    <div className="map">
      <svg
        ref={svg}
        className="map-svg"
        data-zoom={zoom}
        style={{ background: mapColor.water.$value }}
        role="group"
        aria-label="Map of New York City with tonight's events"
        onClick={() => {
          if (!pz.dragged.current) props.onSelect(null);
        }}
      >
        <g ref={world}>
          <BaseLayers layers={props.layers} />
          <g className="station-labels" aria-hidden="true">
            {stationLabels.map((s) => (
              <text key={s.id} style={pin(s.x, s.y)} x={10} y={4} fill={palette.black} stroke={mapColor.land.$value}>
                {s.name}
              </text>
            ))}
          </g>
          <g className="events">
            {markers.map(({ e, x, y, r, color }) => (
              <g
                key={e.id}
                className={e.id === props.selectedId ? "marker selected" : "marker"}
                style={pin(x, y, "calc(var(--ik) * var(--ms))")}
                role="button"
                tabIndex={0}
                aria-label={`${e.title} at ${e.venueName}`}
                aria-pressed={e.id === props.selectedId}
                onClick={(ev) => select(ev, e.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    props.onSelect(e.id);
                  }
                }}
              >
                <circle className="glow" r={r * 2.2} fill={color} />
                <circle className="hit" r={Math.max(r, 14)} fill="transparent" />
                <circle className="dot" r={r} fill={color} stroke={palette.white} />
                <text y={r + 15} textAnchor="middle" fill={palette.black} stroke={mapColor.land.$value}>
                  {e.venueName}
                </text>
              </g>
            ))}
          </g>
          <g className="avatars" aria-hidden="true">
            {others.map((a) => {
              const [x, y] = project(a.lng, a.lat);
              return (
                <g key={a.id} className="avatar" style={pin(x, y)}>
                  <circle r={7} fill={a.color} stroke={palette.white} strokeWidth={2} />
                  <text y={-13} textAnchor="middle" fill={palette.white} stroke={palette.black}>
                    {a.handle}
                  </text>
                </g>
              );
            })}
            <g className="avatar me" style={pin(me[0], me[1])}>
              <circle r={8} fill={props.identity.color} stroke={palette.peach} strokeWidth={4} />
              <text y={-15} textAnchor="middle" fill={palette.white} stroke={palette.black}>
                {props.identity.handle}
              </text>
            </g>
          </g>
        </g>
      </svg>
      {props.overlay?.(toScreen, { w, h })}
    </div>
  );
});
