import type { ReportService } from '../services/ReportService';

// Drops two demo reports into an empty database so the user has
// something to look at on first launch.
export function seedReportsIfEmpty(reports: ReportService): void {
  if (reports.list().length > 0 || reports.list({ archived: true }).length > 0) return;

  const acme = reports.create({
    title: 'Operation Silent Forge',
    meta: {
      project: 'Operation Silent Forge',
      client: 'Acme Corporation',
      docId: 'SFG-2026-0042',
      classification: 'Confidential — Restricted',
      reportVersion: '1.2',
      engagementType: 'External + Internal Penetration Test',
      methodology: 'OSSTMM 3 / PTES / OWASP ASVS L2',
      startDate: 'Mar 15, 2026',
      endDate: 'Apr 12, 2026',
      authors: 'Irfanul Montasir, K. Tanaka',
      reviewers: 'S. Park (Lead)',
      distribution: 'CISO, CTO, Engineering Leads',
      scope: [
        { type: 'Domain', value: '*.acme-corp.com', tagClass: 'blue' },
        { type: 'IP CIDR', value: '10.42.0.0/16', tagClass: 'orange' },
        { type: 'URL', value: 'https://app.acme-corp.com', tagClass: 'green' },
        { type: 'AD', value: 'ACME.LOCAL forest (3 domains, 2 forests)', tagClass: 'purple' },
      ],
      outOfScope:
        'Production database tier; third-party SaaS providers (Stripe, Twilio); physical security testing.',
    },
    coverId: 'blackops-dark',
    reportTheme: 'dark',
    reportAccent: '#62d4f5',
  });

  reports.replaceBlocks(acme.id, [
    {
      id: 'b_seed_h1',
      type: 'heading_1',
      position: 0,
      content: 'Executive Summary',
    },
    {
      id: 'b_seed_p1',
      type: 'paragraph',
      position: 1,
      content:
        'Acme Corp engaged us to perform a hybrid external + internal penetration test against the perimeter and corporate AD environment. Six findings were identified across application, identity, and infrastructure layers.',
    },
    {
      id: 'b_seed_h2',
      type: 'heading_2',
      position: 2,
      content: 'Findings',
    },
  ]);

  reports.create({
    title: 'Northwind — Web App Assessment',
    meta: {
      project: 'Northwind — Web App Assessment',
      client: 'Northwind Trading Inc.',
      docId: 'NW-2026-0007',
      classification: 'Confidential',
      reportVersion: '0.9 DRAFT',
      engagementType: 'Web Application Penetration Test',
      methodology: 'OWASP WSTG v4.2',
      startDate: 'Apr 02, 2026',
      endDate: 'Apr 18, 2026',
      authors: 'I. Montasir',
      reviewers: 'pending',
      distribution: 'Engineering, Security',
      scope: [
        { type: 'URL', value: 'https://app.northwind.example', tagClass: 'green' },
      ],
      outOfScope: 'Marketing site; Stripe webhook integrations.',
    },
    coverId: 'corporate',
    reportTheme: 'light',
    reportAccent: '#1e40af',
  });
}
