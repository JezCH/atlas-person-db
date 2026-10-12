# ATLAS Vercel Hobby quota incident & non-regression policy

**Status:** Mandatory resource guard (2026-10-12). **Scope:** every ATLAS lane, agent, operator, researcher and CI workflow sharing the JezCH Vercel Hobby team.

## Verified incident (not an estimate)

- Production returned HTTP 402 `DEPLOYMENT_DISABLED` while deployment builds were `READY`.
- Vercel showed `Paused — Upgrade to resume service`, Sandbox Active CPU **5h06m / 5h** and Fast Origin Transfer **10.19GB / 10GB**.
- Nineteen visible Sandbox sessions consumed **18,382,541 ms = 5h06m22.5s** of active CPU: 12 YouTube discovery sessions consumed **17,748,531 ms** and seven UI sessions **634,010 ms**.
- YouTube sessions executed high-concurrency `yt-dlp` bulk collection. This explains **96.55% of observed Sandbox CPU**, not Fast Origin Transfer.
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

## Enforcement gap and follow-up

The CI guard covers **repository-based execution** and the visual workflow; it cannot impose a hard team-level spending cap, detect tool-invoked Sandbox runs, or block anonymous API abuse before Vercel itself enforces its quotas. Platform-level budget alerts, route-level transfer observations and provider-side restrictions need separate confirmation in the Vercel account. Any claim of “zero future suspension risk” is invalid until provider-level hard limits and traffic controls are independently confirmed.

**No new paid subscription, data deletion or change to canonical historical facts is authorized by this policy.**
