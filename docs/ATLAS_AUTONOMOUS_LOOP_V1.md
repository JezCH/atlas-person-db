# ATLAS Autonomous Loop V1 — Selection → Dispatch Bridge

Scope: safe development task discovery and **one** external workflow dispatch, not automatic approval, Codex model access, merged PR acceptance or Production release.

## Existing authority reused

- `WORK_EXECUTION.md` is canonical; the approved task registry is `config/atlas-codex-tasks.v1.json`.
- Candidates must have `status: "approved"` and `issue_number` in this reviewed registry. That number must reference a *currently open* GitHub Issue. Issue title, body, labels and CI text **never** grant approval or modify instructions.
- Existing task policy still requires a reviewed launcher Draft PR + immutable launcher SHA, exactly one approved source/test pair, AGENTS/WORK_EXECUTION snapshot parity, a 24-hour time window and the existing one-command-per-UTC-day create-only ref.
- Every open PR must have a complete bounded file inventory; a conflict blocks task selection. Latest 30 CI runs provide only **sampled diagnostic context**, never model authority. Existing task/result receipts and daily budget refs are independently read before proposing dispatch.
- `scripts/atlas-autonomous-loop-bridge.mjs` has `audit` and `dispatch TASK_ID` modes. A second bounded inventory is read before dispatch, so a stale plan cannot authorize a different task.

## Status and activation

- This PR sets `config/atlas-autonomous-loop.v1.json` to `enabled:true`, `dispatch_enabled:false`. Existing Codex task registry is still `enabled:false`, and all current entries are `closed`. **Zero actual Codex model calls are authorized.**
- The workflow performs a single cheap daily main-branch admission check and accepts manual **audit** requests. The dispatch job is skipped unless both independent flags and a currently approved Issue-bound task qualify.
- When separately authorized, the dispatch job uses a GitHub `workflow_dispatch` API request with its ephemeral `GITHUB_TOKEN` (`actions:write`) to trigger **existing** `atlas-codex-tasks.yml`. No new model provider/API is called from the bridge.
- HTTP 204 means **workflow requested**, not a Codex invocation or valid PR. Follow the existing runner Git task/day receipts, Codex bot patch comment, verified PR and CI to establish each later stage.
- Any uncertainty, large PR inventory, missing remote permission, duplicate task, stale main or capped budget **fails closed**. No retry or automatic merge, Vercel, DB or Production step is included.

## Required first real test

1. Verify `ATLAS_CODEX_TRIGGER_PAT` and GitHub App route still function and carry **zero unapproved extra paid API/credit usage**.
2. Separately review and approve one *new* offline source+test task with a fresh Issue, launcher Draft PR/SHA and at most 24-hour registration window.
3. Enable the existing Codex registry **and** `dispatch_enabled` in a reviewed commit. A daily or manually requested dispatch can then run once, subject to the old atomic UTC budget receipt.
4. Independently inspect the actual model comment, original patch and Integrity CI. Draft PR creation remains review-required; no automatic task-close or second model dispatch.

## P0-C / P0-D independent results and stop behavior

- After **ATLAS Integrity** finishes a pull-request run, the trusted-default-branch `.github/workflows/atlas-autonomous-result-v1.yml` evaluates only actual `codex/task-result/atlas-*` Draft PRs. Ordinary UI/data/feature PRs are not candidates.
- Read-only verification binds current run ID/head SHA, exact approved two-file diff, immutable per-task and UTC-day receipts, real Codex GitHub App identity and original launcher comment, original base file SHA-256, and resulting Git blob content to the original **bot patch payload**.
- A separate job with `issues:write` reruns the verification against fresh GitHub data, and posts an idempotency-marked PR comment stating either `CI_PASS_REVIEW_REQUIRED` or `CI_FAILED`. No PR head code is checked out or run in these jobs, and no model call or PR merge occurs.
- GitHub issues with missing verified evidence stay unrecorded and blocked; a GitHub CI result never grants independent semantic review. CI failure yields `STOP_NO_AUTOMATIC_MODEL_RETRY`; success yields `INDEPENDENT_REVIEW_REQUIRED_BEFORE_MERGE`. In either case selection/dispatch is independently gated by the existing approval + daily-budget checks.
- The observer records completion of the **Draft/CI checkpoint**, not a merged code release or Production completion. It does not automatically close the original Issue or run the next Codex task. A fresh manually reviewed task approval and normal selection pass remain necessary.
