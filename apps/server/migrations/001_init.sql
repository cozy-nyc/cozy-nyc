CREATE TABLE events (
  id          TEXT PRIMARY KEY,          -- "<source>:<source_id>"
  source      TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  venue_name  TEXT NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  url         TEXT,
  image_url   TEXT,
  genres      JSONB NOT NULL DEFAULT '[]',
  popularity  REAL NOT NULL DEFAULT 0,   -- 0..1 signal from the source (RSVPs, interested counts...)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_starts_at_idx ON events (starts_at);

CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author      TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_event_idx ON comments (event_id, created_at DESC);
