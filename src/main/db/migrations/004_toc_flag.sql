-- Per-report Table of Contents toggle. When 1, the renderer prepends an
-- auto-generated TOC built from h1/h2/h3 headings; when 0, no TOC is
-- inserted. Defaults to 0 so existing reports stay byte-identical.
ALTER TABLE reports ADD COLUMN toc_enabled INTEGER NOT NULL DEFAULT 0;

INSERT INTO schema_version (version, applied_at) VALUES (4, CAST(strftime('%s','now') AS INTEGER) * 1000);
