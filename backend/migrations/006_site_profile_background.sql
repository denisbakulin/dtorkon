ALTER TABLE site_profile ADD COLUMN background_color TEXT NOT NULL DEFAULT '';
ALTER TABLE site_profile ADD COLUMN background_asset_id TEXT NULL REFERENCES assets(id);
