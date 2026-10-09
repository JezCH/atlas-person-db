# Vercel burst deployment operating policy (v1.0)

Scope: `JezCH/atlas-person-db` Git-connected Vercel Production deployments. This is an **operator guideline**, not an automatic merge/deploy gate.

## Default: do not slow development

- Keep `main` Git auto-deployment, non-main Preview suppression and `scripts/vercel-ignore-build.mjs` unchanged.
- Keep parallel implementation, PR creation, review and GitHub CI unrestricted.
- Do not add a timer, queue, bot, API polling, mandatory approval or automated cancellation.
- Do not skip deployments needed to validate an exact Production SHA or a changed deployed runtime.

## Burst decision table

Count **unique Vercel Production deployment IDs** with creation timestamps in rolling windows (not Git commits, workflow runs, or repeated paginated records). Include READY, BUILDING, QUEUED and CANCELED when estimating request pressure. These are conservative operational counts, **not Vercel's authoritative billable quota**.

| State | Trigger (either rolling window) | Action |
| --- | --- | --- |
| NORMAL | <20 / 60 min **and** <80 / 24 h | Merge and deploy normally; no extra process |
| CAUTION | >=20 / 60 min **or** >=80 / 24 h | When multiple non-urgent PRs are already ready, prefer one coordinated merge/deployment checkpoint; do not wait for unrelated work |
| HIGH | >=28 / 60 min **or** >=95 / 24 h | Prioritize Production-critical changes; combine non-urgent changes into the next necessary checkpoint where practical; do not block development/CI |
| RETURN TO NORMAL | <15 / 60 min **and** <70 / 24 h | Resume normal merge cadence; hysteresis avoids toggling |

Evaluate HIGH before CAUTION; RETURN TO NORMAL is the exit condition after CAUTION/HIGH. Do not turn thresholds into hard deployment denials.

**Never delay for batching:** incident/security fix, breaking UI/API defect, deployed-runtime incompatibility blocking authoring/apply, or a required exact-SHA Production verification. If Vercel itself refuses a deployment, preserve the work and use its legitimate retry/recovery path; do not bypass platform limits.

## Verification and change control

- Only consult the deployment counts when a burst is apparent or before a known large merge wave. No background monitoring service.
- Deduplicate by deployment ID and validate pagination. The Vercel connector's `to` pagination may return the same page; use `until` for historical retrieval and verify distinct IDs before counting.
- If a `build-rate-limit` status occurs, record the affected commit, status URL, relevant deployment events, and whether subsequent Production deployments are READY. A historical failed commit status does not imply current deployments are blocked.
- The ignore-build command runs **after a Git deployment request is created**; it cannot guarantee avoidance of request-rate limits. Do not loosen fail-safe behavior without regression tests for runtime and exact-SHA cases.
- Revisit these provisional 20/80 and 28/95 thresholds only if evidence shows repeated false alarms, blocked necessary work, or another limit incident. Do not increase system complexity for a one-off failure.

Prior context: PR #97 and #165 reduced Preview traffic; PR #1788 documents why some audit workflows need an exact deployed SHA.
