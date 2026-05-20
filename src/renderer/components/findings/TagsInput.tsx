import { useState, useRef, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

export interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

const SLUG = /[^a-z0-9_\-:]+/g;
function normalize(raw: string): string {
  return raw.toLowerCase().replace(SLUG, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}

/**
 * Chip-style tag input — type a tag, hit Enter or comma to commit.
 * Backspace on an empty input pops the last tag. Tags are normalized
 * (lowercased, hyphen-separated, ≤32 chars) so the cross-engagement
 * tag index stays sane.
 */
export function TagsInput({
  value,
  onChange,
  placeholder = 'Add tag…',
}: TagsInputProps): JSX.Element {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commit = () => {
    const t = normalize(draft);
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-base)] p-1.5 focus-within:border-[var(--rb-blue)]"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      {value.map((t) => (
        <span
          key={t}
          className="rb-mono inline-flex items-center gap-1 rounded bg-[var(--rb-bg-active)] px-1.5 py-0.5 text-[10px] text-[var(--rb-text-secondary)]"
        >
          {t}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((v) => v !== t));
            }}
            aria-label={`Remove tag ${t}`}
            className="text-[var(--rb-text-muted)] hover:text-[var(--rb-red)]"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ''}
        className="rb-mono flex-1 min-w-[80px] bg-transparent px-1 text-[11px] text-[var(--rb-text-primary)] outline-none placeholder:text-[var(--rb-text-subtle)]"
        aria-label="Add a tag"
      />
      {draft && (
        <button
          type="button"
          onClick={commit}
          aria-label="Commit tag"
          className="text-[var(--rb-text-muted)] hover:text-[var(--rb-text-primary)]"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
