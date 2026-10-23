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

## P0-C/P0-D — independent result classification and completion checkpoint

The new \`.github/workflows/atlas-autonomous-outcome.yml\` receives a **completed** \`ATLAS Integrity\` run via \`workflow_run\` and only starts its job when the head belongs to \`codex/task-result/...\` in the authorized repository. Manual read-only inspection accepts an exact CI run ID.

1. Read the *completed* Integrity run from GitHub. Any non-success result is \`CI_NOT_PASSED\`, stop and never retry the model.
2. A success result is **not** self-approval. Read the trusted registry task, exact currently open Draft PR, single result branch, atomic original task-attempt ref, result commit with that exact one parent, and the exact approved source/test change paths.
3. Confirm the model patch comment really comes from the Codex GitHub App account on the reviewed launcher PR. Parse the same bounded patch envelope as the original trusted relay; independently compare the original base file SHA256 and **both** current PR head file bodies to the bot's immutable proposed complete-file bytes.
4. Only then emit \`CI_PASS_REVIEW_REQUIRED\` with task, PR, immutable SHA, CI run and source comment IDs. The next action is **human review**, not auto-merge or closing a Production task.
5. An immutable per-run \`atlas-autonomous-outcome.json\` is uploaded as a 30-day GitHub Actions artifact, with the status and next action in the run summary. Missing/contradictory evidence produces \`BLOCKED\`, not a green completion.
6. Records persist per observed CI run rather than mutating the authoritative task registry or Issue automatically. No credentials are granted to AI-authored code; the reconciliation workflow uses trusted \`main\`, read-only GitHub permissions, and no model, Production, Supabase, Vercel or PR merge operations.

This closes **P0-C/P0-D for independent CI outcome classification and reporting**, but not for a verified live autonomous cycle. The underlying approved task queue and model dispatch switches remain disabled. First live file pilot still requires a new reviewed Issue/launcher pair, confirmed provider-plan cost/credential availability and deliberate activation. Do not interpret completed CI, an outcome artifact, or a model-written test as Production release.

## Durable review-only outcome journal (no new model calls)

After the independent outcome workflow succeeds, a separate job with `issues:write` re-evaluates the **original GitHub CI run** using the same trusted `scripts/atlas-autonomous-outcome.mjs` verifier. It never trusts the prior job's artifact as authorization. Only a validated `CI_PASS_REVIEW_REQUIRED` result can create one idempotency-marked comment on the exact **still-open matching Draft PR**. The marker includes PR number, run ID and head SHA; existing comments are scanned boundedly before posting.

The PR comment records the real Codex patch source, admitted base, CI run, and `REVIEW_DRAFT_NO_MODEL_RETRY`. A GitHub comment is a durable checkpoint beyond the 30-day artifact retention, but **does not** automatically approve or merge the PR, close an Issue, launch another model task or verify Production. Failed/unknown CI outcomes remain in the original workflow run summary and artifact, with the explicit stop decision. Next model-task selection remains under the separate approved-task registry and daily command budget.


## V1 one-shot live admission preflight (HOLD; read-only)

The default-branch workflow \`.github/workflows/atlas-autonomous-pilot-preflight.yml\` runs once upon introduction to \`main\`, with optional manual \`workflow_dispatch\` repeats. Its only GitHub capabilities are READ for contents, issues, PRs and Actions. It uses \`actions/github-script@v7\` and does not checkout/execute PR head source or send Codex comments.

It verifies the existing \`enabled:false\` real task registry and \`dispatch_enabled:false\` switch, the exact unmerged \`hold\` task from Draft PR #2605, the immutable launcher Draft #2604, the still-open Issue #2603, all four snapshot Git blob SHAs, task expiry and unconsumed Git task/day/result refs, and all bounded open PR file inventories including the 129-file PR #2549. Unexpected or partial GitHub evidence blocks the check. Nothing is promoted from HOLD or dispatched.

The configured presence of \`ATLAS_CODEX_TRIGGER_PAT\` is evaluated as a **boolean by GitHub Actions**; the secret itself is never passed to this script. Presence does **not** prove scope, GitHub App delivery, available included ChatGPT/Codex quota, or whether purchased credits would be consumed. A preflight PASS is **not** model execution, new paid API permission, Draft result PR success, or semantic approval. Actual model activation still requires a separately reviewed time-limited approval and externally checked cost/credit policy.
