import type { Database, Statement } from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  Block,
  CoverOptions,
  CustomCover,
  Report,
  ReportMeta,
  ReportSummary,
} from '@shared/types';

interface ReportRow {
  id: string;
  title: string;
  meta_json: string;
  cover_id: string;
  custom_cover_json: string;
  report_theme: 'light' | 'dark';
  report_accent: string | null;
  cover_options_json: string;
  toc_enabled: number;
  created_at: number;
  updated_at: number;
  archived: number;
}

interface BlockRow {
  id: string;
  report_id: string;
  position: number;
  type: string;
  content: string | null;
  attrs_json: string | null;
}

const DEFAULT_META: ReportMeta = {
  project: 'Untitled engagement',
  client: '',
  docId: '',
  classification: 'Confidential',
  reportVersion: '0.1',
  engagementType: '',
  methodology: '',
  startDate: '',
  endDate: '',
  authors: '',
  reviewers: '',
  distribution: '',
  scope: [],
  outOfScope: '',
};

const DEFAULT_CUSTOM_COVER: CustomCover = {
  name: 'Custom cover',
  html: '',
  css: '',
  js: '',
};

const DEFAULT_COVER_OPTIONS: CoverOptions = {
  logoDataUrl: null,
  logoSize: 0.3,
  textScale: 1,
  palette: null,
};

export interface CreateReportInput {
  title: string;
  meta?: Partial<ReportMeta>;
  coverId?: string;
  customCover?: CustomCover;
  reportTheme?: 'light' | 'dark';
  reportAccent?: string | null;
  coverOptions?: Partial<CoverOptions>;
  tocEnabled?: boolean;
}

export interface UpdateReportInput {
  id: string;
  title?: string;
  meta?: ReportMeta;
  coverId?: string;
  customCover?: CustomCover;
  reportTheme?: 'light' | 'dark';
  reportAccent?: string | null;
  coverOptions?: CoverOptions;
  tocEnabled?: boolean;
  archived?: boolean;
}

export class ReportService {
  // Hoisted for the autosave hot path.
  private readonly stmtUpsertBlock: Statement;
  private readonly stmtUpsertFinding: Statement;
  private readonly stmtBumpUpdatedAt: Statement;

  constructor(private readonly db: Database) {
    this.stmtUpsertBlock = db.prepare(
      `INSERT INTO blocks (id, report_id, position, type, content, attrs_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         type = excluded.type,
         content = excluded.content,
         attrs_json = excluded.attrs_json`,
    );
    this.stmtUpsertFinding = db.prepare(
      `INSERT INTO findings
         (id, report_id, block_id, vuln_id, title, severity, cvss, cwe, affected,
          status, body, poc_steps_json, remediation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         vuln_id = excluded.vuln_id,
         title = excluded.title,
         severity = excluded.severity,
         cvss = excluded.cvss,
         cwe = excluded.cwe,
         affected = excluded.affected,
         status = excluded.status,
         body = excluded.body,
         poc_steps_json = excluded.poc_steps_json,
         remediation = excluded.remediation,
         updated_at = excluded.updated_at`,
    );
    this.stmtBumpUpdatedAt = db.prepare(
      'UPDATE reports SET updated_at = ? WHERE id = ?',
    );
  }

  list(opts: { archived?: boolean } = {}): ReportSummary[] {
    const archived = opts.archived ? 1 : 0;
    const rows = this.db
      .prepare(
        `SELECT id, title, meta_json, cover_id, report_theme, created_at, updated_at, archived
         FROM reports
         WHERE archived = ?
         ORDER BY updated_at DESC`,
      )
      .all(archived) as Array<{
      id: string;
      title: string;
      meta_json: string;
      cover_id: string;
      report_theme: 'light' | 'dark';
      created_at: number;
      updated_at: number;
      archived: number;
    }>;

    return rows.map((row) => {
      let docId = '';
      let reportVersion = '';
      try {
        const meta = JSON.parse(row.meta_json) as { docId?: string; reportVersion?: string };
        docId = meta.docId ?? '';
        reportVersion = meta.reportVersion ?? '';
      } catch {
        // fall through to empty strings
      }
      return {
        id: row.id,
        title: row.title,
        docId,
        reportVersion,
        coverId: row.cover_id,
        reportTheme: row.report_theme,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archived: Boolean(row.archived),
      };
    });
  }

