import { useEffect, useMemo, useState } from "react";
import type { CozyEvent, EventComment } from "@cozy/shared";
import { api } from "../api";
import { ago } from "./format";
import { Icon } from "./icons";

const MAX_THREADS = 12;

interface Props {
  events: CozyEvent[];
  selected: CozyEvent | null;
  author: string;
  liveComments: EventComment[];
  onSelect(id: string | null): void;
  onClose(): void;
}

/**
 * What visitors are saying across the city: every event's thread in one stream,
 * newest first. With an event selected it narrows to that thread and you can post.
 */
export function SocialPanel({ events, selected, author, liveComments, onSelect, onClose }: Props) {
  const [history, setHistory] = useState<EventComment[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // There is no city-wide endpoint yet, so pull the busiest threads (plus the selected one) and merge them.
  const threadIds = useMemo(() => {
    const ids = events
      .filter((e) => e.commentCount > 0)
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, MAX_THREADS)
      .map((e) => e.id);
    if (selected && !ids.includes(selected.id)) ids.push(selected.id);
    return ids.sort().join(",");
  }, [events, selected]);

  useEffect(() => {
    if (!threadIds) return;
    let stale = false;
    Promise.all(threadIds.split(",").map((id) => api.comments(id).then((r) => r.comments))).then(
      (lists) => {
        if (stale) return;
        setHistory(lists.flat());
        setError(null);
      },
      (e: Error) => !stale && setError(`couldn't load posts: ${e.message}`),
    );
    return () => {
      stale = true;
    };
  }, [threadIds]);

  const posts = useMemo(() => {
    const byId = new Map<string, EventComment>();
    for (const c of [...history, ...liveComments]) byId.set(c.id, c);
    return [...byId.values()]
      .filter((c) => !selected || c.eventId === selected.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [history, liveComments, selected]);

  const titles = useMemo(() => new Map(events.map((e) => [e.id, e.title])), [events]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      await api.postComment(selected.id, author, draft);
      setDraft("");
      setError(null);
    } catch (err) {
      setError(`couldn't post: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel side" aria-label="Social feed">
      <header className="panel-head">
        <h2>social</h2>
        <button className="icon-btn ghost" onClick={onClose} aria-label="Close social feed">
          <Icon name="close" size={18} />
        </button>
      </header>
      {selected ? (
        <p className="filter">
          <span>{selected.title}</span>
          <button className="link" onClick={() => onSelect(null)}>
            show all
          </button>
        </p>
      ) : (
        <p className="hint">What people are saying around the city tonight.</p>
      )}
      {error && <p className="error">{error}</p>}
      <ul className="posts">
        {posts.map((c) => (
          <li key={c.id}>
            <p>
              <b>{c.author}</b> <time dateTime={c.createdAt}>{ago(c.createdAt)}</time>
            </p>
            <p>{c.body}</p>
            {!selected && titles.has(c.eventId) && (
              <button className="link" onClick={() => onSelect(c.eventId)}>
                <Icon name="pin" size={14} /> {titles.get(c.eventId)}
              </button>
            )}
          </li>
        ))}
        {!posts.length && !error && <li className="empty">{selected ? "No posts here yet. Be the first." : "Quiet so far. Pick an event and say something."}</li>}
      </ul>
      {selected ? (
        <form className="compose" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={`say something as ${author}`}
            aria-label={`Post about ${selected.title}`}
          />
          <button className="btn" disabled={!draft.trim() || sending}>
            post
          </button>
        </form>
      ) : (
        <p className="hint">Pick an event on the map to post about it.</p>
      )}
    </section>
  );
}
