import type { CoverProps } from '@/lib/preview/coverRegistry';

export function CoverMinimal({ meta }: CoverProps): JSX.Element {
  const hero = meta.client?.trim() || meta.project || 'Untitled engagement';
  const sub = meta.client?.trim() ? meta.project : '';
  const classification = meta.classification?.trim() || 'CONFIDENTIAL';
  const dateRange = [meta.startDate, meta.endDate].filter(Boolean).join(' — ');

  return (
    <div className="rb-cover rb-cover--minimal">
      <header className="rb-cover-mi__top">
        <span className="rb-cover-mi__class">{classification}</span>
        <span className="rb-cover-mi__seq">
          {meta.docId || 'PT-DRAFT'}
        </span>
      </header>

      <div className="rb-cover-mi__rule" aria-hidden />

      <main className="rb-cover-mi__main">
        <p className="rb-cover-mi__eyebrow">Penetration Test Report</p>
        <h1 className="rb-cover-mi__title">{hero}</h1>
        <span className="rb-cover-mi__bar" aria-hidden />
        {sub && <p className="rb-cover-mi__sub">{sub}</p>}
      </main>

      <footer className="rb-cover-mi__foot">
        <div className="rb-cover-mi__rule" aria-hidden />
        <div className="rb-cover-mi__foot-row">
          <span>{dateRange || '—'}</span>
          <span>{meta.authors || '—'}</span>
          <span>v{meta.reportVersion || '0.1'}</span>
        </div>
      </footer>
    </div>
  );
}
