import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CozyEvent, EventComment } from "@cozy/shared";
import { api } from "./api";
import { AudioEngine } from "./audio/engine";
import { loadIdentity, spawnPoint } from "./identity";
import { CityMap } from "./map/CityMap";
import { EventDetail, EventList } from "./ui/EventPanel";
import { useRealtime } from "./useRealtime";

const ENERGY_RADIUS_M = 400;

export function App() {
  const identity = useMemo(loadIdentity, []);
  const position = useRef(spawnPoint());
  const [events, setEvents] = useState<CozyEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveComments, setLiveComments] = useState<EventComment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const audio = useRef<AudioEngine | null>(null);
  const [scene, setScene] = useState<string | null>(null);

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

  const rt = useRealtime(identity, () => position.current, {
    onComment: (c) => {
      setLiveComments((cs) => [...cs.slice(-50), c]);
      setEvents((es) => es.map((e) => (e.id === c.eventId ? { ...e, commentCount: e.commentCount + 1 } : e)));
    },
    onEventsUpdated: refresh,
  });

  // Audio energy follows the hottest event near you.
  const onMove = useCallback(
    (lng: number, lat: number) => {
      rt.sendMove(lng, lat);
      if (!audio.current) return;
      const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
      let energy = 0;
      for (const e of events) {
        const d = Math.hypot((e.lng - lng) * kx, (e.lat - lat) * 110_540);
        energy = Math.max(energy, e.heat * Math.max(0, 1 - d / ENERGY_RADIUS_M));
      }
      audio.current.setEnergy(energy);
    },
    [rt, events],
  );

  const toggleAudio = async () => {
    if (audio.current) {
      await audio.current.stop();
      audio.current = null;
      setScene(null);
      return;
    }
    const engine = new AudioEngine();
    await engine.start();
    audio.current = engine;
    setScene(engine.scene);
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

  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="app">
      <CityMap
        identity={identity}
        position={position}
        events={events}
        avatars={rt.avatars}
        meId={rt.me}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={onMove}
      />
      <aside className="panel">
        <header>
          <img className="logo" src="/cozy-cube.svg" alt="" width={28} height={28} />
          <h1>cozy</h1>
          <span className={rt.connected ? "dot on" : "dot"} title={rt.connected ? "live" : "offline"} />
          <span className="muted">
            {rt.avatars.length} here · you are <b style={{ color: identity.color }}>{identity.handle}</b>
          </span>
          <button onClick={toggleAudio}>{audio.current ? `♪ ${scene ?? ""}` : "♪ sound on"}</button>
        </header>
        {loadError && <p className="error">couldn't load events: {loadError}</p>}
        {selected ? (
          <EventDetail event={selected} author={identity.handle} liveComments={liveComments} onClose={() => setSelectedId(null)} />
        ) : (
          <EventList events={events} onSelect={setSelectedId} />
        )}
        <footer className="muted">WASD / arrows to walk · shift to run · click the map to walk there · F to find yourself</footer>
      </aside>
    </div>
  );
}
