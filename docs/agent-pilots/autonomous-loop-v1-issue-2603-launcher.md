# ATLAS Autonomous Loop V1: immutable offline Codex launcher — Issue #2603

**State: HOLD — model dispatch prohibited pending provider-cost and authorization checks.**

This Draft launcher is documentation-only. It preserves the exact source/test snapshot and approved constraints for a later `atlas-codex-tasks.v1.json` registration; it is not a model trigger. Never merge this launcher just to trigger a task.

## Verified bounded defect

`relativeSpecifiers(source)` in `scripts/atlas-agent-dependency-map.mjs` currently misses otherwise-valid static relative import literals separated from `import`, `from`, or literal `import(` by JavaScript comments. Example: `import /* context */ './a.mjs';`. Node 22 syntax parser accepts this form. The scanner must not infer unverified function-call relationships or dynamic variable imports.

## Exact source-and-test scope

- Source: `scripts/atlas-agent-dependency-map.mjs`
- Test: `tests/atlas-agent-dependency-map.test.mjs`
- Regressions: inline block and newline comments, lexical fake imports in strings/comments, unchanged existing cases. Show red then green.
- Run `node --test tests/atlas-agent-dependency-map.test.mjs` and `git diff --check`.
- Only the exact source+test files may change. No additional modules, docs, API, runtime, historical data, Production, Supabase, Vercel Sandbox, merge, extra paid API or retries.

## Preimage checkpoint

GitHub `main` baseline at launcher preparation: `863f3f1f6a772783ac4ec4110c35762de2a99d39`.

| Snapshot path | Git blob SHA |
|---|---|
| `scripts/atlas-agent-dependency-map.mjs` | `4d83f894b4eb09d9ad5ae8e831326bc0164ee331` |
| `tests/atlas-agent-dependency-map.test.mjs` | `c6a9ef1a6c074c47c6e2bff0c6408cf20234e2f4` |
| `AGENTS.md` | `bc21dffab9fd96a4f6cf2523427ed85c510f7631` |
| `WORK_EXECUTION.md` | `c6595ac67253f53411b442d0f4c3796652080566` |

If `main` changes, the runner must still prove exact parity for all snapshot paths, otherwise block. The launcher Draft head SHA, Issue number, approval window and allowed paths must all be present in the separately reviewed main-branch task registry.

## Evidence and stop gates

- Open Issue #2603 is **candidate only**, not independent approval to spend model credits.
- Registry task status **HOLD** until cost/credential route is verified, then explicit time-limited authorization; bridge `dispatch_enabled` currently remains `false`.
- A single preapproved GitHub Actions dispatch may consume a one-time task/day admission and request one Codex patch. In case of uncertain submission, do not retry.
- Independent patch relay must validate original author ID, full-file payload, before-SHA256, exact files and focused tests. Draft PR plus successful GitHub Integrity CI and trusted outcome journal is the V1 finish line; semantic review/merge stay separate.
