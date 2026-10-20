# ATLAS Work Manager: read-only MVP and Work cloud handoff

## Actual contract

The goal is to manage ATLAS development without a personal PC or a paid API, using the existing ChatGPT Work, GitHub and Codex integrations. This MVP adds a deterministic **read-only triage decision**, not an autonomous scheduler or a model executor. It cannot approve a task, call Codex, modify Production, deploy Vercel, spend credits or merge PRs. The proven Codex runner remains **disabled**. No Work scheduled job was created.

**Official product context:** ChatGPT Work and Scheduled Tasks support cloud activities, recurring schedules and some GitHub PR triggers where account access permits. This Chat mode cannot provision a Work-cloud Scheduled task. Chat task scheduling is not a substitute for Work. Work and Codex may share included usage and paid credit balance. Repository rules cannot impose an account-wide model spend ceiling; do not claim zero-cost certification.

## Fresh GitHub read-only triage

1. Via the connected GitHub account, read AGENTS.md, WORK_EXECUTION.md, current docs/ATLAS_CURRENT_WORKSTREAMS.md and the canonical config/atlas-codex-tasks.v1.json; inspect the live main commit and current open PRs. Do not treat an old issue comment or PR as authority.
2. Capture a **complete single-page (<100) open PR inventory** from GitHub. For every possible Codex output (including legacy result branches and independently proven nonstandard names), read its exact changed files, verified original App patch comment on the reviewed launcher PR, immutable attempt-ref SHA, resulting PR head and the ATLAS Integrity CI conclusion and exact tested head. Never trust branch/title alone. Missing or stale metadata fails closed. The snapshot may be proposed by an LLM, but its facts must originate in authenticated live GitHub results.
3. Run the pure offline policy: node scripts/atlas-work-manager-triage.mjs <fresh-snapshot.json>. Input: object with version=1, repository=JezCH/atlas-person-db, main_sha, observed_at (UTC ISO within 15 min), registry (actual parsed object), pulls array. Every PR: number, draft, head_ref, head_sha, base_branch=main. Codex result PR also: changed_paths, integrity_conclusion, integrity_run_url, integrity_head_sha and codex_evidence as specified below. Do not fabricate a run conclusion or snapshot timestamp.
4. REVIEW_DRAFT means review that existing Codex result first: current diff, exact tests, CI and main drift. INSPECT_CI or BLOCKED means report the exact issue, not retry. DISCOVER_OFFLINE_TASK permits **only** the proposal of one new verified source-backed offline defect with an isolated source/test pair and conflict check. Never turn such a proposal into approval or a model invocation without separate user authorization and verified usage conditions.
5. Record one durable decision with current main SHA, checked PR/CI references, classification, blocker and next resume point. No repeating prior Codex task IDs or creating a new model call for an existing Draft result.

No Production, Supabase, Vercel Sandbox, API token, open-ended retry, unbounded issue search or paid-credit operation is allowed.

## Exact Work instruction for one-time cloud pilot (NOT YET SCHEDULED)

> Operate as a read-only ATLAS development manager for JezCH/atlas-person-db. Use the GitHub connection, current AGENTS.md and WORK_EXECUTION.md, current docs/ATLAS_CURRENT_WORKSTREAMS.md, and docs/ATLAS_WORK_MANAGER_MVP.md. Collect actual fresh main SHA, open PR list, closed Codex task registry and exact matching Integrity CI evidence. Apply atlas-work-manager-triage.mjs or its exact gate. Select ONE smallest safe pending unit. PR #2579 was already independently reviewed and merged at b8b20bc9504a1b18daac57d0033f5d9264447e4a on 2026-10-20; do NOT treat it as current backlog. Use LIVE GitHub state to find unreviewed, non-superseded, nonoverlapping active work. Prefer safely closing an already-reviewed PR or verified small defect over inventing a new task. Otherwise propose one independently sourced offline defect with file pair and tests. Do not invent status, enable dispatch, post run markers, invoke Codex, merge, deploy, mutate Production or buy/use additional credits. Stop after one completed review or proposal; report sources, blockers and exact next step. If an account permission or cost gate is uncertain, stop safely.

