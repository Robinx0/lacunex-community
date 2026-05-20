import type { Block } from '@shared/types';
import type { TemplateService, TemplateInput } from '../services/TemplateService';

/**
 * Built-in section templates for non-pentest report types: engineering
 * postmortem, security incident, audit gap, and consulting assessment.
 * Each is a `section`-type template — a full report scaffold that's
 * inserted via the template library or slash menu. Seeded on first run
 * only if the `Reports` category is empty.
 */

type CalloutKind = 'info' | 'warn' | 'danger' | 'success';

class BlockBuilder {
  readonly blocks: Block[] = [];
  constructor(private readonly slug: string) {}

  private nextId(): string {
    return `b_tpl_${this.slug}_${this.blocks.length}`;
  }

  h1(text: string): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'heading_1',
      position: this.blocks.length,
      content: JSON.stringify({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text }],
      }),
    });
    return this;
  }

  h2(text: string): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'heading_2',
      position: this.blocks.length,
      content: JSON.stringify({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text }],
      }),
    });
    return this;
  }

  para(text: string): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'paragraph',
      position: this.blocks.length,
      content: JSON.stringify({
        type: 'paragraph',
        content: [{ type: 'text', text }],
      }),
    });
    return this;
  }

  bullets(items: string[]): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'bullet_list',
      position: this.blocks.length,
      content: JSON.stringify({
        type: 'bulletList',
        content: items.map((t) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
        })),
      }),
    });
    return this;
  }

  ordered(items: string[]): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'ordered_list',
      position: this.blocks.length,
      content: JSON.stringify({
        type: 'orderedList',
        content: items.map((t) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
        })),
      }),
    });
    return this;
  }

  callout(text: string, kind: CalloutKind = 'info'): this {
    const label = calloutLabel(kind);
    this.blocks.push({
      id: this.nextId(),
      type: 'callout',
      position: this.blocks.length,
      attrs: { kind, label },
      content: JSON.stringify({
        type: 'callout',
        attrs: { kind, label },
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      }),
    });
    return this;
  }

  divider(): this {
    this.blocks.push({
      id: this.nextId(),
      type: 'divider',
      position: this.blocks.length,
      content: JSON.stringify({ type: 'horizontalRule' }),
    });
    return this;
  }
}

function calloutLabel(kind: CalloutKind): string {
  if (kind === 'warn') return 'Warning';
  if (kind === 'danger') return 'Danger';
  if (kind === 'success') return 'Success';
  return 'Note';
}

function build(slug: string, fn: (b: BlockBuilder) => void): Block[] {
  const b = new BlockBuilder(slug);
  fn(b);
  return b.blocks;
}

