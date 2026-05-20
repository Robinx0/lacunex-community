import { X, BookMarked } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { SEVERITY_ORDER } from '@shared/constants';
import { severityTheme } from '@/lib/severityTheme';
import { editorThemes } from '@/lib/themes/editorThemes';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { cn } from '@/lib/utils';

export interface StyleGuideModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Visual reference for the report's design tokens — severity colors,
 * callouts, code-block typography, finding cards, and the eight editor
 * themes. Useful when an analyst is calibrating their writing across a
 * multi-author report.
 *
 * No data here is dynamic; the page is a deliberately static catalogue.
 */
export function StyleGuideModal({ open, onClose }: StyleGuideModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useModalA11y(panelRef, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { mounted, phase } = useModalLifecycle(open);
  if (!mounted) return null;
  const backdropAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 duration-150'
      : 'animate-out fade-out-0 duration-150';
  const panelAnim =
    phase === 'enter'
      ? 'animate-in fade-in-0 zoom-in-95 duration-150'
      : 'animate-out fade-out-0 zoom-out-95 duration-150';

  return (
    <div
      role="presentation"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm',
        backdropAnim,
      )}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Style guide"
        className={cn(
          'relative flex h-[680px] w-[820px] max-w-[92vw] flex-col rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-popover)] shadow-pop focus:outline-none',
          panelAnim,
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--rb-border-subtle)] px-4 py-3">
          <BookMarked className="h-4 w-4 text-[var(--rb-blue)]" aria-hidden />
          <h2 className="text-base font-semibold text-[var(--rb-text-primary)]">Style guide</h2>
          <p className="text-xs text-[var(--rb-text-muted)]">
            · the visual primitives every report uses
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-[var(--rb-text-muted)] hover:bg-[var(--rb-bg-hover)] hover:text-[var(--rb-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <Severities />
          <Callouts />
          <CodeBlock />
          <FindingCardSample />
          <Themes />
        </div>
      </div>
    </div>
  );
}

function GuideSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--rb-text-secondary)]">
          {title}
        </h3>
        {hint && <span className="text-[10px] text-[var(--rb-text-muted)]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Severities(): JSX.Element {
  return (
    <GuideSection title="Severity scale" hint="5 levels · maps to CVSS bands">
      <div className="grid grid-cols-5 gap-2">
        {SEVERITY_ORDER.map((sev) => {
          const t = severityTheme(sev);
          return (
            <div
              key={sev}
              className="rounded-md border p-3"
              style={{ background: t.bg, borderColor: t.color }}
            >
              <div className="rb-mono text-lg font-semibold" style={{ color: t.color }}>
                {t.code}
              </div>
              <div className="mt-1 text-[12px] font-medium" style={{ color: t.color }}>
                {t.label}
              </div>
              <div className="rb-mono mt-2 text-[9px] uppercase tracking-[0.08em] text-[var(--rb-text-muted)]">
                {sev === 'crit'
                  ? 'CVSS 9.0–10'
                  : sev === 'high'
                    ? 'CVSS 7.0–8.9'
                    : sev === 'med'
                      ? 'CVSS 4.0–6.9'
                      : sev === 'low'
                        ? 'CVSS 0.1–3.9'
                        : 'no impact'}
              </div>
            </div>
          );
        })}
      </div>
    </GuideSection>
  );
}

