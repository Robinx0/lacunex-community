import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Send,
  Check,
  FileType2,
  Globe,
  FileText as FileTextIcon,
  FileBox,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useMutation } from '@/lib/query';
import type { CoverOptions, CustomCover, Report, ReportMeta } from '@shared/types';
import type { CoverEntry } from '@/lib/preview/coverRegistry';
import type { ExportFormat, IpcOutput } from '@shared/ipc-contracts';
import { COVER_REGISTRY, getCoverEntry } from '@/lib/preview/coverRegistry';
import { ipc } from '@/lib/ipc';
import { useUpdateReport } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { slugify } from '@shared/util/text';
import { cn } from '@/lib/utils';

export interface PublishViewProps {
  report: Report;
}

interface FormatCard {
  id: ExportFormat;
  label: string;
  hint: string;
  Icon: typeof FileType2;
}

const FORMATS: FormatCard[] = [
  { id: 'pdf', label: 'PDF', hint: 'Print-ready, paginated, with covers.', Icon: FileType2 },
  { id: 'html', label: 'HTML', hint: 'Standalone single-file with inlined styles.', Icon: Globe },
  { id: 'markdown', label: 'Markdown', hint: 'Plain GFM, for git, wikis, SSGs.', Icon: FileTextIcon },
  { id: 'word', label: 'Word', hint: 'Editable .docx for client review.', Icon: FileBox },
];

interface ContentOptions {
  cover: boolean;
  toc: boolean;
  matrix: boolean;
  evidence: boolean;
  pii: boolean;
  watermark: boolean;
  /**
   * Beta: route PDF generation through the paged.js polyfill so the
   * document gets pre-paginated client-side before printToPDF
   * captures. Word-style per-page chrome and pagination — every page
   * is a real `<div class="pagedjs_page">` DOM object.
   * Off by default; only meaningful for `format === 'pdf'`.
   */
  pagedLayout: boolean;
}

/**
 * Final-stage surface. Layout matches the GlassNote reference:
 *
 *   [ cover gallery + format chooser ]   [ options & Generate CTA ]
 *
 * Cover-card click writes through to `report.coverId` (and pairs the
 * report theme + accent atomically, like everywhere else). Format
 * selection drives the inline export. The Generate button at the
 * bottom of the right rail performs the export — no modal required.
 */
