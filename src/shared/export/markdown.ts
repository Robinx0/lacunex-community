import type { Report } from '@shared/types';
import { rendersFor } from '@shared/blocks';
import { buildToc } from '@shared/util/toc';

export function blocksToMarkdown(report: Report): string {
  const m = report.meta;
  const lines: string[] = [
    `# ${m.project}`,
    '',
    `**Client:** ${m.client}`,
    `**Document ID:** ${m.docId}`,
    `**Classification:** ${m.classification}`,
    `**Version:** ${m.reportVersion}`,
    `**Period:** ${m.startDate} — ${m.endDate}`,
    `**Authors:** ${m.authors}`,
    `**Methodology:** ${m.methodology}`,
    '',
    '---',
    '',
  ];

  if (report.tocEnabled) {
    const toc = buildToc(report.blocks);
    if (toc.length > 0) {
      lines.push('## Table of Contents', '');
      for (const e of toc) {
        const indent = '  '.repeat(e.level - 1);
        lines.push(`${indent}- [${e.text}](#${e.anchor})`);
      }
      lines.push('', '---', '');
    }
  }

  for (const block of report.blocks) {
    lines.push(...rendersFor(block.type).toMarkdown(block));
    lines.push('');
  }

  return lines.join('\n');
}
