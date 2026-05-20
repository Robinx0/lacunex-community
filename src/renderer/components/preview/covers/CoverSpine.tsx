import type { CSSProperties } from 'react';
import type { CoverProps } from '@/lib/preview/coverRegistry';

// Generic exam-report cover with a colored book-spine on the left.
// `engagementType` drives the title so one cover serves OSCP, CRTP,
// CRTO, OSEP, OSWP, PNPT, eJPT, eCPPT, etc.
export function CoverSpine({ meta, coverOptions }: CoverProps): JSX.Element {
  const examTitle =
    meta.engagementType?.trim().replace(/\s+exam$/i, '').trim() ||
    meta.engagementType?.trim() ||
    meta.project?.trim() ||
    'Examination';
  const certBody = meta.client?.trim() || 'Examining Body';
  const candidate = meta.authors?.trim() || 'Candidate name';
  const certId = meta.docId?.trim() || '—';
  const version = meta.reportVersion?.trim() ? `v${meta.reportVersion.trim()}` : 'v1.0';
  const methodology = meta.methodology?.trim() || '—';
  const distribution = meta.distribution?.trim() || certBody;
  const classification = meta.classification?.trim() || 'CONFIDENTIAL';
  const examDate =
    [meta.startDate, meta.endDate].filter((s) => s?.trim()).join(' → ') ||
    meta.startDate?.trim() ||
    meta.endDate?.trim() ||
    new Date().toISOString().slice(0, 10);
  const year =
    meta.endDate?.trim().slice(0, 4) ||
    meta.startDate?.trim().slice(0, 4) ||
    new Date().getFullYear().toString();

  const opts = coverOptions ?? null;
  const palette = opts?.palette ?? 'crimson';
  const textScale = opts?.textScale ?? 1;
  const logoDataUrl = opts?.logoDataUrl ?? null;

  const rootStyle: CSSProperties = {
    ['--sp-scale' as string]: String(textScale),
  };

  return (
    <div
      className="rb-cover rb-cover--spine"
      data-cover-palette={palette}
      style={rootStyle}
    >
      <aside className="rb-cover-sp__spine" aria-hidden>
        {logoDataUrl ? (
          <img
            className="rb-cover-sp__spine-logo"
            src={logoDataUrl}
            alt=""
            aria-hidden
          />
        ) : (
          <span className="rb-cover-sp__spine-mark">§</span>
        )}
        <span className="rb-cover-sp__spine-text">
          {`Examination Report  ·  ${certBody}`}
        </span>
        <span className="rb-cover-sp__spine-year">{year}</span>
      </aside>

      <section className="rb-cover-sp__main">
        <header className="rb-cover-sp__head">
          <span className="rb-cover-sp__brand">{certBody}</span>
          <span className="rb-cover-sp__class">{classification}</span>
        </header>

        <div className="rb-cover-sp__hero">
          <p className="rb-cover-sp__eyebrow">Examination Report</p>
          <h1 className="rb-cover-sp__title">{examTitle}</h1>
          <p className="rb-cover-sp__byline">
            presented by <span className="rb-cover-sp__candidate">{candidate}</span>
          </p>
        </div>

        <dl className="rb-cover-sp__meta">
          <div>
            <dt>Candidate ID</dt>
            <dd>{certId}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{version}</dd>
          </div>
          <div>
            <dt>Examination period</dt>
            <dd>{examDate}</dd>
          </div>
          <div>
            <dt>Methodology</dt>
            <dd>{methodology}</dd>
          </div>
        </dl>

        <footer className="rb-cover-sp__foot">
          <span>{distribution}</span>
          <span>№ {certId}</span>
        </footer>
      </section>
    </div>
  );
}
