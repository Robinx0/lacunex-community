import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
} from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';
import { SEVERITY_LABELS, STATUS_LABELS } from '../constants';
import type { Severity, FindingStatus } from '../types';

const sevLabel = (s: unknown) =>
  SEVERITY_LABELS[(typeof s === 'string' ? s : 'med') as Severity] ?? SEVERITY_LABELS.med;
const statusLabel = (s: unknown) =>
  STATUS_LABELS[(typeof s === 'string' ? s : 'open') as FindingStatus] ?? STATUS_LABELS.open;

registerBlockRenderers('finding', {
  toMarkdown: (block) => {
    const a = block.attrs ?? {};
    const lines: string[] = [
      `### ${a['vulnId'] ?? ''} — ${a['title'] ?? ''}`,
      '',
      `**Severity:** ${sevLabel(a['severity'])}  `,
      `**CVSS:** ${a['cvss'] ?? '—'}  `,
      `**CWE:** ${a['cwe'] ?? '—'}  `,
      `**Affected:** ${a['affected'] ?? '—'}  `,
      `**Status:** ${statusLabel(a['status'])}`,
      '',
      `**Description.** ${a['body'] ?? ''}`,
      '',
    ];
    const steps = (a['pocSteps'] as string[] | undefined) ?? [];
    if (steps.length > 0) {
      lines.push('**Proof-of-concept**', '');
      steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push('');
    }
    if (a['remediation']) lines.push(`**Remediation.** ${a['remediation'] as string}`);
    return lines;
  },

  toHtml: (block) => {
    const a = block.attrs ?? {};
    // Class names mirror `PaperFinding` so printStyles.ts rules apply.
    return `<div class="rb-paper-finding">
  <div class="rb-paper-finding__head">
    <span class="rb-paper-finding__id">${escapeHtml(String(a['vulnId'] ?? ''))}</span>
    <span class="rb-paper-finding__title">${escapeHtml(String(a['title'] ?? ''))}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;padding:1px 6px;border-radius:999px;background:var(--paper-tint);border:1px solid var(--paper-rule);">${sevLabel(a['severity'])}</span>
  </div>
  <dl class="rb-paper-finding__meta">
    <div><dt>CVSS</dt><dd>${escapeHtml(String(a['cvss'] ?? '—'))}</dd></div>
    <div><dt>CWE</dt><dd>${escapeHtml(String(a['cwe'] ?? '—'))}</dd></div>
    <div><dt>Affected</dt><dd>${escapeHtml(String(a['affected'] ?? '—'))}</dd></div>
    <div><dt>Status</dt><dd>${statusLabel(a['status'])}</dd></div>
  </dl>
  <p class="rb-paper-finding__body">${escapeHtml(String(a['body'] ?? ''))}</p>
</div>`;
  },

  toConfluence: (block) => {
    const a = block.attrs ?? {};
    return `<ac:structured-macro ac:name="panel"><ac:parameter ac:name="title">${escapeHtml(String(a['vulnId'] ?? ''))} — ${escapeHtml(String(a['title'] ?? ''))}</ac:parameter><ac:rich-text-body>
<table><tbody>
<tr><th>Severity</th><td>${sevLabel(a['severity'])}</td><th>CVSS</th><td>${escapeHtml(String(a['cvss'] ?? '—'))}</td></tr>
<tr><th>CWE</th><td>${escapeHtml(String(a['cwe'] ?? '—'))}</td><th>Status</th><td>${statusLabel(a['status'])}</td></tr>
<tr><th>Affected</th><td colspan="3">${escapeHtml(String(a['affected'] ?? '—'))}</td></tr>
</tbody></table>
<p><strong>Description.</strong> ${escapeHtml(String(a['body'] ?? ''))}</p>
<p><strong>Remediation.</strong> ${escapeHtml(String(a['remediation'] ?? ''))}</p>
</ac:rich-text-body></ac:structured-macro>`;
  },

  toWord: (block) => {
    const a = block.attrs ?? {};
    const out: Array<Paragraph | Table> = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: String(a['vulnId'] ?? ''), font: 'Consolas', color: '666666' }),
          new TextRun({ text: '  ' }),
          new TextRun({ text: String(a['title'] ?? ''), bold: true }),
        ],
      }),
    ];
    const row = (label: string, value: string) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph(value)],
          }),
        ],
      });
    out.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          row('Severity', sevLabel(a['severity'])),
          row('CVSS', String(a['cvss'] ?? '—')),
          row('CWE', String(a['cwe'] ?? '—')),
          row('Affected', String(a['affected'] ?? '—')),
          row('Status', statusLabel(a['status'])),
        ],
      }),
    );
    out.push(new Paragraph({ text: ' ' }));
    out.push(
      new Paragraph({
        children: [new TextRun({ text: 'Description. ', bold: true }), new TextRun(String(a['body'] ?? ''))],
      }),
    );
    const steps = (a['pocSteps'] as string[] | undefined) ?? [];
    if (steps.length > 0) {
      out.push(new Paragraph({ children: [new TextRun({ text: 'Proof-of-concept', bold: true })] }));
      steps.forEach((s, i) =>
        out.push(new Paragraph({ children: [new TextRun(`${i + 1}. ${s}`)], indent: { left: 360 } })),
      );
    }
    if (a['remediation']) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Remediation. ', bold: true }),
            new TextRun(String(a['remediation'])),
          ],
        }),
      );
    }
    out.push(new Paragraph({ text: ' ' }));
    return out;
  },
});
