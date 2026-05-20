import { describe, it, expect } from 'vitest';
import { openDatabase } from '../../src/main/db/connection';
import { getSchemaVersion, runMigrations } from '../../src/main/db/migrate';

describe('migration runner', () => {
  it('creates schema_version, reports, blocks, findings, templates, attachments and findings_fts', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const tableNames = handle.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);

    for (const expected of [
      'reports',
      'blocks',
      'findings',
      'templates',
      'attachments',
      'schema_version',
      'findings_fts',
    ]) {
      expect(tableNames).toContain(expected);
    }

    expect(getSchemaVersion(handle.db)).toBe(5);
    handle.close();
  });

  it('is idempotent — re-running on a migrated db is a no-op', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const before = getSchemaVersion(handle.db);
    const result = runMigrations(handle.db);
    expect(result.ranVersions).toEqual([]);
    expect(getSchemaVersion(handle.db)).toBe(before);
    handle.close();
  });
});
