# ATLAS Vercel Hobby quota incident & non-regression policy

**Status:** Mandatory resource guard (2026-10-12). **Scope:** every ATLAS lane, agent, operator, researcher and CI workflow sharing the JezCH Vercel Hobby team.

## Verified incident (not an estimate)

- Production returned HTTP 402 `DEPLOYMENT_DISABLED` while deployment builds were `READY`.
- Vercel showed `Paused — Upgrade to resume service`, Sandbox Active CPU **5h06m / 5h** and Fast Origin Transfer **10.19GB / 10GB**.
- Fast Origin Transfer **was not attributed to individual routes**. Sandbox download ingress is a different counter, and must never be reported as proof of the 10.19GB source.
- The public Person/Activity reads return large, largely unpaginated JSON and use `no-store`; Production visual acceptance previously polled exact SHA as many as 90 times. These are verified risk factors, **not proved byte contributions**.

## P0 — hard stop: no Vercel Sandbox for development or research

- **Never launch, resume or schedule any Vercel Sandbox in the JezCH team** for crawling, data ingestion, historical research, candidate discovery, bulk analysis, UI experimentation, testing or normal CI. This includes direct app/connector calls, CLI, SDK, and agents outside this repository.
- Use local development or a **separately budgeted, approved research runner**. An external service is not automatically free; check its limits first. Keep research runs checkpointed, bounded, incremental and resumable.
- Historical discovery must reuse previously verified files; **do not restart an entire crawl to retry a small batch**.
- The CI gate `scripts/verify-vercel-resource-budget.mjs` rejects Sandbox launch commands committed to executable repository paths. **CI cannot stop a direct Vercel UI/connector call**; all operators and assistants must apply this rule too.
- Only a new explicit user authorization can change this prohibition, after showing the expected CPU/data budget.

## P1 — Fast Origin Transfer protection

- Until route-level usage is known, do not claim an exact 10.19GB cause.
- No unbounded external loops over public Production list endpoints; no repeated full-person, full-polity or full-activity downloads for internal audits if a DB or local snapshot can serve them.
- Batch relevant Production acceptance reads; reuse evidence and snapshots. Probe one needed endpoint only; **HTTP 402 is terminal**, not retryable.
- Introduce output versioning/conditional requests or carefully controlled CDN caching **only after** verifying runtime publication, canonical writer read-after-write, data freshness and authorization. Do not blindly cache mutation/admin endpoints or silently truncate the historical database.
- Inspect Vercel Usage by resource and request path whenever available. **At 60%** of monthly Origin quota, investigate top routes. **At 75%**, suspend non-essential Production audits and bulk reads. **At 85%**, pause all discretionary reads while preserving normal user-facing availability. These thresholds require an actual Usage check: this repository currently **does not automatically read Vercel's billing meter**.

## P2 — deploy, validation and safe recovery

- Keep `WORK_EXECUTION.md` small-work-unit approach: bundle coherent commits; no unrelated full-history audit, UI screenshot loop, deployment polling or smoke-test replay.
- Production visual SHA verification must fail fast at 402 and use at most 12 ten-second tries. Run this workflow only for UI changes that genuinely need browser acceptance.
- Merge/build success is **not** proof of live availability. Verify a healthy HTTP response once service is resumed.
- Never auto-upgrade, pay, restart a Sandbox, unpause Vercel or deploy merely to test quota recovery.
- Once Vercel's Usage quota window permits, request/perform permitted Hobby service reactivation and verify publicly; **there is no guarantee of immediate/automatic reactivation**.

## 2026-10-16 corrective implementation and Production feedback contract

- The original main/Production Chrome visual workflow launched **19 scripts** per run. Main now runs a **three-script bounded Production smoke**; explicit manual `workflow_dispatch` retains all 19 visual validators.
- Non-Person routes no longer start a Person full-list Function read from the initial Person module (the canonical Person view still loads full data when opened; no records are removed).
- CORE SHA polling limited from 90 to 12; CORE, Dashboard and existing visual test stop immediately on HTTP 402. Canonical writer correctness and read-after-write remain mandatory.
- Large dynamic JSON replies log **pathname plus uncompressed JSON byte count only** and add an `x-atlas-json-bytes` diagnostic header; this is **not** the Vercel billed transfer metric and must not be presented as exact FOT metering.
- The user evaluates changes at **Production**, not merely on a PR. A merged branch awaiting suspended Vercel remains `BLOCKED — PRODUCTION NOT LIVE` until the actual public URL is HTTP 200 and changed UI verified. No paid upgrade is permitted.
- The Oct 8–10 origin-byte cause remains **unquantified by request path**. Investigate other PR Production browser workflows, redundant audits and 402 retry loops before calling all routes protected.

## 2026-10-16 follow-up — avoid repeat Production audits and false deploy dependencies

- GitHub `.github/workflows/**` files are CI configuration, not served runtime assets. Workflow-only changes must **skip Vercel builds** (mixed runtime changes still deploy). This fixes unnecessary deployments that used to wait on a SHA the `vercel-ignore-build` classifier may skip.
- CORE Final Acceptance retains its exact-SHA Production and generated artifact gates for **deployed CORE surfaces** but no longer auto-runs for unrelated `tests/**`, `requirements/**`, generic `scripts/**`, or edits of its own workflow file. Repository integrity handles such code checks.
- The entire read-only Stage2/Polity/Place Production censuses are **manual workflow_dispatch**; never relaunch a multi-megabyte audit simply because a handler or workflow file changed. Preserve their scripts/artifacts and invoke one focused authorized check when a real audit decision needs it.
- Protected Human Authoring retains conservative, schema-aware 60-attempt readiness logic for canonical safety, but stops before mutation if Vercel reports HTTP 402. Place audit retries are bounded and 402-terminal.
- An older deployed site may return 200 while **new deployment creation is blocked**. Production feedback closes only when current deployed assets and user-visible behavior are verified. Last observed error: 402 `resource_creation_blocked` for the Hobby team, not a test failure.

## 2026-10-17 P0 automatic-workflow audit (awaiting latest Production release)

- Six legacy one-shot Russia/Song/Sweden/spatial Production audits now run only when explicitly dispatched. Existing historical evidence and canonical data are retained.
- An automatic CI check rejects any PR-triggered workflow browsing live Production and any restoration of push triggers in the historical full-census audit list.
- Authoring Schema Bootstrap, protected Correction Apply, Reviewed Person Merge and Person Domain verifier now stop on HTTP 402. Canonical write safety and compatible runtime checks remain in place.
- Person Domain and UI Production visual checks no longer auto-run on changes to test-only scripts. Runtime and UI deployment changes continue to require Production verification for user feedback.
- A passing GitHub check or an HTTP 200 from the old Vercel runtime does not close the release gate. The team-level deployment-creation restriction requires official provider clearance. Exact endpoint-level outgoing byte attribution is still open.

## Enforcement gap and follow-up

The CI guard covers **repository-based execution** and the visual workflow; it cannot impose a hard team-level spending cap, detect tool-invoked Sandbox runs, or block anonymous API abuse before Vercel itself enforces its quotas. Platform-level budget alerts, route-level transfer observations and provider-side restrictions need separate confirmation in the Vercel account. Any claim of “zero future suspension risk” is invalid until provider-level hard limits and traffic controls are independently confirmed.

**No new paid subscription, data deletion or change to canonical historical facts is authorized by this policy.**
