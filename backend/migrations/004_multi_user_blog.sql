CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
  display_name TEXT NOT NULL,
  avatar_asset_id TEXT NULL REFERENCES assets(id),
  bio TEXT NOT NULL DEFAULT '',
  notify_new_posts INTEGER NOT NULL DEFAULT 0,
  theme_preset TEXT NOT NULL DEFAULT 'light',
  accent_preset TEXT NOT NULL DEFAULT 'telegram',
  comment_blocked_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users (
  id,
  role,
  display_name,
  bio,
  notify_new_posts,
  theme_preset,
  accent_preset,
  created_at,
  updated_at
)
SELECT
  'admin',
  'admin',
  'Admin',
  '',
  0,
  'light',
  'telegram',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 'admin'
);

CREATE TABLE IF NOT EXISTS external_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT NULL,
  provider_chat_id TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_external_accounts_user_id
  ON external_accounts(user_id);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  poll_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'expired')),
  user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  telegram_user_id TEXT NULL,
  expires_at TEXT NOT NULL,
  approved_at TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_status_expires_at
  ON auth_challenges(status, expires_at);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_text TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created_at
  ON comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS site_profile (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_bio TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_telegram TEXT NOT NULL DEFAULT '',
  avatar_asset_id TEXT NULL REFERENCES assets(id),
  updated_at TEXT NOT NULL
);

INSERT INTO site_profile (
  id,
  author_name,
  author_bio,
  contact_email,
  contact_telegram,
  updated_at
)
SELECT
  'default',
  'dtorkon',
  '',
  'hello@dtorkon.local',
  '@dtorkon',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM site_profile WHERE id = 'default'
);

ALTER TABLE assets ADD COLUMN transcript_status TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE assets ADD COLUMN transcript_text TEXT NULL;
ALTER TABLE assets ADD COLUMN transcript_error TEXT NULL;
ALTER TABLE assets ADD COLUMN transcribed_at TEXT NULL;

CREATE TABLE attachments_v3 (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  kind TEXT NOT NULL CHECK(kind IN ('image', 'audio', 'video', 'file')),
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, asset_id)
);

INSERT INTO attachments_v3 (
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

ALTER TABLE attachments_v3 RENAME TO attachments;

CREATE INDEX IF NOT EXISTS idx_attachments_post_sort_order
  ON attachments(post_id, sort_order ASC);
