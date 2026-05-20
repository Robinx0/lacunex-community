import { describe, it, expect } from 'vitest';
import { openDatabase } from '../../src/main/db/connection';
import { ReportService } from '../../src/main/services/ReportService';
import { FindingService } from '../../src/main/services/FindingService';
import { TemplateService } from '../../src/main/services/TemplateService';
import { seedFindingTemplatesIfEmpty } from '../../src/main/lib/findingTemplates';

describe('finding extraction + FTS', () => {
  it('inserts a row in `findings` for every finding-typed block on save', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const findings = new FindingService(handle.db);
    const r = reports.create({ title: 'Test report' });

    reports.replaceBlocks(r.id, [
      {
        id: 'b_finding_1',
        type: 'finding',
        position: 0,
        attrs: {
          vulnId: 'TST-001',
          title: 'SQL Injection in login.php',
          severity: 'crit',
          cvss: '9.8',
          cwe: 'CWE-89',
          affected: '/login.php',
          status: 'open',
          body: 'The login endpoint is vulnerable to SQL injection via the username field.',
          pocSteps: ['Submit \' OR 1=1--', 'Observe bypass'],
          remediation: 'Use parameterized queries.',
        },
      },
      {
        id: 'b_p',
        type: 'paragraph',
        position: 1,
        content: 'just some prose',
      },
    ]);

    const rows = findings.search('login');
    expect(rows).toHaveLength(1);
    expect(rows[0].vulnId).toBe('TST-001');
    expect(rows[0].severity).toBe('crit');

    // Negative search
    expect(findings.search('zzzzzz')).toHaveLength(0);

    // Full content search hits remediation, body, and title
    expect(findings.search('parameterized')).toHaveLength(1);
    expect(findings.search('username')).toHaveLength(1);

    handle.close();
  });

  it('cascades the findings rows when a block is removed', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const findings = new FindingService(handle.db);
    const r = reports.create({ title: 'Cascade test' });

    reports.replaceBlocks(r.id, [
      {
        id: 'b_x',
        type: 'finding',
        position: 0,
        attrs: { vulnId: 'X-001', title: 'will be removed', severity: 'high' },
      },
    ]);
    expect(findings.search('removed')).toHaveLength(1);

    reports.replaceBlocks(r.id, [{ id: 'b_y', type: 'paragraph', position: 0, content: 'new' }]);
    expect(findings.search('removed')).toHaveLength(0);

    handle.close();
  });

  it('replaceBlocks is idempotent — same input twice does not duplicate rows', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const findings = new FindingService(handle.db);
    const r = reports.create({ title: 'Idempotency test' });

    const blocks = [
      { id: 'b_stable_1', type: 'paragraph' as const, position: 0, content: 'one' },
      {
        id: 'b_stable_2',
        type: 'finding' as const,
        position: 1,
        attrs: { vulnId: 'IDM-001', title: 'finding', severity: 'high' },
      },
    ];
    reports.replaceBlocks(r.id, blocks);
    reports.replaceBlocks(r.id, blocks);
    reports.replaceBlocks(r.id, blocks);

    const blockCount = handle.db
      .prepare('SELECT COUNT(*) AS c FROM blocks WHERE report_id = ?')
      .get(r.id) as { c: number };
    expect(blockCount.c).toBe(2);

    const findingRows = findings.search('finding');
    expect(findingRows).toHaveLength(1);
    expect(findingRows[0].vulnId).toBe('IDM-001');

    handle.close();
  });

  it('replaceBlocks deletes only blocks no longer in the new set', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const r = reports.create({ title: 'Diff test' });

    reports.replaceBlocks(r.id, [
      { id: 'b_keep', type: 'paragraph', position: 0, content: 'I survive' },
      { id: 'b_drop', type: 'paragraph', position: 1, content: 'I get removed' },
    ]);

    reports.replaceBlocks(r.id, [
      { id: 'b_keep', type: 'paragraph', position: 0, content: 'I survive' },
      { id: 'b_new', type: 'paragraph', position: 1, content: 'fresh' },
    ]);

    const rows = handle.db
      .prepare('SELECT id FROM blocks WHERE report_id = ? ORDER BY position')
      .all(r.id) as Array<{ id: string }>;
    expect(rows.map((x) => x.id)).toEqual(['b_keep', 'b_new']);

    handle.close();
  });

  it('applyBlockDiff upserts only the diffed blocks', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const r = reports.create({ title: 'Diff path' });

    reports.replaceBlocks(r.id, [
      { id: 'a', type: 'paragraph', position: 0, content: 'one' },
      { id: 'b', type: 'paragraph', position: 1, content: 'two' },
      { id: 'c', type: 'paragraph', position: 2, content: 'three' },
    ]);
    // Now apply a diff: edit 'b', remove 'a', add 'd'.
    reports.applyBlockDiff(
      r.id,
      [
        { id: 'b', type: 'paragraph', position: 0, content: 'TWO!' },
        { id: 'd', type: 'paragraph', position: 2, content: 'four' },
      ],
      ['a'],
    );

    const rows = handle.db
      .prepare('SELECT id, content FROM blocks WHERE report_id = ? ORDER BY position')
      .all(r.id) as Array<{ id: string; content: string }>;
    expect(rows.map((x) => x.id).sort()).toEqual(['b', 'c', 'd']);
    const b = rows.find((x) => x.id === 'b');
    expect(b?.content).toBe('TWO!');

    handle.close();
  });

  it('seedFindingTemplatesIfEmpty inserts the 5 built-ins', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const templates = new TemplateService(handle.db);

    seedFindingTemplatesIfEmpty(templates);
    const list = templates.list({ category: 'Findings' });
    expect(list).toHaveLength(5);
    expect(list.map((t) => t.name).sort()).toEqual(
      ['Auth Bypass', 'IDOR', 'SQL Injection', 'SSRF', 'Stored XSS'].sort(),
    );

    // Idempotent — re-running doesn't double-insert
    seedFindingTemplatesIfEmpty(templates);
    expect(templates.list({ category: 'Findings' })).toHaveLength(5);

    handle.close();
  });
});