export function PublishView({ report }: PublishViewProps): JSX.Element {
  const [format, setFormatRaw] = useState<ExportFormat>('pdf');
  const [options, setOptionsRaw] = useState<ContentOptions>({
    cover: true,
    toc: true,
    matrix: true,
    evidence: true,
    pii: false,
    watermark: true,
    // Beta on by default — paged.js pre-paginates the document into
    // discrete page objects (Word-style), which gives reliable
    // per-page chrome / margins / break-avoid rules. Users can still
    // toggle off to fall back to Chromium's auto-pagination.
    pagedLayout: true,
  });
  const [filename, setFilenameRaw] = useState(slugify(report.title));
  const [done, setDone] = useState<IpcOutput<'export.run'> | null>(null);

  // Wrap each setter so any change to the export configuration clears
  // the success banner — otherwise a "Generated 245 kB" message lingers
  // after the user picks a different format/cover/option, falsely
  // claiming the new settings produced the old file.
  const setFormat = useCallback((next: ExportFormat) => {
    setDone(null);
    setFormatRaw(next);
  }, []);
  const setOptions = useCallback((next: ContentOptions) => {
    setDone(null);
    setOptionsRaw(next);
  }, []);
  const setFilename = useCallback((next: string) => {
    setDone(null);
    setFilenameRaw(next);
  }, []);

  // Reset filename + clear stale done banner on report switch.
  const lastSeededReportId = useRef<string | null>(null);
  useEffect(() => {
    if (lastSeededReportId.current === report.id) return;
    lastSeededReportId.current = report.id;
    setFilenameRaw(slugify(report.title));
    setDone(null);
  }, [report.id, report.title]);

  const updateReport = useUpdateReport();
  // Stable callback so memoized cover thumbs can short-circuit by ref.
  // Also clears the success banner — picking a new cover invalidates
  // the previously generated file's settings.
  const applyCover = useCallback(
    (coverId: string) => {
      setDone(null);
      const entry = getCoverEntry(coverId);
      updateReport.mutate({
        id: report.id,
        coverId: entry.id,
        reportTheme: entry.reportTheme,
        reportAccent: entry.reportAccent,
      });
    },
    [report.id, updateReport],
  );

  const run = useMutation<IpcOutput<'export.run'>, Error>({
    mutationFn: () =>
      ipc.exports.run({
        reportId: report.id,
        format,
        filename,
        options: {
          includeCover: options.cover,
          // pagedLayout only meaningful for PDF — for HTML/MD/Word/JSON
          // the option is harmless to send (ignored downstream).
          pagedLayout: options.pagedLayout,
        },
      }),
    onSuccess: (result) => {
      setDone(result);
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-1">
      <main className="flex h-full min-w-0 flex-1 flex-col bg-[var(--rb-bg-base)]">
        <PublishToolbar />
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto w-full max-w-[820px] min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold text-[var(--rb-text-primary)] [overflow-wrap:anywhere]">
              <span>Publish</span>
              <span className="min-w-0 font-normal text-[var(--rb-text-muted)]">— {report.title}</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--rb-text-secondary)]">
              Pick the cover and format. The right rail tunes content options. When you&apos;re ready,
              hit <span className="rb-mono">Generate</span>. The file lands on disk.
            </p>

            <Step label="01 · Cover design" hint={getCoverEntry(report.coverId).name}>
              <CoverGallery activeId={report.coverId} onPick={applyCover} report={report} />
            </Step>

            <Step label="02 · Output format" hint={FORMATS.find((f) => f.id === format)?.label}>
              <FormatGrid value={format} onChange={setFormat} />
            </Step>
          </div>
        </div>
      </main>

      <PublishSidebar
        report={report}
        format={format}
        options={options}
        setOptions={setOptions}
        filename={filename}
        setFilename={setFilename}
        done={done}
        running={run.isPending}
        error={run.error?.message ?? null}
        onGenerate={() => run.mutate()}
      />
    </div>
  );
}

function PublishToolbar(): JSX.Element {
  return (
    <header className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-4 py-2">
      <Send className="h-3.5 w-3.5 shrink-0 text-[var(--rb-blue)]" aria-hidden />
      <span className="rb-section-label shrink-0">Publish</span>
      <span className="rb-mono ml-auto truncate text-[10px] uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
        Read-only · final preview
      </span>
    </header>
  );
}

