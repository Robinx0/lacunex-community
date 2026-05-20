import { useMemo } from 'react';
import type { Block, Report, Severity } from '@shared/types';
import { SEVERITY_ORDER } from '@shared/constants';
import { severityTheme } from '@/lib/severityTheme';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { PaperPage } from '@/components/preview/PaperPage';
import { getCoverEntry } from '@/lib/preview/coverRegistry';
import { relativeTime } from '@/lib/format';

export interface ReviewViewProps {
  report: Report;
  /** The live editor blocks — supersedes `report.blocks` so reviewers see
   *  unsaved edits immediately. */
  blocks: Block[];
}

/**
 * Read-only review surface. Layout matches the GlassNote reference:
 *
 *   [ paper-stack canvas ─ cover + body pages ]   [ findings rail ]
 *
 * The paper-stack is rendered at scale-down so cover and body fit on
 * one screen with the rail visible. Right rail surfaces the report's
 * findings with severity counts, plus the report-level activity feed.
 */
export function ReviewView({ report, blocks }: ReviewViewProps): JSX.Element {
  const cover = getCoverEntry(report.coverId);
  const Cover = cover.component;

  return (
    <div className="flex h-full min-h-0 flex-1">
      <main className="flex h-full min-w-0 flex-1 flex-col bg-[var(--rb-bg-base)]">
        <ReviewToolbar report={report} />
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-[800px] flex-col gap-6">
            {/* Cover page */}
            <div
              className="rb-paper rb-paper--cover overflow-hidden"
              data-report-theme={report.reportTheme}
              style={{ aspectRatio: '8.5 / 11' }}
            >
              <Cover
                meta={report.meta}
                customCover={report.customCover}
                coverOptions={report.coverOptions}
              />
            </div>
            {/* Body pages */}
            <PaperPage
              blocks={blocks}
              meta={report.meta}
              reportTheme={report.reportTheme}
              reportAccent={report.reportAccent}
              tocEnabled={report.tocEnabled}
            />
          </div>
        </div>
      </main>
      <FindingsRail report={report} blocks={blocks} />
    </div>
  );
}

function ReviewToolbar({ report }: { report: Report }): JSX.Element {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-4 py-2">
      <span className="rb-section-label">Review</span>
      <span className="text-[var(--rb-text-subtle)]">/</span>
      <span className="rb-mono text-[11px] text-[var(--rb-text-secondary)]">{report.meta.docId}</span>
      <span className="text-[var(--rb-text-subtle)]">/</span>
      <span className="text-xs text-[var(--rb-text-primary)]">{report.title}</span>
      <span className="ml-auto rb-mono text-[10px] uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
        Read-only · click any heading on the rail to jump
      </span>
    </header>
  );
}