  get(id: string): Report | null {
    const row = this.db
      .prepare(
        `SELECT id, title, meta_json, cover_id, custom_cover_json,
                report_theme, report_accent, cover_options_json, toc_enabled,
                created_at, updated_at, archived
         FROM reports WHERE id = ?`,
      )
      .get(id) as ReportRow | undefined;
    if (!row) return null;
    return assembleReport(row, this.readBlocks(id));
  }

  // `id ASC` tiebreaker — `position` is not unique per report and SQLite
  // row-iteration order is not stable across vacuums.
  readBlocks(reportId: string): Block[] {
    return (
      this.db
        .prepare(
          `SELECT id, report_id, position, type, content, attrs_json
           FROM blocks WHERE report_id = ? ORDER BY position ASC, id ASC`,
        )
        .all(reportId) as BlockRow[]
    ).map(blockRowToBlock);
  }

  create(input: CreateReportInput): Report {
    const id = `r_${nanoid(10)}`;
    const now = Date.now();
    const meta: ReportMeta = { ...DEFAULT_META, ...(input.meta ?? {}), project: input.title };
    const customCover: CustomCover = input.customCover ?? DEFAULT_CUSTOM_COVER;

    const coverOptions: CoverOptions = {
      ...DEFAULT_COVER_OPTIONS,
      ...(input.coverOptions ?? {}),
    };

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO reports
             (id, title, meta_json, cover_id, custom_cover_json,
              report_theme, report_accent, cover_options_json, toc_enabled,
              created_at, updated_at, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        )
        .run(
          id,
          input.title,
          JSON.stringify(meta),
          input.coverId ?? 'blackops-dark',
          JSON.stringify(customCover),
          input.reportTheme ?? 'dark',
          input.reportAccent ?? null,
          JSON.stringify(coverOptions),
          input.tocEnabled ? 1 : 0,
          now,
          now,
        );
    });
    tx();

    const created = this.get(id);
    if (!created) throw new Error('ReportService.create — failed to read back the created report');
    return created;
  }

  update(input: UpdateReportInput): Report {
    // Single tx so a concurrent autosave can't interleave RMW.
    const tx = this.db.transaction(() => this.applyMetaUpdate(input));
    return tx();
  }

  private applyMetaUpdate(input: UpdateReportInput): Report {
    const existing = this.get(input.id);
    if (!existing) throw new Error(`Report not found: ${input.id}`);

    const next: Report = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.meta !== undefined ? { meta: input.meta } : {}),
      ...(input.coverId !== undefined ? { coverId: input.coverId } : {}),
      ...(input.customCover !== undefined ? { customCover: input.customCover } : {}),
      ...(input.reportTheme !== undefined ? { reportTheme: input.reportTheme } : {}),
      ...(input.reportAccent !== undefined ? { reportAccent: input.reportAccent } : {}),
      ...(input.coverOptions !== undefined ? { coverOptions: input.coverOptions } : {}),
      ...(input.tocEnabled !== undefined ? { tocEnabled: input.tocEnabled } : {}),
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      updatedAt: Date.now(),
    };

    this.db
      .prepare(
        `UPDATE reports SET
            title = ?,
            meta_json = ?,
            cover_id = ?,
            custom_cover_json = ?,
            report_theme = ?,
            report_accent = ?,
            cover_options_json = ?,
            toc_enabled = ?,
            archived = ?,
            updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.title,
        JSON.stringify(next.meta),
        next.coverId,
        JSON.stringify(next.customCover),
        next.reportTheme,
        next.reportAccent,
        JSON.stringify(next.coverOptions),
        next.tocEnabled ? 1 : 0,
        next.archived ? 1 : 0,
        next.updatedAt,
        next.id,
      );

    return next;
  }

  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Report not found: ${id}`);
    }
  }

  // `blocks` (full replacement) takes precedence over `blocksUpsert`/`blocksDelete`.
  updateWithBlocks(
    input: UpdateReportInput,
    opts: {
      blocks?: Block[];
      blocksUpsert?: Block[];
      blocksDelete?: string[];
    },
  ): Report {
    const tx = this.db.transaction(() => {
      const next = this.applyMetaUpdate(input);
      if (opts.blocks) {
        this.applyReplaceBlocks(next.id, opts.blocks);
      } else if (
        (opts.blocksUpsert && opts.blocksUpsert.length > 0) ||
        (opts.blocksDelete && opts.blocksDelete.length > 0)
      ) {
        this.applyBlockDiffInner(next.id, opts.blocksUpsert ?? [], opts.blocksDelete ?? []);
      } else {
        return next;
      }
      return { ...next, blocks: this.readBlocks(next.id) };
    });
    return tx();
  }

  duplicate(id: string): Report {
    const source = this.get(id);
    if (!source) throw new Error(`Report not found: ${id}`);
    const duplicate = this.create({
      title: `${source.title} (copy)`,
      meta: source.meta,
      coverId: source.coverId,
      customCover: source.customCover,
      reportTheme: source.reportTheme,
      reportAccent: source.reportAccent,
      coverOptions: source.coverOptions,
      tocEnabled: source.tocEnabled,
    });
    if (source.blocks.length > 0) {
      // Fresh block IDs; strip finding vulnId/status so the copy is a clean draft.
      const clones = source.blocks.map((b) => {
        const next: Block = { ...b, id: `b_${nanoid(10)}` };
        if (b.type === 'finding' && b.attrs) {
          const { vulnId: _vulnId, status: _status, ...rest } = b.attrs;
          next.attrs = { ...rest, vulnId: '', status: 'open' };
        }
        return next;
      });
      this.replaceBlocks(duplicate.id, clones);
    }
    const reloaded = this.get(duplicate.id);
    if (!reloaded) throw new Error('ReportService.duplicate — failed to reload duplicate');
    return reloaded;
  }

  applyBlockDiff(
    reportId: string,
    upsert: Block[],
    deleteIds: string[],
  ): void {
    const tx = this.db.transaction(() => this.applyBlockDiffInner(reportId, upsert, deleteIds));
    tx();
  }

  private applyBlockDiffInner(
    reportId: string,
    upsert: Block[],
    deleteIds: string[],
  ): void {
    const now = Date.now();

    if (deleteIds.length > 0) {
      const placeholders = deleteIds.map(() => '?').join(',');
      this.db
        .prepare(
          `DELETE FROM blocks WHERE report_id = ? AND id IN (${placeholders})`,
        )
        .run(reportId, ...deleteIds);
    }

    if (upsert.length > 0) {
      this.upsertBlockRows(reportId, upsert, now);
    }

    this.stmtBumpUpdatedAt.run(now, reportId);
  }

  // Incremental: delete dropped blocks, upsert the rest by primary
  // key. tiptapDocToBlocks emits stable IDs so unchanged blocks
  // become no-op UPSERTs.
  replaceBlocks(reportId: string, blocks: Block[]): void {
    const tx = this.db.transaction(() => this.applyReplaceBlocks(reportId, blocks));
    tx();
  }

  private applyReplaceBlocks(reportId: string, blocks: Block[]): void {
    const now = Date.now();

    const placeholders = blocks.length > 0 ? blocks.map(() => '?').join(',') : "''";
    const ids = blocks.map((b) => b.id);
    this.db
      .prepare(
        `DELETE FROM blocks WHERE report_id = ? AND id NOT IN (${placeholders})`,
      )
      .run(reportId, ...ids);

    this.upsertBlockRows(reportId, blocks, now);

    this.stmtBumpUpdatedAt.run(now, reportId);
  }

  private upsertBlockRows(reportId: string, blocks: Block[], now: number): void {
    if (blocks.length === 0) return;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      this.stmtUpsertBlock.run(
        block.id,
        reportId,
        block.position ?? i,
        block.type,
        block.content ?? null,
        block.attrs ? JSON.stringify(block.attrs) : null,
      );
      if (block.type === 'finding' && block.attrs) {
        const a = block.attrs;
        const pocSteps = Array.isArray(a['pocSteps']) ? (a['pocSteps'] as string[]) : [];
        this.stmtUpsertFinding.run(
          `f_${block.id}`,
          reportId,
          block.id,
          (a['vulnId'] as string) ?? '',
          (a['title'] as string) ?? '',
          (a['severity'] as string) ?? 'med',
          (a['cvss'] as string | undefined) ?? null,
          (a['cwe'] as string | undefined) ?? null,
          (a['affected'] as string | undefined) ?? null,
          (a['status'] as string) ?? 'open',
          (a['body'] as string) ?? '',
          JSON.stringify(pocSteps),
          (a['remediation'] as string) ?? '',
          now,
          now,
        );
      }
    }
  }
}

