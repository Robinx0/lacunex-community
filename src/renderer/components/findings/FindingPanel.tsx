import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Search, Bookmark } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import type { Block, FindingStatus, Severity } from '@shared/types';
import { STATUS_LABELS, SEVERITY_ORDER } from '@shared/constants';
import { ipc } from '@/lib/ipc';
import { severityTheme } from '@/lib/severityTheme';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { BufferedInput, BufferedTextarea } from '@/components/ui/BufferedInput';
import { useArrayKeys } from '@/hooks/useArrayKeys';
import { TagsInput } from './TagsInput';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: FindingStatus[] = ['open', 'triaged', 'fixed', 'risk_accepted', 'wont_fix'];
const COMMON_CWES = [
  'CWE-79', 'CWE-89', 'CWE-200', 'CWE-287', 'CWE-352',
  'CWE-434', 'CWE-502', 'CWE-639', 'CWE-798', 'CWE-918',
];

interface FindingAttrs {
  findingNodeId: string | null;
  vulnId: string;
  title: string;
  severity: Severity;
  cvss: string;
  cwe: string;
  affected: string;
  status: FindingStatus;
  body: string;
  pocSteps: string[];
  remediation: string;
  tags: string[];
}

interface NodeLocation {
  pos: number;
  attrs: FindingAttrs;
}

function findNodeById(editor: Editor, findingNodeId: string): NodeLocation | null {
  // Findings are always top-level blocks, so we only need to walk the doc's
  // direct children — orders of magnitude cheaper than `doc.descendants`.
  const doc = editor.state.doc;
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name === 'finding' && child.attrs['findingNodeId'] === findingNodeId) {
      return { pos, attrs: child.attrs as unknown as FindingAttrs };
    }
    pos += child.nodeSize;
  }
  return null;
}

export interface FindingPanelProps {
  editor: Editor | null;
  findingNodeId: string | null;
  onClose: () => void;
  onSaveAsTemplate?: (block: Block) => void;
}

/**
 * Right-drawer editor for one Finding. Layout follows the LUMEN
 * mockup top-to-bottom:
 *
 *   FINDING · {vulnId}              [⋆] [⋯] [×]
 *   SEVERITY      [CRT][HI][MD][LO][IF]
 *   IDENTIFIER    [ ACME-001 ]
 *   TITLE         [ multi-line title ]
 *   META          CVSS / Status / CWE / Affected (compact 4-row block)
 *   EVIDENCE      stub list + Attach button
 *   TAGS          [authz] [tenancy] +
 *
 *   DESCRIPTION
 *   POC STEPS
 *   REMEDIATION
 *   CROSS-ENGAGEMENT SEARCH
 */
