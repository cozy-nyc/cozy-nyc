import type { CozyEvent } from "@cozy/shared";
import { logo } from "../logo";
import { time } from "./format";

export function EventFeed({ events, selectedId, onSelect }: { events: CozyEvent[]; selectedId: string | null; onSelect(id: string): void }) {
  if (!events.length) return <p className="empty">Nothing on the map yet tonight. Check back in a bit.</p>;
  return (
    <ol className="feed-list">
      {events.map((e) => (
        <li key={e.id}>
          <button className={e.id === selectedId ? "feed-item selected" : "feed-item"} aria-pressed={e.id === selectedId} onClick={() => onSelect(e.id)}>
            <img className={e.imageUrl ? "thumb" : "thumb blank"} src={e.imageUrl ?? logo} alt="" loading="lazy" />
            <span className="feed-text">
              <strong>{e.title}</strong>
              <small>
                {e.venueName} · {time(e.startsAt)}
                {e.commentCount > 0 && ` · ${e.commentCount} ${e.commentCount === 1 ? "post" : "posts"}`}
                {e.source === "seed" && <em className="badge">demo</em>}
              </small>
            </span>
            <span className="heat" style={{ width: `${Math.round(e.heat * 100)}%` }} />
          </button>
        </li>
      ))}
    </ol>
  );
}
