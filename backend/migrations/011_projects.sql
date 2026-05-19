CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  readme_excerpt TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
  cover_asset_id TEXT NULL REFERENCES assets(id),
  published_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_screenshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, asset_id)
);

CREATE INDEX idx_projects_status_updated_at ON projects(status, updated_at DESC);
CREATE INDEX idx_projects_published_at ON projects(published_at DESC, updated_at DESC);
CREATE INDEX idx_project_screenshots_project_sort ON project_screenshots(project_id, sort_order ASC);
