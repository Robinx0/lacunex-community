-- Per-report cover knobs: optional logo, logo size multiplier, cover-text
-- scale, and palette key. Stored as a single JSON blob so future cover
-- options (badges, footer overrides, custom anchor copy) don't require
-- one new column per knob. Defaults match the existing cover render so
-- pre-migration reports come back identical.
ALTER TABLE reports ADD COLUMN cover_options_json TEXT NOT NULL DEFAULT '{}';

INSERT INTO schema_version (version, applied_at) VALUES (5, CAST(strftime('%s','now') AS INTEGER) * 1000);
