import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Sun, Moon, FileText, Image as ImgIcon, Tags, X } from 'lucide-react';
import type { Report } from '@shared/types';
import {
  COVER_REGISTRY,
  getCoverEntry,
  type CoverEntry,
} from '@/lib/preview/coverRegistry';
import { PaperPage } from './PaperPage';
import { MetadataPanel } from './MetadataPanel';
import { useUpdateReport } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

export interface PreviewPaneProps {
  report: Report;
  onCollapse?: () => void;
}

function previewPaneEqual(prev: PreviewPaneProps, next: PreviewPaneProps): boolean {
  if (prev.onCollapse !== next.onCollapse) return false;
  const a = prev.report;
  const b = next.report;
  return (
    a === b ||
    (a.id === b.id &&
      a.coverId === b.coverId &&
      a.reportTheme === b.reportTheme &&
      a.reportAccent === b.reportAccent &&
      a.title === b.title &&
      a.meta === b.meta &&
      a.customCover === b.customCover &&
      a.coverOptions === b.coverOptions &&
      a.tocEnabled === b.tocEnabled &&
      a.blocks === b.blocks)
  );
}

export const PreviewPane = memo(PreviewPaneInner, previewPaneEqual);

function PreviewPaneInner({ report, onCollapse }: PreviewPaneProps): JSX.Element {
  const update = useUpdateReport();
  const mode = useUiStore((s) => s.previewMode);
  const setMode = useUiStore((s) => s.setPreviewMode);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const activeCover = getCoverEntry(report.coverId);

  useEffect(() => {
    if (!coverPickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setCoverPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCoverPickerOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [coverPickerOpen]);

  const applyCover = (entry: CoverEntry) => {
    update.mutate({
      id: report.id,
      coverId: entry.id,
      reportTheme: entry.reportTheme,
      reportAccent: entry.reportAccent,
    });
    setCoverPickerOpen(false);
  };

  const toggleTheme = () => {
    update.mutate({
      id: report.id,
      reportTheme: report.reportTheme === 'light' ? 'dark' : 'light',
    });
  };

  const Cover = activeCover.component;
  const isDark = report.reportTheme === 'dark';

  const accentStyle = useMemo(
    () => ({
      ['--paper-accent' as string]:
        report.reportAccent ?? activeCover.reportAccent,
    }),
    [report.reportAccent, activeCover.reportAccent],
  );

  return (
    <div className="rb-preview-shell">
      <div className="rb-preview-toolbar">
        <div className="rb-cover-picker" ref={pickerRef}>
          <button
            type="button"
            className="rb-cover-picker__trigger"
            onClick={() => setCoverPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={coverPickerOpen}
          >
            <span
              className="rb-cover-picker__swatch"
              style={{ background: activeCover.swatch, width: 18, height: 18 }}
              aria-hidden
            />
            <span>{activeCover.name}</span>
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
          {coverPickerOpen && (
            <div role="listbox" aria-label="Cover design" className="rb-cover-picker__menu">
              {COVER_REGISTRY.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  role="option"
                  aria-selected={entry.id === activeCover.id}
                  className={cn(
                    'rb-cover-picker__item',
                    entry.id === activeCover.id && 'is-active',
                  )}
                  onClick={() => applyCover(entry)}
                >
                  <span
                    className="rb-cover-picker__swatch"
                    style={{ background: entry.swatch }}
                    aria-hidden
                  />
                  <span className="rb-cover-picker__label">
                    <span className="rb-cover-picker__name">{entry.name}</span>
                    <span className="rb-cover-picker__tag">{entry.tag}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('cover')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
              mode === 'cover'
                ? 'bg-[var(--rb-bg-active)] text-[var(--rb-text-primary)]'
                : 'text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]',
            )}
            aria-pressed={mode === 'cover'}
          >
            <ImgIcon className="h-3 w-3" aria-hidden />
            Cover
          </button>
          <button
            type="button"
            onClick={() => setMode('body')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
              mode === 'body'
                ? 'bg-[var(--rb-bg-active)] text-[var(--rb-text-primary)]'
                : 'text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]',
            )}
            aria-pressed={mode === 'body'}
          >
            <FileText className="h-3 w-3" aria-hidden />
            Body
          </button>
          <button
            type="button"
            onClick={() => setMode('metadata')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs',
              mode === 'metadata'
                ? 'bg-[var(--rb-bg-active)] text-[var(--rb-text-primary)]'
                : 'text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]',
            )}
            aria-pressed={mode === 'metadata'}
            title="Edit cover metadata — OSID, student email, dates, etc."
          >
            <Tags className="h-3 w-3" aria-hidden />
            Metadata
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch report theme to ${isDark ? 'light' : 'dark'}`}
            title={`Switch to ${isDark ? 'light' : 'dark'} report theme`}
            className="ml-1 rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Hide preview"
              title="Hide preview"
              className="rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {mode === 'metadata' ? (
        <MetadataPanel report={report} />
      ) : (
        <div className="rb-preview-canvas" style={accentStyle}>
          {mode === 'cover' ? (
            <div
              className="rb-paper rb-paper--cover"
              data-report-theme={report.reportTheme}
            >
              <Cover
                meta={report.meta}
                customCover={report.customCover}
                coverOptions={report.coverOptions}
              />
            </div>
          ) : (
            <PaperPage
              blocks={report.blocks}
              meta={report.meta}
              reportTheme={report.reportTheme}
              reportAccent={report.reportAccent}
              tocEnabled={report.tocEnabled}
            />
          )}
        </div>
      )}
    </div>
  );
}