function parseJsonOr<T>(raw: string | null | undefined, fallback: T, context: string): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[ReportService] failed to parse JSON column (${context})`, err);
    return fallback;
  }
}

const FALLBACK_META: ReportMeta = {
  project: '',
  client: '',
  docId: '',
  classification: '',
  reportVersion: '',
  engagementType: '',
  methodology: '',
  startDate: '',
  endDate: '',
  authors: '',
  reviewers: '',
  distribution: '',
  scope: [],
  outOfScope: '',
};

const FALLBACK_CUSTOM_COVER: CustomCover = { name: '', html: '', css: '', js: '' };

function blockRowToBlock(b: BlockRow): Block {
  const attrs = parseJsonOr<Record<string, unknown> | null>(b.attrs_json, null, `block ${b.id}.attrs_json`);
  return {
    id: b.id,
    type: b.type as Block['type'],
    position: b.position,
    ...(b.content ? { content: b.content } : {}),
    ...(attrs ? { attrs } : {}),
  };
}

// Defense in depth: reject anything that isn't a base64-encoded
// raster image data URL. SVG excluded because it can pull remote
// subresources via href.
function sanitizeLogoDataUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return /^data:image\/(png|jpeg|gif|webp);base64,/i.test(v) ? v : null;
}

function assembleReport(row: ReportRow, blocks: Block[]): Report {
  const parsedOptions = parseJsonOr<Partial<CoverOptions>>(
    row.cover_options_json,
    {},
    `report ${row.id}.cover_options_json`,
  );
  const coverOptions: CoverOptions = {
    logoDataUrl: sanitizeLogoDataUrl(parsedOptions.logoDataUrl),
    logoSize: typeof parsedOptions.logoSize === 'number' ? parsedOptions.logoSize : 0.3,
    textScale: typeof parsedOptions.textScale === 'number' ? parsedOptions.textScale : 1,
    palette: parsedOptions.palette ?? null,
  };

  return {
    id: row.id,
    title: row.title,
    meta: parseJsonOr<ReportMeta>(row.meta_json, FALLBACK_META, `report ${row.id}.meta_json`),
    coverId: row.cover_id,
    customCover: parseJsonOr<CustomCover>(
      row.custom_cover_json,
      FALLBACK_CUSTOM_COVER,
      `report ${row.id}.custom_cover_json`,
    ),
    reportTheme: row.report_theme,
    reportAccent: row.report_accent,
    coverOptions,
    tocEnabled: Boolean(row.toc_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: Boolean(row.archived),
    blocks,
  };
}
