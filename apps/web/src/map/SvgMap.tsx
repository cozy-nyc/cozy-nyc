import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import type { Avatar, CozyEvent } from "@cozy/shared";
import { palette } from "@cozy/comfy/tokens";
import diagramUrl from "../assets/subway-diagram.svg";
import type { Identity } from "../identity";
import { WORLD_H, WORLD_W, project } from "./projection";
import { usePanZoom, type Insets, type View } from "./usePanZoom";

export interface MapLayers {
  subway: boolean;
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
  /** Middle of the screen, in diagram units. */
  onViewChange?(center: { x: number; y: number }): void;
  /** Things pinned to a place on the map, like the location card. */
  overlay?(toScreen: (lng: number, lat: number) => { x: number; y: number }, size: { w: number; h: number }): ReactNode;
}

/** Zoom to at least this when an event is picked; less on phones, where the screen holds less of the diagram. */
const selectK = () => (window.innerWidth < 800 ? 1 : 1.6);
/** The diagram's own water colour, so the edges of the sheet blend into the page. */
const WATER = "#E4EDF9";
const HALO = "#FFFFFF";

const pin = (x: number, y: number, scale = "var(--ik)") => ({ transform: `translate(${x}px, ${y}px) scale(${scale})` });

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
    // Markers grow a little as you zoom in, but far slower than the map does.
    s.setProperty("--ms", Math.min(1.25, 0.55 + v.k * 0.4).toFixed(3));
  };

  const pz = usePanZoom(svg, {
    apply,
    getInsets: () => propsRef.current.getInsets(),
    initial: { ...props.position.current, k: window.innerWidth < 800 ? 0.7 : 1.1 },
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
    if (e) pz.flyTo(e.lng, e.lat, selectK());
    // Only when the selection changes, not on every events refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId]);

  useEffect(() => {
    props.onViewChange?.(pz.center());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const zoom = view.k < 0.6 ? "far" : view.k < 1.3 ? "mid" : "near";
  const { w, h } = pz.size.current;

  const markers = useMemo(
    () =>
      props.events
        .map((e) => {
          const [x, y] = project(e.lng, e.lat);
          return { e, x, y, r: 7 + e.heat * 9, color: heatColor(e.heat) };
        })
        // Hotter on top, selected on top of everything.
        .sort((a, b) => Number(a.e.id === props.selectedId) - Number(b.e.id === props.selectedId) || a.e.heat - b.e.heat),
    [props.events, props.selectedId],
  );

  const others = props.avatars.filter((a) => a.id !== props.meId);
  const me = useMemo(() => project(props.position.current.lng, props.position.current.lat), [props.position]);

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
        style={{ background: WATER }}
        role="group"
        aria-label="Map of New York City with tonight's events"
        onClick={() => {
          if (!pz.dragged.current) props.onSelect(null);
        }}
      >
        <g ref={world}>
          {props.layers.subway && <image className="diagram" href={diagramUrl} width={WORLD_W} height={WORLD_H} />}
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
                <text y={r + 15} textAnchor="middle" fill={palette.black} stroke={HALO}>
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
