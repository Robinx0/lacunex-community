import type { Database } from 'better-sqlite3';
import { MIGRATION_FILES } from './migrations.gen';

/**
 * Migration files are bundled at build time by `scripts/build-migrations.mjs`
 * — see `migrations.gen.ts`. The numeric prefix on the filename
 * (`001_*.sql`) defines run order and is also the version recorded in the
 * schema_version table.
 */
interface Migration {
  version: number;
  filename: string;
  sql: string;
}

function parseMigrations(): Migration[] {
  const migrations: Migration[] = [];
  for (const [filename, sql] of Object.entries(MIGRATION_FILES)) {
    const match = /^([0-9]+)_[^/]+\.sql$/.exec(filename);
    if (!match) {
      throw new Error(`Migration filename does not match \`NNN_name.sql\`: ${filename}`);
    }
    migrations.push({
      version: Number(match[1]),
      filename,
      sql,
    });
  }
  migrations.sort((a, b) => a.version - b.version);

  // Cheap sanity: detect duplicate version numbers.
  const seen = new Set<number>();
  for (const m of migrations) {
    if (seen.has(m.version)) {
      throw new Error(`Duplicate migration version ${m.version}`);
    }
    seen.add(m.version);
  }
  return migrations;
}

function getCurrentVersion(db: Database): number {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
    .get();
  if (!row) return 0;
  const result = db
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
    .get() as { v: number };
  return result.v;
}

/**
 * Run all migrations whose version is greater than the database's current
 * schema_version.MAX. Each migration runs inside a transaction so a failure
 * leaves the database at its previous version.
 */
export function runMigrations(db: Database): { ranVersions: number[] } {
  const migrations = parseMigrations();
  const current = getCurrentVersion(db);
  const ran: number[] = [];

  for (const migration of migrations) {
    if (migration.version <= current) continue;

    const apply = db.transaction(() => {
      db.exec(migration.sql);
    });
    apply();
    ran.push(migration.version);
  }

  return { ranVersions: ran };
}

export function getSchemaVersion(db: Database): number {
  return getCurrentVersion(db);
}
