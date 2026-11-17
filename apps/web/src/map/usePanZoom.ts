import { useCallback, useEffect, useRef, useState } from "react";
import { WORLD_H, WORLD_W, project, unproject } from "./projection";

/** screen = world * k + (tx, ty) */
export interface View {
  k: number;
  tx: number;
  ty: number;
}

/** Parts of the map covered by panels, so "centre" means the centre of what you can see. */
export interface Insets {
  left: number;
  bottom: number;
}

export const MAX_K = 48; // about one metre per pixel
const DRAG_SLOP = 4;

const isTyping = () => ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "");
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Options {
  /** Called on every view change, before React hears about it. Write transforms to the DOM here. */
  apply(view: View): void;
  getInsets(): Insets;
  initial: { lng: number; lat: number; k: number };
}

export function usePanZoom(ref: React.RefObject<SVGSVGElement | null>, opts: Options) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const view = useRef<View>({ k: 1, tx: 0, ty: 0 });
  const [snapshot, setSnapshot] = useState<View>(view.current);
  const size = useRef({ w: 1, h: 1 });
  const anim = useRef(0);
  const pending = useRef(0);
  /** True right after a drag, so the click that ends it can be ignored. */
  const dragged = useRef(false);

  const minK = () => Math.min(size.current.w / WORLD_W, size.current.h / WORLD_H) * 0.95;

  const commit = useCallback((next: View) => {
    const { w, h } = size.current;
    const k = Math.min(MAX_K, Math.max(minK(), next.k));
    // Keep the middle of the screen over the city.
    const cx = Math.min(WORLD_W, Math.max(0, (w / 2 - next.tx) / next.k));
    const cy = Math.min(WORLD_H, Math.max(0, (h / 2 - next.ty) / next.k));
    const v = { k, tx: w / 2 - cx * k, ty: h / 2 - cy * k };
    if (k === next.k) {
      // Only snap the axes that actually went out of bounds, so zooming at the cursor stays exact.
      if (cx > 0 && cx < WORLD_W) v.tx = next.tx;
      if (cy > 0 && cy < WORLD_H) v.ty = next.ty;
    }
    view.current = v;
    optsRef.current.apply(v);
    if (!pending.current) {
      pending.current = requestAnimationFrame(() => {
        pending.current = 0;
        setSnapshot(view.current);
      });
    }
  }, []);

  const stop = () => cancelAnimationFrame(anim.current);

  const animateTo = useCallback(
    (target: View, ms = 450) => {
      stop();
      if (reducedMotion() || ms === 0) return commit(target);
      const from = view.current;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        const e = 1 - (1 - p) ** 3;
        // Interpolate zoom geometrically so it feels even.
        const k = from.k * (target.k / from.k) ** e;
        commit({ k, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e });
        if (p < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [commit],
  );

  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number, animate = false) => {
      const v = view.current;
      const k = Math.min(MAX_K, Math.max(minK(), v.k * factor));
      const f = k / v.k;
      const next = { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
      if (animate) animateTo(next, 220);
      else commit(next);
    },
    [animateTo, commit],
  );

  /** The point panels leave visible; where a selected marker should land. */
  const focusPoint = () => {
    const { w, h } = size.current;
    const { left, bottom } = optsRef.current.getInsets();
    return { x: left + (w - left) / 2, y: (h - bottom) * 0.6 };
  };

  const zoomBy = useCallback(
    (factor: number) => {
      const { w, h } = size.current;
      const { left, bottom } = optsRef.current.getInsets();
      zoomAt(factor, left + (w - left) / 2, (h - bottom) / 2, true);
    },
    [zoomAt],
  );

  const flyTo = useCallback(
    (lng: number, lat: number, atLeastK = 0) => {
      const [x, y] = project(lng, lat);
      const k = Math.min(MAX_K, Math.max(view.current.k, atLeastK));
      const f = focusPoint();
      animateTo({ k, tx: f.x - x * k, ty: f.y - y * k });
    },
    [animateTo],
  );

  useEffect(() => {
    const el = ref.current!;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
    };
    measure();
    const { lng, lat, k } = optsRef.current.initial;
    const [x, y] = project(lng, lat);
    const f = focusPoint();
    commit({ k, tx: f.x - x * k, ty: f.y - y * k });

    const ro = new ResizeObserver(() => {
      const before = size.current;
      const v = view.current;
      measure();
      // Keep the same spot in the middle when the window changes size.
      commit({ k: v.k, tx: v.tx + (size.current.w - before.w) / 2, ty: v.ty + (size.current.h - before.h) / 2 });
    });
    ro.observe(el);

    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stop();
      pointers.set(e.pointerId, local(e));
      if (pointers.size === 1) {
        moved = 0;
        dragged.current = false;
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      const v = view.current;
      if (pointers.size === 1) {
        moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
        if (moved > DRAG_SLOP) {
          if (!dragged.current) {
            dragged.current = true;
            // Capture only once it's a real drag, so plain clicks still reach the markers.
            el.setPointerCapture(e.pointerId);
            el.classList.add("dragging");
          }
          commit({ k: v.k, tx: v.tx + p.x - prev.x, ty: v.ty + p.y - prev.y });
        }
      } else if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
        const d1 = Math.hypot(p.x - other.x, p.y - other.y);
        dragged.current = true;
        // Pan by half this finger's movement (the midpoint moves half as far), then zoom about the midpoint.
        commit({ k: v.k, tx: v.tx + (p.x - prev.x) / 2, ty: v.ty + (p.y - prev.y) / 2 });
        if (d0 > 0) zoomAt(d1 / d0, (p.x + other.x) / 2, (p.y + other.y) / 2);
      }
      pointers.set(e.pointerId, p);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) el.classList.remove("dragging");
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      stop();
      const p = local(e);
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // ctrlKey is how browsers report a trackpad pinch.
      zoomAt(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
    };
    const key = (e: KeyboardEvent) => {
      if (isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;
      const v = view.current;
      const step = 80;
      if (e.key === "+" || e.key === "=") zoomBy(1.6);
      else if (e.key === "-" || e.key === "_") zoomBy(1 / 1.6);
      else if (e.key === "ArrowLeft") animateTo({ ...v, tx: v.tx + step }, 150);
      else if (e.key === "ArrowRight") animateTo({ ...v, tx: v.tx - step }, 150);
      else if (e.key === "ArrowUp") animateTo({ ...v, ty: v.ty + step }, 150);
      else if (e.key === "ArrowDown") animateTo({ ...v, ty: v.ty - step }, 150);
      else return;
      e.preventDefault();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    return () => {
      stop();
      cancelAnimationFrame(pending.current);
      pending.current = 0;
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
    // Set up once; everything it reads lives in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const center = () => {
    const v = view.current;
    return unproject((size.current.w / 2 - v.tx) / v.k, (size.current.h / 2 - v.ty) / v.k);
  };

  return { view: snapshot, size, dragged, zoomBy, flyTo, center };
}
