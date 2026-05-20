import type { Editor, JSONContent } from '@tiptap/core';
import type { Block, Template } from '@shared/types';
import { blockToTiptapNode } from './blocksBridge';
import { newPrefixedId } from '@/lib/ids';

const newId = newPrefixedId;

// Walks the editor doc to pick the next vulnId for a new finding.
// Prefix comes from the most-recent existing finding (default ACME);
// counter is max(existing) + 1, zero-padded to 3.
function nextVulnIdGenerator(editor: Editor): { prefix: string; nextNumber: () => string } {
  const json = editor.getJSON();
  const findings = (json.content ?? []).filter((n) => n.type === 'finding');
  const last = findings[findings.length - 1]?.attrs?.['vulnId'] as string | undefined;
  const m = last && /^([A-Z][A-Z0-9-]*)-(\d+)$/.exec(last);
  const prefix = m ? m[1] : 'ACME';
  let max = findings.reduce((mx, f) => {
    const fm = /-(\d+)$/.exec(String(f.attrs?.['vulnId'] ?? ''));
    return fm ? Math.max(mx, Number(fm[1])) : mx;
  }, 0);
  return {
    prefix,
    nextNumber: () => {
      max += 1;
      return `${prefix}-${String(max).padStart(3, '0')}`;
    },
  };
}

export interface InsertTemplateOptions {
  /** Replaces the slash trigger range when inserting. */
  replaceRange?: { from: number; to: number };
}

/**
 * Insert a saved template into the editor. Each cloned block gets a fresh
 * findingNodeId / id; finding-typed blocks have their vulnId renumbered
 * against the current report's existing findings.
 */
export function insertTemplate(
  editor: Editor,
  template: Template,
  opts: InsertTemplateOptions = {},
): void {
  const { nextNumber } = nextVulnIdGenerator(editor);

  const nodes: JSONContent[] = template.blocks.map((block) => {
    const cloned: Block = {
      ...block,
      id: newId('b'),
      ...(block.attrs ? { attrs: { ...block.attrs } } : {}),
    };
    if (cloned.type === 'finding') {
      cloned.attrs = {
        ...(cloned.attrs ?? {}),
        vulnId: nextNumber(),
        findingNodeId: newId('fn'),
      };
    }
    return blockToTiptapNode(cloned);
  });

  let chain = editor.chain().focus();
  if (opts.replaceRange) {
    chain = chain.deleteRange(opts.replaceRange);
  }
  chain.insertContent(nodes).run();
}
