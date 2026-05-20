import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReport, useUpdateReport } from '@/hooks/useReports';
import { useUiStore } from '@/stores/uiStore';
import { DialogShell } from './DialogShell';
import { SectionLabel } from '@/components/ui/SectionLabel';

/**
 * Edit the three identity fields of a report at once: title (also the
 * `meta.project` mirror), document ID, and version. Persists in a single
 * IPC update call so the listing + breadcrumb refresh together.
 */
export function RenameReportDialog(): JSX.Element | null {
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);
  const open = dialog?.kind === 'renameReport';
  const reportId = open ? dialog.reportId : null;

  const detail = useReport(reportId);
  const update = useUpdateReport();

  const [title, setTitle] = useState('');
  const [docId, setDocId] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hydrate the form fields ONCE per open — on the rising edge of `open`,
  // and again only if the report data hadn't loaded yet at open time. A
  // background refetch (focus, mutation invalidation) used to clobber
  // in-flight typing because this effect re-ran on every `detail.data`
  // identity change.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (!detail.data) return;
    if (seededFor.current === detail.data.id) return;
    seededFor.current = detail.data.id;
    setTitle(detail.data.title);
    setDocId(detail.data.meta.docId);
    setVersion(detail.data.meta.reportVersion);
    setError(null);
  }, [open, detail.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId || !detail.data) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title cannot be empty.');
      return;
    }
    update.mutate(
      {
        id: reportId,
        title: trimmed,
        meta: {
          ...detail.data.meta,
          project: trimmed,
          docId: docId.trim(),
          reportVersion: version.trim(),
        },
      },
      {
        onSuccess: () => close(),
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <DialogShell
      open={open}
      onClose={close}
      title="Rename report"
      icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
      size="regular"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="rb-rename-form"
            size="sm"
            disabled={update.isPending || !title.trim()}
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="rb-rename-form" onSubmit={onSubmit} className="space-y-3">
        <div>
          <SectionLabel className="mb-1">Title</SectionLabel>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Operation Silent Forge"
            className="rb-finding-input"
            data-autofocus
            required
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionLabel className="mb-1">Document ID</SectionLabel>
            <input
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="ACME-2026-Q2"
              className="rb-finding-input rb-mono"
              maxLength={64}
            />
          </div>
          <div>
            <SectionLabel className="mb-1">Version</SectionLabel>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="rb-finding-input rb-mono"
              maxLength={16}
            />
          </div>
        </div>
        {error && (
          <p className="rounded bg-[var(--rb-red-bg)] px-2 py-1.5 text-xs text-[var(--rb-red)]">
            {error}
          </p>
        )}
        <p className="text-[10px] text-[var(--rb-text-muted)]">
          The title is mirrored into <span className="rb-mono">meta.project</span>; cover designs
          that reference it update on next render.
        </p>
      </form>
    </DialogShell>
  );
}
