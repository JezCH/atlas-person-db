# ATLAS Work Manager: read-only MVP and Work cloud handoff

## Actual contract

The goal is to manage ATLAS development without a personal PC or a paid API, using the existing ChatGPT Work, GitHub and Codex integrations. This MVP adds a deterministic **read-only triage decision**, not an autonomous scheduler or a model executor. It cannot approve a task, call Codex, modify Production, deploy Vercel, spend credits or merge PRs. The proven Codex runner remains **disabled**. No Work scheduled job was created.

**Official product context:** ChatGPT Work and Scheduled Tasks support cloud activities, recurring schedules and some GitHub PR triggers where account access permits. This Chat mode cannot provision a Work-cloud Scheduled task. Chat task scheduling is not a substitute for Work. Work and Codex may share included usage and paid credit balance. Repository rules cannot impose an account-wide model spend ceiling; do not claim zero-cost certification.

## Fresh GitHub read-only triage

1. Via the connected GitHub account, read AGENTS.md, WORK_EXECUTION.md, current docs/ATLAS_CURRENT_WORKSTREAMS.md and the canonical config/atlas-codex-tasks.v1.json; inspect the live main commit and current open PRs. Do not treat an old issue comment or PR as authority.
2. Capture a **complete single-page (<100) open PR inventory** from GitHub. For each Codex result head branch, read its exact changed files and the matching ATLAS Integrity CI conclusion and link. Missing or stale metadata fails closed. The snapshot may be proposed by an LLM, but its facts must originate in authenticated live GitHub results.
3. Run the pure offline policy: node scripts/atlas-work-manager-triage.mjs <fresh-snapshot.json>. Input: object with version=1, repository=JezCH/atlas-person-db, main_sha, observed_at (UTC ISO within 15 min), registry (actual parsed object), pulls array. Every PR: number, draft, head_ref, head_sha, base_branch=main. Codex result PR also: changed_paths, integrity_conclusion, integrity_run_url. Do not fabricate a run conclusion or snapshot timestamp.
4. REVIEW_DRAFT means review that existing Codex result first: current diff, exact tests, CI and main drift. INSPECT_CI or BLOCKED means report the exact issue, not retry. DISCOVER_OFFLINE_TASK permits **only** the proposal of one new verified source-backed offline defect with an isolated source/test pair and conflict check. Never turn such a proposal into approval or a model invocation without separate user authorization and verified usage conditions.
5. Record one durable decision with current main SHA, checked PR/CI references, classification, blocker and next resume point. No repeating prior Codex task IDs or creating a new model call for an existing Draft result.

No Production, Supabase, Vercel Sandbox, API token, open-ended retry, unbounded issue search or paid-credit operation is allowed.

## Exact Work instruction for one-time cloud pilot (NOT YET SCHEDULED)

> Operate as a read-only ATLAS development manager for JezCH/atlas-person-db. Use the GitHub connection, current AGENTS.md and WORK_EXECUTION.md, current docs/ATLAS_CURRENT_WORKSTREAMS.md, and docs/ATLAS_WORK_MANAGER_MVP.md. Collect actual fresh main SHA, open PR list, closed Codex task registry and exact matching Integrity CI evidence. Apply atlas-work-manager-triage.mjs or its exact gate. Select ONE smallest safe pending unit. If an unreviewed Codex Draft such as #2579 exists, review it before proposing further Codex work. Otherwise propose one independently sourced offline defect with file pair and tests. Do not invent status, enable dispatch, post run markers, invoke Codex, merge, deploy, mutate Production or buy/use additional credits. Stop after one completed review or proposal; report sources, blockers and exact next step. If an account permission or cost gate is uncertain, stop safely.

For the next actual cloud pilot, open a **Work** conversation on web/mobile and use that one-time instruction with an authorized GitHub connection. Verify the cloud-run record and account Usage. Do NOT activate recurring/event-triggered Work scheduling without a provider-verifiable no-extra-cost strategy and explicit approval.

## Existing proven evidence

- First generalized Codex live command: Actions #39426395254; Codex App response in PR #2575; receive/publish #39427036896.
- Actual unmerged Codex result: Draft PR #2579; Integrity #39427140872 SUCCESS.
- Chat-to-GitHub comment trigger: merged #2580 with repository tests; no new live test. The Codex runner is disabled and all historical tasks are closed.

## Next unfinished step

**Actual Work-cloud one-shot execution** with read-only Github. Only after proving Work executed the decision with zero unauthorized cost should an event/schedule be considered. This code is an offline guard, not proof that Work itself has run.
