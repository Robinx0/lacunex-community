import { describe, it, expect } from 'vitest';
import {
  blocksToTiptapDoc,
  tiptapDocToBlocks,
  blocksEqual,
  diffBlocks,
} from '../../src/renderer/lib/editor/blocksBridge';
import type { Block } from '../../src/shared/types';

describe('blocksBridge', () => {
  it('blocksToTiptapDoc produces an empty paragraph for empty input', () => {
    const doc = blocksToTiptapDoc([]);
    expect(doc.type).toBe('doc');
    expect(doc.content).toEqual([{ type: 'paragraph' }]);
  });

  it('round-trips heading + paragraph + finding', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'heading_1',
        position: 0,
        content:
          '{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]}',
      },
      {
        id: 'b2',
        type: 'paragraph',
        position: 1,
        content: '{"type":"paragraph","content":[{"type":"text","text":"Body"}]}',
      },
      {
        id: 'b3',
        type: 'finding',
        position: 2,
        attrs: { vulnId: 'X-001', title: 'Finding A', severity: 'crit' },
      },
    ];
    const doc = blocksToTiptapDoc(blocks);
    expect(doc.content).toHaveLength(3);
    expect(doc.content?.[0].type).toBe('heading');
    expect(doc.content?.[2].type).toBe('finding');

    const back = tiptapDocToBlocks(doc);
    expect(back).toHaveLength(3);
    expect(back[0].type).toBe('heading_1');
    expect(back[1].type).toBe('paragraph');
    expect(back[2].type).toBe('finding');
    // Block IDs are regenerated on each save so we can't compare them.
    expect(back[0].content).toContain('"text":"Title"');
  });

  it('blocksEqual ignores ids and position-renumbering', () => {
    const a: Block[] = [{ id: 'a1', type: 'paragraph', position: 0, content: 'X' }];
    const b: Block[] = [{ id: 'b9', type: 'paragraph', position: 5, content: 'X' }];
    expect(blocksEqual(a, b)).toBe(true);

    const c: Block[] = [{ id: 'c1', type: 'paragraph', position: 0, content: 'Y' }];
    expect(blocksEqual(a, c)).toBe(false);
  });

  it('preserves attrs on round-trip', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'callout',
        position: 0,
        content:
          '{"type":"callout","attrs":{"kind":"warn","label":"Caution"},"content":[{"type":"paragraph"}]}',
      },
    ];
    const doc = blocksToTiptapDoc(blocks);
    const node = doc.content?.[0];
    expect(node?.attrs).toEqual({ kind: 'warn', label: 'Caution' });
  });

  it('block IDs are deterministic — unchanged blocks keep their IDs across saves', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        position: 0,
        content: '{"type":"paragraph","content":[{"type":"text","text":"unchanged"}]}',
      },
      {
        id: 'b2',
        type: 'paragraph',
        position: 1,
        content: '{"type":"paragraph","content":[{"type":"text","text":"original"}]}',
      },
    ];
    const docBefore = blocksToTiptapDoc(blocks);
    const after1 = tiptapDocToBlocks(docBefore);

    // Same input again → same IDs (deterministic).
    const after2 = tiptapDocToBlocks(docBefore);
    expect(after2[0].id).toBe(after1[0].id);
    expect(after2[1].id).toBe(after1[1].id);

    // Mutate the second block's content. The first block's ID must NOT
    // change, the second's must.
    const mutated = {
      ...docBefore,
      content: [
        docBefore.content![0],
        { type: 'paragraph', content: [{ type: 'text', text: 'edited' }] },
      ],
    };
    const after3 = tiptapDocToBlocks(mutated);
    expect(after3[0].id).toBe(after1[0].id); // first block id stable
    expect(after3[1].id).not.toBe(after1[1].id); // second block id changed
  });

  it('finding blocks key their ID from findingNodeId for FTS stability', () => {
    const findingNodeId = 'fn_test_abc';
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'finding',
        position: 0,
        attrs: { findingNodeId, vulnId: 'X-001', title: 'Original' },
      },
    ];
    const after1 = tiptapDocToBlocks(blocksToTiptapDoc(blocks));

    // Edit a non-id attribute (severity). Block ID must remain stable
    // because findingNodeId is unchanged.
    const blocks2: Block[] = [
      {
        ...blocks[0],
        attrs: { ...blocks[0].attrs, severity: 'high' },
      },
    ];
    const after2 = tiptapDocToBlocks(blocksToTiptapDoc(blocks2));
    expect(after2[0].id).toBe(after1[0].id);
    expect(after1[0].id).toContain(findingNodeId);
  });

  it('diffBlocks emits empty diff for identical input', () => {
    const blocks: Block[] = [
      { id: 'a', type: 'paragraph', position: 0, content: 'one' },
      { id: 'b', type: 'paragraph', position: 1, content: 'two' },
    ];
    const diff = diffBlocks(blocks, blocks);
    expect(diff.upsert).toEqual([]);
    expect(diff.delete).toEqual([]);
  });

  it('diffBlocks emits a single upsert when one block changes', () => {
    const prev: Block[] = [
      { id: 'a', type: 'paragraph', position: 0, content: 'one' },
      { id: 'b', type: 'paragraph', position: 1, content: 'two' },
    ];
    const next: Block[] = [
      { id: 'a', type: 'paragraph', position: 0, content: 'one' },
      { id: 'b', type: 'paragraph', position: 1, content: 'TWO!' },
    ];
    const diff = diffBlocks(prev, next);
    expect(diff.upsert).toHaveLength(1);
    expect(diff.upsert[0].id).toBe('b');
    expect(diff.delete).toEqual([]);
  });

  it('diffBlocks records additions, deletions, and position changes', () => {
    const prev: Block[] = [
      { id: 'a', type: 'paragraph', position: 0, content: 'one' },
      { id: 'b', type: 'paragraph', position: 1, content: 'two' },
    ];
    const next: Block[] = [
      // 'a' deleted
      { id: 'b', type: 'paragraph', position: 0, content: 'two' }, // moved up
      { id: 'c', type: 'paragraph', position: 1, content: 'three' }, // new
    ];
    const diff = diffBlocks(prev, next);
    expect(diff.delete).toEqual(['a']);
    // 'b' moved → upsert; 'c' is new → upsert
    expect(diff.upsert.map((b) => b.id).sort()).toEqual(['b', 'c']);
  });

  it('diffBlocks treats null prev as empty', () => {
    const next: Block[] = [{ id: 'a', type: 'paragraph', position: 0, content: 'x' }];
    const diff = diffBlocks(null, next);
    expect(diff.upsert).toHaveLength(1);
    expect(diff.delete).toEqual([]);
  });
});
