# ATLAS CORE v2 Final Acceptance

**Current status:** PENDING GENERATED ACCEPTANCE  
**Historical acceptance:** PR #1771 / 2026-10-01 — preserved as audit evidence only  
**Current closure authority:** generated evidence from `.github/workflows/atlas-core-final-acceptance.yml`  
**P14 content implementation:** out of scope; P14 remains separate product work.

## Why the old PASS is no longer authoritative

`data/core/core-v2-final-acceptance.v1.json` preserves the Unit 17 / targeted re-entry PASS reached before the post-closure audit. Its stored PASS values are historical only and are explicitly marked `current_closure_authority:false`.

The old methodology could accept a repository because a PASS artifact, ownership registry, or source file contained expected declarations. That is insufficient for terminal closure. A terminal acceptance result must now be generated from the execution result of the current architecture and from an exact Production deployment read-back.

## Current generated acceptance authority

The authority chain is:

1. `contracts/core-final-acceptance-contract.v2.json`
   - declares the required gates and invariant-to-gate mapping;
   - contains no PASS/FAIL status field for any gate or invariant.
2. `server/atlas-core-final-acceptance.js`
   - validates the contract;
   - derives Production readiness from the exact expected commit SHA;
   - derives every invariant result from executable gate results;
   - can return terminal PASS only when every required gate and Production check pass.
3. `scripts/run-core-final-acceptance.mjs`
   - executes the required gates;
   - captures stdout/stderr in durable logs;
   - hashes each log;
   - writes `artifacts/core-final-acceptance/core-v2-final-acceptance.generated.json`.
4. `.github/workflows/atlas-core-final-acceptance.yml`
   - runs only for `main`/manual acceptance;
   - waits until the Production authoring-readiness endpoint exposes the exact `GITHUB_SHA`;
   - requires `ready:true`, `bootstrap_ready:true`, and `readiness.ready:true`;
   - runs the generated acceptance runner on fresh PostgreSQL;
   - uploads the generated JSON and gate logs;
   - publishes commit status `ATLAS CORE Final Acceptance` for the exact SHA.

## Executable gate set

The generated run must pass all of the following:

- complete current test suite — `npm test`;
- requirements source-of-truth verification;
- release governance verification;
- Stage 2 domain contract verification;
- Runtime architecture verification;
- current-schema reconstruction on fresh PostgreSQL;
- Human Authoring operational parity on fresh PostgreSQL;
- canonical-data readiness rehearsal on fresh PostgreSQL;
- exact Production SHA authoring-readiness read-back.

The contract maps those gates to the CORE invariants, including registration completeness, reviewed-candidate lifecycle, destructive lifecycle, Runtime reproducibility, obsolete executable residue, primitive identity bypass sealing, DB-backed spatial materialization, first-class Place UUID authority, unknown temporal transport, and exact Production readiness.

## Terminal PASS rule

A current terminal PASS is valid only when the generated evidence satisfies all of the following:

- schema `atlas-core-final-acceptance-evidence/v2`;
- `generated:true`;
- every required gate is `PASS`;
- every mapped invariant is `PASS`;
- no failed gate or invariant exists;
- evidence `commit_sha` equals the workflow `GITHUB_SHA`;
- Production `runtime_sha` equals that same SHA;
- Production authoring/readiness and bootstrap read-backs are all true.

No source-controlled JSON can declare the current terminal PASS by itself.

## Requirement state

Until the first exact-main generated acceptance run succeeds, `ATLAS-RQ-0223` remains **PENDING**.

`ATLAS-RQ-0226` through `ATLAS-RQ-0230` retain their independently completed states. `ATLAS-RQ-0224` and `ATLAS-RQ-0225` remain separate P14 work and are not prerequisites for CORE v2 architecture closure.

## Closure evidence

After the generated workflow succeeds on the merged implementation SHA, closure evidence consists of:

- the exact main commit SHA;
- successful `ATLAS CORE Final Acceptance` commit status;
- workflow run ID;
- uploaded generated acceptance JSON and gate logs;
- exact Production readiness SHA;
- the final `ATLAS-RQ-0223` status transition to COMPLETED;
- #917 checkpoint recording those exact identifiers.

Until that evidence exists, this document deliberately does not claim terminal closure.
