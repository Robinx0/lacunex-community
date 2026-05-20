import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  FileDown,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { useDuplicateReport, useUpdateReport } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import type { ReportSummary } from '@shared/types';
import { cn } from '@/lib/utils';

export interface ReportCardMenuProps {
  report: ReportSummary;
}

/**
 * Three-dot menu attached to each report card. Replaces the previous
 * straight-to-delete behavior with a real action set: rename, duplicate,
 * export, archive/unarchive, delete. Destructive items live below a
 * separator.
 */
export function ReportCardMenu({ report }: ReportCardMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const duplicate = useDuplicateReport();
  const update = useUpdateReport();

  const openDialog = useUiStore((s) => s.openDialog);
  const openModal = useUiStore((s) => s.openModal);
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const onRename = () => {
    close();
    openDialog({ kind: 'renameReport', reportId: report.id });
  };

  const onDuplicate = () => {
    close();
    duplicate.mutate({ id: report.id });
  };

  const onExport = () => {
    close();
    setActiveReportId(report.id);
    openModal('export');
  };

  const onToggleArchive = () => {
    close();
    update.mutate({ id: report.id, archived: !report.archived });
  };

  const onDelete = () => {
    close();
    openDialog({
      kind: 'confirmDeleteReport',
      reportId: report.id,
      reportTitle: report.title,
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Report options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'rounded p-0.5 text-[var(--rb-text-muted)] transition-opacity hover:text-[var(--rb-text-primary)]',
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <MoreHorizontal className="h-3 w-3" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Report actions"
          className="absolute right-0 top-[calc(100%+4px)] z-30 w-[180px] rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-1 shadow-pop"
        >
          <MenuItem icon={<Pencil className="h-3 w-3" aria-hidden />} onClick={onRename}>
            Rename
            <Shortcut>⌘R</Shortcut>
          </MenuItem>
          <MenuItem icon={<Copy className="h-3 w-3" aria-hidden />} onClick={onDuplicate}>
            Duplicate
          </MenuItem>
          <MenuItem icon={<FileDown className="h-3 w-3" aria-hidden />} onClick={onExport}>
            Export…
            <Shortcut>⌘E</Shortcut>
          </MenuItem>

          <div className="my-1 border-t border-[var(--rb-border-subtle)]" aria-hidden />

          <MenuItem
            icon={
              report.archived ? (
                <ArchiveRestore className="h-3 w-3" aria-hidden />
              ) : (
                <Archive className="h-3 w-3" aria-hidden />
              )
            }
            onClick={onToggleArchive}
          >
            {report.archived ? 'Unarchive' : 'Archive'}
          </MenuItem>

          <MenuItem
            icon={<Trash2 className="h-3 w-3" aria-hidden />}
            onClick={onDelete}
            tone="destructive"
          >
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  tone = 'neutral',
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  tone?: 'neutral' | 'destructive';
}): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors focus:outline-none',
        tone === 'destructive'
          ? 'text-[var(--rb-text-secondary)] hover:bg-[var(--rb-red-bg)] hover:text-[var(--rb-red)]'
          : 'text-[var(--rb-text-secondary)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]',
      )}
    >
      <span className="shrink-0 text-[var(--rb-text-muted)] [button:hover_>_&]:text-current">
        {icon}
      </span>
      <span className="flex flex-1 items-center justify-between gap-2">{children}</span>
    </button>
  );
}

function Shortcut({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="rb-mono shrink-0 text-[9px] text-[var(--rb-text-subtle)]">{children}</span>
  );
}
