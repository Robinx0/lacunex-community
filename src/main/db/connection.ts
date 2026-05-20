import Database, { type Database as Db } from 'better-sqlite3';
import { runMigrations } from './migrate';

export interface DatabaseHandle {
  db: Db;
  close: () => void;
}

export interface OpenDatabaseOptions {
  /** Filesystem path or `:memory:`. Required. */
  filename: string;
  /** When true, run all pending migrations before returning. Default: true. */
  migrate?: boolean;
  /** Verbose logger called with each executed SQL statement. */
  verbose?: (...args: unknown[]) => void;
}

/**
 * Open a better-sqlite3 connection with our standard PRAGMAs applied. The
 * caller owns the lifecycle — call `close()` to release the file handle.
 */
export function openDatabase(opts: OpenDatabaseOptions): DatabaseHandle {
  const db = new Database(opts.filename, opts.verbose ? { verbose: opts.verbose } : undefined);

  // PRAGMAs first. WAL is a no-op on `:memory:` but harmless.
  if (opts.filename !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  if (opts.migrate !== false) {
    runMigrations(db);
  }

  return {
    db,
    close: () => db.close(),
  };
}
