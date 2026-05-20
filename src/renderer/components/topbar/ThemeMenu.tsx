import { useEffect, useRef } from 'react';
import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { editorThemes, type EditorThemeId } from '@/lib/themes/editorThemes';
import { cn } from '@/lib/utils';

export interface ThemeMenuProps {
  open: boolean;
  theme: EditorThemeId;
  onChange: (id: EditorThemeId) => void;
  onClose: () => void;
  onToggle: () => void;
}

/**
 * Click-outside-aware dropdown listing the 8 editor themes. Renders a fixed
 * panel below the trigger.
 */
export function ThemeMenu({
  open,
  theme,
  onChange,
  onClose,
  onToggle,
}: ThemeMenuProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        size="sm"
        variant="ghost"
        // Stop the mousedown from reaching the document-level listener; on
        // browsers where the listener fires before React's click bubbles,
        // an unprotected click on the trigger would close-then-reopen the
        // menu, producing a visible flicker.
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Palette className="h-3.5 w-3.5" />
        Theme
      </Button>
      {open && (
        <div
          role="listbox"
          aria-label="Editor theme"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[280px] rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-1 shadow-pop"
        >
          {editorThemes.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                type="button"
                key={t.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(t.id);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors hover:bg-[var(--rb-bg-hover)]',
                  selected && 'bg-[var(--rb-bg-active)]',
                )}
              >
                <span
                  className="flex h-7 w-12 shrink-0 overflow-hidden rounded border border-[var(--rb-border-subtle)]"
                  aria-hidden
                >
                  {t.swatches.map((swatch, i) => (
                    <span key={i} className="h-full flex-1" style={{ background: swatch }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--rb-text-primary)]">
                    {t.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--rb-text-muted)]">
                    {t.tagline}
                  </span>
                </span>
                {selected && <Check className="h-3.5 w-3.5 text-[var(--rb-blue)]" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
