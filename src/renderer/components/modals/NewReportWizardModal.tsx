import { useEffect, useMemo, useRef, useState } from 'react';
import { X, FileText, Wand2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateReport, useUpdateReport } from '@/hooks/useReports';
import { useTemplateList } from '@/hooks/useTemplates';
import { useUiStore } from '@/stores/uiStore';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { newPrefixedId } from '@/lib/ids';
import { ipc } from '@/lib/ipc';
import { markdownToBlocks } from '@/lib/markdownToBlocks';
import type { Block, ReportMeta, Template } from '@shared/types';
import { cn } from '@/lib/utils';

export interface NewReportWizardModalProps {
  open: boolean;
  onClose: () => void;
}

interface ReportKind {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Template `name` to match against the `Reports` category. `null` = no preload. */
  templateName: string | null;
  coverId: string;
  theme: 'light' | 'dark';
  metaDefaults: Partial<ReportMeta>;
  /** Default-enable the Table of Contents for this kind. Mostly used
   *  by exam-report kinds where a TOC is a near-universal convention. */
  tocEnabled?: boolean;
}

const REPORT_KINDS: ReportKind[] = [
  {
    id: 'rca',
    label: 'Engineering Postmortem',
    description: 'Blameless incident postmortem — timeline, impact, root cause, action items.',
    icon: '🛠️',
    templateName: 'Engineering Postmortem',
    coverId: 'corporate-light',
    theme: 'light',
    metaDefaults: { classification: 'Internal' },
  },
  {
    id: 'incident',
    label: 'Security Incident',
    description: 'Breach response — detection, scope, IOCs, containment, recovery.',
    icon: '🚨',
    templateName: 'Security Incident Report',
    coverId: 'blackops-dark',
    theme: 'dark',
    metaDefaults: { classification: 'Confidential' },
  },
  {
    id: 'audit',
    label: 'Audit Gap Assessment',
    description: 'Compliance gap report against SOC 2 · ISO 27001 · HIPAA · PCI · NIST.',
    icon: '📋',
    templateName: 'Audit Gap Assessment',
    coverId: 'corporate-light',
    theme: 'light',
    metaDefaults: { engagementType: 'Compliance Assessment', classification: 'Confidential' },
  },
  {
    id: 'consulting',
    label: 'Consulting Assessment',
    description: 'Generic deliverable — current state, observations, prioritized roadmap.',
    icon: '💼',
    templateName: 'Consulting Assessment',
    coverId: 'minimal-light',
    theme: 'light',
    metaDefaults: { classification: 'Confidential' },
  },
  {
    id: 'status',
    label: 'Project Status Report',
    description: 'Recurring status update — highlights, progress, risks, decisions, next period.',
    icon: '📊',
    templateName: 'Project Status Report',
    coverId: 'minimal-light',
    theme: 'light',
    metaDefaults: { classification: 'Internal' },
  },
  {
    id: 'research',
    label: 'Research Report',
    description: 'Technical research — abstract, methodology, findings, discussion, references.',
    icon: '🔬',
    templateName: 'Research Report',
    coverId: 'corporate-light',
    theme: 'light',
    metaDefaults: { classification: 'Public' },
  },
  {
    id: 'exec',
    label: 'Executive Brief',
    description: 'Short-format briefing. TL;DR, options, recommendation, decision required.',
    icon: '📑',
    templateName: 'Executive Brief',
    coverId: 'corporate-dark',
    theme: 'dark',
    metaDefaults: { classification: 'Confidential' },
  },
  {
    id: 'pentest',
    label: 'Pentest Engagement',
    description: 'Pentest scaffold. Add findings via the slash menu or finding library.',
    icon: '🛡️',
    templateName: null,
    coverId: 'blackops-dark',
    theme: 'dark',
    metaDefaults: {
      engagementType: 'External',
      methodology: 'OWASP Testing Guide v4',
      classification: 'Confidential',
    },
  },
  {
    id: 'oscp',
    label: 'Exam Report — OSCP',
    description:
      'Offensive Security OSCP exam report — OSID, methodology, per-target writeups, AD set, proof.txt / local.txt.',
    icon: '🎯',
    templateName: 'OSCP Exam Report',
    coverId: 'oscp-crimson',
    theme: 'dark',
    tocEnabled: true,
    metaDefaults: {
      project: 'OSCP Exam Report',
      client: 'Offensive Security',
      docId: 'OS-XXXXX',
      reportVersion: '1.0',
      engagementType: 'OSCP Exam',
      methodology: 'Offensive Security Methodology',
      authors: 'student@youremailaddress.com',
      classification: 'Confidential',
      distribution: 'Offensive Security · Student',
    },
  },
  {
    id: 'examcard',
    label: 'Exam Report — Generic',
    description:
      'Generic certification exam report — CRTP, CRTO, OSEP, OSWP, PNPT, eJPT, etc. Spine cover · cream paper + colored book-spine.',
    icon: '🎓',
    templateName: 'OSCP Exam Report',
    coverId: 'spine-ink',
    theme: 'light',
    tocEnabled: true,
    metaDefaults: {
      project: 'Certification Exam Report',
      client: 'Examining Body',
      docId: 'CERT-XXXX',
      reportVersion: '1.0',
      engagementType: 'Exam',
      methodology: 'Vendor Methodology',
      authors: 'candidate@youremailaddress.com',
      classification: 'Confidential',
      distribution: 'Examining Body · Candidate',
    },
  },
  {
    id: 'blank',
    label: 'Blank report',
    description: 'Empty document. Add sections via the slash menu.',
    icon: '📄',
    templateName: null,
    coverId: 'blackops-dark',
    theme: 'dark',
    metaDefaults: {},
  },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function suggestedTitle(kind: ReportKind): string {
  return `${kind.label} — ${todayIso()}`;
}

/**
 * Re-key blocks coming out of a saved template so the freshly created
 * report doesn't collide with template-seeded block IDs (which use
 * deterministic `b_tpl_<slug>_<n>` strings). After autosave round-trips,
 * `tiptapDocToBlocks` will compute its own deterministic IDs from
 * content, so these are only the initial DB row keys.
 */
function rekeyTemplateBlocks(blocks: Block[]): Block[] {
  return blocks.map((b, i) => ({
    ...b,
    id: newPrefixedId('b'),
    position: i,
    ...(b.attrs ? { attrs: { ...b.attrs } } : {}),
  }));
}

export function NewReportWizardModal({ open, onClose }: NewReportWizardModalProps): JSX.Element | null {
  const create = useCreateReport();
  const update = useUpdateReport();
  const templates = useTemplateList('Reports');
  const setActiveReportId = useUiStore((s) => s.setActiveReportId);

  const [kindId, setKindId] = useState<string>(REPORT_KINDS[0].id);
  const [title, setTitle] = useState<string>(suggestedTitle(REPORT_KINDS[0]));
  /** Tracks whether the user has manually edited the title — once true, stop auto-prefilling. */
  const [titleDirty, setTitleDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const { mounted, phase } = useModalLifecycle(open);
  useModalA11y(panelRef, open);

  // Focus the title input on open, deferred a tick so useModalA11y can
  // claim the panel first without our focus losing the race.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const kind = useMemo(
    () => REPORT_KINDS.find((k) => k.id === kindId) ?? REPORT_KINDS[0],
    [kindId],
  );

  // Reset state on every open. Picking the user's *previous* selection is a
  // "remember context across modals" UX bet we're not making here — fresh
  // wizard each time keeps the cognitive model simple.
  useEffect(() => {
    if (!open) return;
    setKindId(REPORT_KINDS[0].id);
    setTitle(suggestedTitle(REPORT_KINDS[0]));
    setTitleDirty(false);
    setError(null);
    setSubmitting(false);
  }, [open]);

  // Prefill title when the user clicks a different kind, but only until
  // they've manually edited the title. After that, leave it alone.
  useEffect(() => {
    if (!titleDirty) setTitle(suggestedTitle(kind));
  }, [kind, titleDirty]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  if (!mounted) return null;
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 zoom-in-95 duration-150'
      : 'animate-out fade-out-0 zoom-out-95 duration-150';

  const matchingTemplate: Template | undefined = kind.templateName
    ? (templates.data ?? []).find((t) => t.name === kind.templateName)
    : undefined;

  // If a template was expected but isn't loaded yet, surface that as a wait
  // rather than silently creating a blank report.
  const waitingForTemplate =
    kind.templateName !== null && !matchingTemplate && !templates.isError;

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Give the report a title.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        coverId: kind.coverId,
        reportTheme: kind.theme,
        meta: kind.metaDefaults,
      });

      if (matchingTemplate) {
        const blocks = rekeyTemplateBlocks(matchingTemplate.blocks);
        await update.mutateAsync({ id: created.id, blocks });
      }

      setActiveReportId(created.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the report.');
      setSubmitting(false);
    }
  };

  /**
   * Alternative entry path — the user picked an existing markdown file
   * to seed a fresh report. Bypasses kind/template selection: we name
   * the report after the file's basename, parse the body to Block[]
   * via markdownToBlocks, and create.
   */
  const handleImportFile = async (): Promise<void> => {
    setError(null);
    setSubmitting(true);
    try {
      const picked = await ipc.app.importFile({});
      if (!picked.picked) {
        setSubmitting(false);
        return;
      }
      const importedTitle = picked.filename.replace(/\.(md|markdown|txt)$/i, '').trim() || picked.filename;
      const blocks = markdownToBlocks(picked.content);
      const created = await create.mutateAsync({
        title: importedTitle,
        coverId: 'corporate-light',
        reportTheme: 'light',
        meta: { classification: 'Internal' },
      });
      await update.mutateAsync({ id: created.id, blocks });
      setActiveReportId(created.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the file.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50', backdropAnim)}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={() => !submitting && onClose()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="New report"
        className={cn(
          'relative flex w-[760px] max-w-[94vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <Wand2 className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">Start a new report</h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--rb-text-muted)]">
              What kind of report?
            </p>
            <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {REPORT_KINDS.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => setKindId(k.id)}
                    aria-pressed={k.id === kindId}
                    className={cn(
                      'flex h-full w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--rb-blue)]',
                      k.id === kindId
                        ? 'border-[var(--rb-blue)] bg-[var(--rb-blue-bg)]'
                        : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base" aria-hidden>
                        {k.icon}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--rb-text-primary)]">
                        {k.label}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[11px] text-[var(--rb-text-secondary)]">
                      {k.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor="new-report-title"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--rb-text-muted)]"
            >
              Title
            </label>
            <div className="relative">
              <FileText
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--rb-text-muted)]"
                aria-hidden
              />
              <input
                id="new-report-title"
                ref={titleInputRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleDirty(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting && !waitingForTemplate) {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="Report title"
                className="rb-finding-input w-full pl-8"
              />
            </div>
            <p className="mt-1.5 text-[10.5px] text-[var(--rb-text-muted)]">
              {kind.templateName
                ? `Pre-loads the “${kind.templateName}” section template.`
                : 'Starts with an empty document — add blocks via the slash menu.'}
              {' · '}
              <span className="rb-mono">{kind.coverId}</span>
              {' · '}
              {kind.theme} theme
            </p>
          </div>

          {error && (
            <p role="alert" className="text-[11px] text-[var(--rb-red)]">
              {error}
            </p>
          )}

          {waitingForTemplate && (
            <p className="text-[11px] text-[var(--rb-text-muted)]">
              Loading template…
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--rb-border-subtle)] px-4 py-3">
          <Button
            variant="ghost"
            onClick={() => void handleImportFile()}
            disabled={submitting}
            title="Open an existing .md / .markdown / .txt file as a new report"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            Import from file…
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting || waitingForTemplate}>
              {submitting ? 'Creating…' : 'Create report'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
