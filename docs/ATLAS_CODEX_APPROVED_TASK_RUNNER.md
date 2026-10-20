# Approved Codex task runner

## Current state

The earlier live task `atlas-integrated-root-20261020` completed uninterrupted: dispatcher [#39417983087](https://github.com/JezCH/atlas-person-db/actions/runs/39417983087) → user command [6290213307](https://github.com/JezCH/atlas-person-db/pull/2571#issuecomment-6290213307) → actual Codex App patch [6290260961](https://github.com/JezCH/atlas-person-db/pull/2571#issuecomment-6290260961) → receiver [#39418377459](https://github.com/JezCH/atlas-person-db/actions/runs/39418377459) → Draft [#2573](https://github.com/JezCH/atlas-person-db/pull/2573), head `3aa5250a60acebbf959731ed9f118afa62c0909d`, full Integrity [#39418449680](https://github.com/JezCH/atlas-person-db/actions/runs/39418449680) SUCCESS. Preserve that result and its original attempt ref. It is not a task to replay.

This generalized implementation reuses the strict patch parser and original-event comparison. Its new dispatcher/publisher has an offline end-to-end regression with a simulated GitHub API and real local Git clones/push. That is **not a live-provider execution of this generalized runner**. No new model command has been submitted by this implementation.

`config/atlas-codex-tasks.v1.json` is the only reviewed task-admission list. It starts with `enabled:false` and the already-completed task marked `closed`. `.github/workflows/atlas-codex-tasks.yml` has only manual dispatch and patch-comment events; no push trigger or schedule. Disabled dispatch returns NO WORK before any API read, claim or model submission. This is implemented in a subprocess regression, not merely a schema assertion.

## Selection and invocation receipts

An enabled dispatcher selects at most one task with status `approved`, within a reviewed window of at most 24 hours, without a prior task receipt or overlap with any current open PR target paths. Lower priority number then task ID determines order. An optional task-ID input narrows selection; it never supplies arbitrary instructions or file paths. `hold` and `closed` tasks are ineligible.

Before submission, the runner checks fresh main SHA, exact open/draft launcher SHA, and blob parity for target files, direct test dependencies and project policy. The task snapshot list must include both target paths plus AGENTS.md and WORK_EXECUTION.md. This allows a documentation-only launcher's verified local snapshot without relying on the model container's unreliable Git fetch.

Each invocation requires two atomic create-only refs, both pointing to the exact main base:

- `codex/task-attempt/<task-id>`: permanent admission receipt, preventing the same task ID from being retried on another day.
- `codex/daily-attempt/YYYY-MM-DD`: the shared UTC-day command slot, limiting this runner to **one development command per UTC calendar day**. Two calls around midnight are in different days; this is not a rolling-24-hour limit.

Concurrent contenders cannot both create the daily ref. A task claim, daily reservation or uncertain command POST is never automatically deleted, reset or retried. A failure after the task claim may consume that task even if no model command was posted; this is deliberate fail-closed behavior. Inspect the exact run before any separately reviewed recovery. These are invocation receipts and one shared quota slot, not project-wide task ownership or a canonical-data writer lock.

The previous one-shot receipt uses its original name and is preserved. Its task stays closed in this registry; do not convert historical evidence into ready work.

## Patch and credential boundaries

The receiver loads the trusted main registry, matches the task and launcher to the numeric Codex App identity, requires a fresh comment within 30 minutes and the task deadline, and permits exactly one reviewed source/test pair. New files, unsafe paths, relay self-modification, schema/data/API changes and arbitrary shell bundles remain rejected by the shared parser. Review of the approved task still owns semantic scope and direct dependency correctness; path overlap alone cannot discover every semantic conflict.

The test job has repository read permission, no persisted checkout credentials and no PAT. Its artifact is untrusted. A separate fresh runner re-parses its independent original GitHub event, checks exact artifact equality, task/day receipts, current main and open PR conflicts, then applies and commits only the approved two paths. The branch is deterministic, `codex/task-result/<task-id>`; an existing branch stops publication. Main is checked again immediately before push. Model-authored tests never execute in this write-capable job.

The existing repo-scoped `ATLAS_CODEX_TRIGGER_PAT` is used only in separate command-POST and Draft-PR-POST steps. The command step performs no GitHub Contents reads, so the implementation does not require broadening that PAT. Missing/expired PAT is a blocker, not permission to mint a new token or retry. A source result remains Draft and never merges automatically.

## Usage and activation boundary

One development command per UTC day is an invocation cap, **not a provider-enforced token/credit/spend cap**. It does not control calls from other tools, legacy workflows, humans or other agents. This runner does not enable paid APIs, credit purchases, automatic top-up or recurring charges. Shared-plan availability and provider-side paid-credit settings are not exposed or proven by this repository.

Remain disabled until an actual new, source-backed offline defect and its launcher/snapshot/dependencies are reviewed into the registry, along with the intended shared-plan usage policy. Do not enable a schedule or claim unattended recurring operation merely because the prior one-shot or offline generalized regression succeeded. No Production, Supabase or Vercel/Sandbox requests are part of this runner.

## Verification and exact next unit

Tests cover disabled no-op behavior, deterministic selection, exact-path conflicts, closed/expired/attempted tasks, competing daily reservations, next-day task replay, uncertain reservations, event identity/time/task binding, artifact substitution, and the complete offline dispatch-to-Draft flow. The latter verifies a single command, real local result-branch contents and that no model test executes in the publisher. PAT-stage API logs in the fixture assert POST-only use.

Next incomplete unit: add one genuinely new reviewed task and validate the generalized runner once against live GitHub with the same safeguards. No model task should be repeated merely to reproduce the already-accepted #2573 result. Repeated/scheduled operation and account-wide usage enforcement remain separate unfinished decisions.

Authority: AGENTS.md, WORK_EXECUTION.md, docs/VERCEL_HOBBY_QUOTA_GUARD.md.
