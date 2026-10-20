# ATLAS Codex patch relay v1 — bounded experiment

**Status: one Codex-authored patch reached Draft PR #2568; recurring unattended operation is not enabled or proven.** This design avoids requiring a Codex Cloud task container to push to GitHub through the unreliable proxy. No paid API or recurring model dispatch is enabled.

## Accepted pilot evidence and current resume point — 2026-10-20

- [Codex App comment 6288359769](https://github.com/JezCH/atlas-person-db/pull/2560#issuecomment-6288359769), account ID `199175422`, supplied the two complete replacement files. Both decoded files match PR #2568 head `d9803689eef8271fef639152d623a330d3a6cd0c` byte for byte: `scripts/classify-ci-impact.mjs` and `tests/ci-impact-routing.test.mjs`.
- [Relay run #39404578493](https://github.com/JezCH/atlas-person-db/actions/runs/39404578493) validated and tested the patch, then committed/pushed it. PR creation alone failed under the default Actions token.
- [Bounded recovery #39405329950](https://github.com/JezCH/atlas-person-db/actions/runs/39405329950) revalidated that exact commit and used the existing repository-scoped user PAT only to create [Draft PR #2568](https://github.com/JezCH/atlas-person-db/pull/2568). [Integrity #39405374881](https://github.com/JezCH/atlas-person-db/actions/runs/39405374881) succeeded. The PR remains draft/unmerged; no automatic merge is authorized.
- Current publisher already separates branch publication under `GITHUB_TOKEN` from PR creation under `ATLAS_CODEX_TRIGGER_PAT`. The obsolete main-push recovery job is retired; its observed outcome above is retained as evidence. The old model dispatcher is an inert manual archive, with no PAT access or automatic trigger.
- [Draft PR #2563](https://github.com/JezCH/atlas-person-db/pull/2563) is a separate manually orchestrated fix, not a Codex unattended success. Launcher #2560 remains open and must not be merged as a code delivery.
- **Next incomplete unit:** review/integrate the cleanup and event-bound publishing guard, then design a fresh task identity, approved snapshot/paths, duplicate-call prevention and usage stop conditions before one bounded integrated Actions dispatch → Codex patch → Draft PR experiment. The origin of command comment `6288311565` is not established as scheduled dispatch. Do not rerun the completed pilot, reuse its output branch, or enable cron. There is no proven hard cap for shared model usage.
- Production, Supabase, deployments and Vercel Sandbox are outside this unit. CI success is not Production acceptance.

## Proven starting capabilities

- A narrowly scoped, expiring GitHub fine-grained PAT in Actions Secret `ATLAS_CODEX_TRIGGER_PAT` lets a trusted, manually reviewed Actions workflow post a **JezCH-authored** `@codex` command (not a bot-authored command).
- The Codex GitHub App completed read-only tasks and later authored the actual two-file patch accepted into #2568. An earlier code-edit task failed; that failure does not invalidate the later observed success. Reactions and dispatch success alone remain insufficient evidence.
- Codex Cloud `git fetch origin main` can fail before GitHub with a proxy-port-8080 connection error; do not supply broader credentials or continuously retry it.

## Output contract

For this **single fixed pilot**, only a real GitHub App comment from `chatgpt-codex-connector[bot]` (GitHub account ID `199175422`) on existing Draft PR **#2560** can submit a patch. Its report must contain exactly one complete delimited payload (a surrounding heading or Codex-generated View task footer is allowed):

```text
ATLAS-CODEX-PATCH-V1
{"version":1,"task_id":"atlas-patch-relay-pilot-20261020","base_sha":"<exact current main SHA, 40 lowercase hex>","files":[{"path":"scripts/<existing safe utility>.mjs","before_sha256":"<original file sha256>","after_base64":"<complete replacement UTF-8 file, base64>"},{"path":"tests/<existing regression>.test.mjs","before_sha256":"<original file sha256>","after_base64":"<complete replacement UTF-8 test file, base64>"}]}
END-ATLAS-CODEX-PATCH-V1
```

This is **complete-file replacement**, not a shell script or arbitrary diff. Only one existing source and one existing test file, in that order. Avoid `.github/`, `api/`, `db/`, schemas, secrets, registry/data files, authoring/mutation utilities, deployment tooling, new files, symlinks and any other path rejected by the parser. Each file is at most 24 KiB; combined 38 KiB; comment at most 50 KiB. No arbitrary paths, new paid dependencies, model-issued GitHub credentials or code executing in a credentialed job.

## Workflow architecture

1. **Receive** — `issue_comment:created`, gated by exact PR, GitHub App numeric identity and exact marker. All other comments skip the job.
2. **Unprivileged validate** — checkout trusted `main` without persisted credentials. Reject stale HEAD, invalid hashes, encodings, wrong paths, pre-existing symlinks or dirty checkout. Write both files only after all validations. Run only the focused Node test and `git diff --check`. No repository write permission and no PAT.
3. **Handoff** — one short-lived GitHub Actions artifact carries the JSON plan. Treat it as untrusted: the model-authored test can rewrite any writable file in its own runner, including this plan.
4. **Privileged publish** — fresh trusted checkout `main`; first re-parse the publishing job's independently received `GITHUB_EVENT_PATH`, revalidate the exact bot/repository/launcher envelope and require deep equality between the original proposal and artifact. Reject any artifact substitution before applying files. Then revalidate the entire plan, compare current remote `main` against exact base, reject file overlap with any open PR, then commit only two allowed paths to a **deterministic one-off branch**. Create one **Draft** PR in a separate step using the existing repository-scoped user PAT; the default Actions token was observed to deny PR creation. No model-authored program/test is executed with a write-capable token.
5. **Stop** — no automatic merge, Production request, Supabase mutation, Codex repeat, polling schedule or self-healing retries.

The GitHub Actions `GITHUB_TOKEN` is distinct from `ATLAS_CODEX_TRIGGER_PAT`. Validation has read-only repository permission and no PAT; branch publication has contents write and pull-requests read. Only the separate Draft-PR creation step receives the previously configured PAT. Missing or expired PAT is a terminal blocker; never print it or broaden its permissions automatically. Model-authored tests are never executed in the credentialed publishing job.

## Publishing trust boundary

The no-PAT test job and the publisher are separate runners. A passing model-authored test is not an authority for what gets published. Before this guard, a test could replace `runner.temp/plan.json` with a different schema-valid two-file plan retaining the same base/preimage hashes. The old publisher would accept that substituted content. The publisher now calls trusted `verify` against its own event before `apply`, so modified source or test replacements abort publication even when their schema and preimage checks pass. Model code never runs in the publisher.

Focused regression covers a valid unchanged handoff, substituted source, substituted test, spoofed author and wrong launcher. This closes artifact substitution; it does not prove semantic correctness or honesty of AI-generated tests. Independent PR CI/review remain required. No new model invocation is needed to verify this boundary.

## Fail-closed rules and verification

- One exact `task_id`, one fixed launcher PR, deterministic output branch, no cron. A second message cannot create another branch after the first succeeds.
- Any `main` change before publishing, mismatched preimage, unknown file, collision with another open PR, missing task output or failed test aborts publication.
- CI passes only prove the validator works against fixtures. **Actual unattended code-edit → Codex patch comment → bot-ingested Actions event → verified Draft PR** requires a separate one-time observed live receipt. Those patch-to-PR links were observed in the accepted pilot above, with a separate one-time recovery. A single uninterrupted dispatch-to-PR run remains unproven.
- The launcher PR #2560 was created from an older `main` snapshot; model output based on its old checkout must fail the current-main SHA gate. A real live pilot will need a fresh trusted checkout/snapshot. Do **not** label the older launcher Production-current.

## Cost and resource gate

The relay has no scheduler and invokes no model by itself. Enabling a future fixed cadence requires separate proof of model usage constraints, anti-overlap rules, branch publishing and complete logs. No Vercel Sandbox, Vercel Hobby Production browser, unrelated data audits, paid API or full backup replay.

**Project authority:** `WORK_EXECUTION.md`, `AGENTS.md`, `docs/VERCEL_HOBBY_QUOTA_GUARD.md`.

