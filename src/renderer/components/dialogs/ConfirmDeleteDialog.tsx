import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteReport, useReport } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import { DialogShell } from './DialogShell';

const TYPE_TO_CONFIRM_THRESHOLD_BLOCKS = 5;

/**
 * Destructive confirmation for deleting a report. Substantial reports
 * (≥5 blocks) require typing the title to confirm — protects against
 * fat-finger deletions of an active engagement. Trivial reports get a
 * plain Confirm button.
 */
export function ConfirmDeleteDialog(): JSX.Element | null {
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);
  const activeReportId = useUiStore((s) => s.activeReportId);

  const open = dialog?.kind === 'confirmDeleteReport';
  const reportId = open ? dialog.reportId : null;
  const reportTitle = open ? dialog.reportTitle : '';

  const detail = useReport(reportId);
  const del = useDeleteReport();

  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setError(null);
    }
  }, [open]);

  const blockCount = detail.data?.blocks.length ?? 0;
  const findingCount =
    detail.data?.blocks.filter((b) => b.type === 'finding').length ?? 0;
  const requiresType = blockCount >= TYPE_TO_CONFIRM_THRESHOLD_BLOCKS;
  const canConfirm = !requiresType || confirmText.trim() === reportTitle;

  const onConfirm = () => {
    if (!reportId) return;
    if (!canConfirm) {
      setError('Type the report title exactly to confirm.');
      return;
    }
    del.mutate(
      { id: reportId },
      {
        onSuccess: () => {
          // If we just nuked the active report, clear it so the sidebar
          // falls back to the next available report.
          if (activeReportId === reportId) setActiveReportId(null);
          close();
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <DialogShell
      open={open}
      onClose={close}
      title="Delete report"
      tone="destructive"
      size="compact"
      icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            disabled={del.isPending || !canConfirm}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            {del.isPending ? 'Deleting…' : 'Delete report'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-[var(--rb-text-secondary)]">
        <p>
          Permanently delete{' '}
          <span className="font-semibold text-[var(--rb-text-primary)]">
            &ldquo;{reportTitle}&rdquo;
          </span>
          ?
        </p>
        <ul className="rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-3 py-2 text-xs">
          <li className="flex items-center justify-between py-0.5">
            <span className="text-[var(--rb-text-muted)]">Blocks</span>
            <span className="rb-mono rb-tabular text-[var(--rb-text-secondary)]">
              {blockCount}
            </span>
          </li>
          <li className="flex items-center justify-between py-0.5">
            <span className="text-[var(--rb-text-muted)]">Findings</span>
            <span className="rb-mono rb-tabular text-[var(--rb-text-secondary)]">
              {findingCount}
            </span>
          </li>
          <li className="flex items-center justify-between py-0.5">
            <span className="text-[var(--rb-text-muted)]">Attachments</span>
            <span className="rb-mono rb-tabular text-[var(--rb-text-secondary)]">
              all linked files
            </span>
          </li>
        </ul>
        <p className="text-xs text-[var(--rb-text-muted)]">
          This cannot be undone. Associated findings and the image copies stored
          in Lacunex&apos;s app-data folder will be removed. Your original files
          (anywhere else on disk) are untouched.
        </p>

        {requiresType && (
          <div>
            <p className="mb-1 text-xs text-[var(--rb-text-muted)]">
              Type the title to confirm:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={reportTitle}
              className="rb-finding-input"
              autoComplete="off"
              spellCheck={false}
              data-autofocus
            />
          </div>
        )}

        {error && (
          <p className="rounded bg-[var(--rb-red-bg)] px-2 py-1.5 text-xs text-[var(--rb-red)]">
            {error}
          </p>
        )}
      </div>
    </DialogShell>
  );
}