For the next actual cloud pilot, open a **Work** conversation on web/mobile and use that one-time instruction with an authorized GitHub connection. Verify the cloud-run record and account Usage. Do NOT activate recurring/event-triggered Work scheduling without a provider-verifiable no-extra-cost strategy and explicit approval.

## Existing proven evidence

- First generalized Codex live command: Actions #39426395254; Codex App response in PR #2575; receive/publish #39427036896.
- Completed Codex result: PR #2579 received an independent scope/conflict review, Integrity #39427140872 SUCCESS, and was squash-merged as b8b20bc9504a1b18daac57d0033f5d9264447e4a. This is historical evidence, NOT a current queue item.
- Chat-to-GitHub comment trigger: merged #2580 with repository tests; no new live test. The Codex runner is disabled and all historical tasks are closed.

## Next unfinished step

**Actual Work-cloud one-shot execution** through Work mode with connected GitHub. A scheduled or GitHub-event task can be considered only after observing the one-time run, and after the user reviews account permissions and available usage/credit settings. This code is an offline guard, not proof that Work itself has run.

## 2026-10-20 operational handoff — use the real Work interface

Status verified on 2026-10-20: main `b8b20bc9504a1b18daac57d0033f5d9264447e4a`; PR #2579 is **merged**, not an open draft. Codex task registry `enabled=false` and approved task count is zero. There are other open PRs, some older or explicitly "DO NOT MERGE"; these are **not automatically cleared for work**. Re-read all facts live before decisions. The Work plugin or cloud browser must be granted GitHub repository access by the user; GitHub connection in one Chat conversation does not authorize a new Work task by itself.

### Step A: real one-time Work validation (operator action)

In ChatGPT on web or supported mobile, select **Work** and open the ATLAS project; check Settings > Apps/Plugins > GitHub connection and authorize `JezCH/atlas-person-db` if prompted. Paste this exact prompt as a **one-time run**, not a reminder or a schedule:

> Act as the ATLAS AI development manager for GitHub repository JezCH/atlas-person-db. Read fresh AGENTS.md, WORK_EXECUTION.md, docs/ATLAS_CURRENT_WORKSTREAMS.md, docs/ATLAS_WORK_MANAGER_MVP.md, and the current closed/disabled Codex registry. Retrieve the live main SHA and current open PRs, not cached 2026-10-20 snapshots. Verify any candidate's diff, current scope ownership, comments, requirements, overlap and relevant CI. Note that #2579 was merged and must NOT be repeated. Complete **one read-only manager unit**: select exactly one best safe pending task, preferably an already reviewable small PR; identify exact file(s), evidence, concrete acceptance criteria, existing conflicting work, test command, and next user approval boundary. If all candidates lack evidence, return BLOCKED with the missing facts. Do not create branches or PRs; do not commit, post Codex activation comments, launch Codex, enable the task registry, call paid APIs or credits, schedule further work, merge, deploy, access Production, use Vercel Sandbox, or modify Supabase. Report exact GitHub PR/CI URLs and the run's recorded outcome. Stop after this single unit.

A successful Work proof must have its **own genuine Work run record** plus fresh GitHub evidence and one decision/checkpoint. A Chat answer or GitHub test-suite success is not Work proof. If Work stops on account approval or access, the run is BLOCKED, not successful.

### Step B: separate follow-on (NOT ACTIVE)

The official ChatGPT Work/Scheduled documentation supports PR-event-triggered tasks where enabled: 
- https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt
- https://help.openai.com/en/articles/11145903-connecting-github-t-chatgpt-deep-research

**Only after Step A passes:** In **Work**, request a draft event-triggered task for authorized GitHub PR activity in `JezCH/atlas-person-db`. Choose a supported narrow event (for example, PR marked ready for review) and require read-only decision/reporting. Review Trigger, Condition, Prompt, GitHub account access and any user approval requirements before enabling. Condition must reject unrelated repos, completed historical PRs, superseded/DO NOT MERGE launchers, or repeated prior runs. Do not assume the GitHub trigger can watch arbitrary issue comments, pushes, or CI completions; confirm exact event choices in Work UI. Do not auto-chain tasks by generating new PR events. **Do not** add a recurring clock schedule as a fallback or use the ordinary Chat automation as a substitute for Work.

