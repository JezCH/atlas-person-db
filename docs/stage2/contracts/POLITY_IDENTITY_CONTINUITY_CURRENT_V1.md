# Stage 2 Polity Identity & Continuity — Current Contract v1

> Status: BASELINE-INDEPENDENT CURRENT CONTRACT / NO PRODUCTION MUTATION
>
> Source decision record: `docs/audits/STAGE2_POLITY_CONTINUITY_DECISIONS_2026-08-12.md`

## Purpose

This contract carries forward only the **historical identity model** that is independent of the old 346-Activity baseline. It deliberately omits every old Activity UUID and every future Production Polity UUID binding.

The core rule is:

> A change in name, title, state form, territorial extent, or historiographic period label does not by itself create a new Polity identity. Conversely, a source-defined union or genuinely distinct political actor must not be collapsed into one UUID merely to simplify migration.

## Identity layers

ATLAS keeps these concepts separate:

1. stable Polity identity;
2. localized names and aliases;
3. temporal designation/state-form history;
4. diachronic identity relations between distinct Polities;
5. simultaneous Polity-to-Polity hierarchy;
6. Territory history.

No generic `successor_of` shortcut may replace this distinction.

## Reviewed continuity families

### Roman → Eastern Roman / Byzantine, 395

Historical identity remains explicitly Roman. For map/GIS operation, however, ATLAS may represent a distinct eastern territorial authority from the 395 division boundary while retaining Roman-continuity metadata.

This is **not** modeled as an ethnonational replacement of Rome by a new non-Roman civilization.

Current contract:

- pre-395 unified Roman territorial authority remains distinct from the post-395 eastern operational territorial authority for map purposes;
- the eastern authority may use `Byzantine Empire` as the project's conventional English presentation label;
- Roman continuity must remain explicit metadata/provenance;
- the exact Production survivor UUIDs and any identity-relation assertion wait for Baseline A.

### Yuan → Northern Yuan, 1368

The immediate post-1368 Yuan court continuation is modeled as **one stable Yuan Polity identity** with major territorial contraction.

Current contract:

- `Northern Yuan` is a historiographic/conventional temporal designation for the reviewed immediate continuation phase;
- 1368 does not automatically create a new Polity UUID;
- territorial loss is expressed through Territory history, not identity duplication;
- this decision is intentionally not extrapolated to every later Mongol regime without separate research.

### Tsardom of Russia → Russian Empire, 1721

The 1721 imperial-title/state-form transition is one stable Russian Polity identity.

Current contract:

- one Russia UUID across the transition;
- `Tsardom of Russia` and `Russian Empire` belong to temporal designation/state-form history;
- transition boundary: **1721-11-02 Gregorian** (22 October Julian), day precision, exact;
- Person Role changes may still require distinct Activities even though Polity identity remains stable;
- no successor-Polity relation is created for this state-form change.

### Portugal → United Kingdom of Portugal, Brazil and the Algarves, 1815

This case is structurally different. The 16 December 1815 primary law creates a composite United Kingdom from multiple kingdoms.

Current contract:

- `United Kingdom of Portugal, Brazil and the Algarves` is a distinct composite Polity;
- `Kingdom of Portugal` is not merely renamed out of existence and may continue as a constituent Polity where the reviewed legal model requires;
- formation boundary: **1815-12-16**, day precision, exact, Gregorian;
- the union uses a distinct identity/formation model plus structural `constituent_of` assertions rather than a simple alias;
- exact constituent intervals and Production UUID bindings remain separate historical/backfill work.

## Baseline A boundary

The following are specifically forbidden before Baseline A:

- selecting a stable Production Polity UUID merely because one old row used a familiar English name;
- converting old Activity UUIDs into correction targets;
- deleting duplicate/competing Polity identities;
- generating RELINK/SPLIT/RETIRE manifests;
- inserting designation, identity-relation, or constituent assertions against guessed UUIDs.

Historical model decisions are portable. Execution bindings are not.

## Runtime implications

Runtime historical naming resolves conceptually as:

```text
Polity UUID + selected time -> preferred reviewed designation/state form
```

A designation change does not duplicate geometry. Territory changes only when the territorial assertion itself changes.

For the Roman 395 operational split, map-specific territorial authority is represented according to the reviewed GIS model while Roman identity continuity remains visible in metadata rather than being erased.

## Production Train 2 implication

After Baseline A, this contract is rebound once to surviving Polity identities. Correction v2 then handles exact relinks/retirements/designations/identity relations/structural assertions. The semantic-key cutover must consume the resulting canonical Polity identities; it must not decide Polity identity on the fly.
