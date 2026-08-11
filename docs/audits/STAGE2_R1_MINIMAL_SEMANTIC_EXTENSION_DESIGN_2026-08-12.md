# ATLAS Stage 2 R1 — Minimal Semantic Extension Design (2026-08-12)

> Status: DESIGN ONLY — NO SCHEMA MIGRATION / NO PRODUCTION MUTATION
>
> Scope: only capabilities proven necessary by current audited R1 cases. Do not pre-build the full future atlas ontology here.

## 1. Current schema fact

`atlas_v2.person_politics_v2` currently stores:

- `person_id`
- `polity_id`
- nullable `role_id`
- `period_basis_id`
- integer `activity_start`
- integer `activity_end`
- confidence / chronology status / source/provenance fields

The current schema has **no explicit Person–Polity relation kind**, **no durable regime/government context**, and **no month/day boundary fields**.

This is why some historically certain R1 corrections cannot be represented without information loss.

---

## 2. Principle: do not add schema because a concept exists; add it because a reviewed correction cannot be expressed safely without it

Current audited blockers prove three missing semantic capabilities:

1. relation meaning (`rules`, `serves`, `active_in`, etc.);
2. governance context distinct from Polity identity (`Fifth Republic`, `Ganden Phodrang`, bakufu/regime cases);
3. sub-year chronology precision for terms that start/end within the same calendar year.

R2/R3 polity continuity, parent/constituent, vassal/overlord, and layered territorial control remain separate later work. They are **not** prerequisites for the first R1A corrections.

---

## 3. Minimal extension A — explicit Person–Polity relation kind

### Why it is required

The same `Person -> Polity` link means different things on the map:

- Justinian I -> Byzantine Empire = territorial rule;
- Belisarius -> Byzantine Empire = service;
- Gandhi -> British Raj / India = political activity/opposition, not rule;
- Aung San Suu Kyi -> Myanmar = opposition leadership before 2016, government leadership in 2016–2021;
- Joan of Arc -> Kingdom of France = service;
- a pretender may claim rule without effective rule.

A Role label alone is insufficient because map behavior must not be inferred from free text.

### Minimal vocabulary

Start with a deliberately small controlled set:

- `rules` — sovereign/personal territorial ruling authority;
- `governs` — head-of-government / executive governing authority where the Polity remains the governed political community;
- `serves` — official/military/administrative service to the Polity;
- `active_in` — historically significant activity in the Polity without office/rule;
- `opposes` — political/military opposition to the Polity/order;
- `claims_rule` — claimed/pretender authority not equivalent to effective rule.

Do not add dozens of specialized relation codes until real data requires them.

### Schema direction

Preferred: controlled vocabulary table rather than unchecked text.

Conceptually:

```sql
relation_types(id uuid, code text unique, is_active boolean)
person_politics_v2.relation_type_id uuid not null
```

Migration must not guess relation type from role strings. Existing rows are backfilled from the completed semantic audit / reviewed batches only; unresolved rows remain explicitly deferred until reviewed.

### Identity/collision rule

Once introduced, `relation_type_id` becomes part of Activity semantic identity/collision checks. Otherwise the system could incorrectly coalesce two distinct simultaneous relationships.

---

## 4. Minimal extension B — governance context distinct from Polity

### Why it is required

Examples:

- Charles de Gaulle -> France/French Republic, with `Fifth Republic` as constitutional regime;
- Ngawang Lobsang Gyatso -> Tibet, with `Ganden Phodrang` as government;
- Tokugawa cases may require Japan + bakufu/government context once the layered-authority model is resolved.

If these names are kept only in notes, the information becomes unqueryable and cannot later drive map/detail UI. If they remain primary Polities, territorial identity is distorted.

### Minimal entity

Use one temporal governance-context entity instead of prematurely creating separate tables for every historical concept.

Conceptually:

```text
polity_governance_contexts
- id
- polity_id
- context_type
- canonical_name_en
- display_name_ko
- start_year
- end_year
- historicity/confidence as needed
```

