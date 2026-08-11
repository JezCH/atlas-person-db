# ATLAS Polity-to-Polity Relation Contract v1

> Status: STAGE 2 DOMAIN CONTRACT / AUDIT ONLY
>
> Production DB mutation: **none**

## 1. Purpose

ATLAS needs to represent political entities that coexist in hierarchical or composite political orders without collapsing them into one polygon or pretending every subordinate authority is an independent sovereign state.

Examples include:

- a constituent republic inside a union;
- a dominion or colonial dependency under an imperial order;
- a vassal kingdom under an empire;
- a tributary polity;
- a member polity in a confederation;
- regional authorities that retain nominal relation to a parent polity while exercising substantial de facto territorial power.

The relation is between **Polity identities**, not between Person and Polity and not between polygons.

## 2. Separate three different problems

### A. Person–Polity relation

```text
Person -> Polity
rules / governs / serves / active_in / opposes / claims_rule
```

This describes what the person does in relation to a polity.

### B. Polity–Polity structural relation

```text
subordinate / constituent Polity -> parent / overlord Polity
```

This contract covers this problem.

### C. Territory/control relation

```text
Territory Record
  direct_control / overlordship / tributary / occupation / contested / claimed / influence ...
```

This describes spatial control and must remain separate from constitutional/political identity relations.

A vassal relation may influence map rendering, but it does not make the vassal's entire geometry a direct-control polygon of the overlord.

## 3. Temporal directional relation

Recommended conceptual structure:

```text
polity_relation_types
  id
  code
  category
  inverse_code
  is_active

polity_relations
  id UUID
  subject_polity_id
  object_polity_id
  relation_type_id
  start / end temporal interval
  confidence
  notes
  provenance / sources
```

Interpretation:

```text
subject --relation_type--> object
```

Examples:

```text
RSFSR --constituent_of--> Soviet Union
Dominion of Canada --dominion_of--> British imperial polity/order
vassal kingdom --vassal_of--> Han polity
```

Only the canonical direction is stored. The inverse is derived from `inverse_code`; do not create redundant mirror rows such as both `vassal_of` and `overlord_of` for the same fact.

## 4. Use a vocabulary table, not a hard SQL enum

Historical political relations are too varied to freeze into a tiny SQL enum. The schema should provide a controlled vocabulary table whose codes can expand without structural migration.

Initial relation codes should be added only when real reviewed data needs them. The first likely vocabulary includes:

- `constituent_of`
- `dominion_of`
- `colonial_dependency_of`
- `vassal_of`
- `tributary_to`
- `protectorate_of`
- `member_of_confederation`

Possible categories for Runtime grouping:

- `constituent`
- `dependency`
- `suzerainty`
- `confederation`

This preserves specific historical/legal terminology while still allowing Runtime to group related structures.

## 5. Do not put every historical relationship into this table

The following belong elsewhere.

### Polity identity / continuity

- rename
- state-form change
- successor/continuity question
- Roman / Byzantine identity
- Tsardom / Russian Empire
- Soviet Russia naming/continuity before and after union formation

These belong to the Polity identity/transition model, not ordinary simultaneous hierarchy.

### Territory

- occupied_by
- claimed_by
- direct_control
- contested
- sphere of influence

These belong to Territory Records.

### Person holding multiple crowns

A personal union does not automatically require a permanent parent-child relation between the crowns. If one Person independently `rules` two valid Polities, that fact is already represented by two Person Activities.

A dedicated `personal_union_with` relation can be added later if the map/query use case requires the union itself to be searchable. Do not invent it merely because two rows share a monarch.

### Historiographic aggregates

Labels such as `North Sea Empire`, combined `Kingdoms of Ndongo and Matamba`, or an aggregate imperial label may be derived/composite presentation objects rather than a third Polity. Resolve aggregate policy before creating structural relations around them.

## 6. Late-Han and similar regional authority cases

Late Eastern Han data demonstrates why a Polity relation model is necessary but also why it cannot replace historical research.

A regional governor/warlord may simultaneously:

- hold a Han title;
- nominally remain within the Han order;
- exercise de facto territorial authority over one or more provinces;
- change allegiance or autonomy through time.

The correct ATLAS model is not:

```text
Person -> Eastern Han -> rules
```

and not automatically:

```text
Person -> invented independent kingdom
```

Instead, where evidence supports a map-level regional political authority:

