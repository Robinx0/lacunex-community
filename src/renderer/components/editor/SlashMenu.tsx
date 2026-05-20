import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { SlashItem } from '@/lib/editor/slashItems';
import { cn } from '@/lib/utils';

export interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  query: string;
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
  close?: () => void;
}

/**
 * The slash-command palette. The host extension positions a wrapper div via
 * fixed coordinates; this component just renders the list and accepts arrow
 * keys + Enter through the imperative handle.
 */
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command, query },
  ref,
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
    close: () => setSelected(0),
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-3 text-xs text-[var(--rb-text-muted)] shadow-pop animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
        No matches for &ldquo;<span className="font-mono">/{query}</span>&rdquo;
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Slash command palette"
      className="max-h-[360px] overflow-y-auto rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-1 shadow-pop animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
    >
      {items.map((item, idx) => {
        const active = idx === selected;
        return (
          <button
            type="button"
            key={item.cmd}
            role="option"
            aria-selected={active}
            onMouseEnter={() => setSelected(idx)}
            onClick={() => command(item)}
            className={cn(
              'flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors',
              active
                ? 'bg-[var(--rb-bg-active)]'
                : 'hover:bg-[var(--rb-bg-hover)]',
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--rb-bg-active)] font-mono text-xs text-[var(--rb-text-secondary)]">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--rb-text-primary)]">
                {item.name}
              </span>
              <span className="block truncate text-xs text-[var(--rb-text-muted)]">
                {item.desc}
              </span>
            </span>
            {item.shortcut && (
              <span className="shrink-0 rounded border border-[var(--rb-border-subtle)] px-1.5 py-px font-mono text-[10px] text-[var(--rb-text-muted)]">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
