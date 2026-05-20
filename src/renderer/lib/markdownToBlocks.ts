import type { Block } from '@shared/types';
import { newPrefixedId } from '@/lib/ids';

/**
 * Convert a markdown-ish string into a Block[] suitable for
 * `reports.update({ blocks })`. Line-based, intentionally minimal —
 * handles the common shape of a real markdown report (headings,
 * paragraphs, bullet / ordered lists) and falls through to plain
 * paragraphs for anything more exotic.
 *
 * Inline syntax (bold, italic, links, inline code) is NOT parsed —
 * those characters survive as literals in the resulting paragraph
 * text. Tiptap's input rules will rewrite them as the user starts
 * editing, so a `**bold**` import becomes a real bold mark the moment
 * the user touches that line. Acceptable v1 behaviour: lossless,
 * editable, no extra dependency.
 *
 * Code fences (``` blocks), tables, blockquotes, images, and
 * horizontal rules also fall through as plain paragraphs for now;
 * the user can convert via the slash menu after import.
 *
 * The fall-through-to-paragraph design means imports never fail or
 * lose content — at worst, structure is flattened and the user
 * re-applies it.
 */
export function markdownToBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  // List buffer: when we hit a sequence of `- foo` / `* foo` (bullet)
  // or `1. foo` (ordered) lines, we accumulate them into one list
  // block instead of one block per item.
  let listKind: 'bullet' | 'ordered' | null = null;
  let listItems: string[] = [];

  const flushList = (): void => {
    if (listKind === null || listItems.length === 0) {
      listKind = null;
      listItems = [];
      return;
    }
    blocks.push(
      listBlock(listKind, listItems, blocks.length),
    );
    listKind = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Blank line: end any open list, otherwise just a separator.
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Bullet item: `- text` or `* text`
    const bulletMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      if (listKind !== 'bullet') flushList();
      listKind = 'bullet';
      listItems.push(bulletMatch[1]);
      continue;
    }

    // Ordered item: `1. text` (any digits)
    const orderedMatch = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
      if (listKind !== 'ordered') flushList();
      listKind = 'ordered';
      listItems.push(orderedMatch[1]);
      continue;
    }

    // Anything else closes an open list before being added.
    flushList();

    // Heading: `#`, `##`, `###` — deeper levels collapse to h3.
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push(headingBlock(level, headingMatch[2], blocks.length));
      continue;
    }

    // Default: paragraph.
    blocks.push(paragraphBlock(line.trim(), blocks.length));
  }

  // Flush any trailing list.
  flushList();

  // An empty markdown file produces zero blocks. Tiptap requires at
  // least one — give it a single empty paragraph so the editor mounts
  // cleanly.
  if (blocks.length === 0) {
    blocks.push(paragraphBlock('', 0));
  }

  return blocks;
}

function paragraphBlock(text: string, position: number): Block {
  return {
    id: newPrefixedId('b'),
    type: 'paragraph',
    position,
    content: JSON.stringify(
      text === ''
        ? { type: 'paragraph' }
        : {
            type: 'paragraph',
            content: [{ type: 'text', text }],
          },
    ),
  };
}

function headingBlock(level: 1 | 2 | 3, text: string, position: number): Block {
  return {
    id: newPrefixedId('b'),
    type: level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3',
    position,
    content: JSON.stringify({
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text }],
    }),
  };
}

function listBlock(kind: 'bullet' | 'ordered', items: string[], position: number): Block {
  return {
    id: newPrefixedId('b'),
    type: kind === 'bullet' ? 'bullet_list' : 'ordered_list',
    position,
    content: JSON.stringify({
      type: kind === 'bullet' ? 'bulletList' : 'orderedList',
      content: items.map((t) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: t.length > 0 ? [{ type: 'text', text: t }] : undefined,
          },
        ],
      })),
    }),
  };
}
