import type { Block } from '@shared/types';
import type { TemplateService, TemplateInput } from '../services/TemplateService';

/**
 * Five built-in finding templates (SQLi, XSS, IDOR, SSRF, Auth Bypass).
 * Inserted via TemplateService on first run if no findings-category templates
 * exist.
 */
const FINDING_TEMPLATES: TemplateInput[] = [
  {
    name: 'SQL Injection',
    description: 'Concatenated SQL — RCE via stacked queries / xp_cmdshell.',
    category: 'Findings',
    icon: '💉',
    type: 'finding',
    blocks: makeFindingBlocks({
      vulnId: 'TPL-SQLI',
      title: 'SQL Injection in <endpoint>',
      severity: 'crit',
      cvss: '9.8',
      cwe: 'CWE-89',
      affected: '<asset>',
      body:
        'The endpoint concatenates user-supplied input into a SQL query, permitting injection ' +
        'that can be escalated to remote command execution via stacked queries or xp_cmdshell.',
      remediation:
        'Replace string concatenation with parameterized queries (prepared statements). Apply ' +
        'principle of least privilege to the database service account. Disable dangerous stored ' +
        'procedures.',
      pocSteps: [
        "Submit '\" OR 1=1-- in the username field.",
        'Observe authentication bypass / database error.',
      ],
    }),
  },
  {
    name: 'Stored XSS',
    description: 'Persistent script injection via insufficient output encoding.',
    category: 'Findings',
    icon: '📝',
    type: 'finding',
    blocks: makeFindingBlocks({
      vulnId: 'TPL-XSS',
      title: 'Stored Cross-Site Scripting in <field>',
      severity: 'high',
      cvss: '8.0',
      cwe: 'CWE-79',
      affected: '<asset>',
      body:
        "User-supplied input is rendered without proper output encoding, permitting persistent " +
        "script injection that executes in other users' browsers.",
      remediation:
        'Apply context-aware output encoding (HTML / JS / CSS / URL contexts). Implement a ' +
        'strict Content Security Policy. Use a templating engine that escapes by default.',
      pocSteps: [
        'Submit <script>alert(1)</script> in the comment field.',
        'Reload the comment thread as another user.',
        'Observe alert dialog.',
      ],
    }),
  },
  {
    name: 'IDOR',
    description: 'Object reference accepted without authorization check.',
    category: 'Findings',
    icon: '🔓',
    type: 'finding',
    blocks: makeFindingBlocks({
      vulnId: 'TPL-IDOR',
      title: 'Insecure Direct Object Reference in <endpoint>',
      severity: 'high',
      cvss: '7.5',
      cwe: 'CWE-639',
      affected: '<asset>',
      body:
        'The endpoint accepts an object identifier without verifying that the requester has ' +
        'authorization to access that object.',
      remediation:
        'Implement object-level authorization checks on every request that references an ' +
        'internal ID. Consider indirect references (per-user UUIDs) where appropriate.',
      pocSteps: [
        'Authenticate as user A.',
        'Issue GET /api/v2/users/<user-B-id>.',
        'Observe user B record returned.',
      ],
    }),
  },
  {
    name: 'SSRF',
    description: 'Server-side fetch of attacker-controlled URLs.',
    category: 'Findings',
    icon: '🔄',
    type: 'finding',
    blocks: makeFindingBlocks({
      vulnId: 'TPL-SSRF',
      title: 'Server-Side Request Forgery in <endpoint>',
      severity: 'high',
      cvss: '8.6',
      cwe: 'CWE-918',
      affected: '<asset>',
      body:
        'The endpoint accepts a URL parameter and fetches its contents server-side, permitting ' +
        'access to internal-only resources or scanning of the internal network.',
      remediation:
        'Validate and allowlist destination hosts. Reject private IP ranges (RFC 1918, ' +
        'link-local, loopback). Route outbound HTTP through a proxy with strict egress rules.',
      pocSteps: [
        'POST /api/import { "url": "http://169.254.169.254/latest/meta-data/" }',
        'Receive cloud metadata service response.',
      ],
    }),
  },
  {
    name: 'Auth Bypass',
    description: 'Authentication logic flaw — access without valid credentials.',
    category: 'Findings',
    icon: '🔑',
    type: 'finding',
    blocks: makeFindingBlocks({
      vulnId: 'TPL-AUTH',
      title: 'Authentication Bypass via <method>',
      severity: 'crit',
      cvss: '9.1',
      cwe: 'CWE-287',
      affected: '<asset>',
      body:
        'A flaw in the authentication logic permits an unauthenticated attacker to gain access ' +
        'to authenticated functionality without valid credentials.',
      remediation:
        'Audit all authentication paths including password reset, OAuth, SAML and SSO flows. ' +
        'Apply the principle of failing closed on any error condition. Add integration tests ' +
        'covering negative cases.',
      pocSteps: [
        'Send POST /api/login with an empty Authorization header.',
        'Receive a session cookie despite no credentials.',
      ],
    }),
  },
];

interface FindingArgs {
  vulnId: string;
  title: string;
  severity: 'crit' | 'high' | 'med' | 'low' | 'info';
  cvss: string;
  cwe: string;
  affected: string;
  body: string;
  remediation: string;
  pocSteps: string[];
}

function makeFindingBlocks(f: FindingArgs): Block[] {
  return [
    {
      id: `b_tpl_${f.vulnId.toLowerCase()}`,
      type: 'finding',
      position: 0,
      attrs: {
        vulnId: f.vulnId,
        title: f.title,
        severity: f.severity,
        cvss: f.cvss,
        cwe: f.cwe,
        affected: f.affected,
        status: 'open',
        body: f.body,
        pocSteps: f.pocSteps,
        remediation: f.remediation,
      },
    },
  ];
}

export function seedFindingTemplatesIfEmpty(templates: TemplateService): void {
  const existing = templates.list({ category: 'Findings' });
  if (existing.length > 0) return;
  for (const t of FINDING_TEMPLATES) {
    templates.create(t);
  }
}
