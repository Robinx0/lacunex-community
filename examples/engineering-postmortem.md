# Postmortem — Connection-Pool Exhaustion in `orders-api`

> **Severity:** SEV-1 · **Status:** Resolved · **Author:** P. Aldera ·
> **Date:** 2026-04-23

A surge of legitimate traffic combined with a misconfigured deployment
of `orders-api` exhausted the shared PgBouncer pool in our `us-east-1`
region. From 14:32 to 15:19 UTC on 2026-04-22, 38% of checkout requests
returned `503 Service Unavailable`. Customer-facing impact ended once
we rolled back the deploy and increased the pool ceiling. No data was
lost.

## Timeline

All times UTC.

- **14:08** — Marketing email blast sent to ~2.1M users, deeplinking to
  `/checkout/cart`. Expected; capacity sized for a 4× peak.
- **14:30** — `orders-api` v2.41 finishes deploying to all `us-east-1`
  pods. The release switched the connection-pool config from
  `PG_POOL_MAX=80` to `PG_POOL_MAX=20` (a typo in the Helm values
  override during a separate refactor).
- **14:32** — First `503` errors surface in the edge CDN. Synthetic
  monitor at `/checkout` flips red.
- **14:33** — Pager fires (`api-checkout-error-rate > 1%`).
- **14:34** — Incident commander assigned (P. Aldera). Sev-1 declared.
- **14:38** — On-call engineer identifies elevated PgBouncer
  `cl_waiting` count. Suspects exhaustion.
- **14:51** — Rollback to `orders-api` v2.40 begins.
- **15:04** — Rollback complete across all 24 pods. Error rate falls.
- **15:19** — Synthetic monitor green. Customer-facing impact ends.
- **15:42** — Status page updated to "monitoring." Incident closed at
  16:30.

## Impact

- **Users affected:** ~74,000 distinct sessions saw at least one
  `503`. Of those, 21,200 abandoned the cart entirely.
- **Customer-facing duration:** 47 minutes (14:32 → 15:19).
- **Revenue exposure:** ~$184k of checkouts deflected (estimate
  based on prior 14-day average AOV × abandoned-cart count).
- **Data loss / corruption:** None. Carts were stored client-side
  and persisted to the DB on retry; no in-flight orders were lost.
- **External communication:** Status page updated at 14:39 with
  "investigating," then "identified" at 14:51, then "monitoring" at
  15:42, then "resolved" at 16:30.

## Detection

Detection was driven by the synthetic monitor at `/checkout`, which
flipped red within 90 seconds of the first `503`. The pager fired on
the `api-checkout-error-rate > 1% over 5 minutes` SLO alert at 14:33.

**Time to detect:** 1 minute (first symptom → first alert).

This is within target. Our SLO budget allows for up to 5 minutes; we
came in well under.

## Root cause

A Helm values override during the v2.41 release set
`PG_POOL_MAX=20` instead of the intended `80`. This was a copy-paste
error from a separate experimental config (we had been testing pool
behavior on a staging-only service). The two services share a
templated Helm chart but are supposed to override pool size
independently.

The misconfigured deploy went out at 14:30. By 14:32, with normal +
email-driven traffic on top, the 20 connection slots per pod were
saturated. PgBouncer's `cl_waiting` queue grew until requests timed
out at the upstream client.

## Contributing factors

- **No alarm on `PG_POOL_MAX` drift.** We have alarms on connection
  saturation but no alarm on the configured ceiling itself dropping.
  A 75% ceiling reduction was unobservable until traffic exposed it.
- **Helm chart shared across services.** The pool-config override
  lives in service-specific values files, but the chart structure
  invites cross-pollination during edits. A linter rule could enforce
  per-service pool ceilings.
- **Marketing campaign was not pre-announced to platform.** We had
  capacity sized for the expected 4× peak; we did not, however, cross-
  check that the planned release window overlapped with the email
  blast. Either the deploy or the campaign should have moved.
- **No deploy gate on `PG_POOL_MAX` regression.** The pre-deploy
  checks validate code paths but not service-config diffs.

## Resolution

Rollback to v2.40 restored the `PG_POOL_MAX=80` ceiling at the pod
level. PgBouncer connections drained back to nominal within 4
minutes of the last pod returning to healthy. No DB-side changes
were required.

## Action items

| ID | Owner | Action | Due |
|---|---|---|---|
| AI-01 | P. Aldera | Add Datadog monitor on `PG_POOL_MAX` value drift, alarming on >25% reduction in any production service. | 2026-04-30 |
| AI-02 | M. Chen | Add a deploy-gate that diffs the rendered Helm values against the previous release and flags any change to `PG_POOL_*`, `MAX_CONNECTIONS`, or other capacity knobs without a `--allow-capacity-change` flag. | 2026-05-07 |
| AI-03 | M. Chen | Update runbook section 4.2 with the rollback command sequence used during this incident. | 2026-04-29 |
| AI-04 | L. Singh | Add an integration test that boots `orders-api` with `PG_POOL_MAX=20` and asserts `503` rate stays below 1% under the standard load profile. (Negative test for this exact regression.) | 2026-05-14 |
| AI-05 | Platform | Add a calendar integration so marketing campaigns auto-sync to the deploy-freeze calendar. Same-window deploys require explicit override + a 15-minute pre-checkpoint. | 2026-05-21 |

## Lessons learned

**What went well**

- Detection was fast — pager fired within 90 seconds.
- Rollback was safe and clean. v2.40 was still in the cluster's
  image registry; the only delay was the rolling-pod cycle.
- The status page was updated early and frequently, which reduced
  customer-side support volume.

**What went poorly**

- The misconfiguration was invisible to our pre-deploy checks. We
  shipped a 75% reduction in a critical capacity knob with no
  guardrail.
- Cross-team coordination missed the deploy/marketing window
  overlap. Both teams behaved correctly within their own scope; the
  failure was at the seam.

**Where we got lucky**

- The traffic spike came from a marketing campaign with a clear
  retry pattern (users tap the email a second time). Carts persisted
  client-side; if the spike had been from an integration with no
  retry semantics, the revenue exposure would have been
  3-5× larger.

---

*Generated with [Lacunex Community](https://github.com/robinx0/lacunex-community)
from the **Engineering Postmortem** template. The Postmortem template
ships with the editor; pick it from "+ New report" to get this
structure pre-loaded.*
