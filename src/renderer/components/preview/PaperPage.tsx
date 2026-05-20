import { memo, useEffect, useMemo, useState } from 'react';
import type { Block, FindingStatus, ReportMeta, Severity } from '@shared/types';
import { STATUS_LABELS } from '@shared/constants';
import { extractTiptapText } from '@shared/util/text';
import { parseTiptapNode, tiptapListToHtml } from '@shared/util/tiptapHtml';
import { buildToc, type TocEntry } from '@shared/util/toc';
import { ipc } from '@/lib/ipc';
import { severityTheme } from '@/lib/severityTheme';

export interface PaperPageProps {
  blocks: Block[];
  meta: ReportMeta;
  reportTheme: 'light' | 'dark';
  reportAccent: string | null;
  tocEnabled?: boolean;
}

export const PaperPage = memo(function PaperPage({
  blocks,
  meta,
  reportTheme,
  reportAccent,
  tocEnabled = false,
}: PaperPageProps): JSX.Element {
  const accent = reportAccent ?? (reportTheme === 'dark' ? '#62d4f5' : '#1e40af');
  const toc = useMemo(() => (tocEnabled ? buildToc(blocks) : []), [tocEnabled, blocks]);

  return (
    <div
      className="rb-paper rb-paper--body rb-paper-body"
      data-report-theme={reportTheme}
      style={{ ['--paper-accent' as string]: accent }}
    >
      <header
        className="rb-paper-header"
        style={{
          marginBottom: 24,
          paddingBottom: 12,
          borderBottom: '1px solid var(--paper-rule)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--paper-text-muted)',
            fontFamily: 'var(--rb-font-mono)',
          }}
        >
          {meta.client} · {meta.docId}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--paper-text)',
          }}
        >
          {meta.project}
        </p>
      </header>

      {tocEnabled && toc.length > 0 && <TocBlock entries={toc} />}

      {blocks.length === 0 ? (
        <p style={{ color: 'var(--paper-text-muted)', fontStyle: 'italic' }}>
          This report has no body content yet.
        </p>
      ) : (
        blocks.map((b) => <BlockOnPaper key={b.id} block={b} />)
      )}

      <footer
        style={{
          marginTop: 32,
          paddingTop: 12,
          borderTop: '1px solid var(--paper-rule)',
          fontSize: 10,
          color: 'var(--paper-text-muted)',
          fontFamily: 'var(--rb-font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{meta.classification}</span>
        <span>v{meta.reportVersion}</span>
      </footer>
    </div>
  );
});

function blockOnPaperPropsEqual(
  prev: { block: Block },
  next: { block: Block },
): boolean {
  // tiptapDocToBlocks mints fresh Block/attrs refs per save; compare by value.
  const a = prev.block;
  const b = next.block;
  if (a.id !== b.id) return false;
  if (a.type !== b.type) return false;
  if ((a.content ?? null) !== (b.content ?? null)) return false;
  return deepEqualAttrs(a.attrs, b.attrs);
}

function deepEqualAttrs(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const k of aKeys) {
    if (!valueEqual(a[k], b[k])) return false;
  }
  return true;
}

function valueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!valueEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!valueEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

