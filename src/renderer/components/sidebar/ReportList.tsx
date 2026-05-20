import { Plus, FileText } from 'lucide-react';
import { useReportList } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ReportCardMenu } from './ReportCardMenu';
import { cn } from '@/lib/utils';
import type { ReportSummary } from '@shared/types';

/**
 * Replaces the old WorkspaceSwitcher dropdown. Reports are visible
 * directly in the sidebar as cards — title, docId · version, click to
 * activate. Matches the LUMEN mockup; also makes report-switching one
 * click instead of two.
 */
export function ReportList(): JSX.Element {
  const list = useReportList(false);
  const activeId = useUiStore((s) => s.activeReportId);
  const setActiveId = useUiStore((s) => s.setActiveReportId);
  const openModal = useUiStore((s) => s.openModal);

  const reports = list.data ?? [];

  return (
    <section className="flex flex-col gap-1.5">
      <SectionLabel
        trailing={
          <button
            type="button"
            aria-label="New report"
            title="New report"
            onClick={() => openModal('newReport')}
            className="flex h-4 w-4 items-center justify-center rounded text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <Plus className="h-3 w-3" />
          </button>
        }
      >
        Reports
      </SectionLabel>

      {list.isLoading && (
        <p className="px-1 py-2 text-[10px] text-[var(--rb-text-muted)]">Loading…</p>
      )}

      <ul className="flex flex-col gap-1">
        {reports.map((r) => (
          <li key={r.id}>
            <ReportCard
              report={r}
              active={r.id === activeId}
              onActivate={() => setActiveId(r.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportCard({
  report,
  active,
  onActivate,
}: {
  report: ReportSummary;
  active: boolean;
  onActivate: () => void;
}): JSX.Element {
  return (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-md border px-2 py-2 transition-colors',
        active
          ? 'border-[var(--rb-blue-bg)] bg-[var(--rb-bg-active)]'
          : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]',
      )}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-1 items-start gap-2 text-left focus:outline-none"
      >
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded',
            active ? 'bg-[var(--rb-blue-bg)] text-[var(--rb-blue)]' : 'bg-[var(--rb-bg-active)] text-[var(--rb-text-muted)]',
          )}
          aria-hidden
        >
          <FileText className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-snug text-[var(--rb-text-primary)]">
            {report.title}
          </p>
          <p className="rb-mono mt-0.5 truncate text-[9px] uppercase tracking-[0.06em] text-[var(--rb-text-muted)]">
            <span>{report.docId || 'no-id'}</span>
            {report.reportVersion && (
              <>
                <span className="mx-1 text-[var(--rb-text-subtle)]">·</span>
                <span>v{report.reportVersion}</span>
              </>
            )}
          </p>
        </div>
      </button>
      <ReportCardMenu report={report} />
    </div>
  );
}
