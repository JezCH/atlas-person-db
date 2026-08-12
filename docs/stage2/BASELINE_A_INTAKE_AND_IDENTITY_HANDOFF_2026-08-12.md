# Baseline A v2 Intake and Identity Handoff — 2026-08-12

Status: **LIVE BASELINE A CAPTURED / P3 BRANCH-ONLY REBIND IN PROGRESS / NO PRODUCTION MUTATION**

## 1. Authoritative live result

Production Train 1 completed successfully. The exact read-only Baseline A v2 was recaptured after ledger reconciliation on Production SHA:

`ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`

Baseline digest:

`sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

Measured counts:

```text
Activities                  338
Persons                     302
Person names                609
Polities                    212
Polity names                424
Roles                       149
Role names                  298
Period bases                  8
Period basis names            8
Sources                      20
Activity source links       345
Chronology claims             0
Relationship descriptions    0
```

The old exact-346 Activity baseline is superseded. **338 is measured live state, not a predicted target.**

## 2. Durable capture

GitHub Actions artifacts expire, so the artifact alone is not an acceptable long-term Stage 2 rebinding authority.

The exact full read-only JSON capture is therefore preserved in-repository as gzip:

`stage2/baselines/baseline-a-ad9a0ed0398b.json.gz`

Descriptor:

`stage2/baselines/baseline-a-current.v2.json`

Compressed file SHA-256:

`sha256:d9aeea92d73ebd0dbb4dfa0b2fa3770da49886a137c8d2f497c35425a686fc77`

The durable capture preserves **all 338 Activity rows plus the complete Person/name, Polity/name/raw-name-type, Role/name, Period Basis/name and Source catalogs**. This makes the fresh master ledger reproducible without another live DB read and without relying on an expiring Actions artifact.

## 3. Intake authority

`scripts/stage2-baseline-a-intake.mjs` validates the stored snapshot and produces `atlas-stage2-baseline-a-intake/v2`.

The intake is authoritative for live UUID inventory only.

Binding:

- Activity UUIDs and exact current row state;
- Person UUID inventory;
- Polity UUID inventory;
- Role / Period Basis / Source UUID inventory;
- raw live names and `name_type` values.

Not automatically binding:

- historical Person identity merge decisions;
- historical Polity continuity/survivor decisions;
- historical or historiographic semantic name kind;
- Relation Type;
- Governance Context;
- structural Polity relation assertions;
- correction-v2 authorization;
- physical Person merge.

A name or canonical key may nominate a reviewed candidate. It never becomes UUID authority by itself.

## 4. Current-schema cleanup is closed

Baseline A proves the completed P1 state:

- six R0 duplicate drop Activity UUIDs absent;
- six reviewed R0 representatives present;
- Franklin invalid U.S. Activity absent;
- Muhammad 610–632 Medina back-projection absent;
- Muhammad 622–632 Medinan Polity Activity retained;
- Bismarck Prussia Activity is 1862–1890.

Fresh Stage 2 work queues must therefore contain **zero pending R0 actions and zero pending current-schema R1 actions**. The old queue counts are historical evidence only.

## 5. P3 fresh ledger rule

The old 346-row master ledger generator is not current authority because it hard-coded the old snapshot and old cleanup actions.

The P3 generator instead consumes the validated durable Baseline A intake and:

1. requires exactly the measured 338 surviving Activity rows;
2. verifies removed R0/R1 UUIDs do not reappear;
3. verifies surviving R0 representatives and the Bismarck interval postcondition;
4. carries forward reviewed historical audit decisions only for surviving UUIDs;
5. treats applied R0/R1 operations as historical provenance, not pending work;
6. emits a fresh master ledger and fresh dependency/work queues;
7. authorizes no Production mutation.

## 6. Polity naming handoff

Baseline A contains only the legacy operational raw `name_type` vocabulary currently stored in Production. A raw value such as `canonical` or `display` does **not** prove that a label is:

- historical official;
- historically attested;
- historiographic conventional;
- editorial catalog label.

Therefore P3 must not auto-map legacy `name_type` to a historical semantic kind. `semantic_name_kind` stays nullable during P5 until a reviewed mapping/evidence decision exists. No designation assertion is generated merely from a legacy preferred label.

## 7. Identity handoff

Reviewed continuity models may now be rebound against the actual 212-Polity catalog. The result must distinguish:

- exact surviving live UUID;
- legacy UUID to be relinked/retired;
- distinct UUIDs intentionally retained;
- reviewed target requiring creation of a new Polity because no live UUID exists.

Physical Person merge remains P10-only after semantic-key-v2 reconciliation.

## 8. Next gate

P5 additive Production schema is not authorized merely because Baseline A exists.

Before P5, P3/P4 must close the live handoff artifacts needed for exact correction generation:

```text
validated durable Baseline A
→ fresh 338-row master ledger
→ fresh work queues
→ surviving Activity UUID bindings
→ reviewed Polity identity / name-kind / structural-relation bindings
→ Person identity decisions without physical merge
→ correction-v2 exact-before preparation
```

Until then all work remains branch-only.
