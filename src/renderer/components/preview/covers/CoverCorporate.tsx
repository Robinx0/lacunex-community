import type { CoverProps } from '@/lib/preview/coverRegistry';

export function CoverCorporate({ meta }: CoverProps): JSX.Element {
  const hero = meta.client?.trim() || meta.project || 'Untitled engagement';
  const sub = meta.client?.trim() ? meta.project : '';
  const classification = meta.classification?.trim() || 'CONFIDENTIAL';
  const engagementLine = [meta.engagementType, meta.methodology]
    .filter((s) => s?.trim())
    .join(' · ');

  return (
    <div className="rb-cover rb-cover--corporate">
      <div className="rb-cover-co__strip" aria-hidden />

      <header className="rb-cover-co__head">
        <span className="rb-cover-co__eyebrow">Penetration Test Report</span>
        <span className="rb-cover-co__class">{classification}</span>
      </header>

      <main className="rb-cover-co__main">
        <h1 className="rb-cover-co__title">{hero}</h1>
        <hr className="rb-cover-co__rule" />
        {sub && <p className="rb-cover-co__sub">{sub}</p>}
        {engagementLine && (
          <p className="rb-cover-co__sub-meta">{engagementLine}</p>
        )}
      </main>

      <table className="rb-cover-co__table" role="presentation">
        <tbody>
          <tr>
            <th scope="row">Document ID</th>
            <td>{meta.docId || '—'}</td>
            <th scope="row">Version</th>
            <td>v{meta.reportVersion || '0.1'}</td>
          </tr>
          <tr>
            <th scope="row">Period</th>
            <td>
              {[meta.startDate, meta.endDate].filter(Boolean).join(' — ') || '—'}
            </td>
            <th scope="row">Authors</th>
            <td>{meta.authors || '—'}</td>
          </tr>
          <tr>
            <th scope="row">Reviewers</th>
            <td>{meta.reviewers || '—'}</td>
            <th scope="row">Distribution</th>
            <td>{meta.distribution || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
