import { memo, useMemo } from 'react';
import type { Block, Severity } from '@shared/types';
import { SEVERITY_ORDER } from '@shared/constants';
import { severityTheme } from '@/lib/severityTheme';
import { SectionLabel } from '@/components/ui/SectionLabel';

export interface SeverityStatsProps {
  blocks: Block[];
}

/**
 * Compact severity strip. The mockup hides this from the sidebar entirely
 * and surfaces severity in the right-rail finding panel; we keep a
 * collapsed version in the sidebar because it's a useful at-a-glance
 * signal for the report's risk profile. Dense single-row layout —
 * five tiny cells, total badge to the right of the section header.
 */
export const SeverityStats = memo(function SeverityStats({
  blocks,
}: SeverityStatsProps): JSX.Element | null {
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { crit: 0, high: 0, med: 0, low: 0, info: 0 };
    for (const b of blocks) {
      if (b.type !== 'finding') continue;
      const sev = ((b.attrs?.severity as Severity | undefined) ?? 'info') as Severity;
      if (sev in c) c[sev] += 1;
    }
    return c;
  }, [blocks]);

  const total = SEVERITY_ORDER.reduce((sum, s) => sum + counts[s], 0);
  if (total === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <SectionLabel
        trailing={
          <span className="rb-mono rb-tabular text-[10px] text-[var(--rb-text-secondary)]">
            {total}
          </span>
        }
      >
        Findings
      </SectionLabel>
      <div className="flex items-stretch gap-px overflow-hidden rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)]">
        {SEVERITY_ORDER.map((sev) => {
          const v = severityTheme(sev);
          const n = counts[sev];
          return (
            <div
              key={sev}
              className="flex flex-1 flex-col items-center justify-center px-1 py-1 text-center"
              style={{ background: n > 0 ? v.bg : 'transparent' }}
              title={`${v.label}: ${n}`}
            >
              <span
                className="rb-mono rb-tabular text-[12px] font-semibold leading-none"
                style={{ color: n > 0 ? v.color : 'var(--rb-text-subtle)' }}
              >
                {n}
              </span>
              <span
                className="rb-mono mt-0.5 text-[8px] uppercase tracking-[0.08em]"
                style={{ color: n > 0 ? v.color : 'var(--rb-text-subtle)', opacity: n > 0 ? 0.85 : 1 }}
              >
                {v.code}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});
