import type { Database } from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { extname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import type { Attachment } from '@shared/types';
import { ATTACHMENT_MAX_BYTES } from '@shared/ipc-contracts';
import type { FileIO } from '../lib/io';

/**
 * Strict report-id pattern matching `ReportIdSchema` on the renderer side.
 * Defense-in-depth: even though the IPC contract validates the input,
 * `filepath` values stored in the DB also flow through this check on
 * read/delete to catch tampered rows or future import paths.
 */
const REPORT_ID_RE = /^r_[A-Za-z0-9_-]{1,40}$/;

interface AttachmentRow {
  id: string;
  report_id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  created_at: number;
}

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    reportId: row.report_id,
    filename: row.filename,
    filepath: row.filepath,
    mimetype: row.mimetype,
    size: row.size,
    createdAt: row.created_at,
  };
}

export interface UploadInput {
  reportId: string;
  filename: string;
  mimetype: string;
  /** Base64-encoded file contents — IPC payloads are JSON-only. */
  base64: string;
}

export interface AttachmentPaths {
  /** Absolute root for all reports' attachments. */
  rootDir: () => string;
  /** Absolute directory for one report's attachments — caller must ensure it exists via FileIO. */
  reportDir: (reportId: string) => string;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/**
 * Whitelist of extensions we'll keep from a user-supplied filename. We
 * never derive `.exe`/`.lnk`/etc. from the upload — the on-disk extension
 * is mimetype-driven first, with the original filename only contributing
 * if it agrees with the allowlist.
 */
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

/**
 * Persists attachment files + metadata. Constructed with `FileIO` and a
 * path resolver so tests can run against an in-memory file store without
 * touching the OS.
 */
export class AttachmentService {
  constructor(
    private readonly db: Database,
    private readonly io: FileIO,
    private readonly paths: AttachmentPaths,
  ) {}

  upload(input: UploadInput): Attachment {
    if (!REPORT_ID_RE.test(input.reportId)) {
      throw new Error('AttachmentService.upload — invalid reportId');
    }

    const buf = Buffer.from(input.base64, 'base64');
    // Defense in depth: the IPC contract already caps the base64 string,
    // but the decoded byteLength is the value we actually want to bound
    // — and `Buffer.from` quietly truncates invalid base64 instead of
    // throwing, so this also catches malformed inputs that decode short.
    if (buf.byteLength === 0) {
      throw new Error('AttachmentService.upload — empty payload');
    }
    if (buf.byteLength > ATTACHMENT_MAX_BYTES) {
      throw new Error('AttachmentService.upload — payload exceeds size limit');
    }

    const id = `a_${nanoid(10)}`;
    // Prefer the mimetype-derived extension; fall back to the user's
    // filename ext only if it's on the allowlist. Never honor `.exe` or
    // similar from the upload.
    const userExt = extname(input.filename).toLowerCase();
    const mimeExt = MIME_TO_EXT[input.mimetype] ?? '';
    const ext = ALLOWED_EXTENSIONS.has(userExt) ? userExt : mimeExt;
    const safeName = `${id}${ext}`;
    const dir = this.paths.reportDir(input.reportId);
    this.io.ensureDir(dir);

    const filepath = join(input.reportId, safeName);
    const absolutePath = this.resolveContained(filepath);

    // Crash-atomic write: if the process dies mid-write the .tmp file
    // is left behind but the canonical name never points at a partial
    // file. Rename is atomic on the same filesystem on every OS we ship.
    const tmpPath = `${absolutePath}.tmp`;
    this.io.writeFile(tmpPath, buf);
    try {
      this.io.rename(tmpPath, absolutePath);
    } catch (err) {
      // Best-effort cleanup so we don't leave orphan .tmp files behind.
      try { this.io.unlink(tmpPath); } catch { /* ignore */ }
      throw err;
    }

    const now = Date.now();
    try {
      this.db
        .prepare(
          `INSERT INTO attachments (id, report_id, filename, filepath, mimetype, size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, input.reportId, input.filename, filepath, input.mimetype, buf.byteLength, now);
    } catch (err) {
      // DB insert failed after the file landed — the file is now
      // orphaned. Roll it back so the next upload doesn't leak storage.
      try { this.io.unlink(absolutePath); } catch { /* ignore */ }
      throw err;
    }

    return {
      id,
      reportId: input.reportId,
      filename: input.filename,
      filepath,
      mimetype: input.mimetype,
      size: buf.byteLength,
      createdAt: now,
    };
  }

  /**
   * Returns base64 + mimetype so the renderer can render via a `data:`
   * URL. The renderer never receives a file path — preserves the
   * fs-isolation security boundary in the spec.
   */
  getDataUrl(id: string): { mimetype: string; base64: string } | null {
    const row = this.findRow(id);
    if (!row) return null;
    const buf = this.io.readFile(this.resolveContained(row.filepath));
    if (!buf) return null;
    return { mimetype: row.mimetype, base64: buf.toString('base64') };
  }

  get(id: string): Attachment | null {
    const row = this.findRow(id);
    return row ? rowToAttachment(row) : null;
  }

  delete(id: string): void {
    const row = this.findRow(id);
    if (!row) return;
    try {
      this.io.unlink(this.resolveContained(row.filepath));
    } catch (err) {
      // Orphaned files are recoverable; failing to delete the row is not.
      console.warn('[AttachmentService] failed to remove file', err);
    }
    this.db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  }

  /**
   * Resolve a relative filepath against the attachments root and assert
   * the result stays inside it. Catches both crafted `reportId` inputs and
   * tampered DB rows whose `filepath` was rewritten to escape via `..`.
   *
   * Also explicitly rejects absolute paths and `..`-prefixed paths before
   * resolution: `path.resolve(root, '/etc/passwd')` returns `/etc/passwd`
   * verbatim, which the startsWith check below catches — but the
   * pre-resolution rejection makes the invariant ("filepath is a
   * relative path strictly inside root") legible at the boundary.
   */
  private resolveContained(filepath: string): string {
    if (isAbsolute(filepath) || normalize(filepath).split(/[\\/]/).includes('..')) {
      throw new Error('AttachmentService — non-relative filepath rejected');
    }
    const root = resolve(this.paths.rootDir());
    const target = resolve(root, filepath);
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error('AttachmentService — path traversal blocked');
    }
    return target;
  }

  /**
   * Remove every file backing a report's attachments. Used when a report
   * is deleted — the FK CASCADE wipes the rows, but without this the
   * blobs sit on disk forever consuming user space.
   */
  deleteAllForReport(reportId: string): void {
    if (!REPORT_ID_RE.test(reportId)) return;
    const rows = this.db
      .prepare('SELECT filepath FROM attachments WHERE report_id = ?')
      .all(reportId) as Array<{ filepath: string }>;
    for (const row of rows) {
      try {
        this.io.unlink(this.resolveContained(row.filepath));
      } catch (err) {
        console.warn('[AttachmentService] failed to remove file during report delete', err);
      }
    }
  }

  listForReport(reportId: string): Attachment[] {
    const rows = this.db
      .prepare('SELECT * FROM attachments WHERE report_id = ? ORDER BY created_at ASC')
      .all(reportId) as AttachmentRow[];
    return rows.map(rowToAttachment);
  }

  private findRow(id: string): AttachmentRow | null {
    return (
      (this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as
        | AttachmentRow
        | undefined) ?? null
    );
  }
}
