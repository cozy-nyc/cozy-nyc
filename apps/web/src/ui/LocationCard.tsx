import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CozyEvent } from "@cozy/shared";
import { logo } from "../logo";
import { googleMapsUrl, venueFor } from "../mock/venues";
import { time } from "./format";
import { Icon } from "./icons";

const WIDTH = 304;
const EDGE = 12;
const GAP = 26; // clear of the marker

interface Props {
  event: CozyEvent;
  /** Where the event's marker is on screen. */
  anchor: { x: number; y: number };
  bounds: { w: number; h: number };
  onClose(): void;
  onOpenPosts(): void;
}

/** Address, details and links for the selected event, pinned to its marker. */
export function LocationCard({ event, anchor, bounds, onClose, onOpenPosts }: Props) {
  const venue = venueFor(event);
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(ref.current?.offsetHeight ?? 0);
  }, [event.id, venue]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const width = Math.min(WIDTH, bounds.w - EDGE * 2);
  const left = Math.min(bounds.w - EDGE - width, Math.max(EDGE, anchor.x - width / 2));
  const below = anchor.y - GAP - height < EDGE;
  const top = below ? anchor.y + GAP : anchor.y - GAP - height;
  const arrow = Math.min(width - 20, Math.max(20, anchor.x - left));

  return (
    <div
      ref={ref}
      className={below ? "card below" : "card"}
      role="dialog"
      aria-label={`${event.title} details`}
      style={{ left, top, width, "--arrow-x": `${arrow}px`, visibility: height ? "visible" : "hidden" } as React.CSSProperties}
    >
      <button className="icon-btn ghost close" onClick={onClose} aria-label="Close details">
        <Icon name="close" size={18} />
      </button>
      <h2>{event.title}</h2>
      <div className="card-body">
        <img className={event.imageUrl ? "thumb" : "thumb blank"} src={event.imageUrl ?? logo} alt="" />
        <div>
          <strong>{event.venueName}</strong>
          <p>{venue?.address ?? "Address not listed yet"}</p>
          <p>
            {time(event.startsAt)}
            {event.endsAt && ` – ${time(event.endsAt)}`}
          </p>
        </div>
      </div>
      {event.genres.length > 0 && (
        <ul className="chips" aria-label="Genres">
          {event.genres.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
      <div className="card-links">
        <a className="btn" href={googleMapsUrl(event)} target="_blank" rel="noreferrer">
          <Icon name="pin" size={16} /> Google Maps
        </a>
        {event.url && (
          <a className="icon-btn" href={event.url} target="_blank" rel="noreferrer" aria-label="Tickets and info" title="Tickets and info">
            <Icon name="ticket" size={18} />
          </a>
        )}
        {venue?.website && (
          <a className="icon-btn" href={venue.website} target="_blank" rel="noreferrer" aria-label={`${event.venueName} website`} title="Website">
            <Icon name="globe" size={18} />
          </a>
        )}
        {venue?.instagram && (
          <a
            className="icon-btn"
            href={`https://www.instagram.com/${venue.instagram}/`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${event.venueName} on Instagram`}
            title="Instagram"
          >
            <Icon name="instagram" size={18} />
          </a>
        )}
        <button className="icon-btn posts" onClick={onOpenPosts} aria-label={`${event.commentCount} posts about this event. Open social feed`} title="Posts">
          <Icon name="chat" size={18} />
          {event.commentCount > 0 && <span>{event.commentCount}</span>}
        </button>
      </div>
    </div>
  );
}
