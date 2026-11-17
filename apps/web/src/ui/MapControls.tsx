import { useEffect, useRef, useState } from "react";
import type { MapLayers } from "../map/SvgMap";
import { Icon } from "./icons";

const LAYER_LABELS: Record<keyof MapLayers, string> = { subway: "Subway map" };

interface Props {
  layers: MapLayers;
  onLayers(next: MapLayers): void;
  onZoomIn(): void;
  onZoomOut(): void;
  /** null until the first tap starts the audio. */
  scene: string | null;
  muted: boolean;
  onToggleMute(): void;
}

/** Bottom-right stack: zoom, map layers, and the now-playing pill with mute. */
export function MapControls(props: Props) {
  const [open, setOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !layersRef.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // close only the popover, not the location card behind it
      setOpen(false);
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open]);

  const status = props.muted ? "muted" : (props.scene ?? "tap for sound");

  return (
    <div className="controls">
      <div className="zoom" role="group" aria-label="Zoom">
        <button className="icon-btn" onClick={props.onZoomIn} aria-label="Zoom in">
          <Icon name="plus" />
        </button>
        <button className="icon-btn" onClick={props.onZoomOut} aria-label="Zoom out">
          <Icon name="minus" />
        </button>
      </div>
      <div className="layers" ref={layersRef}>
        {open && (
          <fieldset className="popover">
            <legend>Map layers</legend>
            {(Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={props.layers[k]} onChange={(e) => props.onLayers({ ...props.layers, [k]: e.target.checked })} />
                {LAYER_LABELS[k]}
              </label>
            ))}
          </fieldset>
        )}
        <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Map layers" aria-expanded={open}>
          <Icon name="layers" />
        </button>
      </div>
      <div className={props.muted || !props.scene ? "now-playing off" : "now-playing"}>
        <span className="bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="scene" aria-live="polite">
          {status}
        </span>
        <button className="icon-btn" onClick={props.onToggleMute} aria-label={props.muted ? "Unmute" : "Mute"} aria-pressed={props.muted}>
          <Icon name={props.muted ? "muted" : "sound"} />
        </button>
      </div>
    </div>
  );
}
