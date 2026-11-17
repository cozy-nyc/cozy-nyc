import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CozyEvent, EventComment } from "@cozy/shared";
import { api } from "./api";
import { AudioEngine } from "./audio/engine";
import { loadIdentity, spawnPoint } from "./identity";
import { logo } from "./logo";
import { SvgMap, type MapLayers, type SvgMapHandle } from "./map/SvgMap";
import { NEWS } from "./mock/news";
import { loadPref, savePref } from "./prefs";
import { EventFeed } from "./ui/EventFeed";
import { Icon } from "./ui/icons";
import { LocationCard } from "./ui/LocationCard";
import { MapControls } from "./ui/MapControls";
import { NewsPanel } from "./ui/NewsPanel";
import { SocialPanel } from "./ui/SocialPanel";
import { useRealtime } from "./useRealtime";

const ENERGY_RADIUS_M = 400;
const DESKTOP = "(min-width: 800px)";

type SidePanel = "social" | "news" | null;

export function App() {
  const identity = useMemo(loadIdentity, []);
  const position = useRef(spawnPoint());
  const map = useRef<SvgMapHandle>(null);
  const [events, setEvents] = useState<CozyEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveComments, setLiveComments] = useState<EventComment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [side, setSide] = useState<SidePanel>(null);
  const [layers, setLayers] = useState<MapLayers>(() => loadPref("cozy.layers", { subway: true, stations: true }));
  const audio = useRef<AudioEngine | null>(null);
  const starting = useRef(false);
  const [scene, setScene] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => loadPref("cozy.muted", false));
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const refresh = useCallback(() => {
    api.events().then(
      (r) => {
        setEvents(r.events);
        setLoadError(null);
      },
      (e: Error) => setLoadError(e.message),
    );
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000); // heat drifts with time; re-pull every minute
    return () => clearInterval(t);
  }, [refresh]);

  // Walking is off for now, so everyone stays where they spawned; presence still shows who's here.
  const rt = useRealtime(identity, () => position.current, {
    onComment: (c) => {
      setLiveComments((cs) => [...cs.slice(-50), c]);
      setEvents((es) => es.map((e) => (e.id === c.eventId ? { ...e, commentCount: e.commentCount + 1 } : e)));
    },
    onEventsUpdated: refresh,
  });

  // ---- Audio: always on once the browser lets us, unless you muted it ----

  const startAudio = useCallback(async () => {
    if (audio.current || starting.current) return;
    starting.current = true;
    try {
      const engine = new AudioEngine();
      await engine.start();
      engine.setMuted(mutedRef.current);
      audio.current = engine;
      setScene(engine.scene);
    } catch {
      // No audio device or the manifest didn't load. The map still works; a later tap tries again.
    } finally {
      starting.current = false;
    }
  }, []);

  useEffect(() => {
    // Browsers only allow sound after a tap or key press, so the first one anywhere starts it.
    const first = () => {
      if (!mutedRef.current) void startAudio();
    };
    window.addEventListener("click", first);
    window.addEventListener("keydown", first);
    return () => {
      window.removeEventListener("click", first);
      window.removeEventListener("keydown", first);
    };
  }, [startAudio]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    savePref("cozy.muted", next);
    if (audio.current) audio.current.setMuted(next);
    else if (!next) void startAudio();
  };

  useEffect(() => {
    // ?hour=2 lets you audition scenes without waiting for 2am.
    const override = new URLSearchParams(location.search).get("hour");
    const t = setInterval(() => {
      audio.current?.tick(override ? Number(override) : undefined);
      setScene(audio.current?.scene ?? null);
    }, 5_000);
    return () => clearInterval(t);
  }, []);

  // Energy follows the hottest event near the middle of the map.
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const onViewChange = useCallback(({ lng, lat }: { lng: number; lat: number }) => {
    if (!audio.current) return;
    const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
    let energy = 0;
    for (const e of eventsRef.current) {
      const d = Math.hypot((e.lng - lng) * kx, (e.lat - lat) * 110_540);
      energy = Math.max(energy, e.heat * Math.max(0, 1 - d / ENERGY_RADIUS_M));
    }
    audio.current.setEnergy(energy);
  }, []);

  // ---- Layout ----

  const feedRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const getInsets = useCallback(() => {
    const feed = feedRef.current?.getBoundingClientRect();
    if (!feed) return { left: 0, bottom: 0 };
    if (!window.matchMedia(DESKTOP).matches) return { left: 0, bottom: window.innerHeight - feed.top };
    const sideRight = sideRef.current?.getBoundingClientRect().right ?? 0;
    // On narrow desktops the panels would leave too little map, so just centre on the whole thing.
    const left = Math.max(feed.right, sideRight);
    return { left: left < window.innerWidth * 0.6 ? left : 0, bottom: 0 };
  }, []);

  const setLayersPref = (next: MapLayers) => {
    setLayers(next);
    savePref("cozy.layers", next);
  };
  const close = useCallback(() => setSelectedId(null), []);
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const postCount = events.reduce((n, e) => n + e.commentCount, 0);

  return (
    <div className="app">
      <SvgMap
        ref={map}
        identity={identity}
        position={position}
        events={events}
        avatars={rt.avatars}
        meId={rt.me}
        selectedId={selectedId}
        layers={layers}
        getInsets={getInsets}
        onSelect={setSelectedId}
        onViewChange={onViewChange}
        overlay={(toScreen, bounds) =>
          selected && (
            <LocationCard
              event={selected}
              anchor={toScreen(selected.lng, selected.lat)}
              bounds={bounds}
              onClose={close}
              onOpenPosts={() => setSide("social")}
            />
          )
        }
      />

      <header className="brand">
        <img src={logo} alt="" width={32} height={32} />
        <h1>cozy</h1>
        <span className={rt.connected ? "dot on" : "dot"} role="img" aria-label={rt.connected ? "live" : "offline"} />
        <span className="who">
          {rt.avatars.length} here · you are <b style={{ color: identity.color }}>{identity.handle}</b>
        </span>
      </header>

      <aside className="left" ref={feedRef}>
        <section className="panel feed" aria-label="Tonight's events">
        <header className="panel-head">
          <h2>tonight</h2>
          <span className="count">{events.length} events</span>
        </header>
        {loadError && <p className="error">couldn't load events: {loadError}</p>}
        <EventFeed events={events} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
        <nav className="tiles" aria-label="Feeds">
          <button className={side === "social" ? "tile on" : "tile"} aria-expanded={side === "social"} onClick={() => setSide(side === "social" ? null : "social")}>
            <Icon name="open" size={18} />
            <strong>social</strong>
            <small>{postCount ? `${postCount} ${postCount === 1 ? "post" : "posts"} tonight` : "say something"}</small>
          </button>
          <button className={side === "news" ? "tile on" : "tile"} aria-expanded={side === "news"} onClick={() => setSide(side === "news" ? null : "news")}>
            <Icon name="open" size={18} />
            <strong>news</strong>
            <small>{NEWS[0]?.title}</small>
          </button>
        </nav>
      </aside>

      <div ref={sideRef} className="side-slot">
        {side === "social" && (
          <SocialPanel
            events={events}
            selected={selected}
            author={identity.handle}
            liveComments={liveComments}
            onSelect={setSelectedId}
            onClose={() => setSide(null)}
          />
        )}
        {side === "news" && <NewsPanel onClose={() => setSide(null)} />}
      </div>

      <MapControls
        layers={layers}
        onLayers={setLayersPref}
        onZoomIn={() => map.current?.zoomIn()}
        onZoomOut={() => map.current?.zoomOut()}
        scene={scene}
        muted={muted}
        onToggleMute={toggleMute}
      />
    </div>
  );
}
