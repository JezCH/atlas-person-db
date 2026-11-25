# Work → Codex handoff — 2026-10-26

This directory preserves all 23 files from the latest observed Work checkpoint v10, the original checkpoint ZIP, the agent evolution plan and the current automation instruction/result snapshot. These are reviewable handoff artifacts. Copying a patch here does not integrate it into application source or authorize its execution.

## Read first

1. Repository-root `AGENTS.md` and authoritative `WORK_EXECUTION.md`.
2. This README for the exact current resume point.
3. [Place checkpoint](checkpoint/place2476/checkpoint.json), [fact evidence](checkpoint/place2476/fact-evidence-handoff.json), [writer contract](checkpoint/place2476/writer-contract.json).
4. Only the affected source and direct dependencies needed for the chosen unit.

The user's instruction for this upload was **“전부 깃허브로 올려”**. It authorizes preservation on GitHub, not Production operations, automatic merges, enabling model dispatch, changing the existing schedule, or applying the archived patches.

## Current business unit

Continue **Place #2476 restoration preparation**: [canonical issue](https://github.com/JezCH/atlas-person-db/issues/2476).

Latest checkpoint v10 contains:
- original manifest: **20 Place UUIDs / 27 Source UUIDs / 23 place-function facts**;
- Source assertions: **13 STRUCTURALLY_VALID_EVIDENCE_HOLD / 14 HOLD_MISSING_CANONICAL_URL**;
- [fact-evidence-handoff.json](checkpoint/place2476/fact-evidence-handoff.json): all 23 fact requests linked to source review/locator and missing evidence;
- a proposed [exact-place-transport.patch](checkpoint/place2476/exact-place-transport.patch), **not integrated into live repository source**.

Structural validity is not historical approval. All scoped historical HOLDs remain. The original facts have no id field; do not invent preserved function UUIDs.

**Next work:** review the remaining 14 missing-URL Sources and the exact supported claims/periods, resolve Edirne's 1453 transition versus the original 1452 endpoint convention and Singapore's insufficient end-year evidence, complete the Source correction-plan envelope, and finish the UUID-preserving writer connection against the current actual source. Preserve the earlier 1911-vs-1922 Ottoman endpoint evidence gap. Keep unsupported items HOLD while completing supported independent items.

Finish a usable restoration input/payload bundle, per-item evidence/HOLDs, actual writer mapping/order and necessary focused verification. Do not substitute another manager feature, test-only artifact, repeated repository trigger census or model pilot for this business deliverable.

Source → Place → place-function → separate compile/read-back remains the proposed dependency order. Live identity conflicts and exact-before absence have **not** been checked by these offline artifacts.

## Status corrections and authority

- [Agent evolution plan](ATLAS_agent_evolution_plan_20261026.md) is preserved byte-for-byte from its original creation. Its v9 counts **10/17** and “no GitHub upload yet” statements describe the earlier snapshot. For restoration preparation, v10's **13/14** values and actual checkpoint artifacts supersede those observations.
- The v10 checkpoint's legacy `remaining` prose still says “24 canonical URLs”. This is stale text; the 27 actual assertion records classify **14** missing URLs and **13** structurally valid candidates. Preserve the original bytes and use the record-level statuses; do not turn the stale 24 into a current denominator.
- `automation-resume-20261025-2300.json` is an earlier repository event audit, retained as evidence rather than a second active task registry.
- [Automation snapshot](automation-snapshot.json) is a timestamped copy of the existing task's prompt and latest recorded result. It creates no schedule or new authority, and may become stale if that task advances.
- [Manifest](handoff-manifest.json) records exact archive entry sizes/hashes and the source revision used for this upload.
- `REMOTE_DELIVERY_HOLD` in archived checkpoint files describes their prior delivery state. This PR delivers the artifact snapshot to GitHub. It does not prove that Vercel integration overrides, Production deployment, canonical preflight or restored data have been accepted.
- A snapshot is not an exclusive task claim. Reconcile only actual changed UUIDs/files/contracts if another worker advances related work.

## Preserved parked work

[person-only1896](checkpoint/person-only1896/) includes the original and modified UI JavaScript, proposed patch, payload helper and local check scripts. Status remains **PARKED_PRIORITY_REVIEW**. These files are archival evidence under `docs/`; they are not application files or registered tests. Do not apply or resume them automatically.

## Existing GitHub work

- #2593 already merged the agent code-context/skills/memory capabilities; #2590/#2591 are superseded.
- #2611 is **open, ready for review, unmerged**, pending the current maintainer review/authorization boundary. Do not repeat the closed model pilot or make its merge a dependency of Place preparation.
- Existing selected Person drafts remain separate protected work.
- Retired YouTube discovery, parked P14 geometry and mass portrait generation stay inactive.
- Existing model task registry/bridge remain disabled; no Codex activation is requested by this upload.

## Execution and safety boundaries

Reuse canonical writers and current fail-closed stale-write checks. Do not generate replacement Place UUIDs, invent Korean labels, silently rewrite reviewed historical claims, perform DB writes, execute migrations, enable automatic merge, retry HTTP 402, use Vercel Sandbox, or create paid API/model dependencies.

The user can now select this PR's branch in Codex and read these files directly. An unmerged PR is not part of default `main`; use the actual branch/head when resuming. Do not assume the Work chat history, browser sessions, credentials or Library metadata are transferred with a checkout.

## Preservation validation

All 23 archive entries were extracted without content changes and verified against their SHA-256/Git blob hashes. All preserved JSON files parse. A scoped credential-pattern scan found no matches. No archived application code was executed and no historical evidence was promoted to APPROVED during packaging.

Only new files beneath `docs/handoffs/20261026-work-to-codex/` are proposed. Existing runtime, configuration, workflows, canonical data and authoring requests are unchanged. Repository configuration disables non-main Git deployments and the existing ignore classifier treats this touch set as non-deployable. External provider overrides are not attested by this snapshot.