function Callouts(): JSX.Element {
  const variants: Array<{ kind: 'info' | 'warn' | 'danger' | 'success'; label: string; body: string }> = [
    { kind: 'info', label: 'Note', body: 'Background context that supports the surrounding paragraph.' },
    { kind: 'warn', label: 'Warning', body: 'Important — the analyst should attend to this before continuing.' },
    { kind: 'danger', label: 'Danger', body: 'Critical — incident-level signal. Read carefully.' },
    { kind: 'success', label: 'Success', body: 'Confirms a control works as intended; positive result.' },
  ];
  const VAR: Record<string, { color: string; bg: string }> = {
    info: { color: 'var(--rb-blue)', bg: 'var(--rb-blue-bg)' },
    warn: { color: 'var(--rb-yellow)', bg: 'var(--rb-yellow-bg)' },
    danger: { color: 'var(--rb-red)', bg: 'var(--rb-red-bg)' },
    success: { color: 'var(--rb-green)', bg: 'var(--rb-green-bg)' },
  };
  return (
    <GuideSection title="Callouts" hint="info / warn / danger / success">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((v) => (
          <div
            key={v.kind}
            className="rounded-md border border-[var(--rb-border-subtle)] p-3"
            style={{ background: VAR[v.kind].bg, borderLeft: `2px solid ${VAR[v.kind].color}` }}
          >
            <div className="text-[11px] font-semibold" style={{ color: VAR[v.kind].color }}>
              {v.label}
            </div>
            <p className="mt-1 text-xs text-[var(--rb-text-secondary)]">{v.body}</p>
          </div>
        ))}
      </div>
    </GuideSection>
  );
}

function CodeBlock(): JSX.Element {
  return (
    <GuideSection title="Code blocks" hint="lowlight syntax — 18 languages">
      <pre className="overflow-x-auto rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-elevated)] p-3 text-[12px] leading-[1.55] text-[var(--rb-text-primary)]">
        <code className="rb-mono">{`POST /api/v2/exports HTTP/1.1
Host: app.aurora.example
Authorization: Bearer eyJhbGciOiJIUzI1Ni…
Content-Type: application/json

{"tenant_id":"acme","format":"csv","scope":"all"}`}</code>
      </pre>
    </GuideSection>
  );
}

function FindingCardSample(): JSX.Element {
  const t = severityTheme('crit');
  return (
    <GuideSection title="Finding card" hint="block-level — full anatomy">
      <article
        className="rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-3"
        style={{ borderLeft: `3px solid ${t.color}` }}
      >
        <header className="flex items-center gap-2">
          <span className="rb-mono rounded bg-[var(--rb-bg-active)] px-1.5 py-0.5 text-[10px] text-[var(--rb-text-secondary)]">
            AUR-001
          </span>
          <span className="flex-1 truncate text-sm font-semibold text-[var(--rb-text-primary)]">
            Cross-tenant data exposure in export pipeline
          </span>
          <span
            className="rb-mono rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: t.bg, color: t.color }}
          >
            {t.label}
          </span>
        </header>
        <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-b border-[var(--rb-border-subtle)] py-2">
          <KV k="CVSS" v="9.1" />
          <KV k="CWE" v="CWE-639" />
          <KV k="Affected" v="/v2/exports" />
          <KV k="Status" v="Open" />
        </dl>
        <p className="mt-2 text-xs text-[var(--rb-text-secondary)]">
          A race condition in the tenant filter middleware allows a low-privilege user to retrieve
          rows belonging to other tenants under specific concurrent-request patterns.
        </p>
      </article>
    </GuideSection>
  );
}

function KV({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <div>
      <dt className="rb-mono text-[9px] uppercase tracking-[0.1em] text-[var(--rb-text-muted)]">
        {k}
      </dt>
      <dd className="rb-mono text-[11px] text-[var(--rb-text-primary)]">{v}</dd>
    </div>
  );
}

function Themes(): JSX.Element {
  return (
    <GuideSection title="Editor themes" hint="9 ship · 1 active">
      <div className="grid grid-cols-3 gap-2">
        {editorThemes.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-md border border-[var(--rb-border-subtle)] bg-[var(--rb-bg-faint)] p-2"
          >
            <div className="flex h-7 w-12 shrink-0 overflow-hidden rounded">
              {t.swatches.map((s, i) => (
                <span key={i} className="h-full flex-1" style={{ background: s }} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-[var(--rb-text-primary)]">
                {t.name}
              </p>
              <p className="truncate text-[10px] text-[var(--rb-text-muted)]">{t.tagline}</p>
            </div>
          </div>
        ))}
      </div>
    </GuideSection>
  );
}
