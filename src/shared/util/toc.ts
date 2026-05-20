import type { Block } from '../types';
import { extractTiptapText, slugify } from './text';

export interface TocEntry {
  /** ID of the source heading block — used as the anchor target. */
  blockId: string;
  /** Slugified anchor — stable across reloads so PDF/HTML cross-refs stick. */
  anchor: string;
  /** 1, 2, or 3 — matches heading_1 / heading_2 / heading_3. */
  level: 1 | 2 | 3;
  /** Plain text content of the heading. */
  text: string;
}

const HEADING_LEVEL: Record<string, 1 | 2 | 3> = {
  heading_1: 1,
  heading_2: 2,
  heading_3: 3,
};

/**
 * Extract a Table of Contents from a block list. Walks blocks in
 * display order, pulls heading_1 / heading_2 / heading_3 text, and
 * produces a flat list of entries. Consumers (preview, HTML / Markdown
 * / Word exporters) can render this as nested or flat depending on
 * their layout needs.
 *
 * Skips empty headings — a placeholder "Heading" left over from the
 * editor placeholder shouldn't pollute the TOC.
 */
export function buildToc(blocks: Block[]): TocEntry[] {
  const entries: TocEntry[] = [];
  const seenSlugs = new Map<string, number>();

  for (const block of blocks) {
    const level = HEADING_LEVEL[block.type];
    if (!level) continue;
    const text = extractTiptapText(block.content).trim();
    if (!text) continue;

    // Disambiguate duplicate headings — "Service Enumeration" appears
    // once per target in the OSCP template, so the slug needs a suffix
    // or anchors collide and only the first one is reachable.
    const base = slugify(text);
    const count = (seenSlugs.get(base) ?? 0) + 1;
    seenSlugs.set(base, count);
    const anchor = count === 1 ? base : `${base}-${count}`;

    entries.push({ blockId: block.id, anchor, level, text });
  }

  return entries;
}
