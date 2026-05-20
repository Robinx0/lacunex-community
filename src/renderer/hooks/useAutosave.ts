import { useEffect, useRef, useState } from 'react';
import type { Block } from '@shared/types';
import { useUpdateReport } from './useReports';
import { blocksEqual, diffBlocks } from '@/lib/editor/blocksBridge';
import { useActivityStore } from '@/stores/activityStore';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 800;

interface PendingSave {
  reportId: string;
  toSave: Block[];
  previous: Block[] | null;
}

/**
 * Debounced autosave for the active report's block list. Drives the topbar's
 * Save indicator via `status`. Skips writes when the new block list is
 * structurally equal to the last persisted snapshot.
 *
 * Wire format is a **diff** — we only send the blocks that changed and the
 * IDs of the ones that disappeared. With deterministic block IDs from
 * `tiptapDocToBlocks`, a single-keystroke edit ships ~1 block over IPC
 * instead of the entire document.
 *
 * Pending saves are flushed when the report changes or the hook unmounts —
 * otherwise switching reports mid-debounce silently drops the user's last
 * 800 ms of typing.
 */
export function useAutosave(
  reportId: string | null,
  blocks: Block[] | null,
): { status: AutosaveStatus } {
  const update = useUpdateReport();
  const setAutosaveActivity = useActivityStore((s) => s.setAutosave);
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  // Mirror local status into the activity feed so the sidebar strip
  // surfaces the save lifecycle. The store collapses pending → no-op,
  // saving → running entry, saved → success flash, error → persistent
  // error row. See activityStore.setAutosave for the mapping.
  useEffect(() => {
    if (status === 'idle') return;
    setAutosaveActivity(status === 'pending' ? 'pending' : status === 'saving' ? 'saving' : status === 'error' ? 'error' : 'saved');
  }, [status, setAutosaveActivity]);
  const lastSavedRef = useRef<Block[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PendingSave | null>(null);
  // Stash the mutation in a ref so the flush path (which can run during
  // unmount) doesn't depend on a stale captured `update` from an old render.
  const updateRef = useRef(update);
  updateRef.current = update;

  // Imperative flush — runs the pending diff immediately and clears the
  // queue. Used both as the debounce-fire callback and the unmount /
  // report-switch flush.
  //
  // Failure handling: `pendingRef` is cleared synchronously *before* the
  // mutate, so an in-flight failure leaves the hook with no record of
  // what was being saved. To avoid losing edits across a report switch
  // that races a failing mutation, we re-queue the failed payload onto
  // `pendingRef` from `onError`. Within the same report, `lastSavedRef`
  // is intentionally NOT advanced on error, so the next keystroke would
  // already re-bundle the failed content; the re-queue covers the
  // unmount-during-mutate window where no further keystroke comes.
  function flush(): void {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const diff = diffBlocks(pending.previous, pending.toSave);
    if (diff.upsert.length === 0 && diff.delete.length === 0) {
      lastSavedRef.current = pending.toSave;
      setStatus('saved');
      return;
    }
    setStatus('saving');
    updateRef.current.mutate(
      {
        id: pending.reportId,
        blocksUpsert: diff.upsert,
        blocksDelete: diff.delete,
      },
      {
        onSuccess: () => {
          lastSavedRef.current = pending.toSave;
          setStatus('saved');
        },
        onError: () => {
          // Re-queue ONLY if nothing newer has landed since the failed
          // attempt — a fresher pending entry is the truth, and would
          // already include the failed content (lastSavedRef wasn't
          // bumped on error). Without this guard, fast typing during a
          // failed save could roll a newer payload back to an older one.
          if (pendingRef.current === null) {
            pendingRef.current = pending;
          }
          setStatus('error');
        },
      },
    );
  }

  useEffect(() => {
    if (!reportId || !blocks) return;

    if (lastSavedRef.current === null) {
      // First snapshot for this report — treat as already saved.
      lastSavedRef.current = blocks;
      setStatus('saved');
      return;
    }
    if (blocksEqual(lastSavedRef.current, blocks)) {
      // Selection-only update or genuine no-op — drop any stale pending
      // entry so a stray flush doesn't re-fire it.
      pendingRef.current = null;
      setStatus('saved');
      return;
    }

    pendingRef.current = {
      reportId,
      toSave: blocks,
      previous: lastSavedRef.current,
    };
    setStatus('pending');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    // No cleanup here — the cleanup on a per-keystroke effect would clear
    // the timer every keystroke, which is what we already do above. The
    // unmount / report-switch flush lives in the next effect.
  }, [reportId, blocks]);

  // Reset the snapshot cache and flush any pending save when the report
  // changes. The cleanup also runs on full unmount, catching the case
  // where the user navigates away mid-debounce.
  useEffect(() => {
    return () => {
      flush();
      lastSavedRef.current = null;
      setStatus('idle');
    };
    // We intentionally key only on `reportId` — `flush` reads everything
    // it needs through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  return { status };
}
