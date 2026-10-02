import { useEffect, useState } from "react";
import type { CozyEvent, EventComment } from "@cozy/shared";
import { api } from "../api";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export function EventList({ events, onSelect }: { events: CozyEvent[]; onSelect(id: string): void }) {
  return (
    <ol className="list">
      {events.map((e) => (
        <li key={e.id} onClick={() => onSelect(e.id)}>
          <span className="heat" style={{ width: `${Math.round(e.heat * 100)}%` }} />
          <strong>{e.title}</strong>
          <small>
            {e.venueName} · {time(e.startsAt)}
            {e.commentCount > 0 && ` · ${e.commentCount} 💬`}
            {e.source === "seed" && <em className="badge">demo</em>}
          </small>
        </li>
      ))}
    </ol>
  );
}

export function EventDetail(props: { event: CozyEvent; author: string; liveComments: EventComment[]; onClose(): void }) {
  const { event, author } = props;
  const [comments, setComments] = useState<EventComment[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setComments([]);
    api.comments(event.id).then((r) => setComments(r.comments), (e: Error) => setError(e.message));
  }, [event.id]);

  // Merge comments that arrived over the websocket.
  useEffect(() => {
    const fresh = props.liveComments.filter((c) => c.eventId === event.id);
    if (!fresh.length) return;
    setComments((cs) => {
      const seen = new Set(cs.map((c) => c.id));
      return [...fresh.filter((c) => !seen.has(c.id)).reverse(), ...cs];
    });
  }, [props.liveComments, event.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await api.postComment(event.id, author, draft);
      setDraft("");
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="detail">
      <button className="close" onClick={props.onClose} aria-label="close">×</button>
      {event.imageUrl && <img src={event.imageUrl} alt="" />}
      <h2>{event.title}</h2>
      <p>
        {event.venueName} · {time(event.startsAt)}
        {event.endsAt && `–${time(event.endsAt)}`}
      </p>
      <p className="muted">
        heat {(event.heat * 100).toFixed(0)} · {event.genres.join(", ") || "—"} · via {event.source}
      </p>
      {event.url && (
        <a href={event.url} target="_blank" rel="noreferrer">
          tickets / info ↗
        </a>
      )}
      <form onSubmit={submit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={`say something as ${author}`} />
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="comments">
        {comments.map((c) => (
          <li key={c.id}>
            <b>{c.author}</b> {c.body}
          </li>
        ))}
      </ul>
    </div>
  );
}
