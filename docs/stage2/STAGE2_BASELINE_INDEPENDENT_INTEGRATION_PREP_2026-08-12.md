# Stage 2 Baseline-Independent Integration Preparation — 2026-08-12

> Status: PRE-VERCEL DOMAIN/ENGINEERING CLOSURE / NO PRODUCTION MUTATION

## Boundary

Old Stage 2 stacked work is split into:

1. **portable domain/research/rehearsal evidence** — may be carried before Baseline A;
2. **live execution state** — Activity/Polity/Person/Source UUID bindings, correction targets, queues and Production backfills; must be regenerated from Baseline A v2.

The old 346-row count and old Activity UUID targets never regain authority.

## Portable execution contract

Current release train now contains:

- six Person–Polity Relation semantics;
- Governance Context;
- full temporal boundary contract with unresolved-boundary support;
- Polity structural/identity/designation models;
- Polity historical-name vs editorial-label semantics;
- PeopleGroup / PersonPeopleAffiliation;
- HistoricalEvent / PersonEventParticipation;
- normalized multi-locator provenance;
- Activity semantic-key v2;
- additive Stage 2 schema rehearsal;
- People/Event + naming rehearsal;
- provenance rehearsal;
- semantic-key/index replacement rehearsal;
- reviewed pre-Vercel historical closure registry.

`contracts/stage2-domain-contract.v1.json` is the current baseline-independent machine contract. It contains no live UUID binding.

## Baseline A v2

The old Activity-only handoff was insufficient because unreferenced Person/Polity rows, raw `polity_names.name_type`, and complete normalized Sources could otherwise require later ad-hoc Production queries.

Baseline A v2 captures, in one exact-SHA `REPEATABLE READ READ ONLY` transaction:

```text
all Activities
+ all Persons / Person names
+ all Polities / Polity names / raw name_type
+ all Roles / Role names
+ all Period Bases / names
+ all Sources
```

The digest covers `{rows, counts, catalogs}`. The intake then cross-checks every Activity FK/metadata against the same snapshot. Names and canonical keys are review labels, never binding authority.

## Entity-boundary correction

Two earlier modeling ambiguities are now explicit:

- a source-backed Polity may lack a trustworthy historical state-name; an explicitly tagged `editorial_catalog_label` can identify it in Authoring without pretending the label is historical evidence or a designation;
- People and Events are independent entities, so ethnic affiliation and event participation never need fake Person–Polity relations.

This resolves the structural problem behind Sacagawea/Tecumseh/Leftraru and many unnamed regional authorities without inventing states.

## Historical closure

`research/pre-vercel/stage2-pre-vercel-domain-closure.v1.json` is the current status overlay over the earlier detailed research packs.

Baseline-A-independent model decisions remaining: **0**.

That statement does not mean every historical boundary is exact. Cases such as Sitting Bull retain explicit source-limited uncertainty. Such uncertainty is either stored in Authoring or becomes a P8 Runtime-readiness gate; it is not a reason to fabricate precision.

Reviewed structural relation models now include:

- Canada `dominion_of` UK — 1867-07-01 through 1931-12-10, with Statute of Westminster milestone 1931-12-11;
- British Raj `colonial_dependency_of` UK — 1858-11-01 through 1947-08-14;
- RSFSR `constituent_of` USSR — 1922-12-30 through 1991-12-25, with USSR cessation milestone 1991-12-26;
- Ying Bu's Huainan phase `vassal_of` Western Han — 203 BCE through 196 BCE at year precision, without asserting broader Huainan dynastic continuity.

Production UUIDs remain null until Baseline A v2.

## Rehearsal chain

ATLAS Integrity runs on a fresh disposable PostgreSQL database:

```text
current atlas_v2 reconstruction
→ Stage 2 semantic extensions
→ normalized provenance
→ Polity naming + People/Event entity boundaries
→ Activity semantic-key v2 / legacy index replacement
```

All proposal SQL is marked `REHEARSAL ONLY` and remains absent from Production migration registries.

## Next dependency

The next required live dependency is now unambiguous:

```text
one exact-SHA Production Train 1
→ R0/R1
→ Baseline A v2
→ fresh Stage 2 live rebinding
→ Train 2
```

Territory/Geometry work that does not change Person Activity semantics remains P14 map authoring, not a default Stage 2 cutover blocker.
