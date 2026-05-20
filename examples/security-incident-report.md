# Security Incident Report — Phishing-Driven Credential Exposure

> **Classification:** Confirmed Breach · **Severity:** High ·
> **Category:** Unauthorized Access · **Author:** S. Reyes ·
> **Date:** 2026-03-16

On 2026-03-14 at 09:18 UTC, an employee in the finance team responded
to a phishing email and entered their corporate Okta credentials on a
spoofed login page. The attacker authenticated to the employee's Okta
session at 09:23 UTC and accessed Workday and Salesforce for 2 hours
12 minutes before EDR isolated the device. No customer data was
accessed. No data exfiltration is confirmed. The employee's session
has been revoked; their account credentials and MFA factors are
rotated. This is a high-severity incident and a near-miss for
customer-data exposure.

## Detection timeline

All times UTC.

- **2026-03-14 09:14** — Phishing email lands in employee inbox.
  Subject: "Action required: re-verify your Okta session." Sender:
  `okta-noreply@oktanotices.org` (lookalike domain).
- **09:18** — Employee clicks the link, lands on a typosquat domain
  hosting a pixel-perfect Okta clone. Submits username + password.
- **09:19** — Employee receives a push challenge from the real Okta
  (the attacker's relay is forwarding the auth request). Employee
  approves it.
- **09:23** — Attacker establishes an authenticated Okta session from
  IP `185.220.101.35` (Tor exit node, Frankfurt).
- **09:31** — Attacker accesses Workday. Reads employee directory,
  org chart, salary band data.
- **10:07** — Attacker accesses Salesforce. Searches for "wire
  transfer" and "banking" in Cases. Reads 4 cases (no PII; all
  related to internal IT requests).
- **11:32** — Workday's anomaly-detection flags "atypical login
  location for user `s.morgan@acme.com`." Alert routed to SecOps.
- **11:35** — SecOps triages alert, confirms session is from Tor exit
  while user is physically in office (Slack presence + badge log).
  Incident declared. IR lead assigned (S. Reyes).
- **11:38** — Containment actions started.
- **11:43** — Okta session revoked, password reset forced, MFA
  factors removed and re-enrolled.
- **11:47** — Employee's laptop isolated via CrowdStrike EDR.
- **12:14** — Forensic team images the laptop.
- **2026-03-15 14:00** — Containment confirmed effective. Incident
  closed pending RCA.

**Time to detect:** 2 hours 9 minutes (initial credential entry →
SecOps alert).

## Affected systems and scope

| System | Confirmed access | Data sensitivity |
|---|---|---|
| Okta (employee SSO session) | Yes — full session | Auth tokens for downstream apps |
| Workday | Yes — read-only | Employee directory, salary bands |
| Salesforce | Yes — 4 case reads | No PII; internal IT cases |
| GitHub | No | Not accessed during the session |
| AWS Console | No | Not accessed during the session |
| Customer data systems (S3 customer buckets, BigQuery customer dataset) | No | Not accessed |

Confirmed via Okta logs, Workday access logs, Salesforce login history,
GitHub audit log, and AWS CloudTrail. The employee did not have
production AWS or customer-data access; this is the primary reason
the blast radius stayed within internal HR/IT data.

## Indicators of compromise

| IoC | Value | Notes |
|---|---|---|
| IP | `185.220.101.35` | Tor exit, Frankfurt |
| IP | `192.42.116.180` | Tor exit, Sweden — second session attempt at 12:48 (post-isolation, denied) |
| Domain | `okta-acme.notify-portal[.]net` | Phishing landing page |
| Domain | `oktanotices[.]org` | Sender domain of the phishing email |
| Email | `okta-noreply@oktanotices.org` | Spoofed sender |
| User-Agent | `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36` | Mismatched OS for the user (employee is on macOS) |
| Persistence | None observed | Attacker did not establish backdoor or scheduled task |

These IoCs have been added to our network blocklist and SIEM watchlist.
The lookalike domain `okta-acme.notify-portal[.]net` was reported to
the registrar for takedown and was offline as of 2026-03-15 18:00.

## Containment actions

1. **Okta session revoked** by SecOps (`oktaadmin` action) at 11:43.
   This invalidated the attacker's session token immediately.
