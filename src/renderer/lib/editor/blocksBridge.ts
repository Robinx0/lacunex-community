import type { JSONContent } from '@tiptap/core';
import type { Block, BlockType } from '@shared/types';
import { djb2 } from '@shared/util/text';

/**
 * Maps a Tiptap node type (`paragraph` / `heading` / `bulletList` / etc.) to
 * our flat `BlockType` enum. The renderer's data model stores top-level
 * blocks only — a list is one block whose serialized content carries the
 * full nested item tree.
 */
export function tiptapTypeToBlockType(type: string, attrs?: Record<string, unknown>): BlockType {
  switch (type) {
    case 'paragraph':
      return 'paragraph';
    case 'heading': {
      const lvl = (attrs?.['level'] as number | undefined) ?? 1;
      if (lvl === 1) return 'heading_1';
      if (lvl === 2) return 'heading_2';
      return 'heading_3';
    }
    case 'bulletList':
      return 'bullet_list';
    case 'orderedList':
      return 'ordered_list';
    case 'codeBlock':
      return 'code_block';
    case 'blockquote':
      return 'quote';
    case 'horizontalRule':
      return 'divider';
    case 'finding':
      return 'finding';
    case 'callout':
      return 'callout';
    case 'screenshot':
      return 'screenshot';
    case 'pocSteps':
      return 'poc';
    case 'httpRequest':
      return 'http_request';
    default:
      return 'paragraph';
  }
}

export function blockToTiptapNode(block: Block): JSONContent {
  // If we stored the full node JSON, prefer that — it round-trips inline
  // formatting (bold/italic/links) and list nesting losslessly.
  if (block.content) {
    try {
      const parsed = JSON.parse(block.content) as JSONContent;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed;
    } catch {
      // fall through to the empty-shell case below
    }
  }
  switch (block.type) {
    case 'heading_1':
      return { type: 'heading', attrs: { level: 1 } };
    case 'heading_2':
      return { type: 'heading', attrs: { level: 2 } };
    case 'heading_3':
      return { type: 'heading', attrs: { level: 3 } };
    case 'bullet_list':
      return {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      };
    case 'ordered_list':
      return {
        type: 'orderedList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      };
    case 'code_block':
      return { type: 'codeBlock' };
    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph' }] };
    case 'divider':
      return { type: 'horizontalRule' };
    case 'finding':
      return { type: 'finding', attrs: { ...(block.attrs ?? {}) } };
    case 'callout':
      return {
        type: 'callout',
        attrs: { ...(block.attrs ?? {}) },
        content: [{ type: 'paragraph' }],
      };
    case 'screenshot':
      return { type: 'screenshot', attrs: { ...(block.attrs ?? {}) } };
    case 'poc':
      return { type: 'pocSteps', attrs: { ...(block.attrs ?? {}) } };
    case 'http_request':
      return { type: 'httpRequest', attrs: { ...(block.attrs ?? {}) } };
    default:
      return { type: 'paragraph' };
  }
}

export function blocksToTiptapDoc(blocks: Block[]): JSONContent {
  if (!blocks || blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  return { type: 'doc', content: sorted.map(blockToTiptapNode) };
}

/**
 * Generate a deterministic block ID from a Tiptap node's content + a
 * per-document occurrence counter for that exact content.
 *
 * Why position-independent: inserting a paragraph at the top of a 50-block
 * report previously renumbered every block's `position` → every block ID
 * changed → autosave diff treated the entire doc as a delete-and-reinsert.
 * Hashing by content alone keeps every untouched block's ID stable across
 * insertions; the `position` column still updates via the diff (a cheap
 * column-level UPDATE), but no row churn or FK breakage.
 *
 * Two identical paragraphs get distinct IDs via the `seen` counter — the
 * first occurrence of a content hash gets `_0`, the next `_1`, etc.
 * Reordering identical blocks swaps which is `_0` vs `_1`, but they remain
 * stable as a set.
 *
 * Findings keep an extra-stable id derived from `findingNodeId` (assigned
 * once per finding insertion in FindingView), so the FTS index never sees
 * a delete/insert cycle when the user reorders findings.
 */
function deterministicBlockId(
  node: JSONContent,
  contentJson: string,
  seen: Map<string, number>,
): string {
  if (node.type === 'finding') {
    const findingNodeId = (node.attrs as Record<string, unknown> | undefined)?.['findingNodeId'];
    if (typeof findingNodeId === 'string' && findingNodeId.length > 0) {
      return `b_f_${findingNodeId}`;
    }
  }
  const key = `${node.type ?? 'paragraph'}:${contentJson}`;
  const hash = djb2(key);
  const occurrence = seen.get(hash) ?? 0;
  seen.set(hash, occurrence + 1);
  return `b_${hash}_${occurrence}`;
}

export function tiptapDocToBlocks(doc: JSONContent): Block[] {
  const nodes = doc.content ?? [];
  const out: Block[] = new Array(nodes.length);
  const seen = new Map<string, number>();
  // Allocate inside the loop to avoid retained refs to the parent doc.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const type = tiptapTypeToBlockType(node.type ?? 'paragraph', node.attrs);
    const contentJson = JSON.stringify(node);
    out[i] = {
      id: deterministicBlockId(node, contentJson, seen),
      type,
      position: i,
      content: contentJson,
      ...(node.attrs ? { attrs: node.attrs as Record<string, unknown> } : {}),
    };
  }
  return out;
}

/**
 * Compare two block arrays for content equality (ignoring `id` and
 * `position`). Used by autosave to skip writes when nothing actually
 * changed (e.g. selection-only updates that fire onUpdate without a real
 * diff).
 */
export function blocksEqual(a: Block[], b: Block[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type) return false;
    if ((a[i].content ?? null) !== (b[i].content ?? null)) return false;
  }
  return true;
}

export interface BlockDiff {
  /** Blocks to insert or update (all those whose content/attrs/position changed). */
  upsert: Block[];
  /** IDs of blocks to delete (present in `prev`, gone from `next`). */
  delete: string[];
}

/**
 * Compute the minimal block diff between two snapshots. Block IDs come
 * from the deterministic generator in `tiptapDocToBlocks`, so an
 * unchanged paragraph keeps the same ID across saves and won't appear
 * in the upsert set even though the JSON references differ.
 *
 * Net result: a single-character edit produces an upsert of one block.
 * Compare to the prior `blocks` payload that re-serialized N blocks per
 * keystroke.
 */
export function diffBlocks(prev: Block[] | null, next: Block[]): BlockDiff {
  const prevSafe = prev ?? [];
  // Index prev by ID. Position is part of identity for the diff because
  // a moved block needs an upsert too (its `position` column changes).
  const prevById = new Map<string, Block>();
  for (const b of prevSafe) prevById.set(b.id, b);

  const upsert: Block[] = [];
  const seen = new Set<string>();
  for (const b of next) {
    seen.add(b.id);
    const old = prevById.get(b.id);
    if (
      !old ||
      old.type !== b.type ||
      (old.content ?? null) !== (b.content ?? null) ||
      old.position !== b.position ||
      // Cheap attrs comparison via JSON — finding/poc/screenshot mutations
      // surface here. The serialized form is what we'd write to the DB
      // anyway, so re-stringifying is free.
      JSON.stringify(old.attrs ?? null) !== JSON.stringify(b.attrs ?? null)
    ) {
      upsert.push(b);
    }
  }
  const removed: string[] = [];
  for (const b of prevSafe) if (!seen.has(b.id)) removed.push(b.id);
  return { upsert, delete: removed };
}
