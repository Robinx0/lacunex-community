import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Share2,
  ChevronDown,
  Circle,
  PanelLeft,
  PanelRight,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeStepper } from './ModeStepper';
import { useUiStore } from '@/stores/uiStore';
import { useReportList } from '@/hooks/useReports';
import { clockTime } from '@/lib/format';
import { APP_NAME } from '@shared/constants';
import { cn } from '@/lib/utils';

export interface TopBarProps {
  saved: boolean;
  reportTitle: string;
  reportDocId?: string;
  reportVersion?: string;
  onExport: () => void;
  /** Last-saved timestamp shown after the SAVED dot. */
  savedAt?: number;
}

const APP_VERSION = '0.1';

/**
 * Three-zone topbar:
 *
 *   [ wordmark · v ] [ report breadcrumb ▾ ]   [ Compose Review Publish ]   [ ● SAVED HH:MM | ⌘K | @ Share | theme ]
 *
 * Wordmark + breadcrumb anchor "where am I in the workspace". The center
 * stepper anchors "what phase". The right zone is status + actions.
 */
export function TopBar({
  saved,
  reportTitle,
  reportDocId,
  reportVersion,
  onExport,
  savedAt,
}: TopBarProps): JSX.Element {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const previewCollapsed = useUiStore((s) => s.previewCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const openModal = useUiStore((s) => s.openModal);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-3">
      {/* Left zone: panel toggle + wordmark + breadcrumb */}
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleSidebar}
        title={`${sidebarCollapsed ? 'Show' : 'Hide'} sidebar (Ctrl+\\)`}
        aria-label="Toggle sidebar"
      >
        <PanelLeft
          className="h-3.5 w-3.5"
          style={{ opacity: sidebarCollapsed ? 0.5 : 1 }}
          aria-hidden
        />
      </Button>

      <Wordmark />

      <ReportBreadcrumb
        reportTitle={reportTitle}
        reportDocId={reportDocId}
        reportVersion={reportVersion}
      />

      {/* Center zone: workflow stepper. `mx-auto` pushes the right zone right. */}
      <div className="ml-auto flex items-center">
        <ModeStepper />
      </div>

      {/* Right zone: status + global actions */}
      <div className="ml-auto flex items-center gap-1">
        <SavedIndicator saved={saved} ts={savedAt} />

        <div className="mx-1 h-4 w-px bg-[var(--rb-border-subtle)]" aria-hidden />

        <Button
          size="sm"
          variant="ghost"
          onClick={onExport}
          title="Export (Ctrl+E)"
          aria-label="Export"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Share</span>
        </Button>

        <SearchButton />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => openModal('settings')}
          title="Settings (Ctrl+,)"
          aria-label="Open settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={togglePreview}
          title={`${previewCollapsed ? 'Show' : 'Hide'} preview (Ctrl+.)`}
          aria-label="Toggle preview"
        >
          <PanelRight
            className="h-3.5 w-3.5"
            style={{ opacity: previewCollapsed ? 0.5 : 1 }}
            aria-hidden
          />
        </Button>
      </div>
    </header>
  );
}

function Wordmark(): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-1" aria-label="Workspace">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--rb-blue-bg)] text-[10px] font-bold text-[var(--rb-blue)]"
        aria-hidden
      >
        L
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--rb-text-primary)]">
          {APP_NAME.split(' ')[0]}
        </span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
          studio · v{APP_VERSION}
        </span>
      </div>
    </div>
  );
}

function ReportBreadcrumb({
  reportTitle,
  reportDocId,
  reportVersion,
}: {
  reportTitle: string;
  reportDocId?: string;
  reportVersion?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const list = useReportList(false);
  const reports = list.data ?? [];
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);
  const activeId = useUiStore((s) => s.activeReportId);

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

  return (
    <div ref={ref} className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-[var(--rb-bg-hover)] focus:outline-none focus-visible:bg-[var(--rb-bg-hover)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Circle className="h-1.5 w-1.5 fill-[var(--rb-blue)] text-[var(--rb-blue)]" aria-hidden />
        <span className="max-w-[280px] truncate text-sm font-medium text-[var(--rb-text-primary)]">
          {reportTitle}
        </span>
        {reportVersion && (
          <span className="rb-mono shrink-0 rounded bg-[var(--rb-bg-active)] px-1.5 py-px text-[10px] text-[var(--rb-text-secondary)]">
            v{reportVersion}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-3 w-3 text-[var(--rb-text-muted)] transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {reportDocId && (
        <span
          className="rb-mono ml-1 hidden text-[10px] text-[var(--rb-text-subtle)] md:inline"
          title="Document ID"
        >
          {reportDocId}
        </span>
      )}

      {open && (
        <div
          role="listbox"
          aria-label="Switch report"
          className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[300px] rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] p-1 shadow-pop"
        >
          {reports.map((r) => {
            const active = r.id === activeId;
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                key={r.id}
                onClick={() => {
                  setActiveReportId(r.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                  active ? 'bg-[var(--rb-bg-active)]' : 'hover:bg-[var(--rb-bg-hover)]',
                )}
              >
                <Circle
                  className={cn(
                    'h-1.5 w-1.5 shrink-0',
                    active
                      ? 'fill-[var(--rb-blue)] text-[var(--rb-blue)]'
                      : 'text-[var(--rb-text-muted)]',
                  )}
                  aria-hidden
                />
                <span className="truncate text-sm text-[var(--rb-text-primary)]">{r.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavedIndicator({ saved, ts }: { saved: boolean; ts?: number }): JSX.Element {
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]"
      aria-live="polite"
    >
      <Circle
        className={cn(
          'h-1.5 w-1.5 transition-colors',
          saved
            ? 'fill-[var(--rb-green)] text-[var(--rb-green)]'
            : 'fill-[var(--rb-yellow)] text-[var(--rb-yellow)] animate-pulse',
        )}
        aria-hidden
      />
      <span className="text-[var(--rb-text-muted)]">{saved ? 'SAVED' : 'SAVING'}</span>
      {ts && (
        <span className="rb-mono rb-tabular text-[var(--rb-text-subtle)]">{clockTime(ts)}</span>
      )}
    </span>
  );
}

function SearchButton(): JSX.Element {
  const openModal = useUiStore((s) => s.openModal);
  return (
    <Button
      size="sm"
      variant="ghost"
      title="Open command palette (Ctrl+K)"
      aria-label="Open command palette"
      onClick={() => openModal('commandPalette')}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="rb-mono hidden text-[10px] text-[var(--rb-text-muted)] md:inline">⌘K</span>
    </Button>
  );
}