2. **Account credentials rotated.** Password reset was forced via
   Okta self-service flow over a verified channel (phone call to
   employee's known number).
3. **MFA factors removed and re-enrolled.** All previous MFA factors
   (push, SMS, hardware key) were removed. Employee re-enrolled
   their hardware key in person at the IT desk.
4. **Laptop isolated** via CrowdStrike EDR Network Containment at
   11:47. The device retained EDR connectivity but lost all other
   network access.
5. **Downstream session checks.** Workday and Salesforce were
   queried for any active sessions for the user. None remained;
   Okta's revocation cascaded.
6. **Email rule check.** The employee's mailbox was inspected for
   any rules added during the compromise window. None were present.

## Eradication and recovery

- **Forensic image** of the laptop was taken at 12:14 (drive image
  + memory dump). Initial review confirmed no persistence
  mechanisms (no new launch agents, scheduled tasks, browser
  extensions, or LSP entries dated after the compromise window).
- **Laptop returned to service** at 2026-03-15 09:00 after a clean
  re-imaging from gold image. Network containment lifted.
- **Reviewed Workday and Salesforce read logs** for the compromise
  window in detail — confirmed scope above.
- **Customer data systems** verified untouched via CloudTrail,
  BigQuery audit, S3 access logs.

Recovery is complete. The user is back on a clean laptop, with new
credentials, new MFA factors, and a 30-day elevated monitoring tag in
the SIEM.

## Root cause analysis

The initial access vector was a phishing email that defeated the
following controls:

1. **DMARC/DKIM** — the spoofed sender domain (`oktanotices.org`)
   was a registered lookalike, not a forgery. DMARC and DKIM passed
   for the actual sending domain. Our anti-phishing filter did not
   flag the lookalike as known-bad at message arrival.
2. **MFA** — the employee approved the push challenge because the
   attacker's relay made the auth request look legitimate (correct
   timing, correct username). Push notifications without
   number-matching are vulnerable to MFA-relay attacks.
3. **Anomalous-login detection** — Workday flagged the atypical
   login location, but only after the attacker had been active
   for 2 hours 8 minutes. Okta itself did not flag the Tor exit
   IP at the moment of authentication.

The compromise was contained because:

- The user's downstream access did not include customer-data
  systems.
- Workday's anomaly detection (eventually) caught it.
- The user's laptop was managed and could be isolated remotely.

## Recommendations

| Priority | Recommendation | Owner | Target |
|---|---|---|---|
| Immediate | Roll out **number-matching MFA** for all push challenges in Okta. Configure number-matching enforcement at the Okta tenant level. | IT/SecOps | 2026-03-31 |
| Immediate | Add `oktanotices.org` and 12 other identified lookalike domains to the email gateway blocklist. Subscribe to a managed lookalike-domain feed. | IT/SecOps | 2026-03-22 |
| Short-term (30d) | Mandatory phishing-resistance training for all employees with elevated access, with a focus on push-relay attacks and lookalike-domain recognition. | People Ops | 2026-04-15 |
| Short-term (30d) | Enable Okta IP-allowlist enforcement for sensitive apps (Workday, Salesforce, GitHub, AWS). Block all known anonymizer ranges (Tor, commercial VPNs) at the Okta policy level. | IT/SecOps | 2026-04-15 |
| Long-term (90+d) | Migrate to **passkeys** for all SSO authentication. WebAuthn-bound credentials are not phishable. Deprecate password-plus-MFA. | IT/SecOps + Eng | 2026-07-01 |
| Detection improvement | Add a SIEM rule for `Okta login from Tor exit node` that pages SecOps within 5 minutes regardless of subsequent activity. | SecOps | 2026-04-08 |
| Process improvement | Run a tabletop exercise quarterly that simulates a phished SSO session. Validate that the IR runbook still maps to the current Okta + EDR + Workday configurations. | SecOps | Recurring |

## Lessons learned

**What worked**

- Workday's anomaly detection caught the compromise. It was slower
  than we'd like (2h+), but it was the only signal that fired —
  and it fired.
- EDR network-containment was fast and clean. The laptop was
  isolated within 4 minutes of the IR call.
- The employee was cooperative, verifiable through a known phone
  number, and able to re-enroll their hardware key in person same-
  day. The whole containment loop closed in under 4 hours.

**What failed**

- Push-only MFA without number-matching was the controlling
  failure. We had known about MFA-relay attacks for over a year
  and had number-matching on a "next quarter" backlog. It needs
  to ship now.
- Phishing detection failed. The lookalike domain had been
  registered 11 days prior; commercial threat-intel feeds knew
  about it but our filter wasn't subscribed.
- 2 hours from compromise to detection is too long for an account
  with cross-system SSO. Lower-tier alerting (e.g. on Okta IP
  reputation, not Workday access patterns) would have detected
  this within minutes.

**What we got lucky on**

- The user did not have customer-data access. If this had been an
  engineering account with `prod-readonly` IAM, the breach would
  have crossed into customer-data territory and been
  disclosable. The eventual passkey rollout (recommendation
  above) is the durable fix; in the meantime, audit who has
  cross-system SSO scope and reduce it.

## Distribution

This report is restricted to: CISO, CTO, Director of People Ops,
General Counsel. Internal-only. Do not forward outside the
distribution list without written approval from the CISO.

---

*Generated with [Lacunex Community](https://github.com/robinx0/lacunex-community)
from the **Security Incident Report** template. The Incident template
ships with the editor; pick it from "+ New report" to get this
structure pre-loaded.*
