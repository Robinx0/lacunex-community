CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX idx_attachments_report ON attachments(report_id);

INSERT INTO schema_version (version, applied_at) VALUES (3, CAST(strftime('%s','now') AS INTEGER) * 1000);
