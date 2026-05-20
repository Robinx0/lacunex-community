import { memo, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X, Save, FileDown, Sparkles, Activity } from 'lucide-react';
import { useActivityStore, type ActivityEntry, type ActivityKind } from '@/stores/activityStore';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<ActivityKind, typeof Save> = {
  autosave: Save,
  export: FileDown,
  ai: Sparkles,
  system: Activity,
};

/**
 * Bottom-of-sidebar activity feed. Shows running operations (autosave,
 * export, AI generate) so the user always knows what work is in flight,
 * with a brief success flash and persistent error rows. Idle state shows
 * a quiet "Ready" line — preferable to collapsing the slot, since a
 * silent strip would make users think the surface is broken.
 *
 * Visibility cap: at most 3 rows; older rows roll into a "+N more"
 * footer. Errors never auto-dismiss — the user clicks the × to clear.
 */
export const ActivityStrip = memo(function ActivityStrip(): JSX.Element {
  const entries = useActivityStore((s) => s.entries);
  const dismiss = useActivityStore((s) => s.dismiss);
  const clearCompleted = useActivityStore((s) => s.clearCompleted);

  const visible = entries.slice(-3).reverse();
  const overflow = entries.length - visible.length;
  const hasErrors = entries.some((e) => e.status === 'error');

  return (
    <div
      className="flex flex-col gap-0.5 px-1 py-1.5"
      role="status"
      aria-live="polite"
      aria-label="Activity feed"
    >
      <div className="flex items-center justify-between px-1">
        <span className="rb-section-label">Activity</span>
        {hasErrors && (
          <button
            type="button"
            onClick={clearCompleted}
            className="text-[9px] text-[var(--rb-text-muted)] hover:text-[var(--rb-text-secondary)]"
          >
            Clear
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <IdleRow />
      ) : (
        <ul className="flex flex-col gap-0.5">
          {visible.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} onDismiss={() => dismiss(entry.id)} />
          ))}
          {overflow > 0 && (
            <li className="px-1 text-[9px] text-[var(--rb-text-muted)]">+{overflow} more</li>
          )}
        </ul>
      )}
    </div>
  );
});

function IdleRow(): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-[var(--rb-text-muted)]">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--rb-green)]"
        aria-hidden
      />
      <span>Ready</span>
    </div>
  );
}

interface ActivityRowProps {
  entry: ActivityEntry;
  onDismiss: () => void;
}

function ActivityRow({ entry, onDismiss }: ActivityRowProps): JSX.Element {
  const KindIcon = KIND_ICON[entry.kind];
  const elapsed = useElapsed(entry.status === 'running' ? entry.startedAt : null);

  let statusIcon: JSX.Element;
  let labelClass = 'text-[var(--rb-text-secondary)]';
  let rowClass = 'bg-[var(--rb-bg-faint)]';

  if (entry.status === 'running') {
    statusIcon = <Loader2 className="h-3 w-3 animate-spin text-[var(--rb-blue)]" aria-hidden />;
  } else if (entry.status === 'success') {
    statusIcon = <CheckCircle2 className="h-3 w-3 text-[var(--rb-green)]" aria-hidden />;
    labelClass = 'text-[var(--rb-text-primary)]';
  } else {
    statusIcon = <AlertTriangle className="h-3 w-3 text-[var(--rb-red)]" aria-hidden />;
    labelClass = 'text-[var(--rb-red)]';
    rowClass = 'bg-[var(--rb-red-bg)]';
  }

  const detail = entry.error ?? entry.detail;
  // Build a tooltip that survives even when the row is too narrow to show
  // the detail line — title attribute is the cheapest option.
  const tooltip = [entry.label, detail, elapsed && `${elapsed}s`].filter(Boolean).join(' · ');

  return (
    <li
      className={cn(
        'group flex items-center gap-1.5 rounded px-1.5 py-1 text-[10.5px] transition-colors',
        rowClass,
      )}
      title={tooltip}
    >
      <KindIcon className="h-3 w-3 shrink-0 text-[var(--rb-text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn('truncate font-medium', labelClass)}>
          {entry.label}
          {entry.status === 'running' && elapsed !== null && elapsed >= 1 && (
            <span className="rb-mono ml-1 text-[9px] text-[var(--rb-text-muted)]">{elapsed}s</span>
          )}
        </p>
        {detail && (
          <p className="truncate text-[9.5px] text-[var(--rb-text-muted)]">{detail}</p>
        )}
      </div>
      {statusIcon}
      {entry.status === 'error' && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-[var(--rb-text-muted)] opacity-60 hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)] hover:opacity-100"
        >
          <X className="h-2.5 w-2.5" aria-hidden />
        </button>
      )}
    </li>
  );
}

/**
 * Re-renders once per second so a long-running export shows accumulating
 * elapsed seconds. Returns null when there's nothing to count.
 */
function useElapsed(startedAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [startedAt]);
  if (startedAt === null) return null;
  return Math.floor((now - startedAt) / 1000);
}
