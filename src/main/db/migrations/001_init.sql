-- PRAGMAs intentionally omitted here: `db.transaction` wraps each
-- migration, and `journal_mode` / `foreign_keys` are silently no-ops
-- inside an explicit transaction. The connection layer
-- (`src/main/db/connection.ts`) sets both before running migrations.

CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  cover_id TEXT NOT NULL,
  custom_cover_json TEXT NOT NULL,
  report_theme TEXT NOT NULL CHECK (report_theme IN ('light','dark')),
  report_accent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_reports_updated_at ON reports(updated_at DESC);
CREATE INDEX idx_reports_archived ON reports(archived);

CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  attrs_json TEXT,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX idx_blocks_report_pos ON blocks(report_id, position);

CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  vuln_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('crit','high','med','low','info')),
  cvss TEXT,
  cwe TEXT,
  affected TEXT,
  status TEXT NOT NULL,
  body TEXT NOT NULL,
  poc_steps_json TEXT NOT NULL DEFAULT '[]',
  remediation TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_findings_report ON findings(report_id);
CREATE INDEX idx_findings_severity ON findings(severity);

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📄',
  type TEXT NOT NULL CHECK (type IN ('block','section','finding')),
  blocks_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_templates_category ON templates(category);

INSERT INTO schema_version (version, applied_at) VALUES (1, CAST(strftime('%s','now') AS INTEGER) * 1000);
