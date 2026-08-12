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
- Polity identity/continuity contract for Roman 395, Yuan 1368, Russia 1721 and Portugal 1815;
- shared BCE-safe temporal boundary contract;
- normalized provenance contract;
- Activity semantic-key v2;
- additive Stage 2 schema contract;
- one machine-readable Stage 2 domain contract;
- executable non-Production additive-schema rehearsal;
- executable normalized-provenance rehearsal;
- executable semantic-key-v2/index-replacement rehearsal;
- Qubilai pre-1271 identity/designation policy;
- baseline-independent structural Polity-relation interval research for Canada/UK, British Raj/UK, RSFSR/USSR and Huainan/Western Han.

These are portable historical/domain decisions and disposable capability rehearsals, not Production backfill manifests.

## One machine-readable contract again

The old stack had a useful property that was missing from the first reconstruction of PR #125: multiple documents described the same vocabularies, but there was no current machine-readable object tying them together.

`contracts/stage2-domain-contract.v1.json` is now the current baseline-independent contract for:

- six Person–Polity Relation codes;
- Governance Context types;
- temporal granularity/certainty/calendar vocabularies;
- Polity designation types;
- Polity structural-relation candidate codes;
- Polity identity-relation candidate codes;
- normalized provenance join families;
- Activity semantic-key-v2 dimensions and excluded evidence fields.

It contains no Production UUID binding and does not revive the old 346-row count.

## Rehearsal chain is executable, but cannot mutate Production

ATLAS Integrity now proves the following chain on disposable PostgreSQL after reconstructing the current v2 baseline:

```text
current atlas_v2 clean baseline
-> machine-readable Stage 2 contract verification
-> additive Stage 2 semantic schema rehearsal
-> normalized provenance rehearsal
-> Activity semantic-key v2 / legacy-index replacement rehearsal
```

The three SQL proposal files live under `db/proposals/`, are marked `REHEARSAL ONLY`, and are deliberately absent from Production migration registries.

This restores the useful engineering proof from the old stack without restoring its stale Activity UUID bindings or queue counts.

## Structural correction found while reconnecting the contracts

Blindly copying the old rehearsal would have contradicted the current Authoring rules in two places. Both are corrected in the current train.

### 1. Unknown/open temporal boundaries

The old rehearsal made Governance, Polity relation and designation boundaries `NOT NULL`. That cannot faithfully represent source-backed cases where the relation exists but the exact beginning/end remains unknown, model-qualified, or still under review.

Current rule:

- a whole new-assertion boundary may be NULL/unresolved in Authoring;
- once any boundary component is supplied, the full tuple must be coherent;
- year zero is rejected;
- lower precision is never invented;
- existing Activity year endpoints remain as they are, with Stage 2 detail columns additive/nullable until reviewed backfill.

This directly matches the current Huainan and RSFSR research state instead of forcing fake dates.

### 2. Multiple source locators

The old provenance rehearsal keyed a join only by `(assertion_id, source_id)`, which meant the same source could not preserve multiple independently useful pages/sections for one assertion.

Current rule:

```text
assertion_id + source_id + source_locator_key
```

is the provenance join identity. Exact duplicate locators may deduplicate; distinct locators from the same Source must survive correction/coalescing.

## Polity identity must be fixed before Activity semantic cutover

`polity_id` is part of final Activity identity. Therefore Polity continuity/canonicalization is not cosmetic naming work and cannot be deferred until after semantic-key v2 activation.

The current portable continuity decisions are:

- **Roman 395** — operational eastern territorial split for GIS while preserving explicit Roman continuity metadata;
- **Yuan 1368** — stable Yuan identity through the reviewed immediate post-1368 phase; `Northern Yuan` as historiographic designation plus Territory contraction;
- **Russia 1721** — one stable Russian Polity; Tsardom/Russian Empire as temporal state-form/designation, exact transition 1721-11-02 Gregorian;
- **Portugal 1815** — distinct composite United Kingdom created 1815-12-16; Portugal remains a constituent rather than becoming a mere alias.

None of these decisions selects a Production UUID before Baseline A.

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

Unknown Territory may remain unknown without corrupting identity or Person semantics.

## Structural relation research result

The interval research closes the relation **meaning** for four families while refusing false precision:

- Canada `dominion_of` UK: 1867-07-01 start is exact; 1931-12-11 is an exact legal-autonomy milestone, but the final relation end remains model-qualified;
- British Raj `colonial_dependency_of` UK: 1947-08-14 inclusive end is exact; 1858-11-01 remains primary-locator gated before Production approval;
- RSFSR `constituent_of` USSR: 1922-12-30 start is exact; the terminal boundary remains 1991 year-level uncertain because dissolution was multi-step;
- Huainan `vassal_of` Western Han: relation semantics are resolved, while absolute chronology and Polity continuity remain explicit blockers.

This is the intended ATLAS behavior: **incomplete evidence reduces precision; it does not trigger invention.**

## Acceptance

The current CI chain now enforces that:

- required baseline-independent contracts and rehearsals exist;
- port-now and Baseline-A-wait sets are disjoint;
- the integration manifest does not contain old UUID write targets or revive 346 as authority;
- machine-readable vocabularies match the current human contracts and rehearsal SQL;
- unresolved whole boundaries are representable while partial malformed tuples are rejected;
- provenance preserves multiple locators and restricts cited Source deletion;
- semantic-key v2 includes Relation + full interpreted temporal boundaries and excludes evidence quality/content;
- the legacy null-role index is replaced only inside disposable rehearsal, not Production;
- Qubilai, structural-relation and continuity decisions remain UUID-unbound before Baseline A;
- Production mutation remains false.

The next actual live dependency remains Production Train 1. Until that occurs, further Stage 2 work should continue only where it is genuinely baseline-independent.
