import { Paragraph, TextRun } from 'docx';
import { registerBlockRenderers } from './registry';
import { blockText, escapeHtml } from './_helpers';
import { parseTiptapNode, tiptapListToHtml, tiptapInlineToHtml } from '../util/tiptapHtml';

for (const type of ['bullet_list', 'ordered_list'] as const) {
  registerBlockRenderers(type, {
    toMarkdown: (block) => {
      const root = parseTiptapNode(block.content);
      if (!root) return [blockText(block)];
      return tiptapListToMarkdown(root, 0);
    },
    toHtml: (block) => {
      const root = parseTiptapNode(block.content);
      if (!root) return `<p>${escapeHtml(blockText(block))}</p>`;
      return tiptapListToHtml(root);
    },
    toConfluence: (block) => {
      const root = parseTiptapNode(block.content);
      if (!root) return `<p>${escapeHtml(blockText(block))}</p>`;
      return tiptapListToHtml(root);
    },
    toWord: (block) => {
      const root = parseTiptapNode(block.content);
      if (!root) {
        return [new Paragraph({ children: [new TextRun(blockText(block))] })];
      }
      return tiptapListToWord(root, 0);
    },
  });
}

interface MdListNode {
  type: string;
  content?: MdListNode[];
}

function tiptapListToMarkdown(node: MdListNode, depth: number): string[] {
  const ordered = node.type === 'orderedList';
  const lines: string[] = [];
  const items = (node.content ?? []).filter((c) => c.type === 'listItem');
  items.forEach((item, idx) => {
    const indent = '  '.repeat(depth);
    const bullet = ordered ? `${idx + 1}.` : '-';
    const firstParagraph = item.content?.find((c) => c.type === 'paragraph');
    const text = firstParagraph ? plainInline(firstParagraph) : '';
    lines.push(`${indent}${bullet} ${text}`);
    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        lines.push(...tiptapListToMarkdown(child, depth + 1));
      }
    }
  });
  return lines;
}

interface InlineLike {
  type?: string;
  text?: string;
  content?: InlineLike[];
}

function plainInline(node: InlineLike): string {
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  return node.content.map(plainInline).join('');
}

// Bullet-prefixed indented paragraphs — avoids docx abstract-numbering definitions.
function tiptapListToWord(node: MdListNode, depth: number): Paragraph[] {
  const ordered = node.type === 'orderedList';
  const out: Paragraph[] = [];
  const items = (node.content ?? []).filter((c) => c.type === 'listItem');
  items.forEach((item, idx) => {
    const firstParagraph = item.content?.find((c) => c.type === 'paragraph');
    const text = firstParagraph ? plainInline(firstParagraph) : '';
    const bullet = ordered ? `${idx + 1}.` : '•';
    out.push(
      new Paragraph({
        indent: { left: 360 * depth + 200 },
        children: [new TextRun(`${bullet}  ${text}`)],
      }),
    );
    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        out.push(...tiptapListToWord(child, depth + 1));
      }
    }
  });
  return out;
}

export { tiptapInlineToHtml };
