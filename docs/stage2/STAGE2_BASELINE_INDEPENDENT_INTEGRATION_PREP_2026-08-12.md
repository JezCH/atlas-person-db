# Stage 2 Baseline-Independent Integration Preparation — 2026-08-12

> Status: RELEASE-TRAIN PREPARATION / NO PRODUCTION MUTATION

This document defines what may safely be carried from the old stacked Stage 2 work into the current release train **before Baseline A exists**.

## Rule

The old Stage 2 stack contains two fundamentally different kinds of work:

1. **baseline-independent contracts/rehearsals/research** — domain meaning and historical decisions that do not depend on a specific surviving Activity UUID set;
2. **baseline-bound execution state** — old 346-row Activity UUID bindings, queue counts, correction targets, backfill plans and exact Production Polity UUID assertions.

Only the first class may be carried forward now.

## Carried forward now

Current canonical units in this release train:

- Person–Polity Relation semantics;
- Governance Context;
- Polity-to-Polity structural relations, including reviewed `nominally_subordinate_to`;
- shared BCE-safe temporal boundary contract;
- normalized provenance contract;
- Activity semantic-key v2;
- additive Stage 2 schema contract;
- Qubilai pre-1271 identity/designation policy;
- baseline-independent structural Polity-relation interval research for Canada/UK, British Raj/UK, RSFSR/USSR and Huainan/Western Han.

The last item is deliberately not a Production backfill manifest. It records which parts of the relation semantics and chronology are actually resolved and which must remain uncertain.

## Structural relation interval rule

A Person Activity does not define the lifetime of a Polity-to-Polity relation. The relation has its own interval and provenance.

For example:

- Laurier's premiership is evidence that Canada/UK structure matters, but his 1896–1911 Activity cannot become the Canada/UK relation interval;
- Gandhi's life/activism interval cannot define the entire British Raj dependency interval;
- Lenin's office interval cannot define when the RSFSR was a constituent of the USSR;
- Ying Bu's Person row exposes Huainan, but Huainan continuity across later kings is a separate Polity-identity question.

`research/relations/stage2-structural-polity-relation-intervals.v1.json` therefore stores no Production Polity UUIDs. It distinguishes resolved semantics, resolved boundaries, model-qualified transitions and unresolved chronology/continuity.

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

## Structural relation research result

The new interval research closes the relation **meaning** for four families while refusing false precision:

- Canada `dominion_of` UK: 1867-07-01 start is exact; 1931-12-11 is an exact legal-autonomy milestone, but the final relation end remains model-qualified because residual constitutional dependence survived;
- British Raj `colonial_dependency_of` UK: 1947-08-14 inclusive end is exact; 1858-11-01 remains primary-locator gated before Production approval;
- RSFSR `constituent_of` USSR: 1922-12-30 start is exact; the terminal boundary remains 1991 year-level uncertain because dissolution was multi-step;
- Huainan `vassal_of` Western Han: relation semantics are resolved, while absolute chronology and Polity continuity remain explicit blockers.

This is the intended ATLAS behavior: **incomplete evidence reduces precision; it does not trigger invention.**

## Acceptance

`scripts/verify-stage2-integration-prep.mjs` enforces that:

- required baseline-independent contracts exist;
- port-now and Baseline-A-wait sets are disjoint;
- the integration manifest does not contain UUID-shaped Activity write targets or revive the old 346 baseline as authority;
- the Qubilai decision preserves 1260 identity / 1271 Great Yuan designation and unresolved geometry;
- all four structural-relation research entries remain UUID-unbound and non-Production;
- Canada/Raj/RSFSR/Huainan precision guards cannot silently regress into false exactness;
- Production mutation remains false.

The next actual live dependency remains Production Train 1. Until that occurs, further Stage 2 work should continue only where it is genuinely baseline-independent.