```text
Person -> regional Polity/authority -> rules/governs
regional Polity -> reviewed structural relation -> Eastern Han
regional Polity -> its own Territory Records
```

Exact target Polity identities and relation types remain research items. The structural table makes the historically correct answer representable without forcing it in advance.

## 7. Layered Japan

Kamakura and Tokugawa cases show simultaneous authority layers:

- broader Japan political identity;
- bakufu/shogunal government;
- domains/regional polities;
- imperial/court legitimacy and offices.

Governance Context handles the government/regime identity. Polity Relations handle actual political-unit hierarchy when the research establishes it. Territory handles direct versus superior/overlord authority.

No single `Japan -> shogunate -> domain` hierarchy is hard-coded before the historical model is reviewed.

## 8. Current 26-row planning-signal reconciliation

The master ledger currently flags 26 Activity rows with `polity_relation_model`. That number came from broad audit-text keyword extraction and is a work queue, not proof that all 26 need new relation rows.

Explicit reconciliation groups them into:

### Structural-relation model relevant — 18 rows

These cases need, or plausibly require after target-polity research, an explicit simultaneous hierarchy/constituency/dependency representation:

- Ying Bu / Western Han dependent-vassal kingdom context;
- seven late-Han regional-authority rows;
- Hōjō Tokimune / Kamakura layered authority;
- Fang Guozhen and Bolad Temur / Yuan regional authority;
- three Tokugawa Ieyasu layered-authority rows;
- Wilfrid Laurier / Dominion of Canada;
- Mahatma Gandhi / British Raj colonial/dependent polity context, though relation/chronology correction also remains;
- Lenin's Soviet Russia and Soviet Union pair, where the RSFSR becomes a constituent of the union rather than disappearing by simple rename.

`model relevant` does **not** mean the exact relation row is already approved. Regional-authority and Japanese cases remain research-gated.

### Not proven to require a core Polity relation — 8 rows

- Cunobeline / Catuvellauni — current flagged issue is chronology/research, not an approved parent-child relation;
- Trung Trac / Trung Sisters' Realm — underlying polity relabel/research;
- Muhammad / Medinan Polity — evolving territory/spatial context, not a proved parent-child relation;
- Charles V / Spanish Monarchy — valid composite monarchy Person relation; no new parent relation is required merely by this Activity;
- Philip II / Spanish Monarchy and Kingdom of Portugal — multiple crowns/person relations can coexist without inventing a structural parent relation;
- Maria Theresa / Habsburg Monarchy — current Activity is kept; internal composite-monarchy structure can be modeled later if map queries require it;
- Nzinga / combined Kingdoms of Ndongo and Matamba — aggregate/composite row needs aggregate policy rather than automatic parent-child creation.

## 9. Soviet Russia / Soviet Union example

The reviewed data explicitly distinguishes:

- Soviet Russia as a valid polity before USSR formation;
- Soviet Union as a new union-level polity from 1922;
- the Russian Soviet republic continuing as a constituent rather than being simply renamed into the USSR.

Therefore two concepts are required:

1. Polity identity/continuity history for the Russian polity;
2. a temporal `constituent_of` structural relation from the Russian republic to the USSR after union formation.

This is why `successor_of` must not be used as a substitute for structural constituency.

## 10. Runtime behavior

Default map rendering remains direct/effective territorial control.

Polity relations may enable optional layers such as:

- constituents;
- dependencies;
- vassals;
- tributaries;
- confederation members.

Runtime must not visually merge subordinate geometry into direct territory unless the Territory interpretation policy explicitly says so.

## 11. Authoring behavior

Authoring must allow:

- uncertain relation start/end;
- changing relation type over time;
- disputed dependency status;
- multiple simultaneous relations where historically real;
- relation known while geometry remains unknown;
- source-level disagreement.

## 12. Schema gate

Before implementing `polity_relations` in Production:

1. finish exact target research for regional-authority cases;
2. finish the Japan/bakufu/domain authority decision;
3. finish Polity identity/continuity contract so temporal succession is not mixed into hierarchy;
4. align temporal precision with Activity/Governance/Territory intervals;
5. define source/provenance contract;
6. test cycle prevention and invalid self-relations where applicable;
7. test clean-schema migration and rollback.

The table is justified now as a domain requirement, but data backfill must remain source-reviewed and relation-specific.
