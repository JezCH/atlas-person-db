# ATLAS Codex patch relay v1 — bounded experiment

**Status: proposal; not proof of unattended code/PR completion.** This design avoids requiring a Codex Cloud task container to reach GitHub through the currently unreliable proxy. It does NOT repair that proxy, require OpenAI API keys or enable recurring background development.

## Proven starting capabilities

- A narrowly scoped, expiring GitHub fine-grained PAT in Actions Secret `ATLAS_CODEX_TRIGGER_PAT` lets a trusted, manually reviewed Actions workflow post a **JezCH-authored** `@codex` command (not a bot-authored command).
- The Codex GitHub App can acknowledge and finish read-only work. A later code-edit task returned only `Codex couldn't complete this request. Try again later.`; actual Codex Cloud code authoring has **not** been proven. Do not treat an eyeball reaction, Actions success or this document as proof of coding.
- Codex Cloud `git fetch origin main` can fail before GitHub with a proxy-port-8080 connection error; do not supply broader credentials or continuously retry it.

## Output contract

For this **single fixed pilot**, only a real GitHub App comment from `chatgpt-codex-connector[bot]` (GitHub account ID `199175422`) on existing Draft PR **#2560** can submit a patch. Its entire comment body must be:

```text
ATLAS-CODEX-PATCH-V1
{"version":1,"task_id":"atlas-patch-relay-pilot-20261020","base_sha":"<exact current main SHA, 40 lowercase hex>","files":[{"path":"scripts/<existing safe utility>.mjs","before_sha256":"<original file sha256>","after_base64":"<complete replacement UTF-8 file, base64>"},{"path":"tests/<existing regression>.test.mjs","before_sha256":"<original file sha256>","after_base64":"<complete replacement UTF-8 test file, base64>"}]}
END-ATLAS-CODEX-PATCH-V1
```

This is **complete-file replacement**, not a shell script or arbitrary diff. Only one existing source and one existing test file, in that order. Avoid `.github/`, `api/`, `db/`, schemas, secrets, registry/data files, authoring/mutation utilities, deployment tooling, new files, symlinks and any other path rejected by the parser. Each file is at most 24 KiB; combined 38 KiB; comment at most 50 KiB. No arbitrary paths, new paid dependencies, model-issued GitHub credentials or code executing in a credentialed job.

## Workflow architecture

1. **Receive** — `issue_comment:created`, gated by exact PR, GitHub App numeric identity and exact marker. All other comments skip the job.
2. **Unprivileged validate** — checkout trusted `main` without persisted credentials. Reject stale HEAD, invalid hashes, encodings, wrong paths, pre-existing symlinks or dirty checkout. Write both files only after all validations. Run only the focused Node test and `git diff --check`. No repository write permission and no PAT.
3. **Handoff** — one short-lived GitHub Actions artifact carries the validated JSON plan, not an executable script.
4. **Privileged publish** — fresh checkout `main`; revalidate the entire plan, compare current remote `main` against exact base, reject file overlap with any open PR, then commit only two allowed paths to a **deterministic one-off branch**. Create one **Draft** PR if GitHub allows GitHub Actions to create pull requests. No model-authored program/test is executed with a write-capable token.
5. **Stop** — no automatic merge, Production request, Supabase mutation, Codex repeat, polling schedule or self-healing retries.

The GitHub Actions `GITHUB_TOKEN` is distinct from the manually created `ATLAS_CODEX_TRIGGER_PAT`. The receiver **never uses the user PAT**. Repository Actions settings might disallow PR creation by the default token: if so, the job must report a precise failure, not silently switch to a broader PAT.

## Fail-closed rules and verification

- One exact `task_id`, one fixed launcher PR, deterministic output branch, no cron. A second message cannot create another branch after the first succeeds.
- Any `main` change before publishing, mismatched preimage, unknown file, collision with another open PR, missing task output or failed test aborts publication.
- CI passes only prove the validator works against fixtures. **Actual unattended code-edit → Codex patch comment → bot-ingested Actions event → verified Draft PR** requires a separate one-time observed live receipt. That step remains unproven until all four links are observed.
- The launcher PR #2560 was created from an older `main` snapshot; model output based on its old checkout must fail the current-main SHA gate. A real live pilot will need a fresh trusted checkout/snapshot. Do **not** label the older launcher Production-current.

## Cost and resource gate

The relay has no scheduler and invokes no model by itself. Enabling a future fixed cadence requires separate proof of model usage constraints, anti-overlap rules, branch publishing and complete logs. No Vercel Sandbox, Vercel Hobby Production browser, unrelated data audits, paid API or full backup replay.

**Project authority:** `WORK_EXECUTION.md`, `AGENTS.md`, `docs/VERCEL_HOBBY_QUOTA_GUARD.md`.
