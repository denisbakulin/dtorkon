CREATE TABLE IF NOT EXISTS error_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('backend', 'frontend')),
  level TEXT NOT NULL CHECK(level IN ('warning', 'error')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  status_code INTEGER NULL,
  request_method TEXT NULL,
  request_path TEXT NULL,
  page_url TEXT NULL,
  details_json TEXT NULL,
  stack_trace TEXT NULL,
  session_id TEXT NULL REFERENCES sessions(id),
  user_agent TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_events_created_at
  ON error_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_events_source_level
  ON error_events(source, level, created_at DESC);
