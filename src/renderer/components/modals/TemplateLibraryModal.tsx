import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Trash2, BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplateList, useDeleteTemplate } from '@/hooks/useTemplates';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import type { Template } from '@shared/types';
import { cn } from '@/lib/utils';

export interface TemplateLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (template: Template) => void;
}

const ALL_CATEGORIES_KEY = '__all__';

export function TemplateLibraryModal({
  open,
  onClose,
  onInsert,
}: TemplateLibraryModalProps): JSX.Element | null {
  const list = useTemplateList();
  const del = useDeleteTemplate();
  const [category, setCategory] = useState<string>(ALL_CATEGORIES_KEY);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of list.data ?? []) set.add(t.category);
    return Array.from(set).sort();
  }, [list.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((t) => {
      if (category !== ALL_CATEGORIES_KEY && t.category !== category) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [list.data, category, query]);

  const { mounted, phase } = useModalLifecycle(open);
  if (!mounted) return null;
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 zoom-in-95 duration-150'
      : 'animate-out fade-out-0 zoom-out-95 duration-150';

  return (
    <div
      role="presentation"
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50', backdropAnim)}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Template library"
        className={cn(
          'relative flex h-[640px] w-[820px] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <BookOpen className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">
            Template library
          </h2>
          <span className="ml-2 rounded bg-[var(--rb-bg-active)] px-2 py-0.5 text-[10px] text-[var(--rb-text-secondary)]">
            {list.data?.length ?? 0} templates
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--rb-text-muted)]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="rb-finding-input w-full pl-7"
            />
          </div>
          <CategoryChip
            label="All"
            active={category === ALL_CATEGORIES_KEY}
            onClick={() => setCategory(ALL_CATEGORIES_KEY)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {list.isLoading ? (
            <p className="text-sm text-[var(--rb-text-muted)]">Loading templates…</p>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <BookOpen className="h-6 w-6 text-[var(--rb-text-muted)]" aria-hidden />
              <p className="text-sm text-[var(--rb-text-secondary)]">No templates found</p>
              <p className="text-xs text-[var(--rb-text-muted)]">
                Save a finding or section as a template to see it here.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="group flex flex-col rounded-lg border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-3 transition-colors hover:border-[var(--rb-blue)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {t.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--rb-text-primary)]">
                        {t.name}
                      </p>
                      <p className="truncate text-[10px] text-[var(--rb-text-muted)]">
                        {t.category} · {t.type} · {t.blocks.length} block{t.blocks.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => setPendingDelete(t)}
                      className="opacity-0 transition-opacity hover:text-[var(--rb-red)] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {t.description && (
                    <p className="mt-2 line-clamp-3 text-xs text-[var(--rb-text-secondary)]">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        onInsert(t);
                        onClose();
                      }}
                    >
                      Insert
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDeleteTemplate
          template={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            del.mutate({ id: pendingDelete.id });
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteTemplate({
  template,
  onCancel,
  onConfirm,
}: {
  template: Template;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  // Stack on top of the library modal — z-50 (modal) → z-[55] (this confirm).
  const ref = useRef<HTMLDivElement | null>(null);
  useModalA11y(ref, true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Delete template"
        className="relative w-[360px] max-w-[92vw] rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-4 shadow-pop focus:outline-none"
      >
        <h2 className="text-sm font-semibold text-[var(--rb-text-primary)]">Delete template?</h2>
        <p className="mt-1.5 text-xs text-[var(--rb-text-secondary)]">
          Removes <span className="rb-mono font-medium">{template.name}</span> from the library.
          Reports already using it are unaffected.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-3 w-3" aria-hidden />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
        active
          ? 'bg-[var(--rb-blue)] text-white'
          : 'bg-[var(--rb-bg-active)] text-[var(--rb-text-secondary)] hover:bg-[var(--rb-bg-elevated)]',
      )}
    >
      {label}
    </button>
  );
}