Initial `context_type` should stay narrow:

- `regime`
- `government`
- `state_form`
- `administration`

Do **not** automatically place Dynasty/House/Clan here. Those may later deserve their own reusable entities and relations.

### Activity linkage

A Person Activity may optionally reference the governance context in force for that office. The primary `polity_id` remains the map-level political community.

---

## 5. Minimal extension C — sub-year chronology without replacing BCE-safe integer years

### Why SQL `date` should not replace the current year model globally

ATLAS stores BCE years as integers and must support ancient chronology, uncertain dates and year-only evidence. Replacing all chronology with ordinary SQL dates would introduce unnecessary BCE/year-zero/precision complexity.

### Minimal compatible design

Keep the current integer years and add optional boundary detail:

```text
activity_start integer          -- existing, required
activity_start_month smallint?   -- 1..12
activity_start_day smallint?     -- 1..31
activity_start_precision         -- year | month | day

activity_end integer             -- existing, required
activity_end_month smallint?
activity_end_day smallint?
activity_end_precision           -- year | month | day
```

`chronology_status` continues to represent historical certainty/status; precision is a different concept.

Examples:

- ancient reign known only to year: `1946`, no month/day, precision `year`;
- Yoshida first premiership end: `1947-05-24`, precision `day`;
- later Yoshida premiership start: `1948-10-15`, precision `day`.

### Year-only runtime policy

When UI resolution is one calendar year, a Person Activity is visible if its exact interval intersects that year. Multiple officeholders may therefore appear in a transition year. This is more honest than inventing one arbitrary annual snapshot.

Territory geometry may later choose a separate exact-date/snapshot policy; do not force Person chronology to solve Territory chronology prematurely.

---

## 6. Correction engine expansion order

Do not expand correction v1 until R0 duplicate coalescing has been proven against Production.

After R0 proof, expand in the smallest useful increments.

### v1.1 — enough for R1A only

- `update_activity`
- source-preserving `retire_activity`

Required invariants:

- exact UUID + expected before-state row locks;
- SERIALIZABLE transaction;
- source/description/chronology child handling defined explicitly;
- dry-run rollback before apply;
- idempotent ledger result;
- post-apply cardinality and UUID verification.

This is enough for:

- Bismarck Prussia 1862–1890;
- Franklin back-projected U.S. alternative retirement;
- Muhammad pre-622 Medina alternative retirement.

### v1.2 / semantic migration

Only after relation/governance/precision schema exists:

- `relink_activity`
- `split_activity`
- `set_relation_type`
- optional governance-context binding
- sub-year boundary updates

This unlocks de Gaulle, Gandhi, Aung San Suu Kyi, Yoshida and later relation-fix cases.

---

## 7. Explicit non-goals for this stage

Do not yet implement:

- generic Polity merge/rename from display strings;
- `parent_polity_id` shortcut;
- broad dynasty/house/culture ontology;
- territorial geometry schema changes;
- automatic role -> relation inference;
- automatic year -> exact-date fabrication;
- R2 Roman/Byzantine, Russia state-form, Yuan continuity merges;
- R3 bakuhan, colonial, vassal, late-Han layered-sovereignty resolution.

Those require separate evidence and relation design.

---

## 8. Recommended release sequence

1. **R0 Production proof** — 6 true duplicate Activity coalesces.
2. **Correction v1.1** — add only safe `update_activity` + source-preserving `retire_activity`.
3. **R1A apply** — Bismarck, Franklin, Muhammad.
4. **Semantic migration** — relation type + governance context + optional sub-year boundary precision.
5. **R1B apply** — de Gaulle, Gandhi, Aung San Suu Kyi, Yoshida and other already-audited relation/chronology fixes.
6. **R2/R3 design/apply** — polity continuity and layered sovereignty.
7. Re-run full current Production semantic coverage after every bounded change set.

This sequence minimizes schema churn and prevents the audit from turning into another full-system rewrite.
