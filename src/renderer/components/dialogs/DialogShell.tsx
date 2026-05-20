import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalA11y } from '@/hooks/useModalA11y';

export interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tone changes the icon color and the focus-ring on the primary button. */
  tone?: 'neutral' | 'destructive';
  icon?: ReactNode;
  /** Width preset. `compact` (360) for confirms, `regular` (480) for forms. */
  size?: 'compact' | 'regular';
  children: ReactNode;
  /** Optional footer slot — typically a row of action buttons. */
  footer?: ReactNode;
}

/**
 * Shared scaffolding for the small-overlay dialog family. Handles backdrop
 * click, Esc to close, body-scroll lock, and initial focus. The bigger
 * "modal" pattern (Export, Template Library) keeps its own structure;
 * this is just for confirmations and short forms.
 */
export function DialogShell({
  open,
  onClose,
  title,
  tone = 'neutral',
  icon,
  size = 'regular',
  children,
  footer,
}: DialogShellProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop',
          size === 'compact' ? 'w-[360px] max-w-[92vw]' : 'w-[480px] max-w-[92vw]',
        )}
      >
        <header className="flex items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          {icon && (
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded',
                tone === 'destructive'
                  ? 'bg-[var(--rb-red-bg)] text-[var(--rb-red)]'
                  : 'bg-[var(--rb-blue-bg)] text-[var(--rb-blue)]',
              )}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <h2 className="flex-1 text-sm font-semibold text-[var(--rb-text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 px-4 py-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
