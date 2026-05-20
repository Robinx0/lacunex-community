import { useEffect, useMemo, useRef, useState } from 'react';
import type { Block } from '@shared/types';
import { useReport, useReportList } from './useReports';
import { useAutosave } from './useAutosave';
import { useUiStore } from '@/stores/uiStore';

/**
 * Owns the "active report" lifecycle: which report is selected, its server-
 * cached snapshot, the live editor block list, and the autosave loop.
 *
 * Pull this out of App.tsx so the composition root can stay declarative
 * and the editor/sidebar/preview each consume just the slice they need.
 */
export function useActiveReport() {
  const list = useReportList(false);
  const activeReportId = useUiStore((s) => s.activeReportId);
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);

  // Default to the first report once the list resolves.
  useEffect(() => {
    if (!activeReportId && list.data && list.data.length > 0) {
      setActiveReportId(list.data[0].id);
    }
  }, [activeReportId, list.data, setActiveReportId]);

  const detail = useReport(activeReportId);

  // If the persisted `activeReportId` no longer resolves (deleted in
  // another window, wiped DB, stale localStorage) clear it so the next
  // effect can default to the first surviving report.
  useEffect(() => {
    if (!activeReportId) return;
    if (detail.isLoading) return;
    if (detail.data === null) setActiveReportId(null);
  }, [activeReportId, detail.isLoading, detail.data, setActiveReportId]);

  const reportTitle = useMemo(
    () => detail.data?.title ?? (list.isLoading ? 'Loading…' : 'No report'),
    [detail.data?.title, list.isLoading],
  );

  // Live editor blocks — lifted so sidebar (outline + severity counts) and
  // preview can react to typing without waiting for autosave to round-trip.
  // Sync from the cache only when the report ID changes; otherwise every
  // autosave round-trip would overwrite in-flight typing (the detail cache
  // gets a fresh `blocks` reference after each successful save).
  const [editorBlocks, setEditorBlocks] = useState<Block[]>([]);
  const syncedReportIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = detail.data?.id ?? null;
    if (id === syncedReportIdRef.current) return;
    syncedReportIdRef.current = id;
    setEditorBlocks(detail.data?.blocks ?? []);
  }, [detail.data?.id, detail.data?.blocks]);

  const autosave = useAutosave(activeReportId, editorBlocks);

  return {
    activeReportId,
    listIsLoading: list.isLoading,
    report: detail.data ?? null,
    reportTitle,
    editorBlocks,
    setEditorBlocks,
    autosaveStatus: autosave.status,
  };
}
