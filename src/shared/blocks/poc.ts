import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { escapeHtml } from './_helpers';

const stepsOf = (block: { attrs?: Record<string, unknown> }): string[] =>
  Array.isArray(block.attrs?.['steps']) ? (block.attrs!['steps'] as string[]) : [];

registerBlockRenderers('poc', {
  toMarkdown: (block) => stepsOf(block).map((s, i) => `${i + 1}. ${s}`),
  toHtml: (block) =>
    `<ol class="poc">${stepsOf(block)
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('')}</ol>`,
  toConfluence: (block) =>
    `<ol>${stepsOf(block).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`,
  toWord: (block) =>
    stepsOf(block).map(
      (s, i) =>
        new Paragraph({ children: [new TextRun(`${i + 1}. ${s}`)], indent: { left: 360 } }),
    ),
});
