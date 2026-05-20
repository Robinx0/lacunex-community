import { Paragraph, HeadingLevel } from 'docx';
import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml } from './_helpers';

const LEVEL = { heading_1: 1, heading_2: 2, heading_3: 3 } as const;
const DOCX_LEVEL = {
  heading_1: HeadingLevel.HEADING_1,
  heading_2: HeadingLevel.HEADING_2,
  heading_3: HeadingLevel.HEADING_3,
} as const;

(Object.keys(LEVEL) as (keyof typeof LEVEL)[]).forEach((type) => {
  const level = LEVEL[type];
  registerBlockRenderers(type, {
    toMarkdown: (block) => [`${'#'.repeat(level)} ${blockText(block)}`],
    // `id="block-<id>"` anchors the auto-generated TOC; matches PaperPage.
    toHtml: (block) =>
      `<h${level} id="block-${escapeHtml(block.id)}">${escapeHtml(blockText(block))}</h${level}>`,
    toConfluence: (block) => `<h${level}>${escapeHtml(blockText(block))}</h${level}>`,
    toWord: (block) => [new Paragraph({ text: blockText(block), heading: DOCX_LEVEL[type] })],
  });
});
