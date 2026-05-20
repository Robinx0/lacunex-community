import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { Report, ReportMeta } from '@shared/types';
import { rendersFor } from '@shared/blocks';
import { buildToc } from '@shared/util/toc';

// Build a Word document from the report. Per-block translation lives in
// the block registry (src/shared/blocks/<type>.ts); this module only
// sets up the document chrome (cover page, TOC, sections) and packs
// the .docx archive.
export async function buildWordDocument(report: Report): Promise<Buffer> {
  const m = report.meta;

  const children: Paragraph[] = [
    ...buildCoverParagraphs(m),
  ];

  if (report.tocEnabled) {
    const toc = buildToc(report.blocks);
    if (toc.length > 0) {
      // Force a page break here so the TOC starts on its own page,
      // separate from the cover. When the TOC is disabled, the same
      // break is applied to the first body block instead (below).
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          children: [new TextRun({ text: 'Table of Contents', bold: true })],
        }),
      );
      for (const e of toc) {
        children.push(
          new Paragraph({
            indent: { left: (e.level - 1) * 360 },
            children: [new TextRun({ text: e.text })],
          }),
        );
      }
      children.push(new Paragraph({ text: ' ' }));
    }
  }

  // If there's no TOC, emit a page-break paragraph so the cover still
  // occupies its own page before the body content begins. When the TOC
  // is enabled, its heading already carries pageBreakBefore.
  if (!report.tocEnabled && report.blocks.length > 0) {
    children.push(new Paragraph({ children: [], pageBreakBefore: true }));
  }

  for (const block of report.blocks) {
    const blockParas = rendersFor(block.type).toWord(block) as Paragraph[];
    children.push(...blockParas);
  }

  const doc = new Document({
    creator: 'Lacunex Reports',
    title: m.project || 'Report',
    description: m.client ? `Report for ${m.client}` : 'Report',
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

// First-page cover. Uses centered headings and a small key/value block
// instead of trying to replicate the styled cover designs visually:
// Word's layout primitives can't reproduce the SVG covers, but the
// information they carry maps cleanly onto a typeset title page.
function buildCoverParagraphs(m: ReportMeta): Paragraph[] {
  const paras: Paragraph[] = [];

  // Top padding so the title sits a few lines down the page.
  for (let i = 0; i < 6; i++) {
    paras.push(new Paragraph({ text: '' }));
  }

  paras.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: m.project || 'Report', bold: true })],
    }),
  );

  if (m.engagementType?.trim()) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: m.engagementType.trim(),
            italics: true,
            color: '666666',
            size: 28, // half-points, so 14pt
          }),
        ],
      }),
    );
  }

  // Visual gap between the title block and the metadata block.
  for (let i = 0; i < 4; i++) {
    paras.push(new Paragraph({ text: '' }));
  }

  const rows: Array<[string, string]> = [];
  pushIf(rows, 'Client', m.client);
  pushIf(rows, 'Document ID', m.docId);
  pushIf(rows, 'Version', m.reportVersion ? `v${m.reportVersion.trim()}` : '');
  pushIf(rows, 'Period', formatPeriod(m.startDate, m.endDate));
  pushIf(rows, 'Authors', m.authors);
  pushIf(rows, 'Methodology', m.methodology);

  for (const [label, value] of rows) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${label}: `, color: '888888' }),
          new TextRun({ text: value, bold: true }),
        ],
      }),
    );
  }

  // Push the classification badge near the bottom of the cover page.
  for (let i = 0; i < 8; i++) {
    paras.push(new Paragraph({ text: '' }));
  }

  if (m.classification?.trim()) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: m.classification.trim().toUpperCase(),
            bold: true,
            color: 'c0392b',
            size: 22, // 11pt
          }),
        ],
      }),
    );
  }

  return paras;
}

function pushIf(rows: Array<[string, string]>, label: string, value: string | undefined | null): void {
  const v = (value ?? '').trim();
  if (v) rows.push([label, v]);
}

function formatPeriod(start: string, end: string): string {
  const s = start?.trim();
  const e = end?.trim();
  if (s && e) return `${s} — ${e}`;
  return s || e || '';
}

