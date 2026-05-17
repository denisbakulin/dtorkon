CREATE TABLE IF NOT EXISTS site_profile_links (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES site_profile(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('email', 'phone', 'telegram', 'vk', 'link')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(profile_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_site_profile_links_profile_sort
  ON site_profile_links(profile_id, sort_order ASC);

INSERT INTO site_profile_links (
  id,
  profile_id,
  kind,
  label,
  url,
  sort_order,
  created_at,
  updated_at
)
SELECT
  lower(hex(randomblob(16))),
  id,
  'email',
  'Email',
  contact_email,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM site_profile
WHERE
  contact_email <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM site_profile_links
    WHERE profile_id = site_profile.id AND kind = 'email'
  );
