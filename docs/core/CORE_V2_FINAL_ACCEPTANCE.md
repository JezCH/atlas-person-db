# ATLAS CORE v2 Final Acceptance

**Current status:** GENERATED PASS / CORE v2 CLOSED  
**Current P13 requirement:** `ATLAS-RQ-0223 — COMPLETED`  
**Historical acceptance:** PR #1771 / 2026-10-01 — audit evidence only  
**Current closure authority:** generated evidence from `.github/workflows/atlas-core-final-acceptance.yml`  
**P14 content implementation:** out of scope; **PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME**.

## Generated acceptance result

The first current-authority generated acceptance completed on main commit:

- accepted main SHA: `0ed0f0de849972ebda1eab618ce6112f5d5cb135`;
- workflow run: `36960727475`;
- workflow job: `110693599986`;
- artifact: `11207792140`;
- artifact digest: `sha256:7bcc07a2ad125bb946d501db1af3416de8d1e8215b5365dec4470f1584c03731`;
- Production deployment: `dpl_GbgrFxDR32VLH7z6sjga6MxrbEb9`;
- Production runtime SHA: `0ed0f0de849972ebda1eab618ce6112f5d5cb135`;
- generated report schema: `atlas-core-final-acceptance-evidence/v2`;
- generated status: **PASS**;
- executable gates: **9 / 9 PASS**;
- mapped invariants: **26 / 26 PASS**;
- failed gates: **0**;
- failed invariants: **0**.

The closure-state commit that marks `ATLAS-RQ-0223` completed must itself rerun the same exact-SHA generated workflow. Therefore this document records the initial proof above, while the authoritative operational rule remains “latest successful generated acceptance for the current main closure SHA,” not a hand-edited PASS field.

## Why the old PASS is not authority

`data/core/core-v2-final-acceptance.v1.json` preserves the Unit 17 / targeted re-entry PASS reached before the post-closure audit. Its stored PASS values are historical only and remain explicitly marked `current_closure_authority:false`.

A source-controlled acceptance artifact cannot close CORE by declaration.

## Current authority chain

1. `contracts/core-final-acceptance-contract.v2.json`
   - declares required gates and invariant-to-gate mapping;
   - stores no PASS/FAIL result for any gate or invariant.
2. `server/atlas-core-final-acceptance.js`
   - validates that contract;
   - binds generated evidence to `ATLAS-RQ-0223`;
   - derives Production readiness from the exact expected commit SHA;
   - derives every invariant result from executable gate outcomes.
3. `scripts/run-core-final-acceptance.mjs`
   - executes every command gate;
   - persists stdout/stderr logs and SHA-256 hashes;
   - produces `core-v2-final-acceptance.generated.json`.
4. `.github/workflows/atlas-core-final-acceptance.yml`
   - waits until Production exposes the exact `GITHUB_SHA`;
   - requires `ready:true`, `bootstrap_ready:true`, and `readiness.ready:true`;
   - runs acceptance on fresh PostgreSQL;
   - uploads generated JSON plus gate logs;
   - publishes commit status `ATLAS CORE Final Acceptance`.

## Required executable gates

Every generated acceptance run must pass:

- complete current test suite — `npm test`;
- requirements source-of-truth verification;
- release governance verification;
- Stage 2 domain contract verification;
- Runtime architecture verification;
- current-schema reconstruction on fresh PostgreSQL;
- Human Authoring operational parity on fresh PostgreSQL;
- canonical-data readiness rehearsal on fresh PostgreSQL;
- exact Production SHA authoring-readiness read-back.

These gates cover the original Unit 17 invariants plus the post-closure remediation set: new-Person registration completeness, reviewed-candidate lifecycle, primitive identity bypass sealing, DB-backed spatial materialization, first-class Place UUID authority, unknown temporal-boundary transport, obsolete executable residue, destructive lifecycle, Runtime reproducibility, and exact Production readiness.

## Terminal PASS rule

Current terminal PASS exists only when generated evidence satisfies all of the following:

- schema `atlas-core-final-acceptance-evidence/v2`;
- `requirement_id:"ATLAS-RQ-0223"`;
- `generated:true`;
- all required gates PASS;
- all mapped invariants PASS;
- no failed gate or invariant;
- evidence `commit_sha` equals workflow `GITHUB_SHA`;
- Production `runtime_sha` equals the same SHA;
- Production authoring/readiness and bootstrap read-backs are all true.

Any current main commit that changes the acceptance/runtime surface must satisfy the same mechanism; a historical static PASS never substitutes for it.

## Product-phase reconciliation

The following P13 requirements are completed:

- `ATLAS-RQ-0223` — full Production product lifecycle acceptance;
- `ATLAS-RQ-0226` — first-class Person authoring without fabricated optional facts;
- `ATLAS-RQ-0227` — first-class Place and bibliographic Source authoring;
- `ATLAS-RQ-0228` — explicit Compile → Runtime projection/readiness;
- `ATLAS-RQ-0229` — unresolved Activity boundaries without fake endpoints;
- `ATLAS-RQ-0230` — source-backed candidate → human review → authoritative authoring.

`ATLAS-RQ-0224` and `ATLAS-RQ-0225` remain unimplemented requirement rows for traceability, but their execution state is **PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME**. They are not a CORE blocker and must not become a project frontier without an explicit user restart.

## Re-entry rule

CORE v2 is closed after generated acceptance. Re-entry is justified only by concrete contradictory evidence against a closed invariant, or by a deliberately versioned future CORE program. Historical comments, old queue states, superseded PRs, and static PASS artifacts do not reactivate CORE by themselves.
