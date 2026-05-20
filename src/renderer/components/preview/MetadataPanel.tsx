import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import type { CoverOptions, Report, ReportMeta } from '@shared/types';
import { useUpdateReport } from '@/hooks/useReports';
import { cn } from '@/lib/utils';

export interface MetadataPanelProps {
  report: Report;
}

type StringField = Exclude<keyof ReportMeta, 'scope'>;

interface FieldDef {
  key: StringField;
  label: string;
  hint?: string;
  kind?: 'text' | 'date' | 'textarea';
  group?: string;
}

const FIELDS: FieldDef[] = [
  { group: 'Cover', key: 'project', label: 'Title / Project', hint: 'Hero line on the cover' },
  { key: 'client', label: 'Client / Organization', hint: 'Offensive Security for OSCP' },
  { key: 'docId', label: 'Doc ID / OSID', hint: 'your exam id (e.g. OS-XXXXX)' },
  { key: 'reportVersion', label: 'Version', hint: 'Semver-ish. Bumps appear in the topbar.' },
  { key: 'classification', label: 'Classification', hint: 'Confidential · Internal · Public' },

  { group: 'People', key: 'authors', label: 'Authors / Student email', hint: 'student@youremailaddress.com' },
  { key: 'reviewers', label: 'Reviewers' },
  { key: 'distribution', label: 'Distribution', hint: 'Comma-separated recipients' },

  { group: 'Engagement', key: 'engagementType', label: 'Engagement type', hint: 'External · Internal · OSCP Exam' },
  { key: 'methodology', label: 'Methodology', hint: 'OWASP · Offensive Security Methodology · NIST' },
  { key: 'startDate', label: 'Start date', kind: 'date' },
  { key: 'endDate', label: 'End date', kind: 'date' },

  { group: 'Scope notes', key: 'outOfScope', label: 'Out of scope', kind: 'textarea', hint: 'One target per line. Appears in the body header.' },
];

