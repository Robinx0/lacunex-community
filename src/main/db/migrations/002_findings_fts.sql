CREATE VIRTUAL TABLE findings_fts USING fts5(
  title, body, remediation,
  content='findings',
  content_rowid='rowid'
);

CREATE TRIGGER findings_ai AFTER INSERT ON findings BEGIN
  INSERT INTO findings_fts(rowid, title, body, remediation)
  VALUES (new.rowid, new.title, new.body, new.remediation);
END;

CREATE TRIGGER findings_ad AFTER DELETE ON findings BEGIN
  INSERT INTO findings_fts(findings_fts, rowid, title, body, remediation)
  VALUES ('delete', old.rowid, old.title, old.body, old.remediation);
END;

CREATE TRIGGER findings_au AFTER UPDATE ON findings BEGIN
  INSERT INTO findings_fts(findings_fts, rowid, title, body, remediation)
  VALUES ('delete', old.rowid, old.title, old.body, old.remediation);
  INSERT INTO findings_fts(rowid, title, body, remediation)
  VALUES (new.rowid, new.title, new.body, new.remediation);
END;

INSERT INTO schema_version (version, applied_at) VALUES (2, CAST(strftime('%s','now') AS INTEGER) * 1000);