**Cost invariant:** the GitHub code's one-command/day cap is not a provider credit cap. Work and Codex usage/credits may share plan limits. The assistant cannot verify the user's actual credit balance or auto-recharge state from this repo. Before any Work task launches new Codex work, the owner must establish a reliable no-extra-paid-credit gate or explicitly approve that bounded usage. If it cannot be verified, remain read-only and stop at proposal/approval. No claims of confirmed zero incremental cost without billing evidence.

**Exact next incomplete starting point:** a genuine one-shot Work-mode GitHub read-only manager run as above, with its own recorded outcome; then independent verification of whether Work can be safely scheduled or event-triggered for this repo. Do not re-run the #2579 code pilot.


## 2026-10-20: Provenance-based legacy Codex result discovery

**Resolved defect:** The earlier triage accepted only `codex/task-result/` head names, so the historical `codex/integrated-root-result-20261020` PR #2573 would have been omitted even while open. #2573 was already independently reviewed and **merged** at `81b87601ddb07012ada7a89349a3ba7b8007e48e`, so it is NOT an open review target or a job to replay. Its original [Codex App patch comment #6290260961](https://github.com/JezCH/atlas-person-db/pull/2571#issuecomment-6290260961), [receiver run #39418377459](https://github.com/JezCH/atlas-person-db/actions/runs/39418377459), [Integrity #39418449680](https://github.com/JezCH/atlas-person-db/actions/runs/39418449680) and original claim ref remain the reproducible legacy evidence case.

The manager now uses **evidence-based selection**, not the branch as an authorization:
- For each suspected existing result PR, collect `pr.codex_evidence` only from **actual authenticated GitHub API results**, never blindly from PR title/body. Check the exact registered task's `launcher_pr` and `launcher_sha`, the trusted App's real numeric comment author `199175422` and login `chatgpt-codex-connector[bot]`, comment ID, the `ATLAS-CODEX-PATCH-V1` payload's task ID and two paths, and its base SHA against the immutable attempt ref SHA. Confirm the observed output branch's `result_head_sha` equals the live PR head and the two changed paths are those in the registry.
- Supply `codex_evidence` with precisely: `task_id`, `launcher_pr`, `launcher_sha`, `app_comment_id`, `app_comment_author_id`, `app_comment_author_login`, `app_comment_launcher_pr`, `app_comment_marker`, `app_comment_task_id`, `patch_base_sha`, `attempt_ref_sha`, `result_head_sha`, `patch_paths`. Also supply `integrity_head_sha`, `integrity_conclusion` and `integrity_run_url` observed for the current head. The task must be `closed`, the PR must be Draft, the modified files must exactly match the approved pair, and the CI run must match the tested head. For nonstandard results, the GitHub collector must separately check actual submitted patch bytes against the PR file content (the policy's JSON fields alone cannot cryptographically prove code identity).
- Any suspected legacy or current Codex result without verified evidence returns `BLOCKED`, not `DISCOVER_OFFLINE_TASK`. Branch patterns now serve only as an **uncertain-result detection heuristic**, not proof. Other branch names with source-backed `codex_evidence` are also eligible. An unrelated PR title, authored description, or a user-set JSON flag cannot authenticate a Codex result.
- This is a **read-only review prioritizer**: a `REVIEW_DRAFT` output authorizes only independent manual/Work review, not a merge, fresh Codex execution, deployment, provider spend or Production mutation. A supplied snapshot remains observational; it is not a signed attestation of GitHub API facts. Verify source API records independently before any mutation.

The Work manager should now prioritize unreviewed, genuinely supported PRs rather than treating already merged #2573 or #2579 as outstanding. **Exact next incomplete unit** after this merge: a new actual one-shot Work Cloud invocation collecting the verified evidence fields, then evidence-backed selection of the next nonconflicting task. Preserve disabled Codex runner and do not replay historical attempts.
