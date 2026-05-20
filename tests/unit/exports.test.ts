import { describe, it, expect } from 'vitest';
import { renderReportHtml } from '../../src/shared/export/html';
import { blocksToMarkdown } from '../../src/shared/export/markdown';
import { buildWordDocument } from '../../src/main/export/word';
import type { Report } from '../../src/shared/types';

const SAMPLE: Report = {
  id: 'r_test',
  title: 'Test report',
  meta: {
    project: 'Test report',
    client: 'Acme',
    docId: 'X-001',
    classification: 'Confidential',
    reportVersion: '1.0',
    engagementType: 'External pentest',
    methodology: 'OSSTMM 3',
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    authors: 'I. Montasir',
    reviewers: 'S. Park',
    distribution: 'CTO',
    scope: [{ type: 'Domain', value: 'app.example.com', tagClass: 'blue' }],
    outOfScope: 'Production DB',
  },
  blocks: [
    { id: 'b1', type: 'heading_1', position: 0, content: '{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Executive Summary"}]}' },
    { id: 'b2', type: 'paragraph', position: 1, content: '{"type":"paragraph","content":[{"type":"text","text":"Acme retained us for a quick external test."}]}' },
    {
      id: 'b3',
      type: 'finding',
      position: 2,
      attrs: {
        vulnId: 'ACME-001',
        title: 'SQL Injection in /login',
        severity: 'crit',
        cvss: '9.8',
        cwe: 'CWE-89',
        affected: '/login',
        status: 'open',
        body: 'Concatenated SQL allows authentication bypass and RCE.',
        pocSteps: ["Submit ' OR 1=1--", 'Observe bypass'],
        remediation: 'Parameterize queries.',
      },
    },
  ],
  coverId: 'blackops',
  customCover: { name: 'Custom', html: '', css: '', js: '' },
  reportTheme: 'dark',
  reportAccent: '#62d4f5',
  coverOptions: { logoDataUrl: null, logoSize: 0.18, textScale: 1, palette: null },
  tocEnabled: false,
  createdAt: 0,
  updatedAt: 0,
  archived: false,
};

describe('export formats', () => {
  it('HTML — produces a non-empty document containing the project + finding', () => {
    const html = renderReportHtml(SAMPLE);
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Test report');
    expect(html).toContain('ACME-001');
    expect(html).toContain('SQL Injection in /login');
  });

  it('Markdown — heading + finding meta + remediation', () => {
    const md = blocksToMarkdown(SAMPLE);
    expect(md).toContain('# Test report');
    expect(md).toContain('### ACME-001 — SQL Injection in /login');
    expect(md).toContain('**Severity:** Critical');
    expect(md).toContain('Parameterize queries.');
  });

  it('Markdown — output matches snapshot', () => {
    expect(blocksToMarkdown(SAMPLE)).toMatchSnapshot();
  });

  it('HTML — body fragment shape is stable across runs', () => {
    // Snapshot only the inner block layout (skip the cover + meta header
    // since those embed the whole CSS string and a 600-line snapshot is
    // brittle). Pull out everything between <main> tags.
    const html = renderReportHtml(SAMPLE, { includeCover: false });
    const m = /<main class="page">[\s\S]*?<\/main>/.exec(html);
    expect(m?.[0]).toMatchSnapshot();
  });

  it('Word — produces a non-empty .docx Buffer', async () => {
    const buf = await buildWordDocument(SAMPLE);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBeGreaterThan(2000);
    // .docx files are zip archives — check for the zip magic bytes
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
  });
});
