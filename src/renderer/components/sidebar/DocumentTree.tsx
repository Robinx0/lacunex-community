import { memo, useMemo } from 'react';
import { Diamond, FileText, Hash, Circle } from 'lucide-react';
import type { Block } from '@shared/types';
import { extractTiptapText } from '@shared/util/text';
import { compactWordCount, countWords } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface DocumentTreeProps {
  blocks: Block[];
}

interface TreeEntry {
  blockId: string;
  label: string;
  level: 0 | 1 | 2;
  type: 'h1' | 'h2' | 'h3';
  /** Word count for this section (heading + everything until next same-or-higher heading). */
  words: number;
  /** Number of findings in this section. */
  findingCount: number;
}

function headingLevel(type: Block['type']): 0 | 1 | 2 | null {
  if (type === 'heading_1') return 0;
  if (type === 'heading_2') return 1;
  if (type === 'heading_3') return 2;
  return null;
}

/**
 * Build a flat outline from headings, scoping the word and finding counts
 * to "this heading until the next same-or-higher heading." Findings are
 * counted per section so the user sees, e.g., "Findings · 9" inline.
 *
 * Single forward pass, O(N): a stack of currently-open heading entries
 * accumulates counts for each non-heading block. When a new heading
 * appears we pop everything at-or-below its level and push the new entry.
 * Replaces the prior O(N²) re-scan that ran on every keystroke.
 */
function buildTree(blocks: Block[]): TreeEntry[] {
  const out: TreeEntry[] = [];
  const stack: TreeEntry[] = [];

  for (const b of blocks) {
    const lvl = headingLevel(b.type);
    if (lvl !== null) {
      // Close any sections at this level or deeper.
      while (stack.length > 0 && stack[stack.length - 1].level >= lvl) {
        stack.pop();
      }
      const entry: TreeEntry = {
        blockId: b.id,
        label: extractTiptapText(b.content) || '(untitled)',
        level: lvl,
        type: lvl === 0 ? 'h1' : lvl === 1 ? 'h2' : 'h3',
        words: countWords(extractTiptapText(b.content)),
        findingCount: 0,
      };
      out.push(entry);
      stack.push(entry);
      continue;
    }

    // Non-heading block — credit its words/findings to every open
    // ancestor heading on the stack so each section's counts roll up.
    if (stack.length === 0) continue;

    let blockWords = 0;
    let isFinding = false;
    if (b.type === 'finding') {
      isFinding = true;
      const a = b.attrs ?? {};
      blockWords = countWords(String(a['title'] ?? '')) + countWords(String(a['body'] ?? ''));
    } else if (b.content) {
      blockWords = countWords(extractTiptapText(b.content));
    }
    for (const open of stack) {
      open.words += blockWords;
      if (isFinding) open.findingCount += 1;
    }
  }

  return out;
}

/**
 * Outline panel — heading-only; word count and findings count surface to
 * the right of each entry. Memoized so an unrelated keystroke doesn't
 * recompute the tree.
 */
export const DocumentTree = memo(function DocumentTree({
  blocks,
}: DocumentTreeProps): JSX.Element {
  const tree = useMemo(() => buildTree(blocks), [blocks]);

  if (tree.length === 0) {
    return (
      <div className="rounded border border-dashed border-[var(--rb-border-subtle)] p-3 text-center text-[10px] text-[var(--rb-text-muted)]">
        <FileText className="mx-auto mb-1 h-4 w-4 opacity-60" aria-hidden />
        Outline appears as you add headings.
      </div>
    );
  }

  return (
    <nav aria-label="Document outline" className="flex flex-col gap-px">
      {tree.map((entry) => (
        <OutlineRow key={entry.blockId} entry={entry} />
      ))}
    </nav>
  );
});

const OutlineRow = memo(function OutlineRow({ entry }: { entry: TreeEntry }): JSX.Element {
  const Icon = entry.type === 'h1' ? Diamond : entry.type === 'h2' ? Hash : Circle;
  const isFindingsSection = entry.findingCount > 0;
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById(`block-${entry.blockId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
      className="group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-[var(--rb-bg-hover)] focus:outline-none focus-visible:bg-[var(--rb-bg-hover)]"
      style={{ paddingLeft: `${6 + entry.level * 12}px` }}
    >
      <Icon
        className={cn(
          'h-3 w-3 shrink-0',
          entry.level === 0 ? 'text-[var(--rb-blue)]' : 'text-[var(--rb-text-muted)]',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[12px]',
          entry.level === 0
            ? 'font-medium text-[var(--rb-text-primary)]'
            : 'text-[var(--rb-text-secondary)]',
        )}
      >
        {entry.label}
      </span>
      <span
        className={cn(
          'rb-mono rb-tabular shrink-0 text-[9px]',
          isFindingsSection
            ? 'rounded bg-[var(--rb-bg-active)] px-1 py-px text-[var(--rb-text-secondary)]'
            : 'text-[var(--rb-text-subtle)]',
        )}
        title={isFindingsSection ? `${entry.findingCount} findings` : `${entry.words} words`}
      >
        {isFindingsSection ? entry.findingCount : compactWordCount(entry.words)}
      </span>
    </button>
  );
});
