import { useEffect } from 'react';
import { Pencil, Eye, Send } from 'lucide-react';
import { useUiStore, type ComposeMode } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface ModeOption {
  id: ComposeMode;
  index: 1 | 2 | 3;
  label: string;
  Icon: typeof Pencil;
}

const MODES: ModeOption[] = [
  { id: 'compose', index: 1, label: 'Compose', Icon: Pencil },
  { id: 'review', index: 2, label: 'Review', Icon: Eye },
  { id: 'publish', index: 3, label: 'Publish', Icon: Send },
];

// Workflow phase stepper for the topbar. ⌘1 / ⌘2 / ⌘3 jump between
// phases. The editor surface is the same in every phase; the stepper is
// a soft cue (compose, review, publish) rather than three different UIs.
export function ModeStepper(): JSX.Element {
  const mode = useUiStore((s) => s.composeMode);
  const setMode = useUiStore((s) => s.setComposeMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '1') {
        e.preventDefault();
        setMode('compose');
      } else if (e.key === '2') {
        e.preventDefault();
        setMode('review');
      } else if (e.key === '3') {
        e.preventDefault();
        setMode('publish');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMode]);

  return (
    <div
      role="tablist"
      aria-label="Workflow phase"
      className="flex items-center gap-px rounded-lg border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-0.5"
    >
      {MODES.map((m) => {
        const active = m.id === mode;
        const Icon = m.Icon;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={active}
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-[var(--rb-bg-active)] text-[var(--rb-text-primary)] shadow-sm'
                : 'text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-secondary)]',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded font-mono text-[9px]',
                active
                  ? 'bg-[var(--rb-bg-elevated)] text-[var(--rb-text-secondary)]'
                  : 'text-[var(--rb-text-subtle)]',
              )}
              aria-hidden
            >
              {m.index}
            </span>
            <Icon className="h-3 w-3" aria-hidden />
            <span>{m.label}</span>
            <span className="ml-1 hidden font-mono text-[9px] text-[var(--rb-text-subtle)] sm:inline">
              ⌘{m.index}
            </span>
          </button>
        );
      })}
    </div>
  );
}
