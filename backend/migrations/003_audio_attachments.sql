CREATE TABLE attachments_v2 (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  kind TEXT NOT NULL CHECK(kind IN ('image', 'audio', 'file')),
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, asset_id)
);

INSERT INTO attachments_v2 (
  id,
  post_id,
  asset_id,
  kind,
  title,
  sort_order,
  created_at
)
SELECT
  id,
  post_id,
  asset_id,
  kind,
  title,
  sort_order,
  created_at
FROM attachments;

DROP TABLE attachments;

ALTER TABLE attachments_v2 RENAME TO attachments;

CREATE INDEX IF NOT EXISTS idx_attachments_post_sort_order
  ON attachments(post_id, sort_order ASC);
