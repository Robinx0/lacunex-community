import { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { cn } from '@/lib/utils';
import type { Template } from '@shared/types';
import type { SaveTemplatePayload } from '@/stores/uiStore';

const TEMPLATE_ICONS = [
  '📋', '📑', '🛡️', '💉', '🔓', '🔄', '🔑', '📝', '🚨', '⚠️',
  '💡', '🎯', '🐛', '📸', '🧭', '📦', '🧩', '🗂️', '✅', '📊',
  '📈', '💬', '🧠', '🛠️', '📚', '🎨', '🌐', '🔬', '🎓', '✏️',
];

const CATEGORIES = ['Findings', 'Sections', 'Boilerplate', 'General'];

export interface SaveAsTemplateModalProps {
  open: boolean;
  payload: SaveTemplatePayload | null;
  onClose: () => void;
  onSaved?: (template: Template) => void;
}

export function SaveAsTemplateModal({
  open,
  payload,
  onClose,
  onSaved,
}: SaveAsTemplateModalProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [category, setCategory] = useState('General');
  const create = useCreateTemplate();
  const initialized = useRef(false);
  const panelRef = useRef<HTMLFormElement | null>(null);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (open && payload && !initialized.current) {
      setName(payload.suggestedName);
      setIcon(payload.suggestedIcon);
      setCategory(payload.suggestedCategory);
      setDescription('');
      initialized.current = true;
    }
    if (!open) initialized.current = false;
  }, [open, payload]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { mounted, phase } = useModalLifecycle(open && Boolean(payload));
  if (!mounted || !payload) return null;
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 zoom-in-95 duration-150'
      : 'animate-out fade-out-0 zoom-out-95 duration-150';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        category: category || 'General',
        icon,
        type: payload.type,
        blocks: payload.blocks,
      },
      {
        onSuccess: (created) => {
          onSaved?.(created);
          onClose();
        },
      },
    );
  };

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
      <form
        ref={panelRef}
        tabIndex={-1}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Save as template"
        className={cn(
          'relative w-[480px] rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-5 shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="mb-4 flex items-center gap-2">
          <Save className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">
            Save as template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3">
          <Field label="Name">
            <input
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rb-finding-input"
              placeholder="My finding template"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rb-finding-input rb-finding-textarea"
              placeholder="Short description of when to use this template"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rb-finding-input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <input
                disabled
                value={payload.type}
                className="rb-finding-input"
                style={{ opacity: 0.7 }}
              />
            </Field>
          </div>

          <Field label="Icon">
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_ICONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  aria-label={`Choose icon ${emoji}`}
                  className={`flex h-7 w-7 items-center justify-center rounded text-base transition-colors ${
                    icon === emoji
                      ? 'bg-[var(--rb-bg-active)] ring-1 ring-[var(--rb-blue)]'
                      : 'hover:bg-[var(--rb-bg-hover)]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <footer className="mt-5 flex items-center justify-between">
          <p className="text-xs text-[var(--rb-text-muted)]">
            Saving {payload.blocks.length} block{payload.blocks.length === 1 ? '' : 's'} as{' '}
            <span className="font-mono">{payload.type}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
              {create.isPending ? 'Saving…' : 'Save template'}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}
