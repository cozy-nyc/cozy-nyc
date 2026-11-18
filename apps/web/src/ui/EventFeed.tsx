import type { CozyEvent } from "@cozy/shared";
import { time } from "./format";
import { Icon } from "./icons";

const POPULAR = 2;

interface Props {
  events: CozyEvent[];
  selectedId: string | null;
  onSelect(id: string): void;
}

const Poster = ({ event }: { event: CozyEvent }) =>
  event.imageUrl ? <img className="poster" src={event.imageUrl} alt="" loading="lazy" /> : <span className="poster" />;

function Info({ event }: { event: CozyEvent }) {
  return (
    <span className="feed-text">
      <span className="feed-head">
        <strong>{event.title}</strong>
        <small>
          {[time(event.startsAt), ...event.genres].join(" · ")}
          {event.commentCount > 0 && ` · ${event.commentCount} ${event.commentCount === 1 ? "post" : "posts"}`}
        </small>
      </span>
      <span className="feed-where">
        <Icon name="pin" size={14} />
        {event.venueName}
      </span>
    </span>
  );
}

/** The left panel: the hottest events as big cards, then everything on today in start order. */
export function EventFeed({ events, selectedId, onSelect }: Props) {
  if (!events.length) return <p className="empty">Nothing on the map yet today. Check back in a bit.</p>;
  const popular = [...events].sort((a, b) => b.heat - a.heat).slice(0, POPULAR);
  const today = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const item = (e: CozyEvent, kind: string) => (
    <li key={e.id}>
      <button className={e.id === selectedId ? `${kind} selected` : kind} aria-pressed={e.id === selectedId} onClick={() => onSelect(e.id)}>
        <Poster event={e} />
        <Info event={e} />
      </button>
    </li>
  );
  return (
    <div className="feed-scroll">
      <section aria-labelledby="feed-popular">
        <h2 id="feed-popular">Popular</h2>
        <ol className="popular">{popular.map((e) => item(e, "popular-item"))}</ol>
      </section>
      <section aria-labelledby="feed-today">
        <h2 id="feed-today">Today</h2>
        <ol className="feed-list">{today.map((e) => item(e, "feed-item"))}</ol>
      </section>
    </div>
  );
}
