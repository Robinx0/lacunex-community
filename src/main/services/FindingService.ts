import type { Database } from 'better-sqlite3';
import type { Finding, Severity, FindingStatus } from '@shared/types';

interface FindingRow {
  id: string;
  report_id: string;
  block_id: string;
  vuln_id: string;
  title: string;
  severity: Severity;
  cvss: string | null;
  cwe: string | null;
  affected: string | null;
  status: FindingStatus;
  body: string;
  poc_steps_json: string;
  remediation: string;
  created_at: number;
  updated_at: number;
}

function rowToFinding(row: FindingRow): Finding {
  let pocSteps: string[] = [];
  try {
    pocSteps = JSON.parse(row.poc_steps_json) as string[];
  } catch (err) {
    console.warn(`[FindingService] failed to parse poc_steps_json for ${row.id}`, err);
  }
  return {
    id: row.id,
    reportId: row.report_id,
    blockId: row.block_id,
    vulnId: row.vuln_id,
    title: row.title,
    severity: row.severity,
    ...(row.cvss ? { cvss: row.cvss } : {}),
    ...(row.cwe ? { cwe: row.cwe } : {}),
    ...(row.affected ? { affected: row.affected } : {}),
    status: row.status,
    body: row.body,
    pocSteps,
    remediation: row.remediation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FindingService {
  constructor(private readonly db: Database) {}

  search(query: string): Finding[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // FTS5 prefix syntax requires the `*` to follow a single token (or
    // the closing quote of a single-token phrase). The previous form
    // `"foo bar"*` produced a literal-`*` lex error and silently lost
    // prefix matching for multi-word queries. Split on whitespace, strip
    // FTS-reserved characters per term, and AND the resulting prefix
    // matches.
    const terms = trimmed
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, ''))
      .filter((t) => t.length > 0);
    if (terms.length === 0) return [];
    const ftsQuery = terms.map((t) => `"${t}"*`).join(' ');

    const rows = this.db
      .prepare(
        `SELECT findings.*
         FROM findings_fts
         JOIN findings ON findings.rowid = findings_fts.rowid
         WHERE findings_fts MATCH ?
         ORDER BY rank
         LIMIT 100`,
      )
      .all(ftsQuery) as FindingRow[];

    return rows.map(rowToFinding);
  }
}
