# Stage 2 Baseline-Independent Integration Preparation — 2026-08-12

> Status: RELEASE-TRAIN PREPARATION / NO PRODUCTION MUTATION

This document defines what may safely be carried from the old stacked Stage 2 work into the current release train **before Baseline A exists**.

## Rule

The old Stage 2 stack contains two fundamentally different kinds of work:

1. **baseline-independent contracts/rehearsals** — domain meaning that does not depend on a specific Activity UUID set;
2. **baseline-bound execution state** — old 346-row Activity UUID bindings, queue counts, correction targets, and backfill plans.

Only the first class may be carried forward now.

## Carried forward now

Current canonical contracts in this release train:

- Person–Polity Relation semantics
- Governance Context
- Polity-to-Polity structural relations, including reviewed `nominally_subordinate_to`
- shared BCE-safe temporal boundary contract
- normalized provenance contract
- Activity semantic-key v2
- additive Stage 2 schema contract
- Qubilai pre-1271 identity/designation policy

These are semantic/schema contracts. They authorize no Production write.

## Explicitly not carried as authority

The following must be regenerated from Baseline A:

- old `346` Activity count as an invariant;
- old Activity UUID-based master ledger;
- old work-queue counts;
- any old Activity UUID used as a future correction target;
- exact current Polity UUID assertions;
- Relation Type row backfill;
- correction v2 manifests;
- semantic-key v2 activation preflight;
- Phase 9 physical Person merge targets.

Historical research evidence may cite old rows as provenance, but Production execution must target the surviving Baseline A identities.

## Vercel release strategy

This preparation remains on the existing Draft release-train branch and consumes no Production deployment by itself.

Production Train 1 remains:

```text
exact deployed SHA
-> R0
-> R1 current-schema corrections
-> Baseline A capture on the same SHA
```

After Baseline A, Stage 2 execution state is rebound once. Production-facing P5–P11 work is then prepared for one coherent Train 2 whenever live-state dependencies permit:

```text
additive schema
-> correction v2 / historical backfill
-> zero-known-blocker gate
-> semantic-key v2 cutover
-> v2-aware Person merge
-> Baseline B / end-state constraints
```

A new Vercel deployment is not justified merely because the next operation is a different roadmap phase if the same deployed SHA already contains and safely sequences that operation.

## Qubilai blocker decomposition

The old broad `Qubilai pre-1271 Territory` blocker is no longer treated as one indivisible semantic blocker.

- Person relation semantics: resolved.
- stable eastern Polity identity from 1260 + Great Yuan designation boundary at 1271: resolved at model level.
- exact pre-1271 Territory geometry: unresolved and preserved for dedicated map research; no fake geometry; not a Stage 2 semantic-cutover blocker.

This is consistent with the project constitution: unknown Territory may remain unknown without corrupting identity or Person semantics.

## Acceptance

`scripts/verify-stage2-integration-prep.mjs` enforces that:

- required baseline-independent contracts exist;
- port-now and Baseline-A-wait sets are disjoint;
- the integration manifest does not contain UUID-shaped Activity write targets or revive the old 346 baseline as authority;
- the Qubilai decision preserves 1260 identity / 1271 Great Yuan designation and unresolved geometry;
- Production mutation remains false.

The next actual live dependency remains Production Train 1. Until that occurs, further Stage 2 work should continue only where it is genuinely baseline-independent.