import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml, plainParagraph } from './_helpers';
import { parseTiptapNode, tiptapInlineToHtml } from '../util/tiptapHtml';

registerBlockRenderers('paragraph', {
  toMarkdown: (block) => [blockText(block)],
  toHtml: (block) => {
    const node = parseTiptapNode(block.content);
    const inner = node ? tiptapInlineToHtml(node.content) : escapeHtml(blockText(block));
    return `<p>${inner || '&nbsp;'}</p>`;
  },
  toConfluence: (block) => `<p>${escapeHtml(blockText(block))}</p>`,
  toWord: (block) => [plainParagraph(blockText(block))],
});
