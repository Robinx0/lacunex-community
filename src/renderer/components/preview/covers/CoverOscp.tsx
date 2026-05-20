import type { CSSProperties } from 'react';
import type { CoverProps } from '@/lib/preview/coverRegistry';

export function CoverOscp({ meta, coverOptions }: CoverProps): JSX.Element {
  const osid = meta.docId?.trim() || 'OS-XXXXX';
  const student = meta.authors?.trim() || 'student@youremailaddress.com';
  const examDate =
    [meta.startDate, meta.endDate].filter((s) => s?.trim()).join(' → ') ||
    meta.startDate?.trim() ||
    new Date().toISOString().slice(0, 10);
  const classification = meta.classification?.trim() || 'CONFIDENTIAL';
  const version = meta.reportVersion?.trim() ? `v${meta.reportVersion.trim()}` : 'v1.0';
  const subtitle = meta.project?.trim() || 'OSCP Exam Report';

  const opts = coverOptions ?? null;
  const palette = opts?.palette ?? 'crimson';
  const textScale = opts?.textScale ?? 1;
  const logoDataUrl = opts?.logoDataUrl ?? null;
  const logoWidthCqw = Math.round((opts?.logoSize ?? 0.18) * 100);

  const rootStyle: CSSProperties = {
    ['--os-scale' as string]: String(textScale),
  };

  return (
    <div
      className="rb-cover rb-cover--oscp"
      data-cover-palette={palette}
      style={rootStyle}
    >
      <div className="rb-cover-os__noise" aria-hidden />

      <header className="rb-cover-os__head">
        <span className="rb-cover-os__brand">Offensive Security</span>
        <span className="rb-cover-os__class">{classification}</span>
      </header>

      <main className="rb-cover-os__main">
        {logoDataUrl && (
          <img
            className="rb-cover-os__logo"
            src={logoDataUrl}
            alt=""
            aria-hidden
            style={{ width: `${logoWidthCqw}cqw` }}
          />
        )}
        <p className="rb-cover-os__mark" aria-hidden>
          OSCP
        </p>
        <p className="rb-cover-os__eyebrow">Certified Professional</p>
        <h1 className="rb-cover-os__title">Exam Report</h1>
        <div className="rb-cover-os__rule" aria-hidden />
        <p className="rb-cover-os__sub">{subtitle}</p>

        <dl className="rb-cover-os__id">
          <div>
            <dt>OSID</dt>
            <dd>{osid}</dd>
          </div>
          <div>
            <dt>Student</dt>
            <dd>{student}</dd>
          </div>
        </dl>
      </main>

      <dl className="rb-cover-os__meta">
        <div>
          <dt>Exam date</dt>
          <dd>{examDate}</dd>
        </div>
        <div>
          <dt>Methodology</dt>
          <dd>{meta.methodology || 'Offensive Security'}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{version}</dd>
        </div>
        <div>
          <dt>Distribution</dt>
          <dd>{meta.distribution || 'Offensive Security · Student'}</dd>
        </div>
      </dl>

      <footer className="rb-cover-os__foot">
        <span>Penetration Testing with Kali Linux</span>
        <span>{classification}</span>
      </footer>
    </div>
  );
}