const REPORT_TEMPLATES: TemplateInput[] = [
  {
    name: 'Engineering Postmortem',
    description:
      'SRE / DevOps incident postmortem — timeline, impact, root cause, action items, lessons learned. Blameless framing.',
    category: 'Reports',
    icon: '🛠️',
    type: 'section',
    blocks: build('rca', (b) =>
      b
        .h1('Postmortem — <Incident Title>')
        .para(
          'One-paragraph summary: what happened, when, who was affected, and the headline mitigation. Written so an exec can read just this section and understand the incident.',
        )
        .callout(
          'Severity: <SEV-1 / SEV-2 / SEV-3>. Status: <Mitigated / Resolved>. Author: <Name>. Date: <YYYY-MM-DD>.',
          'info',
        )
        .h2('Timeline')
        .para('All times UTC. Capture detection, escalation, mitigation, and resolution as discrete events.')
        .bullets([
          '<HH:MM> — Anomaly first observable in <signal>',
          '<HH:MM> — Pager fired (<alert / service>)',
          '<HH:MM> — Incident declared, incident commander assigned',
          '<HH:MM> — Mitigation applied (<action>)',
          '<HH:MM> — Customer-facing impact ended',
          '<HH:MM> — Incident closed',
        ])
        .h2('Impact')
        .bullets([
          'Users affected: <count or percentage>',
          'Customer-facing duration: <minutes>',
          'Revenue or SLA exposure: <estimate>',
          'Data loss or corruption: <yes/no — describe>',
          'External communication issued: <yes/no — link to status page>',
        ])
        .h2('Detection')
        .para(
          'How did we find out? Which alert, dashboard, or customer report fired first? What was the time-to-detect from first symptom to first human action?',
        )
        .h2('Root Cause')
        .para(
          'Single causal explanation in plain English. Blameless: name systems and decisions, not people. Walk through the chain of events that produced the failure.',
        )
        .h2('Contributing Factors')
        .bullets([
          'Code change: <commit / PR link>',
          'Configuration drift in <component>',
          'Missing or noisy alert on <metric>',
          'Runbook gap for <scenario>',
          'Capacity / saturation pressure on <resource>',
        ])
        .h2('Resolution')
        .para('What action restored the system? Rollback, hotfix, traffic shift, or operator workaround? Who executed it?')
        .h2('Action Items')
        .bullets([
          '<owner> — Add alert for <signal> by <date>',
          '<owner> — Add automated rollback gate to <pipeline> by <date>',
          '<owner> — Update runbook section <X> by <date>',
          '<owner> — Add integration test for <regression scenario> by <date>',
        ])
        .h2('Lessons Learned')
        .bullets([
          'What went well during the response',
          'What went poorly during the response',
          'Where we got lucky',
        ]),
    ),
  },
  {
    name: 'Security Incident Report',
    description:
      'Breach / security incident report — detection, scope, IOCs, containment, eradication, recovery, recommendations.',
    category: 'Reports',
    icon: '🚨',
    type: 'section',
    blocks: build('inc', (b) =>
      b
        .h1('Security Incident Report — <Incident Title>')
        .para(
          'Executive summary: nature of the incident, when it was detected, scope of impact, and the disposition (contained / under investigation / resolved). Written for non-technical leadership.',
        )
        .callout(
          'Classification: <Confirmed Breach / Suspected Breach / Near Miss>. Severity: <Critical / High / Medium / Low>. Category: <Malware / Unauthorized Access / Data Exfiltration / Insider Threat / Phishing>.',
          'danger',
        )
        .h2('Detection Timeline')
        .bullets([
          '<YYYY-MM-DD HH:MM UTC> — Initial indicator observed (<source>)',
          '<YYYY-MM-DD HH:MM UTC> — Triage confirmed by <team>',
          '<YYYY-MM-DD HH:MM UTC> — Incident declared, IR lead assigned',
          '<YYYY-MM-DD HH:MM UTC> — Containment actions started',
          '<YYYY-MM-DD HH:MM UTC> — Containment confirmed effective',
        ])
        .h2('Affected Systems and Scope')
        .para('Inventory of systems, accounts, datasets, and identities touched by the incident. Be explicit about what was confirmed vs. what is still under investigation.')
        .bullets([
          'Hosts: <list>',
          'User accounts: <list>',
          'Customer data: <yes/no — describe records and volume>',
          'Third-party systems: <yes/no — describe>',
        ])
        .h2('Indicators of Compromise')
        .bullets([
          'IP addresses: <list>',
          'Domains / URLs: <list>',
          'File hashes: <SHA-256 list>',
          'User-Agents / TLS fingerprints: <list>',
          'Persistence mechanisms observed: <list>',
        ])
        .h2('Containment Actions')
        .para('What was done to stop the bleeding. Account isolation, network segmentation, credential rotation, EDR isolation, etc. Note who authorized each action.')
        .h2('Eradication and Recovery')
        .para('Removal of attacker artifacts (backdoors, scheduled tasks, persistence). Restoration of systems from known-good state. Validation that the threat actor no longer has access.')
        .h2('Root Cause Analysis')
        .para('Initial access vector and the failure modes that allowed escalation. If still under investigation, mark explicitly and link to the open analysis.')
        .h2('Recommendations')
        .bullets([
          'Immediate: <hardening action>',
          'Short-term (30 days): <control gap to close>',
          'Long-term (90+ days): <architectural change>',
          'Detection improvement: <new alert / log source>',
          'Process improvement: <runbook / training / tabletop>',
        ])
        .h2('Lessons Learned')
        .para('Honest assessment of what worked, what failed, and what we will do differently. Captured in the post-incident review.'),
    ),
  },
  {
    name: 'Audit Gap Assessment',
    description:
      'Compliance gap report against a named framework (SOC 2 / ISO 27001 / HIPAA / PCI DSS). Findings with severity, remediation plan, attestation.',
    category: 'Reports',
    icon: '📋',
    type: 'section',
    blocks: build('audit', (b) =>
      b
        .h1('Audit Gap Assessment — <Client> · <Framework>')
        .para(
          'Executive summary: framework assessed, scope of the engagement, total gaps identified by severity, and headline recommendations. Written for the client executive sponsor.',
        )
        .callout(
          'Framework: <SOC 2 Type II / ISO 27001:2022 / HIPAA Security Rule / PCI DSS v4.0 / NIST CSF 2.0>. Engagement window: <start> to <end>. Lead auditor: <Name>.',
          'info',
        )
        .h2('Engagement Scope')
        .para('Systems, processes, and business units covered by this assessment. Explicitly note exclusions (out-of-scope locations, products, or controls) so the client cannot mistake the report for a full enterprise attestation.')
        .h2('Methodology')
        .para('Approach taken: control walkthroughs, evidence sampling, interviews, system inspections. Sample sizes and selection criteria. Tooling used. Limitations of the assessment.')
        .h2('Summary of Findings')
        .bullets([
          'Critical gaps: <count>',
          'High gaps: <count>',
          'Medium gaps: <count>',
          'Low gaps: <count>',
          'Observations (informational): <count>',
        ])
        .h2('Detailed Gaps')
        .para('One subsection per gap, structured: Control reference, Observed state, Required state, Severity, Evidence, Remediation. The block below is an example — duplicate per finding.')
        .callout(
          'Control: <CC6.1>. Observed: <description>. Required: <description>. Severity: <High>. Evidence: <link / artifact id>. Remediation: <action and owner>.',
          'warn',
        )
        .h2('Remediation Plan')
        .ordered([
          'Critical gaps — remediate within 30 days. Owners: <names>.',
          'High gaps — remediate within 60 days. Owners: <names>.',
          'Medium gaps — remediate within 90 days. Owners: <names>.',
          'Low gaps and observations — address in next control-cycle review.',
          'Re-test plan: <auditor> will re-validate within <timeframe> of remediation.',
        ])
        .h2('Attestation')
        .para('Auditor name, firm, qualifications, and signature line. Statement of independence. Reservation of opinion if the engagement was scope-limited or evidence was incomplete.'),
    ),
  },
  {
    name: 'Consulting Assessment',
    description:
      'Generic consulting deliverable — engagement context, methodology, current-state, observations, recommendations, prioritized roadmap.',
    category: 'Reports',
    icon: '💼',
    type: 'section',
    blocks: build('consult', (b) =>
      b
        .h1('Consulting Assessment — <Client> · <Engagement>')
        .para(
          'Engagement context: business problem, why the client engaged, what success looks like, and the scope of this deliverable. One paragraph.',
        )
        .callout(
          'Engagement: <name>. Sponsor: <executive>. Window: <start> to <end>. Consultants: <names>.',
          'info',
        )
        .h2('Methodology')
        .para(
          'How the assessment was conducted: stakeholder interviews, document reviews, system inspections, workshops, benchmarking. Be explicit about sample sizes and what was NOT examined.',
        )
        .h2('Current-State Assessment')
        .para(
          'Honest snapshot of the client today. Strengths, weaknesses, capability gaps. Use evidence — quotes from interviews, metrics, artifacts — not consultant opinion alone.',
        )
        .h2('Key Observations')
        .bullets([
          'Observation 1 — <plain-English statement of fact, sourced>',
          'Observation 2 — <plain-English statement of fact, sourced>',
          'Observation 3 — <plain-English statement of fact, sourced>',
          'Observation 4 — <plain-English statement of fact, sourced>',
        ])
        .h2('Recommendations')
        .bullets([
          '<Quick win> — low effort, near-term value',
          '<Foundational> — medium effort, enables later changes',
          '<Strategic> — high effort, strategic positioning',
          '<Watchlist> — defer, but monitor signals <X / Y>',
        ])
        .h2('Prioritized Roadmap')
        .ordered([
          'Phase 1 (0–30 days): <quick wins, owners, success criteria>',
          'Phase 2 (30–90 days): <foundational changes, owners, success criteria>',
          'Phase 3 (90–180 days): <strategic initiatives, owners, success criteria>',
          'Phase 4 (180+ days): <watchlist items revisited>',
        ])
        .h2('Risks and Assumptions')
        .bullets([
          'Assumption: <stated assumption underpinning the recommendations>',
          'Risk: <what could invalidate the plan, with mitigation>',
          'Dependency: <external commitment required>',
        ])
        .h2('Appendices')
        .para(
          'Reference material: interview list, evidence index, benchmark sources, glossary. Each appendix gets its own subsection in the final deliverable.',
        ),
    ),
  },
  {
    name: 'Project Status Report',
    description:
      'Recurring project status update — highlights, progress against plan, risks, decisions needed, next period.',
    category: 'Reports',
    icon: '📊',
    type: 'section',
    blocks: build('status', (b) =>
      b
        .h1('Project Status — <Project> · Week of <YYYY-MM-DD>')
        .para(
          'One-paragraph executive summary: where the project stands, the headline change since last update, and the single most important thing the reader needs to know.',
        )
        .callout(
          'Status: <On Track / At Risk / Off Track>. Period: <start> to <end>. Project lead: <Name>. Reporting cadence: <weekly / biweekly>.',
          'info',
        )
        .h2('Highlights')
        .bullets([
          '<Headline accomplishment this period>',
          '<Second meaningful accomplishment>',
          '<Third accomplishment or external milestone>',
        ])
        .h2('Progress against plan')
        .para(
          'Compare actual vs. planned. Call out scope additions, schedule slippage, and effort variance. Concrete numbers beat vague adjectives.',
        )
        .bullets([
          'Milestone <X>: <on track / +N days slip / completed early>',
          'Milestone <Y>: <status with brief explanation>',
          'Milestone <Z>: <status with brief explanation>',
        ])
        .h2('Risks and blockers')
        .bullets([
          '<Risk title> — <impact if it materializes>. Mitigation: <action>. Owner: <name>.',
          '<Blocker title> — <what is blocked, by what, since when>. Action needed: <ask>.',
          '<Risk or blocker title> — <description, mitigation, owner>.',
        ])
        .h2('Decisions needed')
        .bullets([
          '<Decision request> — needed by <date>. Recommended option: <X>. Tradeoffs: <Y vs Z>.',
          '<Decision request> — needed by <date>. Recommended option: <X>. Tradeoffs: <Y vs Z>.',
        ])
        .h2('Next period')
        .bullets([
          '<Top priority for next period> — owner, expected outcome',
          '<Second priority> — owner, expected outcome',
          '<Third priority> — owner, expected outcome',
        ])
        .h2('Metrics')
        .bullets([
          'Burn rate / velocity: <number, with delta from last period>',
          'Budget consumed: <percentage, with delta>',
          'Quality signal (defect rate / SLA / NPS): <number, with delta>',
        ]),
    ),
  },
  {
    name: 'Research Report',
    description:
      'Technical research deliverable — abstract, background, methodology, findings, discussion, recommendations, references.',
    category: 'Reports',
    icon: '🔬',
    type: 'section',
    blocks: build('research', (b) =>
      b
        .h1('Research Report — <Topic>')
        .para(
          'Abstract: 3-5 sentences summarizing the research question, the approach taken, the headline finding, and its practical implication. Written so a busy reader can decide whether to keep reading.',
        )
        .callout(
          'Research lead: <Name>. Co-authors: <names>. Period: <start> to <end>. Funding / sponsor: <none / org name>.',
          'info',
        )
        .h2('Background')
        .para(
          'Context for the research question. What is already known. What gap or unanswered question this work addresses. Why now.',
        )
        .h2('Research question')
        .para(
          'Single, falsifiable, scoped question the report answers. Avoid scope creep — one question per report; follow-ups belong in their own reports.',
        )
        .h2('Methodology')
        .para(
          'How the research was conducted: data sources, sample sizes, tooling, experimental setup, statistical methods. Be explicit about what was excluded from scope.',
        )
        .h2('Findings')
        .para(
          'One subsection per finding. Each subsection: claim · evidence · confidence level · caveats. Replicate the structure below per finding.',
        )
        .callout(
          'Finding 1: <claim in one sentence>. Confidence: <high / medium / low>. Evidence: <link / data reference>. Caveats: <what could overturn this>.',
          'success',
        )
        .h2('Discussion')
        .para(
          'Interpret the findings. How they relate to existing knowledge. Surprising results. Limitations of the approach. Plausible alternative explanations and why this report does or does not adopt them.',
        )
        .h2('Recommendations')
        .bullets([
          'For practitioners: <actionable change in practice>',
          'For tooling / vendors: <gap that warrants new tooling>',
          'For future research: <follow-up question worth pursuing>',
        ])
        .h2('References')
        .bullets([
          '<Author, Year>. "<Title>." <Venue / URL>.',
          '<Author, Year>. "<Title>." <Venue / URL>.',
          '<Author, Year>. "<Title>." <Venue / URL>.',
        ])
        .h2('Appendices')
        .para(
          'Raw data references, derivation steps, longer code listings, full interview transcripts. Reproducibility material that does not belong in the body.',
        ),
    ),
  },
  {
    name: 'OSCP Exam Report',
    description:
      'Offensive Security OSCP exam report scaffold — student / OSID block, methodology, per-target writeups (initial access, priv esc, local.txt, proof.txt), AD set, references, proof contents appendix.',
    category: 'Reports',
    icon: '🎯',
    type: 'section',
    blocks: build('oscp', (b) =>
      b
        .h1('Offensive Security OSCP Exam Report')
        .callout(
          'Student: <student@youremailaddress.com>. OSID: OS-XXXXX. Exam date: <YYYY-MM-DD>. Subtitle: OSCP Exam Report. Language: en. Cover page enabled.',
          'info',
        )
        .h2('Introduction')
        .para(
          'The Offensive Security OSCP exam penetration test report contains all efforts that were conducted in order to pass the OSCP exam. This report should contain all items that were used to pass the overall exam and it will be graded from a standpoint of correctness and fullness to all aspects of the exam. The purpose of this report is to ensure that the student has a full understanding of penetration testing methodologies as well as the technical knowledge to pass the qualifications for the Offensive Security Certified Professional.',
        )
        .h2('Objective')
        .para(
          'The objective of this assessment is to perform an internal penetration test against the Offensive Security Exam network. The student is tasked with following a methodical approach in obtaining access to the objective goals. This test should simulate an actual penetration test and how the student would start from beginning to end, including the overall report.',
        )
        .h2('Requirements')
        .para('The student will be required to fill out this exam report fully and to include the following sections:')
        .bullets([
          'High-level technical summary of the penetration test report.',
          'Methodologies used while conducting the penetration test.',
          'Detailed walkthrough for every compromised machine and the Active Directory set.',
          'Each finding must include the vulnerability discovered, severity, exploitation steps, and the proof.txt / local.txt contents.',
          'Any post-exploitation steps, including privilege escalation and post-exploitation enumeration.',
        ])
        .h1('High-Level Summary')
        .para(
          'The student was tasked with performing an internal penetration test against the OSCP exam network. An internal penetration test is a dedicated attack against internally connected systems. The focus of this test is to perform attacks similar to those of a malicious entity and attempt to infiltrate the OSCP exam environment. The overall objective was to evaluate the network, identify systems, and exploit flaws while reporting the findings back to Offensive Security.',
        )
        .h2('Recommendations')
        .para(
          'The student recommends patching the vulnerabilities identified during the testing to ensure that an attacker cannot exploit these systems in the future. One thing to remember is that these systems require frequent patching and once patched, should be checked regularly to prevent other vulnerabilities from being discovered.',
        )
        .h1('Methodologies')
        .para(
          'The student utilized a widely adopted approach to performing penetration testing that is effective in testing how well the Offensive Security Exam environments are secure. Below is a breakdown of how the student was able to identify and exploit the variety of systems and includes all individual vulnerabilities found.',
        )
        .h2('Information Gathering')
        .para(
          'The information gathering portion of a penetration test focuses on identifying the scope of the penetration test. During this penetration test, the student was tasked with exploiting the exam network. The specific IP addresses were:',
        )
        .bullets([
          'Exam network: <10.11.0.0/24>',
          'Active Directory set: <10.11.1.0/24>',
          'Stand-alone target #1: <IP>',
          'Stand-alone target #2: <IP>',
          'Stand-alone target #3: <IP>',
        ])
        .h2('Service Enumeration')
        .para(
          'The service enumeration portion of a penetration test focuses on gathering information about what services are alive on a system or systems. This is valuable for an attacker as it provides detailed information on potential attack vectors into a system. Understanding what applications are running on the system gives an attacker needed information before performing the actual penetration test. In some cases, some ports may not be listed.',
        )
        .h2('Penetration')
        .para(
          'The penetration testing portions of the assessment focus heavily on gaining access to a variety of systems. During this penetration test, the student was able to successfully gain access to <X> out of the <Y> systems.',
        )
        .h2('Maintaining Access')
        .para(
          'Maintaining access to a system is important to the student as the student must keep access to the system. This phase focuses on documenting and maintaining the access to a system. In a real engagement, the student would, by request, set up backdoors that allow the student to log on at any given time through methods such as reverse shell or post-exploitation modules.',
        )
        .h2('House Cleaning')
        .para(
          'The house cleaning portions of the assessment ensure that remnants of the penetration test are removed. Often, malware, scripts, and remnants of compromise are left over on customer machines. House cleaning ensures that the student has not impacted system functionality and that any artifacts are documented for the customer to remove or further review.',
        )
        .h1('Active Directory Set')
        .para(
          'The Active Directory set comprises a domain controller and one or more domain-joined hosts. Compromise of the entire set is required to receive full marks for this section. Document the path from external foothold to Domain Admin clearly enough that a graders or future-you can replay every step.',
        )
        .h2('AD — Initial Access')
        .para('Foothold target: <hostname / IP>. Vulnerability or misconfiguration leveraged: <description>. Exploit and command sequence:')
        .bullets([
          'Reconnaissance: <nmap / enum4linux / ldapsearch output of interest>',
          'Initial access vector: <SMB null session / Kerberoasting / unauthenticated RCE / phishing-equivalent>',
          'Initial shell: <command, user context, hostname>',
          'local.txt path and contents: <path> · <hash>',
        ])
        .h2('AD — Lateral Movement')
        .para('Pivot path through the domain: harvested credentials, hashes, tickets, or trust abuse. Document each hop with the host, user context, and the technique used to move.')
        .bullets([
          'Credential / hash / ticket harvested: <source, value, user>',
          'Lateral move: <from host as <user> → to host as <user>, technique>',
          'Tooling: <evil-winrm / wmiexec / psexec / pass-the-hash / pass-the-ticket>',
        ])
        .h2('AD — Domain Privilege Escalation')
        .para('Path to Domain Admin: misconfiguration exploited (ACL abuse, DCSync, Kerberos delegation, GPO abuse, etc.), proof of DA shell, and the proof.txt contents from the domain controller.')
        .bullets([
          'Privilege escalation vector: <description>',
          'Tooling: <BloodHound finding / Rubeus / Mimikatz / impacket>',
          'Proof of Domain Admin: <screenshot reference, command output>',
          'proof.txt path and contents: <path> · <hash>',
        ])
        .h1('Stand-alone Target #1 — <Hostname / IP>')
        .h2('Service Enumeration')
        .para('Open ports, services, and versions discovered. Reference the nmap / specialized-tool output that informed the attack path.')
        .h2('Initial Access')
        .para('Vulnerability exploited to obtain a low-privileged shell. Include the CVE / CWE if applicable, the exact exploit or payload used, and the user context obtained.')
        .h2('local.txt')
        .callout('local.txt path: <C:\\Users\\user\\Desktop\\local.txt>. Contents: <hash>.', 'success')
        .h2('Privilege Escalation')
        .para('Vulnerability or misconfiguration leveraged to escalate privileges. Walk through enumeration steps, the chosen vector, and the full exploitation sequence.')
        .h2('proof.txt')
        .callout('proof.txt path: <C:\\Users\\Administrator\\Desktop\\proof.txt or /root/proof.txt>. Contents: <hash>.', 'success')
        .h1('Stand-alone Target #2 — <Hostname / IP>')
        .h2('Service Enumeration')
        .para('Open ports, services, and versions discovered.')
        .h2('Initial Access')
        .para('Vulnerability exploited to obtain a low-privileged shell.')
        .h2('local.txt')
        .callout('local.txt path: <path>. Contents: <hash>.', 'success')
        .h2('Privilege Escalation')
        .para('Vulnerability or misconfiguration leveraged to escalate privileges.')
        .h2('proof.txt')
        .callout('proof.txt path: <path>. Contents: <hash>.', 'success')
        .h1('Stand-alone Target #3 — <Hostname / IP>')
        .h2('Service Enumeration')
        .para('Open ports, services, and versions discovered.')
        .h2('Initial Access')
        .para('Vulnerability exploited to obtain a low-privileged shell.')
        .h2('local.txt')
        .callout('local.txt path: <path>. Contents: <hash>.', 'success')
        .h2('Privilege Escalation')
        .para('Vulnerability or misconfiguration leveraged to escalate privileges.')
        .h2('proof.txt')
        .callout('proof.txt path: <path>. Contents: <hash>.', 'success')
        .h1('Bonus — Lab and Coursework Submission')
        .para(
          'If the student is claiming the 10 bonus points, link to the separately submitted lab report and coursework exercises here. State the number of lab machines compromised and the percentage of coursework exercises completed.',
        )
        .bullets([
          'Lab machines compromised: <count> / 10 required',
          'Coursework exercises completed: <percentage> / 80% required',
          'Lab report and exercise files: <submission filename / archive>',
        ])
        .h1('References')
        .bullets([
          '<Tool / CVE name> — <URL or advisory reference>',
          '<Tool / CVE name> — <URL or advisory reference>',
          '<Tool / CVE name> — <URL or advisory reference>',
        ])
        .h1('Appendix — Proof and Local Contents')
        .para('Consolidated list of every proof.txt and local.txt collected, for grader convenience. Hashes appear here exactly as read from the target.')
        .bullets([
          'AD — proof.txt (DC): <hash>',
          'Stand-alone #1 — local.txt: <hash> · proof.txt: <hash>',
          'Stand-alone #2 — local.txt: <hash> · proof.txt: <hash>',
          'Stand-alone #3 — local.txt: <hash> · proof.txt: <hash>',
        ])
        .divider()
        .para('Submission checklist before zipping and uploading to the Offensive Security control panel:')
        .bullets([
          'OSID and student email are correct on the cover and metadata.',
          'Every compromised target has initial-access, priv-esc, and proof sections completed with screenshots.',
          'All local.txt and proof.txt hashes match the appendix.',
          'Bonus claim (if applicable) cross-references the lab report archive.',
          'Report exported to PDF and renamed to OSID-OSCP-Exam-Report.pdf.',
        ]),
    ),
  },
  {
    name: 'Executive Brief',
    description:
      'Short-format briefing for executive readers — TL;DR, context, key points, recommendation, decision required.',
    category: 'Reports',
    icon: '📑',
    type: 'section',
    blocks: build('exec', (b) =>
      b
        .h1('Executive Brief — <Subject>')
        .callout(
          'TL;DR: <one-sentence headline>. Recommendation: <one-sentence recommendation>. Decision needed by: <date>.',
          'info',
        )
        .h2('Context')
        .para(
          'Why this brief, why now. The trigger event or strategic question. Two paragraphs maximum — executives are not the audience for prose padding.',
        )
        .h2('Key points')
        .bullets([
          '<Most important fact, sourced if possible>',
          '<Second most important fact>',
          '<Third most important fact>',
          '<Constraint or tradeoff the reader must hold in mind>',
        ])
        .h2('Options considered')
        .ordered([
          'Option A — <description>. Cost: <estimate>. Risk: <summary>. Time-to-impact: <window>.',
          'Option B — <description>. Cost: <estimate>. Risk: <summary>. Time-to-impact: <window>.',
          'Option C — <description>. Cost: <estimate>. Risk: <summary>. Time-to-impact: <window>.',
        ])
        .h2('Recommendation')
        .para(
          'Stated as a clear preference with the reason in one sentence. Not a buffet of "we could do X or Y or Z" — pick one and own it.',
        )
        .callout(
          'Decision required: <approve / reject / amend>. From: <decision-maker name>. By: <date>. Blocking the team from progressing on: <next milestone>.',
          'warn',
        )
        .h2('Owners and next steps')
        .bullets([
          '<Owner> — <what they will do if the recommendation is approved>',
          '<Owner> — <what they will do>',
          '<Owner> — <what they will do>',
        ])
        .h2('Appendix — supporting detail')
        .para(
          'Anything the executive can ignore but the staff might need to defend the brief: data tables, vendor quotes, prior-decision history, dissenting view.',
        ),
    ),
  },
];

/**
 * Seed any missing built-in section templates by name. Critically NOT
 * gated on "the Reports category is empty" — that early-out broke the
 * upgrade path: a user who installed CE when only four templates
 * existed kept those four forever and never saw the three later
 * additions (Project Status, Research, Executive Brief), which made
 * the New Report wizard hang on "Loading template..." for the new
 * options. Each entry is created independently iff no existing
 * template shares its name.
 */
export function seedReportSectionTemplatesIfMissing(templates: TemplateService): void {
  const existing = templates.list({ category: 'Reports' });
  const existingNames = new Set(existing.map((t) => t.name));
  for (const t of REPORT_TEMPLATES) {
    if (!existingNames.has(t.name)) {
      templates.create(t);
    }
  }
}
