@codex ATLAS-INTEGRATED-ROOT-20261020 — one bounded source-code fix, not a review.

Task ID: atlas-integrated-root-20261020. Dispatcher Actions run: @@GITHUB_RUN_ID@@. Exactly one invocation; no retries, child agents or follow-up model calls. Stop on a blocker. No internet/fetch/push/gh, credentials, paid API, Vercel/Production/Supabase/Sandbox, data mutation, deployment or merge.

Read local AGENTS.md and WORK_EXECUTION.md. Your checked-out launcher must be 9554e9b0cf705978c51ad0163c3f74c2287ccd5c. The trusted dispatcher has independently verified that both target files, both referenced test fixtures, AGENTS.md and WORK_EXECUTION.md in this launcher match exact current main @@GITHUB_SHA@@. Do not fetch main. Verify SHA256 of the two existing files locally before editing:

- scripts/person-domain-authoring-origin.mjs: @@SOURCE_HASH@@
- tests/atlas-person-domain-authoring-origin.test.mjs: @@TEST_HASH@@

Reproduce this precise bug: validateHumanAuthoringOrigin resolves String(root || '') before checking whether the root exists. path.resolve('') becomes cwd, so the ROOT_REQUIRED guard cannot reject omitted/empty root. In repo cwd with the existing Asanga fixture and matching entry, calls with omitted or empty root incorrectly succeed. Whitespace-only/non-string roots must also be rejected as ROOT_REQUIRED. Require an explicit nonblank string root before path resolution, preserving existing valid explicit root behavior and legitimate spaces in actual paths. Do not change historical fixtures or the provenance/domain/identity checks.

Edit exactly the two target files above. Add focused regression tests for missing/null/empty/whitespace/non-string root, demonstrate red then green, and run node --test tests/atlas-person-domain-authoring-origin.test.mjs plus git diff --check. Do not edit this launcher branch or create a PR yourself. If reproduction fails, report NO CHANGE. If tests fail, report BLOCKED; do not emit a patch. No unrelated cleanup.

Return the actual tested complete files as exactly one JSON patch payload in your GitHub App reply (the machine-readable JSON is mandatory; do not substitute a summary or markdown diff). The base_sha below is the dispatcher-verified current main snapshot; use that exact value with the verified target preimages, despite the documentation-only launcher's different HEAD. Do not claim that your local HEAD is main.

ATLAS-CODEX-PATCH-V1
{"version":1,"task_id":"atlas-integrated-root-20261020","base_sha":"@@GITHUB_SHA@@","files":[{"path":"scripts/person-domain-authoring-origin.mjs","before_sha256":"@@SOURCE_HASH@@","after_base64":"<actual complete tested source in canonical base64>"},{"path":"tests/atlas-person-domain-authoring-origin.test.mjs","before_sha256":"@@TEST_HASH@@","after_base64":"<actual complete tested regression file in canonical base64>"}]}
END-ATLAS-CODEX-PATCH-V1

The receiver accepts this task only until 2026-10-20T14:00:00Z and only fresh receipts within 30 minutes. Report precise blockers instead of resubmitting. Draft code PR only; Production NOT LIVE. Stop after this single reply.
