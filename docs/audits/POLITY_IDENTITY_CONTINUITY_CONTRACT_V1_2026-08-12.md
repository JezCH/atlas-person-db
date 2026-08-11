# ATLAS Polity Identity & Continuity Contract v1

> Status: STAGE 2 DOMAIN CONTRACT / AUDIT ONLY
>
> Production DB mutation: **none**

## 1. Problem

ATLAS must distinguish at least four things that are currently easy to collapse into one `Polity` string:

1. one continuous Polity with different names/state forms through time;
2. a historiographic period label used for one phase of a Polity;
3. two genuinely distinct Polities with a diachronic relationship;
4. two duplicate/alias records that should be one identity.

A visible label change is not evidence by itself that a new Polity UUID must be created.

## 2. Stable Polity identity

`polities.id` remains the stable identity for a historically defensible political actor.

A new UUID is justified only when the historical model concludes that the later actor is a distinct political identity, not merely because:

- an official title changed;
- a ruler adopted an imperial title;
- historians use a conventional period name;
- capitalization/transliteration differs;
- a constitutional state form changed while the underlying polity is treated as continuous.

The decision is historical and source-backed, never lexical.

## 3. Temporal designations / state forms

When one Polity remains continuous but its historically useful label changes, store the label as temporal metadata rather than creating a fake new country.

Conceptual model:

```text
Polity
  └─ Designation / State-form history
       ├─ label
       ├─ designation_type
       ├─ start / end
       ├─ confidence
       └─ sources
```

Useful `designation_type` values may include:

- `official_name`
- `state_form`
- `historiographic_period`
- `conventional_temporal_label`

Examples already flagged by the audit include:

- `New Kingdom of Egypt` as a historiographic/period label rather than automatically a separate Egypt Polity;
- `Swedish Empire` as a temporal/historiographic state-form label requiring normalization;
- `Empire of Japan` as a temporal state form/name under Japan continuity policy;
- early `Ottoman Empire` usage where the underlying Ottoman polity predates the later imperial state form.

The exact target identity still requires case-specific historical review; the schema must simply make a continuous-identity answer representable.

## 4. Duplicate aliases are not continuity relations

Cases such as:

- `Ming Dynasty` vs `Ming dynasty`;
- `Haudenosaunee Confederacy` vs `Iroquois Confederacy`;
- `Shakya` vs a duplicate/alias political identity when research establishes sameness;

are identity resolution/alias problems.

Do not preserve two UUIDs and connect them with `successor_of` merely because the database already contains both.

If they represent the same entity, merge/reconcile the identity and retain names as aliases/localized names.

## 5. Distinct Polities with diachronic relationships

When research concludes that predecessor and successor are genuinely distinct political actors, keep separate UUIDs and express the historical transition separately.

Conceptual model:

```text
polity_identity_relation_types
  code

polity_identity_relations
  predecessor_polity_id
  successor_polity_id
  relation_type
  transition time
  confidence
  sources
```

Candidate relation types should be added only when real data requires them, for example:

- `succeeds`
- `secedes_from`
- `formed_by_union_of`
- `splits_from`
- `annexed_into`

A `continues_as` relation should be used cautiously: if the historical conclusion is actually one stable Polity identity, the preferred model is one UUID plus temporal designation/state-form history rather than two UUIDs tied together forever.

## 6. Do not mix simultaneous hierarchy with diachronic identity

Example: RSFSR / USSR.

The reviewed audit explicitly says the union-level USSR becomes a new polity while the Russian Soviet republic continues as a constituent.

Therefore:

- `RSFSR constituent_of USSR` after union formation -> **Polity-to-Polity structural relation**;
- any pre/post Russian polity naming/continuity question -> **Polity identity/history**;
- this is not a simple `Soviet Russia renamed to Soviet Union` transition.

Identity and hierarchy are independent axes.

## 7. Contested continuity must remain unresolved in Authoring

Cases such as Roman/Byzantine identity are exactly why ATLAS must not force a binary answer prematurely.

Authoring may preserve:

- continuity model A;
- conventional separate-label model B;
- sources for each interpretation;
- a chosen Runtime policy when the project eventually adopts one.

The database should support uncertainty without duplicating contradictory Runtime rows as if both were simultaneously factual.

## 8. Current 28-row planning-signal reconciliation

The old master-ledger `polity_identity_model` queue contains 28 Activity rows. Explicit review separates them into five different classes.

### A. Temporal designation/state-form — 7 rows

- four `New Kingdom of Egypt` rows;
- Osman I / `Ottoman Empire` temporal state-form review;
- Christina of Sweden / `Swedish Empire`;
- Emperor Meiji / `Empire of Japan`.

These justify a temporal designation/state-form model, not automatic new Polity UUIDs.

### B. Duplicate/alias identity reconciliation — 5 rows

- Buddha / `Shakya` duplicate-alias case;
- two Yongle `Ming Dynasty` capitalization/name identities;
- Hiawatha `Haudenosaunee Confederacy` / `Iroquois Confederacy` pair.

These belong to UUID/name reconciliation, not continuity relations.

### C. Genuine continuity model review — 13 rows

- Hypatia Roman/Byzantine competing models — 3 rows;
- Kublai/Yuan/Northern Yuan transition family — 4 rows;
- Peter I Tsardom/Russian Empire — 3 rows;
- Maria I Kingdom of Portugal / United Kingdom of Portugal, Brazil and the Algarves — 3 rows.

The schema must support either one-identity temporal designation or distinct-identity transition depending on the final reviewed conclusion. No automatic rule is authorized.

### D. New union-level polity + constituent relation — 2 rows

- Lenin / Soviet Russia;
- Lenin / Soviet Union.

This is primarily the special combination of distinct union identity plus structural constituency described above, not a simple rename.

### E. False/not-primary identity signal — 1 row

- Harriet Tubman / United States: the current problem is temporal Person relation splitting. The United States Polity identity itself is not the issue.

Total: **28**.

## 9. Runtime naming

Runtime should resolve:

```text
Polity UUID + selected year -> preferred historical designation for that interval
```

without changing the underlying identity used by Territory, Person Activities, sources, or links.

This allows the UI to show the historically appropriate name/state form while preserving stable joins.

## 10. Territory interaction

Territory belongs to the stable Polity identity chosen by the reviewed model.

A state-form/name change does not require geometry duplication. Only a meaningful territorial change creates a new Territory Record interval.

If the continuity model instead establishes a genuinely new Polity, the successor receives its own Territory history from the transition point.

## 11. Schema direction

Do not implement one overloaded `successor_of` column on `polities`.

The eventual normalized model should separate:

1. stable Polity identity;
2. localized names/aliases;
3. temporal designation/state-form history;
4. diachronic identity relations between distinct Polities;
5. simultaneous Polity-to-Polity hierarchy;
6. Territory history.

This separation prevents name changes, constitutional changes, union formation, dependencies, and territorial change from corrupting one another.

## 12. Migration gate

Before Production schema migration:

1. choose project-level Runtime policy for Roman/Byzantine continuity;
2. resolve Yuan/Northern Yuan identity policy;
3. resolve Tsardom/Russian Empire and Portuguese 1815 state-form policy;
4. complete alias merges through the existing evidence/merge path;
5. define the shared temporal precision contract;
6. define provenance/source links for designations and identity relations;
7. test historical-name lookup without changing UUID identity.

Until then, uncertain cases remain Authoring/audit state rather than being flattened into new UUIDs by convenience.
