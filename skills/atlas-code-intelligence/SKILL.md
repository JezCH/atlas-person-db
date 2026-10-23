---
name: atlas-code-intelligence
description: Locate an exact ATLAS code symbol, the likely owner, direct relative imports, nearby declarations, relevant test paths, and verified prior fixes before an isolated source change. Invoke for code navigation, not for whole-repository audits.
---

# ATLAS targeted code intelligence

1. Start from the user-provided symbol/path or the latest task resume point. Do **not** replay all issues or generate a whole-repo index.
2. From a Node 22+ checkout, run `node scripts/atlas-agent-context.mjs --query 'exactNameOrErrorCode'`. This is **read-only**, uses local Git, and does not make AI/API calls.
3. Read the returned `files[].matches` in actual source, check `relative_imports` for direct dependencies, inspect the relevant test, then edit only the smallest required paths.
4. `symbols` and `relative_imports` are **lexical hints**, not a complete AST, call graph, or verified semantic linkage. A missing symbol is not proof of absence. If needed, use precise `git grep`/`rg` and inspect source directly.
5. `lessons` are historical precedents, **not** permission to copy a fix blindly; compare the exact current behavior. Follow `WORK_EXECUTION.md` for source preconditions and a focused test.

Examples: `normalizeBibliographicSource`, `crossCheckActivity`, `retirement`, `atlas-work-manager`.

Never use this command as evidence that a remote Work/Codex job ran, and never equate CI success with Production release.
