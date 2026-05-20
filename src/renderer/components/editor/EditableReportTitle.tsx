import { useEffect, useState, type KeyboardEvent } from 'react';
import { useReport, useUpdateReport } from '@/hooks/useReports';

export interface EditableReportTitleProps {
  reportId: string;
  /** Authoritative title from the report cache. The component keeps a
   *  local draft while the input is focused and reconciles on blur or
   *  Esc; this prop wins again as soon as editing ends. */
  value: string;
}

/**
 * Click-anywhere-to-rename title field. Renders as a styled input that
 * looks like a heading until you focus it. Enter commits and blurs; Esc
 * cancels and restores the prior value; click-away commits.
 *
 * Title and `meta.project` are mirrored — covers and exports read from
 * `meta.project`, so we update both fields atomically in one IPC call.
 */
export function EditableReportTitle({ reportId, value }: EditableReportTitleProps): JSX.Element {
  const update = useUpdateReport();
  const detail = useReport(reportId);
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  // External title changes (e.g. via the rename dialog) should win whenever
  // we're not actively editing. While editing, the local draft is the
  // truth — losing keystrokes mid-edit because some background mutation
  // resolved would feel awful.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      // Empty / unchanged — restore the canonical value and bail.
      setDraft(value);
      return;
    }
    if (!detail.data) {
      setDraft(value);
      return;
    }
    update.mutate({
      id: reportId,
      title: trimmed,
      meta: { ...detail.data.meta, project: trimmed },
    });
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur(); // triggers commit via onBlur
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      e.currentTarget.blur();
    }
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={onKey}
      placeholder="Untitled report"
      aria-label="Report title (click to rename)"
      title="Click to rename"
      maxLength={200}
      className="rb-editable-title"
    />
  );
}
