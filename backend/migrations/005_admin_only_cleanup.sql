DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS auth_challenges;
DROP TABLE IF EXISTS external_accounts;
DROP TABLE IF EXISTS users;

CREATE TABLE site_profile_v2 (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_bio TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  avatar_asset_id TEXT NULL REFERENCES assets(id),
  updated_at TEXT NOT NULL
);

INSERT INTO site_profile_v2 (
  id,
  author_name,
  author_bio,
  contact_email,
  avatar_asset_id,
  updated_at
)
SELECT
  id,
  author_name,
  author_bio,
  contact_email,
  avatar_asset_id,
  updated_at
FROM site_profile;

DROP TABLE site_profile;
ALTER TABLE site_profile_v2 RENAME TO site_profile;

CREATE TABLE sessions_v2 (
  id TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_hash TEXT NULL,
  user_agent TEXT NULL
);

INSERT INTO sessions_v2 (
  id,
  expires_at,
  created_at,
  last_seen_at,
  ip_hash,
  user_agent
)
SELECT
  id,
  expires_at,
  created_at,
  last_seen_at,
  ip_hash,
  user_agent
FROM sessions;

DROP TABLE sessions;
ALTER TABLE sessions_v2 RENAME TO sessions;
