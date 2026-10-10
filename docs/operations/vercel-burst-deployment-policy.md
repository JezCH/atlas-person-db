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

## Release-request discipline (incident follow-up)

- **Before asking Vercel to deploy manually**, inspect the latest Production deployment once. If the Git-connected `main` deployment is already READY and contains the required UI/runtime commit, reuse it; do not create a redundant deployment just to obtain a newer SHA. If an exact-SHA canonical writer requires an exact version, follow that writer's existing release/security procedure instead of claiming ancestry alone is sufficient.
- **Do not equate ignored builds with free requests.** The ignore-build command is evaluated only after Vercel receives a Git deployment request. Count created and canceled deployment IDs as pressure signals; neither a green GitHub CI run nor an ignored build guarantees a free deployment-request slot.
- **When Vercel explicitly returns a request-quota error** (including HTTP 402 with `api-deployments-free-per-day`), do not issue repeated manual deploy requests or force-new retries. Preserve merged work, record the refusal and latest READY commit, and defer an optional release until the provider accepts normal Git deployment again. Do not disable security/exact-SHA gates or change billing automatically.
- **Use one natural release for related optional UI changes** when several are ready during CAUTION/HIGH, without blocking independent development/PR tests. Do not add a project-wide work lock, automatic merge denial, polling loop, scheduler, or background monitor.
- **Keep observed counts and provider limits separate.** Rolling-window counts from the Vercel deployment list are advisory, may omit rejected requests, and cannot override an explicit provider quota refusal. A new attempt is justified by a needed change plus evidence the service has recovered—not by guessing that the list shows free slots.

## Verification and change control

- Only consult the deployment counts when a burst is apparent or before a known large merge wave. No background monitoring service.
- Deduplicate by deployment ID and validate pagination. The Vercel connector's `to` pagination may return the same page; use `until` for historical retrieval and verify distinct IDs before counting.
- If a `build-rate-limit` status occurs, record the affected commit, status URL, relevant deployment events, and whether subsequent Production deployments are READY. A historical failed commit status does not imply current deployments are blocked.
- The ignore-build command runs **after a Git deployment request is created**; it cannot guarantee avoidance of request-rate limits. Do not loosen fail-safe behavior without regression tests for runtime and exact-SHA cases.
- Revisit these provisional 20/80 and 28/95 thresholds only if evidence shows repeated false alarms, blocked necessary work, or another limit incident. Do not increase system complexity for a one-off failure.

Prior context: PR #97 and #165 reduced Preview traffic; PR #1788 documents why some audit workflows need an exact deployed SHA.