const BlockOnPaper = memo(function BlockOnPaper({ block }: { block: Block }): JSX.Element | null {
  const text = useMemo(() => extractTiptapText(block.content), [block.content]);

  switch (block.type) {
    case 'heading_1':
      return <h1 id={`block-${block.id}`}>{text}</h1>;
    case 'heading_2':
      return <h2 id={`block-${block.id}`}>{text}</h2>;
    case 'heading_3':
      return <h3 id={`block-${block.id}`}>{text}</h3>;
    case 'paragraph':
      return <p>{text || ' '}</p>;
    case 'quote':
      return <blockquote>{text}</blockquote>;
    case 'divider':
      return <hr />;
    case 'code_block':
      return (
        <pre>
          <code>{text || '// code'}</code>
        </pre>
      );
    case 'callout':
      return (
        <div
          style={{
            padding: '10px 14px',
            margin: '10px 0',
            borderRadius: 4,
            background: 'var(--paper-tint)',
            borderLeft: '2px solid var(--paper-accent)',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
            {(block.attrs?.['label'] as string | undefined) ?? 'Note'}
          </strong>
          <span>{text}</span>
        </div>
      );
    case 'finding':
      return <PaperFinding block={block} />;
    case 'screenshot':
      return <PaperScreenshot block={block} />;
    case 'poc': {
      const steps = (block.attrs?.['steps'] as string[] | undefined) ?? [];
      return (
        <ol
          style={{
            margin: '10px 0',
            padding: '12px 16px 12px 32px',
            background: 'var(--paper-tint)',
            border: '1px solid var(--paper-border)',
            borderRadius: 4,
          }}
        >
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      );
    }
    case 'http_request':
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1px solid var(--paper-border)',
            borderRadius: 4,
            margin: '10px 0',
            fontFamily: 'var(--rb-font-mono)',
            fontSize: 11,
            overflow: 'hidden',
          }}
        >
          <pre style={{ padding: 12, margin: 0, whiteSpace: 'pre-wrap' }}>
            {(block.attrs?.['request'] as string | undefined) ?? ''}
          </pre>
          <pre
            style={{
              padding: 12,
              margin: 0,
              whiteSpace: 'pre-wrap',
              borderLeft: '1px solid var(--paper-border)',
            }}
          >
            {(block.attrs?.['response'] as string | undefined) ?? ''}
          </pre>
        </div>
      );
    case 'bullet_list':
    case 'ordered_list': {
      // Shared walker so preview matches PDF export DOM.
      const root = parseTiptapNode(block.content);
      const html = root ? tiptapListToHtml(root) : `<p>${text}</p>`;
      return (
        <div
          id={`block-${block.id}`}
          className="rb-paper-list"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case 'cve': {
      const id = (block.attrs?.['cveId'] as string | undefined) ?? '';
      const cvss = (block.attrs?.['cvss'] as string | undefined) ?? '';
      if (!id) return null;
      return <strong>{cvss ? `${id} (CVSS ${cvss})` : id}</strong>;
    }
    case 'asset_chip': {
      const type = (block.attrs?.['type'] as string | undefined) ?? '';
      const value = (block.attrs?.['value'] as string | undefined) ?? '';
      if (!value) return null;
      return <code>{type ? `${type}: ${value}` : value}</code>;
    }
    case 'severity_badge': {
      const sev = (block.attrs?.['severity'] as Severity | undefined) ?? 'med';
      const t = severityTheme(sev);
      return (
        <span
          style={{
            fontFamily: 'var(--rb-font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 999,
            border: '1px solid var(--paper-rule)',
            color: t.color,
          }}
        >
          {t.label}
        </span>
      );
    }
    case 'table': {
      const headers = Array.isArray(block.attrs?.['headers'])
        ? (block.attrs['headers'] as unknown[]).map((h) => String(h ?? ''))
        : [];
      const rawRows = Array.isArray(block.attrs?.['rows']) ? (block.attrs['rows'] as unknown[]) : [];
      const rows = rawRows.map((row) =>
        Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [String(row ?? '')],
      );
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <table style={{ width: '100%', margin: '12px 0', borderCollapse: 'collapse' }}>
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{ borderBottom: '1px solid var(--paper-rule)', textAlign: 'left', padding: '4px 8px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} style={{ borderBottom: '1px solid var(--paper-border)', padding: '4px 8px' }}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'toc':
      return (
        <nav
          aria-label="Table of contents"
          style={{ margin: '14px 0', padding: '12px 16px', border: '1px dashed var(--paper-rule)' }}
        >
          <strong>Table of Contents</strong>
        </nav>
      );
    case 'page_break':
      // Visual hint only; PDF/Word exporters honour the actual break.
      return (
        <div
          style={{
            margin: '20px 0',
            borderTop: '1px dashed var(--paper-rule)',
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--paper-text-muted)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Page Break
        </div>
      );
    case 'list_item':
      // Fallback if a list_item ever leaks out of its parent list.
      return <li>{text}</li>;
    default:
      return null;
  }
}, blockOnPaperPropsEqual);

// Mirrors the .rb-paper-toc DOM emitted by shared/export/html.ts.
const TocBlock = memo(function TocBlock({ entries }: { entries: TocEntry[] }): JSX.Element {
  return (
    <nav
      aria-label="Table of contents"
      className="rb-paper-toc"
      style={{
        margin: '0 0 32px',
        padding: 0,
        background: 'transparent',
        border: 'none',
      }}
    >
      <h2
        className="rb-paper-toc__title"
        style={{
          margin: '0 0 18px',
          paddingBottom: 10,
          borderBottom: '1px solid var(--paper-rule)',
          fontFamily: 'var(--rb-font-ui)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--paper-accent)',
        }}
      >
        Table of Contents
      </h2>
      <ol
        className="rb-paper-toc__list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          fontFamily: 'var(--rb-font-ui)',
          fontSize: 13,
          lineHeight: 1.9,
        }}
      >
        {entries.map((e) => (
          <li
            key={e.blockId}
            className={`toc-l${e.level}`}
            style={{
              margin: 0,
              padding: '2px 0',
              paddingLeft: (e.level - 1) * 22,
            }}
          >
            <a
              href={`#block-${e.blockId}`}
              className="rb-paper-toc__entry"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                textDecoration: 'none',
                color: e.level === 1 ? 'var(--paper-text)' : 'var(--paper-text-muted)',
                fontWeight: e.level === 1 ? 600 : 400,
                width: '100%',
              }}
            >
              <span
                className="rb-paper-toc__text"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {e.text}
              </span>
              <span
                className="rb-paper-toc__leader"
                aria-hidden
                style={{
                  flex: '1 1 auto',
                  minWidth: 12,
                  height: 1,
                  borderBottom: '1px dotted var(--paper-text-subtle)',
                  position: 'relative',
                  bottom: 4,
                  margin: '0 2px',
                }}
              />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
});

const PaperScreenshot = memo(function PaperScreenshot({ block }: { block: Block }): JSX.Element {
  const a = block.attrs ?? {};
  const attachmentId = (a['attachmentId'] as string | null | undefined) ?? null;
  const figure = (a['figure'] as string | undefined) ?? '?';
  const caption = (a['caption'] as string | undefined) ?? '';
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    if (!attachmentId) {
      setSrc(null);
      return;
    }
    ipc.attachments
      .get({ id: attachmentId })
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setSrc(null);
          setMissing(true);
          return;
        }
        setSrc(`data:${res.mimetype};base64,${res.base64}`);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(null);
        setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  return (
    <figure
      id={`block-${block.id}`}
      style={{
        // Avoid overflow:hidden/contain:layout — they suppress page-break fragmentation in print engines.
        margin: '20px 0',
        textAlign: 'center',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        maxWidth: '100%',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={caption}
          style={{
            // 240mm cap as a safety net for unusually tall images.
            display: 'block',
            maxWidth: '100%',
            maxHeight: '240mm',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            margin: '0 auto',
            borderRadius: 2,
          }}
        />
      ) : null}
      <figcaption
        style={{
          margin: src ? '8px 0 0' : 0,
          fontSize: 11.5,
          fontStyle: 'italic',
          color: 'var(--paper-text-muted)',
          textAlign: 'center',
        }}
      >
        Fig {figure} ·{' '}
        {missing
          ? '(attachment missing on disk)'
          : caption || (attachmentId ? 'Loading…' : '(no image uploaded)')}
      </figcaption>
    </figure>
  );
});

const PaperFinding = memo(function PaperFinding({ block }: { block: Block }): JSX.Element {
  const a = block.attrs ?? {};
  const sev = (a['severity'] as Severity | undefined) ?? 'med';
  const status = (a['status'] as FindingStatus | undefined) ?? 'open';
  const t = severityTheme(sev);
  return (
    <div className="rb-paper-finding">
      <div className="rb-paper-finding__head">
        <span className="rb-paper-finding__id">{(a['vulnId'] as string) ?? ''}</span>
        <span className="rb-paper-finding__title">{(a['title'] as string) ?? ''}</span>
        <span
          style={{
            fontFamily: 'var(--rb-font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '1px 6px',
            borderRadius: 999,
            background: 'var(--paper-tint)',
            border: '1px solid var(--paper-rule)',
            color: t.color,
          }}
        >
          {t.label}
        </span>
      </div>
      <dl className="rb-paper-finding__meta">
        <div>
          <dt>CVSS</dt>
          <dd>{(a['cvss'] as string) || '—'}</dd>
        </div>
        <div>
          <dt>CWE</dt>
          <dd>{(a['cwe'] as string) || '—'}</dd>
        </div>
        <div>
          <dt>Affected</dt>
          <dd>{(a['affected'] as string) || '—'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STATUS_LABELS[status]}</dd>
        </div>
      </dl>
      <p className="rb-paper-finding__body">{(a['body'] as string) || ''}</p>
    </div>
  );
});