export function MetadataPanel({ report }: MetadataPanelProps): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="rb-meta-form-scroll flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 text-[11px] leading-relaxed text-[var(--rb-text-secondary)]">
          Fields persist when you click away (or press <span className="rb-mono">Enter</span>).
          Anything that appears on the cover or body header is edited here.
        </p>

        <p className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
          Cover
        </p>
        <CoverOptionsPanel report={report} />

        <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
          Presentation
        </p>
        <TocToggle report={report} />

        <div className="mt-4 flex flex-col gap-3">
          {FIELDS.map((f) => (
            <FieldRow key={f.key} report={report} field={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

const PALETTE_SWATCHES: Array<{
  key: NonNullable<CoverOptions['palette']>;
  label: string;
  swatch: string;
}> = [
  { key: 'crimson', label: 'Crimson', swatch: '#dc143c' },
  { key: 'midnight', label: 'Midnight', swatch: '#1a2b5c' },
  { key: 'forest', label: 'Forest', swatch: '#1a4d3a' },
  { key: 'royal', label: 'Royal', swatch: '#4527a0' },
  { key: 'graphite', label: 'Graphite', swatch: '#2d2f33' },
  { key: 'amber', label: 'Amber', swatch: '#9c4a00' },
];

function patchCoverOptions(
  report: Report,
  patch: Partial<CoverOptions>,
): { id: string; coverOptions: CoverOptions } {
  return { id: report.id, coverOptions: { ...report.coverOptions, ...patch } };
}

function CoverOptionsPanel({ report }: { report: Report }): JSX.Element {
  const update = useUpdateReport();
  const opts = report.coverOptions;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>): void => {
    setUploadError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // 256 KB cap keeps the base64-encoded row JSON payload reasonable over IPC.
    if (file.size > 256 * 1024) {
      setUploadError('Logo file too large. Keep it under 256 KB.');
      return;
    }
    // SVG excluded: it can reference external subresources via href/xlink:href.
    const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setUploadError('Logo must be PNG, JPG, GIF, or WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(dataUrl)) {
        setUploadError('Could not read that image. Try a different file.');
        return;
      }
      update.mutate(patchCoverOptions(report, { logoDataUrl: dataUrl }));
    };
    reader.onerror = () => setUploadError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const clearLogo = (): void => {
    setUploadError(null);
    update.mutate(patchCoverOptions(report, { logoDataUrl: null }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Palette */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-[var(--rb-text-secondary)]">
          OSCP palette
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PALETTE_SWATCHES.map((p) => {
            const active = (opts.palette ?? 'crimson') === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => update.mutate(patchCoverOptions(report, { palette: p.key }))}
                aria-pressed={active}
                title={p.label}
                className={cn(
                  'group flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--rb-blue)]',
                  active
                    ? 'border-[var(--rb-blue)] bg-[var(--rb-blue-bg)]'
                    : 'border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] hover:border-[var(--rb-border)]',
                )}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/30"
                  style={{ background: p.swatch }}
                  aria-hidden
                />
                <span className="truncate text-[11px] text-[var(--rb-text-primary)]">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-[var(--rb-text-muted)]">
          Applies to the OSCP · Crimson cover.
        </p>
      </div>

      {/* Logo */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-[var(--rb-text-secondary)]">
          Cover logo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPickFile}
        />
        <div className="flex items-center gap-2">
          {opts.logoDataUrl ? (
            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-1">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={opts.logoDataUrl} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-dashed border-[var(--rb-border-subtle)] text-[10px] text-[var(--rb-text-muted)]">
              none
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-2 py-1.5 text-[11px] text-[var(--rb-text-primary)] transition-colors hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]"
          >
            <Upload className="h-3 w-3" aria-hidden />
            {opts.logoDataUrl ? 'Replace' : 'Upload'}
          </button>
          {opts.logoDataUrl && (
            <button
              type="button"
              onClick={clearLogo}
              aria-label="Remove logo"
              className="inline-flex items-center justify-center rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-1.5 text-[var(--rb-text-muted)] transition-colors hover:border-[var(--rb-border)] hover:text-[var(--rb-red)]"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] text-[var(--rb-text-muted)]">
          PNG / JPG / GIF / WebP under 256 KB. Rendered above the OSCP mark.
        </p>
        {uploadError && (
          <p className="mt-1 text-[10px] text-[var(--rb-red)]">{uploadError}</p>
        )}
      </div>

      {opts.logoDataUrl && (
        <SliderRow
          label="Logo size"
          min={0.05}
          max={0.45}
          step={0.01}
          value={opts.logoSize}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => update.mutate(patchCoverOptions(report, { logoSize: v }))}
        />
      )}

      <SliderRow
        label="Cover text size"
        min={0.7}
        max={1.3}
        step={0.05}
        value={opts.textScale}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => update.mutate(patchCoverOptions(report, { textScale: v }))}
      />
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (next: number) => void;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-[var(--rb-text-secondary)]">{label}</p>
        <span className="rb-mono text-[10.5px] text-[var(--rb-text-muted)]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function TocToggle({ report }: { report: Report }): JSX.Element {
  const update = useUpdateReport();
  const enabled = Boolean(report.tocEnabled);

  return (
    <button
      type="button"
      onClick={() => update.mutate({ id: report.id, tocEnabled: !enabled })}
      role="switch"
      aria-checked={enabled}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] px-3 py-2.5 text-left transition-colors hover:border-[var(--rb-border)] hover:bg-[var(--rb-bg-hover)]"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[var(--rb-text-primary)]">
          Table of contents
        </p>
        <p className="mt-0.5 text-[10.5px] text-[var(--rb-text-muted)]">
          Auto-generated from H1, H2, and H3 headings. Styled to match the active report theme.
        </p>
      </div>
      <span
        className={cn(
          'relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors',
          enabled ? 'bg-[var(--rb-blue)]' : 'bg-[var(--rb-bg-active)]',
        )}
        aria-hidden
      >
        <span
          className="absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all"
          style={{ left: enabled ? '14px' : '2px' }}
        />
      </span>
    </button>
  );
}

function FieldRow({ report, field }: { report: Report; field: FieldDef }): JSX.Element {
  return (
    <div>
      {field.group && (
        <p className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rb-text-muted)]">
          {field.group}
        </p>
      )}
      <label className="mb-1 block text-[11px] font-medium text-[var(--rb-text-secondary)]">
        {field.label}
      </label>
      <MetaField report={report} fieldKey={field.key} kind={field.kind ?? 'text'} />
      {field.hint && (
        <p className="mt-1 text-[10px] text-[var(--rb-text-muted)]">{field.hint}</p>
      )}
    </div>
  );
}

// Writes through on every change so the cover preview tracks
// typing live. Local draft mirrors the canonical value so the
// controlled input stays in sync.
function MetaField({
  report,
  fieldKey,
  kind,
}: {
  report: Report;
  fieldKey: StringField;
  kind: 'text' | 'date' | 'textarea';
}): JSX.Element {
  const update = useUpdateReport();
  const canonical = String(report.meta[fieldKey] ?? '');
  const [draft, setDraft] = useState(canonical);
  const [editing, setEditing] = useState(false);
  // Pre-focus snapshot — Escape restores this.
  const pristine = useRef(canonical);

  useEffect(() => {
    if (!editing) setDraft(canonical);
  }, [canonical, editing]);

  const writeMeta = useCallback(
    (value: string): void => {
      const meta: ReportMeta = { ...report.meta, [fieldKey]: value };
      if (fieldKey === 'project') {
        update.mutate({ id: report.id, title: value.trim() || report.title, meta });
      } else {
        update.mutate({ id: report.id, meta });
      }
    },
    [report, fieldKey, update],
  );

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const v = e.target.value;
    setDraft(v);
    writeMeta(v);
  };

  const onFocus = (): void => {
    setEditing(true);
    pristine.current = canonical;
  };

  const onBlur = (): void => {
    setEditing(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(pristine.current);
      writeMeta(pristine.current);
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Enter' && kind !== 'textarea') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  if (kind === 'textarea') {
    return (
      <textarea
        value={draft}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKey}
        rows={3}
        className="rb-finding-input resize-y"
      />
    );
  }

  return (
    <input
      type={kind === 'date' ? 'date' : 'text'}
      value={draft}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKey}
      className="rb-finding-input"
    />
  );
}
