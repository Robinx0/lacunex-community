import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';
import { SEVERITY_LABELS } from '../constants';
import type { Severity } from '../types';

function severityLabel(block: { attrs?: Record<string, unknown> }): string {
  const sev = block.attrs?.['severity'] as Severity | undefined;
  return sev && SEVERITY_LABELS[sev] ? SEVERITY_LABELS[sev] : '';
}

registerBlockRenderers('severity_badge', {
  toMarkdown: (block) => {
    const label = severityLabel(block);
    return label ? [`**[${label}]**`] : [];
  },
  toHtml: (block) => {
    const label = severityLabel(block);
    if (!label) return '';
    const sev = block.attrs?.['severity'] as Severity | undefined;
    return `<span class="severity-badge severity-${sev ?? 'info'}">${escapeHtml(label)}</span>`;
  },
  toConfluence: (block) => {
    const label = severityLabel(block);
    return label ? `<strong>[${escapeHtml(label)}]</strong>` : '';
  },
  toWord: (block) => {
    const label = severityLabel(block);
    if (!label) return [];
    return [
      new Paragraph({
        children: [new TextRun({ text: `[${label}]`, bold: true })],
      }),
    ];
  },
});
