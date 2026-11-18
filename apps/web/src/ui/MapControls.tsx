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

/** Right-edge stack: zoom, map layers, and mute. */
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
        <button className="ctl" onClick={props.onZoomIn} aria-label="Zoom in">
          <Icon name="plus" size={24} />
        </button>
        <button className="ctl" onClick={props.onZoomOut} aria-label="Zoom out">
          <Icon name="minus" size={24} />
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
        <button className="ctl" onClick={() => setOpen((o) => !o)} aria-label="Map layers" aria-expanded={open}>
          <Icon name="layers" size={24} />
        </button>
      </div>
      <button
        className={props.muted || !props.scene ? "ctl off" : "ctl"}
        onClick={props.onToggleMute}
        aria-label={props.muted ? "Unmute" : "Mute"}
        aria-pressed={props.muted}
        title={status}
      >
        <Icon name={props.muted ? "muted" : "sound"} size={24} />
      </button>
    </div>
  );
}
