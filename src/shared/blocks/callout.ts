import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml } from './_helpers';

const CONFLUENCE_MACRO: Record<string, string> = {
  info: 'info',
  warn: 'note',
  danger: 'warning',
  success: 'tip',
};

registerBlockRenderers('callout', {
  toMarkdown: (block) => {
    const label = (block.attrs?.['label'] as string | undefined) ?? 'Note';
    return [`> **${label}:** ${blockText(block) || ''}`];
  },
  toHtml: (block) => {
    const label = escapeHtml((block.attrs?.['label'] as string | undefined) ?? 'Note');
    return `<div class="rb-paper-callout"><strong>${label}</strong><span>${escapeHtml(blockText(block))}</span></div>`;
  },
  toConfluence: (block) => {
    const kind = (block.attrs?.['kind'] as string | undefined) ?? 'info';
    const macro = CONFLUENCE_MACRO[kind] ?? 'info';
    const label = escapeHtml((block.attrs?.['label'] as string | undefined) ?? 'Note');
    return `<ac:structured-macro ac:name="${macro}"><ac:parameter ac:name="title">${label}</ac:parameter><ac:rich-text-body><p>${escapeHtml(blockText(block))}</p></ac:rich-text-body></ac:structured-macro>`;
  },
  toWord: (block) => {
    const label = (block.attrs?.['label'] as string | undefined) ?? 'Note';
    return [
      new Paragraph({
        children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(blockText(block))],
        shading: { fill: 'EFF6FF', type: 'clear', color: 'auto' },
      }),
    ];
  },
});
