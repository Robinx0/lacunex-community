import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml } from './_helpers';

registerBlockRenderers('quote', {
  toMarkdown: (block) => [`> ${blockText(block)}`],
  toHtml: (block) => `<blockquote>${escapeHtml(blockText(block))}</blockquote>`,
  toConfluence: (block) => `<blockquote><p>${escapeHtml(blockText(block))}</p></blockquote>`,
  toWord: (block) => [
    new Paragraph({
      children: [new TextRun({ text: blockText(block), italics: true })],
      indent: { left: 600 },
    }),
  ],
});
