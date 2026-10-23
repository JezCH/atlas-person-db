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
