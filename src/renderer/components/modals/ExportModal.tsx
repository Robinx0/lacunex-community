import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  FileDown,
  FileText,
  FileType2,
  FileBox,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { useMutation } from '@/lib/query';
import { Button } from '@/components/ui/button';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { ipc } from '@/lib/ipc';
import { cn } from '@/lib/utils';
import { useActivityStore } from '@/stores/activityStore';
import type { ExportFormat, IpcOutput } from '@shared/ipc-contracts';
import { slugify } from '@shared/util/text';

const FORMAT_CARDS: {
  id: ExportFormat;
  label: string;
  desc: string;
  Icon: typeof FileText;
  defaultExt: string;
}[] = [
  { id: 'pdf', label: 'PDF', desc: 'Print-ready, paginated.', Icon: FileType2, defaultExt: 'pdf' },
  { id: 'html', label: 'HTML', desc: 'Standalone HTML with inlined styles.', Icon: Globe, defaultExt: 'html' },
  { id: 'markdown', label: 'Markdown', desc: 'Plain GFM Markdown.', Icon: FileText, defaultExt: 'md' },
  { id: 'word', label: 'Word', desc: 'Microsoft Word .docx.', Icon: FileBox, defaultExt: 'docx' },
];

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  reportId: string | null;
  reportTitle: string;
}

export function ExportModal({
  open,
  onClose,
  reportId,
  reportTitle,
}: ExportModalProps): JSX.Element | null {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState(slugify(reportTitle));
  const [includeCover, setIncludeCover] = useState(true);
  // Paged-layout mode loads paged.js for per-page footers. Off by
  // default — Chromium's native paginator is much faster and the
  // pre-pagination JS in pdf.ts already handles figure overflow.
  // Toggle on if you need the bottom-left / bottom-right footer.
  const [pagedLayout, setPagedLayout] = useState(false);
  const [done, setDone] = useState<IpcOutput<'export.run'> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);

  useEffect(() => {
    if (open) {
      setFilename(slugify(reportTitle));
      setDone(null);
    }
  }, [open, reportTitle]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const activityStart = useActivityStore((s) => s.start);
  const activitySucceed = useActivityStore((s) => s.succeed);
  const activityFail = useActivityStore((s) => s.fail);
  const activityIdRef = useRef<string | null>(null);

  const run = useMutation<IpcOutput<'export.run'>, Error>({
    mutationFn: async () => {
      if (!reportId) throw new Error('no report selected');
      return ipc.exports.run({
        reportId,
        format,
        filename,
        options: { includeCover, pagedLayout },
      });
    },
    onMutate: () => {
      const id = activityStart({
        kind: 'export',
        label: `Export ${card.label}`,
        detail: `${filename}.${card.defaultExt}`,
      });
      activityIdRef.current = id;
    },
    onSuccess: (result) => {
      setDone(result);
      const id = activityIdRef.current;
      if (id) {
        activitySucceed(id, {
          label: `Exported ${card.label}`,
          detail: result.filepath ?? result.filename,
        });
        activityIdRef.current = null;
      }
    },
    onError: (err) => {
      const id = activityIdRef.current;
      if (id) {
        activityFail(id, err.message);
        activityIdRef.current = null;
      }
    },
  });

  const card = useMemo(() => FORMAT_CARDS.find((c) => c.id === format)!, [format]);

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
        aria-label="Export report"
        className={cn(
          'relative flex w-[640px] max-w-[92vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <FileDown className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">Export report</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-2 p-4">
          {FORMAT_CARDS.map((c) => {
            const Icon = c.Icon;
            const active = c.id === format;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setFormat(c.id)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-[var(--rb-blue)] bg-[var(--rb-bg-active)]'
                    : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border-strong)]',
                )}
              >
                <Icon className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
                <p className="text-sm font-medium text-[var(--rb-text-primary)]">{c.label}</p>
                <p className="text-[10px] text-[var(--rb-text-muted)]">{c.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="border-t border-[var(--rb-border-subtle)] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
                Filename
              </p>
              <div className="flex items-center gap-1">
                <input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="rb-finding-input flex-1"
                />
                <span className="font-mono text-xs text-[var(--rb-text-muted)]">.{card.defaultExt}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--rb-text-muted)]">
                Options
              </p>
              <label className="flex items-center gap-2 text-xs text-[var(--rb-text-secondary)]">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                />
                Include cover page
              </label>
              {format === 'pdf' && (
                <label className="flex items-center gap-2 text-[11px] text-[var(--rb-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={pagedLayout}
                    onChange={(e) => setPagedLayout(e.target.checked)}
                  />
                  Per-page layout engine (beta)
                </label>
              )}
            </div>
          </div>

          {done && done.bytes > 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-[var(--rb-green)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Saved {Math.round(done.bytes / 1024)} kB,{' '}
              <span className="font-mono text-[var(--rb-text-secondary)]">
                {done.filepath ?? done.filename}
              </span>
            </p>
          )}
          {run.isError && (
            <p className="mt-3 text-xs text-[var(--rb-red)]">Export failed: {run.error.message}</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--rb-border-subtle)] px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => run.mutate()} disabled={run.isPending || !reportId}>
            {run.isPending ? 'Exporting…' : 'Export'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