export function FindingPanel({
  editor,
  findingNodeId,
  onClose,
  onSaveAsTemplate,
}: FindingPanelProps): JSX.Element | null {
  const location = useMemo(() => {
    if (!editor || !findingNodeId) return null;
    return findNodeById(editor, findingNodeId);
  }, [editor, findingNodeId]);

  const attrs = location?.attrs;

  // Auto-close when the finding gets deleted from the editor mid-edit.
  useEffect(() => {
    if (findingNodeId && editor && !location) onClose();
  }, [findingNodeId, editor, location, onClose]);

  useEffect(() => {
    if (!findingNodeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [findingNodeId, onClose]);

  const update = (changes: Partial<FindingAttrs>) => {
    if (!editor || !findingNodeId) return;
    const fresh = findNodeById(editor, findingNodeId);
    if (!fresh) return;
    editor
      .chain()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(fresh.pos);
        if (!node) return false;
        tr.setNodeMarkup(fresh.pos, undefined, { ...node.attrs, ...changes });
        return true;
      })
      .run();
  };

  const deleteFinding = () => {
    if (!editor || !findingNodeId) return;
    const fresh = findNodeById(editor, findingNodeId);
    if (!fresh) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(fresh.pos)
      .deleteSelection()
      .run();
    // Auto-close fires from the location-becomes-null effect above;
    // we don't need to close manually here.
  };

  if (!findingNodeId || !attrs) return null;

  return (
    <div
      role="complementary"
      aria-label="Finding details"
      className="flex h-full w-full flex-col overflow-hidden border-l border-[var(--rb-border)] bg-[var(--rb-bg-sidebar)]"
    >
      <PanelHeader
        vulnId={attrs.vulnId}
        onClose={onClose}
        onSaveAsTemplate={
          onSaveAsTemplate
            ? () => {
                const block: Block = {
                  id: `b_${Date.now().toString(36)}`,
                  type: 'finding',
                  position: 0,
                  attrs: { ...attrs },
                };
                onSaveAsTemplate(block);
              }
            : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <SeverityRow value={attrs.severity} onChange={(severity) => update({ severity })} />

        <Field label="Identifier">
          <BufferedInput
            value={attrs.vulnId}
            onCommit={(vulnId) => update({ vulnId })}
            className="rb-finding-input rb-mono"
            aria-label="Vulnerability identifier"
          />
        </Field>

        <Field label="Title">
          <BufferedTextarea
            value={attrs.title}
            onCommit={(title) => update({ title })}
            rows={2}
            className="rb-finding-input rb-finding-textarea"
            aria-label="Finding title"
            placeholder="Cross-tenant data exposure in export pipeline"
          />
        </Field>

        <MetaBlock attrs={attrs} update={update} />

        <Field label="Tags">
          <TagsInput value={attrs.tags ?? []} onChange={(tags) => update({ tags })} />
        </Field>

        <div className="border-t border-[var(--rb-border-subtle)] pt-4">
          <Field label="Description">
            <BufferedTextarea
              value={attrs.body}
              onCommit={(body) => update({ body })}
              rows={5}
              className="rb-finding-input rb-finding-textarea"
              placeholder="Describe the vulnerability and its impact."
            />
          </Field>
        </div>

        <Field label="Proof-of-concept steps">
          <PocEditor steps={attrs.pocSteps ?? []} onChange={(pocSteps) => update({ pocSteps })} />
        </Field>

        <Field label="Remediation">
          <BufferedTextarea
            value={attrs.remediation}
            onCommit={(remediation) => update({ remediation })}
            rows={5}
            className="rb-finding-input rb-finding-textarea"
            placeholder="Describe how to fix this issue."
          />
        </Field>

        <FindingSearchPanel currentVulnId={attrs.vulnId} />

        <DangerZone onDelete={deleteFinding} vulnId={attrs.vulnId} />
      </div>
    </div>
  );
}

function DangerZone({
  onDelete,
  vulnId,
}: {
  onDelete: () => void;
  vulnId: string;
}): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-6 border-t border-[var(--rb-border-subtle)] pt-4">
      <SectionLabel className="mb-2">Danger zone</SectionLabel>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--rb-red-bg)] bg-transparent py-2 text-[12px] font-medium text-[var(--rb-red)] transition-colors hover:bg-[var(--rb-red-bg)]"
        >
          <Trash2 className="h-3 w-3" aria-hidden />
          Delete finding
        </button>
      ) : (
        <div className="rounded-md border border-[var(--rb-red-bg)] bg-[var(--rb-red-bg)] p-2.5">
          <p className="mb-2 text-xs text-[var(--rb-text-primary)]">
            Delete <span className="rb-mono font-semibold">{vulnId}</span> from this report?
            Removes the finding card from the editor; you can undo with{' '}
            <span className="rb-mono">⌘Z</span>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded px-2 py-1 text-[11px] text-[var(--rb-text-secondary)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="inline-flex items-center gap-1 rounded bg-[var(--rb-red)] px-2 py-1 text-[11px] font-medium text-white hover:brightness-110"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelHeader({
  vulnId,
  onClose,
  onSaveAsTemplate,
}: {
  vulnId: string;
  onClose: () => void;
  onSaveAsTemplate?: () => void;
}): JSX.Element {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-3 py-2.5">
      <span className="rb-section-label">Finding</span>
      <span className="text-[var(--rb-text-subtle)]">·</span>
      <span className="rb-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--rb-text-primary)]">
        {vulnId || '—'}
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        {onSaveAsTemplate && (
          <button
            type="button"
            onClick={onSaveAsTemplate}
            aria-label="Save as template"
            title="Save as template"
            className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close finding panel"
          className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

function SeverityRow({
  value,
  onChange,
}: {
  value: Severity;
  onChange: (sev: Severity) => void;
}): JSX.Element {
  return (
    <Field label="Severity">
      <div role="radiogroup" aria-label="Severity" className="flex gap-1">
        {SEVERITY_ORDER.map((sev) => {
          const v = severityTheme(sev);
          const active = value === sev;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              key={sev}
              onClick={() => onChange(sev)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center rounded-md border py-1.5 transition-all',
                active && 'shadow-sm',
              )}
              style={{
                background: active ? v.bg : 'transparent',
                borderColor: active ? v.color : 'var(--rb-border-subtle)',
              }}
              title={v.label}
            >
              <span
                className="rb-mono text-[11px] font-semibold leading-none"
                style={{ color: active ? v.color : 'var(--rb-text-muted)' }}
              >
                {v.code}
              </span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function MetaBlock({
  attrs,
  update,
}: {
  attrs: FindingAttrs;
  update: (changes: Partial<FindingAttrs>) => void;
}): JSX.Element {
  return (
    <div className="rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] divide-y divide-[var(--rb-border-subtle)]">
      <MetaRow label="CVSS" hint="0.0 – 10.0">
        <BufferedInput
          value={attrs.cvss}
          onCommit={(cvss) => update({ cvss })}
          placeholder="9.8"
          className="rb-meta-input rb-mono"
        />
      </MetaRow>
      <MetaRow label="Status">
        <select
          value={attrs.status}
          onChange={(e) => update({ status: e.target.value as FindingStatus })}
          className="rb-meta-input"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </MetaRow>
      <MetaRow label="CWE">
        <BufferedInput
          list="rb-cwe-list"
          value={attrs.cwe}
          onCommit={(cwe) => update({ cwe })}
          placeholder="CWE-89"
          className="rb-meta-input rb-mono"
        />
        <datalist id="rb-cwe-list">
          {COMMON_CWES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </MetaRow>
      <MetaRow label="Affected">
        <BufferedInput
          value={attrs.affected}
          onCommit={(affected) => update({ affected })}
          placeholder="https://app.example.com/login"
          className="rb-meta-input rb-mono"
        />
      </MetaRow>
    </div>
  );
}

function MetaRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2 px-3 py-1.5">
      <div className="flex flex-col">
        <span className="rb-section-label">{label}</span>
        {hint && (
          <span className="rb-mono text-[9px] text-[var(--rb-text-subtle)]">{hint}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div>
      <SectionLabel trailing={trailing} className="mb-1">
        {label}
      </SectionLabel>
      {children}
    </div>
  );
}

function PocEditor({
  steps,
  onChange,
}: {
  steps: string[];
  onChange: (next: string[]) => void;
}): JSX.Element {
  const keys = useArrayKeys(steps.length);
  const setStep = (i: number, value: string) => {
    const next = [...steps];
    next[i] = value;
    onChange(next);
  };
  const move = (i: number, delta: -1 | 1) => {
    const target = i + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[i], next[target]] = [next[target], next[i]];
    keys.swap(i, target);
    onChange(next);
  };
  const add = () => {
    keys.add();
    onChange([...steps, `Step ${steps.length + 1}: `]);
  };
  const remove = (i: number) => {
    keys.remove(i);
    onChange(steps.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-1.5">
      {steps.length === 0 && (
        <p className="text-xs text-[var(--rb-text-muted)]">No steps yet.</p>
      )}
      {steps.map((step, i) => (
        <div key={keys.read(i)} className="flex items-center gap-1.5">
          <span className="rb-mono rb-tabular w-6 shrink-0 text-right text-xs text-[var(--rb-text-muted)]">
            {i + 1}.
          </span>
          <BufferedInput
            value={step}
            onCommit={(v) => setStep(i, v)}
            className="rb-finding-input flex-1"
            aria-label={`Step ${i + 1}`}
          />
          <button
            type="button"
            className="rb-finding-iconbtn"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="rb-finding-iconbtn"
            onClick={() => move(i, 1)}
            disabled={i === steps.length - 1}
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="rb-finding-iconbtn rb-finding-iconbtn--danger"
            onClick={() => remove(i)}
            title="Delete step"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 rounded border border-dashed border-[var(--rb-border-strong)] bg-transparent px-2 py-1 text-xs text-[var(--rb-text-secondary)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
      >
        <Plus className="h-3 w-3" /> Add step
      </button>
    </div>
  );
}

function FindingSearchPanel({ currentVulnId }: { currentVulnId: string }): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; vulnId: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void ipc.findings
        .search({ query })
        .then((rows) =>
          setResults(rows.map((r) => ({ id: r.id, title: r.title, vulnId: r.vulnId }))),
        )
        .catch(() => setResults([]));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="mt-6 border-t border-[var(--rb-border-subtle)] pt-4">
      <SectionLabel className="mb-2">Cross-engagement search</SectionLabel>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--rb-text-muted)]"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find similar findings (FTS)…"
          className="rb-finding-input w-full pl-7"
        />
      </div>
      <ul className="mt-2 space-y-1">
        {results.map((r) => (
          <li
            key={r.id}
            className="rounded bg-[var(--rb-bg-faint)] px-2 py-1.5 text-xs text-[var(--rb-text-secondary)]"
          >
            <span className="rb-mono text-[10px] text-[var(--rb-text-muted)]">{r.vulnId}</span>{' '}
            <span>{r.title}</span>
          </li>
        ))}
        {query.trim() && results.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-[var(--rb-text-muted)]">
            No matches for &ldquo;{query}&rdquo; (current finding: {currentVulnId})
          </li>
        )}
      </ul>
    </div>
  );
}