function FindingsRail({ report, blocks }: { report: Report; blocks: Block[] }): JSX.Element {
  const { findings, counts } = useMemo(() => {
    const f = blocks.filter((b) => b.type === 'finding');
    const c: Record<Severity, number> = { crit: 0, high: 0, med: 0, low: 0, info: 0 };
    for (const b of f) {
      const sev = ((b.attrs?.severity as Severity | undefined) ?? 'info') as Severity;
      if (sev in c) c[sev] += 1;
    }
    return { findings: f, counts: c };
  }, [blocks]);

  const total = SEVERITY_ORDER.reduce((sum, s) => sum + counts[s], 0);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-l border-[var(--rb-border)] bg-[var(--rb-bg-sidebar)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-3 py-2.5">
        <span className="rb-section-label">Annotations</span>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Severity heatmap — proportional bar */}
        <section>
          <SectionLabel
            className="mb-1.5"
            trailing={
              <span className="rb-mono rb-tabular text-[10px] text-[var(--rb-text-secondary)]">
                {total}
              </span>
            }
          >
            Findings by severity
          </SectionLabel>
          <SeverityHeat counts={counts} />
          <div className="mt-2 grid grid-cols-5 gap-1">
            {SEVERITY_ORDER.map((sev) => {
              const t = severityTheme(sev);
              const n = counts[sev];
              return (
                <div
                  key={sev}
                  className="rounded border px-1 py-1.5 text-center"
                  style={{
                    background: n > 0 ? t.bg : 'transparent',
                    borderColor: n > 0 ? t.color : 'var(--rb-border-subtle)',
                  }}
                  title={t.label}
                >
                  <div
                    className="rb-mono rb-tabular text-[12px] font-semibold"
                    style={{ color: n > 0 ? t.color : 'var(--rb-text-subtle)' }}
                  >
                    {n}
                  </div>
                  <div
                    className="rb-mono text-[8px] uppercase tracking-[0.08em]"
                    style={{ color: n > 0 ? t.color : 'var(--rb-text-subtle)' }}
                  >
                    {t.code}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Findings list */}
        <section>
          <SectionLabel className="mb-1.5">Findings</SectionLabel>
          {findings.length === 0 ? (
            <p className="rounded border border-dashed border-[var(--rb-border-subtle)] p-3 text-center text-xs text-[var(--rb-text-muted)]">
              No findings yet. Insert one via <span className="rb-mono">/find</span> in Compose.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {findings.map((f) => {
                const a = f.attrs ?? {};
                const sev = ((a['severity'] as Severity | undefined) ?? 'info') as Severity;
                const t = severityTheme(sev);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`block-${f.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex w-full items-start gap-2 rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-2 py-1.5 text-left transition-colors hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]"
                      style={{ borderLeft: `2px solid ${t.color}` }}
                    >
                      <span
                        className="rb-mono mt-0.5 shrink-0 rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.1em]"
                        style={{ background: t.bg, color: t.color }}
                      >
                        {t.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-[var(--rb-text-primary)]">
                          {String(a['title'] ?? 'Untitled finding')}
                        </span>
                        <span className="rb-mono block text-[10px] text-[var(--rb-text-muted)]">
                          {String(a['vulnId'] ?? '—')} · CVSS {String(a['cvss'] ?? '—')} ·{' '}
                          {String(a['status'] ?? 'open')}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Activity — derived from updatedAt timestamp */}
        <section>
          <SectionLabel className="mb-1.5">Activity</SectionLabel>
          <ul className="space-y-1.5">
            <ActivityRow tone="edit" who="You" what={`Last edit ${relativeTime(report.updatedAt)}`} />
            <ActivityRow
              tone="add"
              who="System"
              what={`Cover · ${getCoverEntry(report.coverId).name}, theme ${report.reportTheme}`}
            />
            <ActivityRow
              tone="check"
              who="System"
              what={`${blocks.length} blocks · ${findings.length} findings`}
            />
          </ul>
        </section>
      </div>
    </aside>
  );
}

function SeverityHeat({ counts }: { counts: Record<Severity, number> }): JSX.Element {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + counts[s], 0);
  if (total === 0) {
    return (
      <div className="h-1.5 rounded-full bg-[var(--rb-bg-active)]" aria-hidden />
    );
  }
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--rb-bg-active)]" aria-hidden>
      {SEVERITY_ORDER.map((sev) => {
        const n = counts[sev];
        if (n === 0) return null;
        const t = severityTheme(sev);
        return (
          <span
            key={sev}
            style={{ flex: n, background: t.color }}
            title={`${t.label}: ${n}`}
          />
        );
      })}
    </div>
  );
}

function ActivityRow({
  tone,
  who,
  what,
}: {
  tone: 'add' | 'edit' | 'check';
  who: string;
  what: string;
}): JSX.Element {
  const TONE: Record<typeof tone, { color: string; bg: string; glyph: string }> = {
    add: { color: 'var(--rb-green)', bg: 'var(--rb-green-bg)', glyph: '+' },
    edit: { color: 'var(--rb-yellow)', bg: 'var(--rb-yellow-bg)', glyph: '~' },
    check: { color: 'var(--rb-blue)', bg: 'var(--rb-blue-bg)', glyph: '✓' },
  };
  const t = TONE[tone];
  return (
    <li className="flex items-start gap-2">
      <span
        className="rb-mono mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold"
        style={{ background: t.bg, color: t.color }}
        aria-hidden
      >
        {t.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--rb-text-secondary)]">
          <span className="font-medium text-[var(--rb-text-primary)]">{who}</span> · {what}
        </p>
      </div>
    </li>
  );
}
