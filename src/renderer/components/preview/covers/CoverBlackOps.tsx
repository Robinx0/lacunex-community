import type { CoverProps } from '@/lib/preview/coverRegistry';

export function CoverBlackOps({ meta }: CoverProps): JSX.Element {
  const hero = meta.client?.trim() || meta.project || 'Untitled engagement';
  const sub = meta.client?.trim() ? meta.project : '';
  const classification = meta.classification?.trim() || 'CONFIDENTIAL';
  const docTag = [meta.docId, meta.reportVersion ? `v${meta.reportVersion}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rb-cover rb-cover--blackops">
      <div className="rb-cover-bo__grid" aria-hidden />

      <header className="rb-cover-bo__head">
        <span className="rb-cover-bo__class">{classification}</span>
        <span className="rb-cover-bo__doc">{docTag || 'PT-DRAFT'}</span>
      </header>

      <main className="rb-cover-bo__main">
        <p className="rb-cover-bo__eyebrow">Penetration Test Report</p>
        <h1 className="rb-cover-bo__title">{hero}</h1>
        {sub && <p className="rb-cover-bo__sub">re: {sub}</p>}
      </main>

      <dl className="rb-cover-bo__meta">
        <div>
          <dt>Engagement</dt>
          <dd>{meta.engagementType || '—'}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>
            {[meta.startDate, meta.endDate].filter(Boolean).join(' → ') || '—'}
          </dd>
        </div>
        <div>
          <dt>Methodology</dt>
          <dd>{meta.methodology || '—'}</dd>
        </div>
        <div>
          <dt>Lead</dt>
          <dd>{meta.authors || '—'}</dd>
        </div>
      </dl>

      <footer className="rb-cover-bo__foot">
        <span>{meta.distribution || '—'}</span>
        <span>{classification}</span>
      </footer>
    </div>
  );
}
