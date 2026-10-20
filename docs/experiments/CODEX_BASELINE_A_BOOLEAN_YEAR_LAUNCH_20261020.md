# Reviewed Codex generalized-runner pilot launcher — Boolean chronology input

Task ID: `atlas-baseline-a-boolean-year-20261020`
Status: DRAFT LAUNCH ANCHOR ONLY — DO NOT MERGE. No Codex command has been posted or admitted.

## Source-backed defect

In `scripts/stage2-baseline-a-intake.mjs`, `crossCheckActivity` converts `row.activity_start` and `row.activity_end` using `Number(...)` before validating integer/nonzero/order. JavaScript converts `true` to `1`, so an Activity with both date fields set to Boolean `true` can pass the historical interval guard after the enclosing snapshot digest is recomputed. That is invalid chronology data, not an AD 1 event.

## Explicitly reviewed development scope

Edit exactly:
- `scripts/stage2-baseline-a-intake.mjs`
- `tests/stage2-baseline-a-intake.test.mjs`

Add a focused failing regression with a properly recomputed fixture digest demonstrating Boolean `true` for both Activity boundary fields is rejected. Harden the boundary validation to refuse Boolean year values before numeric coercion, while preserving valid existing positive and negative integer chronology, the explicit rejection of year zero, full catalog/digest integrity, and no changes to the accepted baseline snapshot schema or unrelated data.

Demonstrate red/green in `node --test tests/stage2-baseline-a-intake.test.mjs` and `git diff --check`. Return only the existing `ATLAS-CODEX-PATCH-V1` full-file response of these two paths; no other edit, commit, push, PR creation, Production, DB, Vercel, Sandbox, API billing or child agent.

## Admissibility boundary

The trusted dispatcher must compare the launcher HEAD snapshot for both target files and `AGENTS.md` / `WORK_EXECUTION.md` to exact current main blobs, verify direct dependencies, check all open/draft PR target-path conflicts, then require one fresh time-bounded approved task record and its atomic task/day ref claims.

Do not use the historic `atlas-integrated-root-20261020` task or #2573 output. No recurring trigger, auto-merge, paid API, or new credential. Any absent dispatch capability or unverified shared-plan spending control is BLOCKED and must not be bypassed. This document does not enable the task registry; explicit approved admission on main and a manual `workflow_dispatch` are separate prerequisites.
