CREATE TABLE IF NOT EXISTS post_inline_assets (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_post_inline_assets_post_sort_order
  ON post_inline_assets(post_id, sort_order ASC);
