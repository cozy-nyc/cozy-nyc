import type { CozyEvent } from "@cozy/shared";
import { time } from "./format";
import { Icon } from "./icons";

export function EventFeed({ events, selectedId, onSelect }: { events: CozyEvent[]; selectedId: string | null; onSelect(id: string): void }) {
  if (!events.length) return <p className="empty">Nothing on the map yet today. Check back in a bit.</p>;
  return (
    <ol className="feed-list">
      {events.map((e) => (
        <li key={e.id}>
          <button className={e.id === selectedId ? "feed-item selected" : "feed-item"} aria-pressed={e.id === selectedId} onClick={() => onSelect(e.id)}>
            {e.imageUrl ? <img className="poster" src={e.imageUrl} alt="" loading="lazy" /> : <span className="poster" />}
            <span className="feed-text">
              <span className="feed-head">
                <strong>{e.title}</strong>
                <small>
                  {[time(e.startsAt), ...e.genres].join(" · ")}
                  {e.commentCount > 0 && ` · ${e.commentCount} ${e.commentCount === 1 ? "post" : "posts"}`}
                </small>
              </span>
              <span className="feed-where">
                <Icon name="pin" size={14} />
                {e.venueName}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
