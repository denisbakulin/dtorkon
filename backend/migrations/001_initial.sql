CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
  cover_asset_id TEXT NULL REFERENCES assets(id),
  published_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published_at
  ON posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_updated_at
  ON posts(updated_at DESC);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER NULL,
  height INTEGER NULL,
  original_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'ready', 'orphaned')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_status_created_at
  ON assets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  kind TEXT NOT NULL CHECK(kind IN ('image', 'file')),
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_attachments_post_sort_order
  ON attachments(post_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_hash TEXT NULL,
  user_agent TEXT NULL
);
