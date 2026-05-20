import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Variable, Copy, Check, Search } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useReport } from '@/hooks/useReports';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { cn } from '@/lib/utils';

export interface VariablesModalProps {
  open: boolean;
  onClose: () => void;
}

interface VarRow {
  group: string;
  key: string;
  /** Token an analyst types to refer to this — `{{report.client}}` etc. */
  token: string;
  /** Live value resolved from the active report. */
  value: string;
}

/**
 * Report-level data dictionary. Lists every meta field the analyst can
 * reference, with click-to-copy on the value or the token. The token
 * convention (`{{group.key}}`) is documented but not auto-substituted —
 * V1 surfaces these as a copyable directory; substitution can land on
 * top of this UI in V2 without breaking it.
 */
export function VariablesModal({ open, onClose }: VariablesModalProps): JSX.Element | null {
  const activeReportId = useUiStore((s) => s.activeReportId);
  const detail = useReport(activeReportId);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCopied(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const rows = useMemo<VarRow[]>(() => {
    const r = detail.data;
    if (!r) return [];
    const m = r.meta;
    const scopeFlat = m.scope.map((s) => `${s.type}: ${s.value}`).join(', ');
    return [
      { group: 'Report', key: 'title', token: '{{report.title}}', value: r.title },
      { group: 'Report', key: 'docId', token: '{{report.docId}}', value: m.docId },
      { group: 'Report', key: 'version', token: '{{report.version}}', value: m.reportVersion },
      { group: 'Report', key: 'classification', token: '{{report.classification}}', value: m.classification },

      { group: 'Engagement', key: 'engagementType', token: '{{engagement.type}}', value: m.engagementType },
      { group: 'Engagement', key: 'methodology', token: '{{engagement.methodology}}', value: m.methodology },
      { group: 'Engagement', key: 'startDate', token: '{{engagement.start}}', value: m.startDate },
      { group: 'Engagement', key: 'endDate', token: '{{engagement.end}}', value: m.endDate },

      { group: 'Client', key: 'name', token: '{{client.name}}', value: m.client },
      { group: 'Client', key: 'distribution', token: '{{client.distribution}}', value: m.distribution },

      { group: 'People', key: 'authors', token: '{{authors}}', value: m.authors },
      { group: 'People', key: 'reviewers', token: '{{reviewers}}', value: m.reviewers },

      { group: 'Scope', key: 'inScope', token: '{{scope.inScope}}', value: scopeFlat },
      { group: 'Scope', key: 'outOfScope', token: '{{scope.outOfScope}}', value: m.outOfScope },
    ];
  }, [detail.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.token.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, VarRow[]>();
    for (const row of filtered) {
      const arr = map.get(row.group) ?? [];
      arr.push(row);
      map.set(row.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const copy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    });
  };

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
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm',
        backdropAnim,
      )}
    >
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Variables"
        className={cn(
          'relative flex h-[640px] w-[720px] max-w-[92vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <Variable className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">Variables</h2>
          <p className="text-xs text-[var(--rb-text-muted)]">
            · {rows.length} fields from the active report&apos;s meta
          </p>
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
          <Search className="h-3 w-3 text-[var(--rb-text-muted)]" aria-hidden />
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, values, or groups…"
            className="flex-1 bg-transparent text-sm text-[var(--rb-text-primary)] outline-none placeholder:text-[var(--rb-text-subtle)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!detail.data ? (
            <p className="text-center text-xs text-[var(--rb-text-muted)]">
              Open a report to see its variables.
            </p>
          ) : grouped.length === 0 ? (
            <p className="text-center text-xs text-[var(--rb-text-muted)]">
              No matches for &ldquo;{query}&rdquo;
            </p>
          ) : (
            grouped.map(([group, list]) => (
              <section key={group}>
                <SectionLabel className="mb-2">{group}</SectionLabel>
                <div className="rounded-md border border-[var(--rb-border-subtle)] divide-y divide-[var(--rb-border-subtle)]">
                  {list.map((row) => {
                    const tokenCopied = copied === row.token;
                    const valueCopied = copied === `value:${row.token}`;
                    return (
                      <div
                        key={row.token}
                        className="grid grid-cols-[1fr_1fr_24px] items-center gap-2 px-3 py-2 hover:bg-[var(--rb-bg-faint)]"
                      >
                        <CopyableField
                          mono
                          label="token"
                          text={row.token}
                          copied={tokenCopied}
                          onCopy={() => copy(row.token, row.token)}
                        />
                        <CopyableField
                          label="value"
                          text={row.value || '—'}
                          copied={valueCopied}
                          onCopy={() => copy(`value:${row.token}`, row.value)}
                          dimmed={!row.value}
                        />
                        <span className="rb-mono text-[9px] uppercase tracking-[0.06em] text-[var(--rb-text-subtle)]">
                          {row.key}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-4 py-2 text-[10px] text-[var(--rb-text-muted)]">
          <span>Click a row to copy the token or value to your clipboard.</span>
          <span aria-hidden>·</span>
          <span>
            Tokens use <span className="rb-mono">{'{{group.key}}'}</span> shape; substitution
            arrives in V2.
          </span>
        </footer>
      </div>
    </div>
  );
}

function CopyableField({
  mono,
  label,
  text,
  copied,
  onCopy,
  dimmed,
}: {
  mono?: boolean;
  label: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
  dimmed?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label}`}
      className={cn(
        'group flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--rb-bg-active)]',
        mono ? 'rb-mono text-[11px]' : 'text-[12px]',
      )}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          dimmed ? 'text-[var(--rb-text-subtle)]' : 'text-[var(--rb-text-primary)]',
        )}
      >
        {text}
      </span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-[var(--rb-green)]" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-[var(--rb-text-muted)] opacity-0 group-hover:opacity-100" aria-hidden />
      )}
    </button>
  );
}