function Step({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="rb-mono shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
          {label}
        </span>
        {hint && (
          <span className="min-w-0 truncate text-[11px] text-[var(--rb-text-muted)]">
            Selected · <span className="text-[var(--rb-blue)]">{hint}</span>
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function CoverGallery({
  activeId,
  onPick,
  report,
}: {
  activeId: string;
  onPick: (id: string) => void;
  report: Report;
}): JSX.Element {
  // Responsive: at narrow widths (when the right rail is open) three
  // columns squeezed each thumbnail to ~120px and the cover artwork
  // overflowed before the parent could clip. Step down to 2 / 1
  // columns first so each thumb stays large enough to render legibly.
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {COVER_REGISTRY.map((c) => (
        <CoverThumb
          key={c.id}
          cover={c}
          meta={report.meta}
          customCover={report.customCover}
          coverOptions={report.coverOptions}
          active={c.id === activeId}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

/**
 * Each thumbnail renders a real Cover component scaled to ~20% — that's
 * heavy SVG/gradient work. Memoized on `cover` (stable from the registry),
 * `meta`, `customCover`, `active`, and `onPick` so toggling a sidebar
 * option or typing in the filename input doesn't repaint all 9 covers.
 */
const CoverThumb = memo(function CoverThumb({
  cover,
  meta,
  customCover,
  coverOptions,
  active,
  onPick,
}: {
  cover: CoverEntry;
  meta: ReportMeta;
  customCover: CustomCover;
  coverOptions: CoverOptions;
  active: boolean;
  onPick: (id: string) => void;
}): JSX.Element {
  const Cover = cover.component;
  return (
    <button
      type="button"
      onClick={() => onPick(cover.id)}
      aria-pressed={active}
      className={cn(
        'group flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-md border bg-[var(--rb-bg-faint)] p-2 text-left transition-all',
        active
          ? 'border-[var(--rb-blue)] shadow-pop'
          : 'border-[var(--rb-border-subtle)] hover:border-[var(--rb-border)]',
      )}
    >
      {/* Outer wrapper holds the page aspect ratio; `overflow-hidden`
          here is the hard clip for any cover that bleeds. The inner
          scaler renders the cover at 5× then transforms back to 1×, so
          the cover's own pixel-perfect typography stays intact while
          the thumbnail itself stays inside its grid cell. */}
      <div
        className="relative w-full overflow-hidden rounded"
        style={{ aspectRatio: '8.5 / 11' }}
        data-report-theme={cover.reportTheme}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: '500%',
            height: '500%',
            transform: 'scale(0.2)',
          }}
        >
          <Cover meta={meta} customCover={customCover} coverOptions={coverOptions} />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-[var(--rb-text-primary)]">
            {cover.name}
          </p>
          <p className="truncate text-[10px] text-[var(--rb-text-muted)]">{cover.tag}</p>
        </div>
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors',
            active
              ? 'bg-[var(--rb-blue)] text-white'
              : 'border border-[var(--rb-border-strong)] text-transparent group-hover:text-[var(--rb-text-muted)]',
          )}
          aria-hidden
        >
          <Check className="h-2.5 w-2.5" />
        </span>
      </div>
    </button>
  );
});

function FormatGrid({
  value,
  onChange,
}: {
  value: ExportFormat;
  onChange: (f: ExportFormat) => void;
}): JSX.Element {
  // Single column on narrow main areas — at <420px the 2-col layout
  // wraps each format hint into 4-5 lines and the radio dot drifts off
  // the baseline. The buttons themselves stay full-width but readable.
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FORMATS.map((f) => {
        const active = f.id === value;
        const Icon = f.Icon;
        return (
          <button
            type="button"
            key={f.id}
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={cn(
              'flex w-full items-start gap-3 overflow-hidden rounded-md border p-3 text-left transition-colors',
              active
                ? 'border-[var(--rb-blue)] bg-[var(--rb-bg-active)]'
                : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border)]',
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rb-blue)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--rb-text-primary)]">{f.label}</p>
              <p className="text-[11px] text-[var(--rb-text-muted)] [overflow-wrap:anywhere]">{f.hint}</p>
            </div>
            <span
              className={cn(
                'rb-mono mt-0.5 shrink-0 text-[10px]',
                active ? 'text-[var(--rb-blue)]' : 'text-[var(--rb-text-subtle)]',
              )}
            >
              {active ? '●' : '○'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PublishSidebar({
  report,
  format,
  options,
  setOptions,
  filename,
  setFilename,
  done,
  running,
  error,
  onGenerate,
}: {
  report: Report;
  format: ExportFormat;
  options: ContentOptions;
  setOptions: (next: ContentOptions) => void;
  filename: string;
  setFilename: (next: string) => void;
  done: IpcOutput<'export.run'> | null;
  running: boolean;
  error: string | null;
  onGenerate: () => void;
}): JSX.Element {
  const ext =
    format === 'pdf'
      ? 'pdf'
      : format === 'html'
        ? 'html'
        : format === 'markdown'
          ? 'md'
          : 'docx';
  const onCount = Object.values(options).filter(Boolean).length;

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-[var(--rb-border)] bg-[var(--rb-bg-sidebar)] xl:w-[360px]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border)] bg-[var(--rb-bg-base)] px-3 py-2.5">
        <span className="rb-section-label">Output options</span>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <Section label="Distribution">
          <Row k="Recipients" v={String(report.meta.distribution.split(',').filter(Boolean).length || 0)} />
          <Row k="Classification" v={report.meta.classification || '—'} />
          <Row k="Engagement" v={`${report.meta.startDate} — ${report.meta.endDate}`} />
        </Section>

        <Section label="Content">
          <ToggleRow
            label="Include cover page"
            desc="Adds the selected cover as page 1"
            value={options.cover}
            onClick={() => setOptions({ ...options, cover: !options.cover })}
          />
          <ToggleRow
            label="Auto table of contents"
            desc="Generated from h1 / h2"
            value={options.toc}
            onClick={() => setOptions({ ...options, toc: !options.toc })}
          />
          <ToggleRow
            label="Severity matrix"
            desc="Heatmap of findings before details"
            value={options.matrix}
            onClick={() => setOptions({ ...options, matrix: !options.matrix })}
          />
          <ToggleRow
            label="Embed evidence"
            desc="Inline screenshots & files"
            value={options.evidence}
            onClick={() => setOptions({ ...options, evidence: !options.evidence })}
          />
        </Section>

        <Section label="Privacy">
          <ToggleRow
            label="Redact PII"
            desc="Mask emails, IPs, identifiers"
            value={options.pii}
            onClick={() => setOptions({ ...options, pii: !options.pii })}
          />
          <ToggleRow
            label="Watermark"
            desc="Recipient name on every page"
            value={options.watermark}
            onClick={() => setOptions({ ...options, watermark: !options.watermark })}
          />
        </Section>

        {format === 'pdf' && (
          <Section label="Advanced (beta)">
            <ToggleRow
              label="Per-page layout engine"
              desc="paged.js. Slower, but more predictable per-page chrome and margins."
              value={options.pagedLayout}
              onClick={() => setOptions({ ...options, pagedLayout: !options.pagedLayout })}
            />
          </Section>
        )}

        <Section label="Filename">
          <div className="flex items-center gap-1">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="rb-finding-input rb-mono flex-1"
            />
            <span className="rb-mono text-[10px] text-[var(--rb-text-muted)]">.{ext}</span>
          </div>
        </Section>

        {done && done.bytes > 0 && (
          <p className="flex items-start gap-2 rounded border border-[var(--rb-green-bg)] bg-[var(--rb-green-bg)] px-2 py-1.5 text-[11px] text-[var(--rb-green)]">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0">
              Generated {(done.bytes / 1024).toFixed(0)} kB
              <br />
              <span className="rb-mono text-[10px] opacity-80">
                {done.filepath ?? done.filename}
              </span>
            </span>
          </p>
        )}
        {error && (
          <p className="flex items-start gap-2 rounded border border-[var(--rb-red-bg)] bg-[var(--rb-red-bg)] px-2 py-1.5 text-[11px] text-[var(--rb-red)]">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--rb-border)] bg-[var(--rb-bg-base)] p-3">
        <p className="rb-mono mb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--rb-text-muted)]">
          {format.toUpperCase()} · {onCount} option{onCount === 1 ? '' : 's'} on
        </p>
        <Button size="lg" className="w-full" onClick={onGenerate} disabled={running}>
          <Send className="h-3.5 w-3.5" aria-hidden />
          {running ? 'Generating…' : 'Generate'}
        </Button>
      </footer>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <section>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      <div className="rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] divide-y divide-[var(--rb-border-subtle)]">
        {children}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="rb-section-label shrink-0">{k}</span>
      <span
        className="rb-mono min-w-0 truncate text-right text-[11px] text-[var(--rb-text-primary)]"
        title={v}
      >
        {v}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onClick,
}: {
  label: string;
  desc: string;
  value: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={value}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--rb-bg-hover)]"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[var(--rb-text-primary)]">{label}</p>
        <p className="text-[10px] text-[var(--rb-text-muted)]">{desc}</p>
      </div>
      <span
        className={cn(
          'relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors',
          value ? 'bg-[var(--rb-blue)]' : 'bg-[var(--rb-bg-active)]',
        )}
        aria-hidden
      >
        <span
          className="absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all"
          style={{ left: value ? '14px' : '2px' }}
        />
      </span>
    </button>
  );
}
