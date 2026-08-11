# ATLAS Stage 2 — R0 Reconciliation Decisions (2026-08-11)

> Status: REVIEW / PRE-CORRECTION ONLY
>
> Production DB mutation: **0**
>
> Purpose: resolve duplicate/competing current Activity rows before any historical Polity relink or chronology correction is applied.

## 1. Hard safety rule

No Activity row in R0 is deleted, merged, relinked, or rewritten from public display strings alone.

A destructive decision requires the normalized read-only inventory to prove at minimum:

- `activity_id`
- `person_id`
- `polity_id`
- `role_id`
- `period_basis_id`
- expected start/end
- child reference counts

If the exact Production SHA inventory endpoint is unavailable, the row remains `R0_PENDING_UUID_CLASSIFICATION`.

## 2. Classification model

R0 classifies each competing group as one of:

- `TRUE_ACTIVITY_DUPLICATE` — same normalized Person/Polity/Role/period-basis identity and same chronology; one relationship is redundant.
- `DUPLICATE_PERSON_IDENTITY` — surface rows match but Person UUIDs differ; route through Phase 9 person duplicate review/merge, not Activity deletion.
- `DUPLICATE_POLITY_IDENTITY` — surface polity labels represent duplicate Polity UUIDs; requires polity identity reconciliation before Activity deletion.
- `ROLE_VARIANT` — same context but distinct Role meaning; preserve unless historical review chooses one.
- `PERIOD_BASIS_VARIANT` — same context but different chronology semantics; preserve until semantics are resolved.
- `COMPETING_CORRECTION_ALTERNATIVES` — old and newer proposed models coexist; choose only after historical decision.
- `LEGITIMATE_PARALLEL_RELATIONS` — simultaneous offices/polities are historically real.
- `AGGREGATE_DERIVED_ROW` — a composite/aggregate convenience row duplicates more atomic polity relations and should normally not remain authoritative.
- `R0_PENDING_UUID_CLASSIFICATION` — normalized inventory not yet available.

## 3. Exact surface duplicate groups

The current public `v2-direct` read contains six exact semantic surface duplicate groups (12 rows). Until normalized UUID inventory succeeds, every pair remains locked as `R0_PENDING_UUID_CLASSIFICATION`.

### R0-D01 — Wu Zetian / Wu Zhou

- `75a124e8-df55-5247-aa48-dc9d7934c10e`
- `da809f25-40ff-5c27-b10b-88d4acc4070d`
- 690–705 / Emperor / reign

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`, but do not delete until Person/Polity/Role/period-basis UUID equality is proven.

### R0-D02 — Sejong the Great / Joseon

- `4263e4d0-a0a0-5803-a61b-85a57322db7e`
- `d1e0a5a6-31a1-5691-8d05-570dccdcad18`
- 1418–1450 / King / reign

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`; UUID proof required.

### R0-D03 — Mehmed II / Ottoman Empire

- `25ce2112-9b21-55dd-88d1-029153fc1a5a`
- `b0d35acc-9705-5b80-96bb-02616df72bcc`
- 1451–1481 / Sultan / reign

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`; UUID proof required.

### R0-D04 — Charles V / Holy Roman Empire

- `16ebebde-e4e4-553d-a520-00da68a276d2`
- `d641eec9-2770-5099-8017-8ec3bcc9244e`
- 1519–1556 / Holy Roman Emperor / reign

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`; retain separate Spanish Monarchy Activity as a legitimate parallel relation.

### R0-D05 — Simón Bolívar / Gran Colombia

- `05d7091a-5cfc-5ec0-9aa3-32461925e7c7`
- `caa526f9-220d-540c-93ea-d889f6d9b8cb`
- 1819–1830 / President and liberator / term

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`; separate Peru/Bolivia offices are legitimate parallel Activities.

### R0-D06 — Otto von Bismarck / German Empire

- `1ff585a7-c481-5d38-98ff-38381c81d961`
- `a8946a02-9235-5985-b882-0c7d60b555dd`
- 1871–1890 / Chancellor / term

Provisional expectation: likely `TRUE_ACTIVITY_DUPLICATE`; Bismarck's Prussian Minister-President relation must not be deleted and should ultimately overlap 1871–1890.

## 4. Competing alternatives — decisions that do not require guessing

### R0-C01 — Tokugawa Ieyasu

Rows:

- `7c315e1c-90c3-5199-a292-8f68ba69d4b2` — 1603–1605 — formal Shogun
- `79dc9310-cd56-5bed-9a35-fe5361bdf0b6` — 1603–1616 — broad compressed formal/de-facto row
- `400c78d5-a7e1-5ddb-83ef-91e0193db0f8` — 1605–1616 — retired de-facto ruler

Decision: `COMPETING_CORRECTION_ALTERNATIVES`.

Preferred historical shape after UUID inventory: preserve the formal 1603–1605 phase and retired/de-facto 1605–1616 phase; the 1603–1616 compressed row is a redundancy candidate. Final Polity target remains blocked on Japan/bakufu/domain layered-authority design.

### R0-C02 — Toyotomi Hideyoshi

- `61bf1687-9815-5844-9f98-02a558470b51` — Toyotomi Regime 1582–1598
- `7bd5741a-6b37-5b33-9512-40741e01b179` — Japan 1582–1598

Decision: `COMPETING_CORRECTION_ALTERNATIVES`.

Neither row is correction-ready: both compress the consolidation phase and nationwide rule. Historical split around the completion of national unification must be decided before either row is retired.

### R0-C03 — Peter I

- `57cdefa5-9a5d-533c-b229-47e398f1d07a` — Tsardom of Russia 1682–1721
- `eda26b64-2f59-5f15-954a-73404ceed064` — Russian Empire 1682–1725
- `9ec53325-3a97-58a8-a7e7-81a496a47e57` — Russian Empire 1721–1725

Decision: `COMPETING_CORRECTION_ALTERNATIVES` with a high-confidence back-projection defect in the 1682–1725 Russian Empire row.

The 1721 state-form/name continuity policy must be finalized before destructive cleanup.

### R0-C04 — Benjamin Franklin

- `5f8351b5-6a9e-56f4-b2d8-afbe83d42ef5` — Province of Pennsylvania 1757–1776
- `2a749964-c057-5671-bdaa-8388099b871d` — United States 1757–1790
- `8bcf4f15-65a5-5ce6-8ba3-e538fd0dca49` — United States 1776–1790

Decision: `COMPETING_CORRECTION_ALTERNATIVES`.

The U.S. 1757–1790 row is a clear political back-projection candidate. The other two rows are structurally preferable but Franklin's mobile diplomatic career still needs relation/place decomposition.

### R0-C05 — Haile Selassie I

- `953a4cac-b59d-58ed-a2e4-4b4e2aa058d8` — 1930–1936
- `62963919-b3d1-5f25-a399-24a33d5e8779` — 1930–1974
- `5045bbb3-a494-5d94-893b-28ee8b98c0d0` — 1941–1974

Decision: `PERIOD_BASIS_VARIANT` / `COMPETING_CORRECTION_ALTERNATIVES`.

Legal reign/claim and effective territorial control must be represented separately. Current public projection showing all three as reign cannot be used to delete any row safely.

### R0-C06 — Hypatia

- `aa5f6b18-e362-5421-9547-5ed0161d3cb8` — Roman Empire 393–395
- `c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa` — Roman Empire 393–415
- `3f0af453-7e55-5bf0-a8d8-6092788e28a6` — Byzantine Empire 395–415

Decision: `COMPETING_CORRECTION_ALTERNATIVES`.

The rows encode competing Roman/Byzantine continuity models. Do not delete until R2 continuity policy is fixed.

### R0-C07 — Maria I of Portugal

- `a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7` — Kingdom of Portugal 1777–1815
- `fefe572f-95f7-5913-86ed-304c7c2ca679` — Kingdom of Portugal 1777–1816
- `25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89` — United Kingdom of Portugal, Brazil and the Algarves 1815–1816

Decision: `COMPETING_CORRECTION_ALTERNATIVES`.

The 1777–1816 Portugal row overlaps the 1815 state-form alternative and should not survive unchanged if the 1815 transition is retained.

### R0-C08 — Kublai Khan

- `418d957a-1658-51a6-8b35-71757f712760` — Yuan 1260–1294
- `94dc0003-495b-58e6-abec-48860ee6d710` — Mongol Empire 1260–1271
- `d82b82dc-e263-5116-ae62-888452bc2655` — Yuan 1271–1294

Decision: `COMPETING_CORRECTION_ALTERNATIVES` + `LEGITIMATE_PARALLEL_RELATIONS`.

The 1260–1294 Yuan row is a back-projection candidate; Great-Khan authority and Yuan territorial government may legitimately overlap as distinct authority layers after 1271 rather than forcing a simple succession.

### R0-C09 — Hiawatha

- `2f2a2dfe-12b3-52b7-957e-42d6f7b89f2a` — Haudenosaunee Confederacy
- `9db8d593-a73c-5993-bfe6-b2b30ec71167` — Iroquois Confederacy

Decision: `DUPLICATE_POLITY_IDENTITY` candidate, not Activity deletion from display labels.

The two labels refer to the same confederacy context; normalized Polity UUID inventory must determine whether this is one identity with duplicate aliases or two Polity identities that must be reconciled.

### R0-C10 — Yongle Emperor

- `d1630b88-d82b-5c5e-a7a1-195bf9661465` — Ming Dynasty
- `b5e49aa2-44b9-5b1c-bc84-a2650d946ef5` — Ming dynasty

Decision: strong `DUPLICATE_POLITY_IDENTITY` candidate caused by name/capitalization identity drift. Do not delete either Activity until underlying Polity UUIDs are compared.

### R0-C11 — Nzinga Mbande

- `34ed5d1e-b93b-5955-b5e9-2edbc4ffaf8d` — Kingdom of Ndongo
- `af14645b-de83-5d35-a977-eb7afce17710` — Kingdoms of Ndongo and Matamba
- `d4b59923-f1a5-531d-a70f-42ffac486c85` — Kingdom of Matamba

Decision: `AGGREGATE_DERIVED_ROW` candidate for the combined row; preserve the two atomic polity relations pending claimed/effective-control review.

### R0-C12 — Edward Teach

- `68b05da1-42cb-5dc7-b584-179aceceebb4` — Nassau Pirate Republic
- `b43cfb03-3d45-5566-a7d8-cabb37c93115` — Republic of Pirates

Decision: `DUPLICATE_POLITY_IDENTITY` / weak-polity research candidate. Both describe the same loosely organized Nassau pirate community under competing labels; no authoritative deletion until polity-status research and UUID reconciliation finish.

## 5. High-confidence R1 corrections that remain blocked only by R0/before-state verification

The following findings are already strong enough to become correction decisions once normalized before-state UUIDs are captured:

- Charles de Gaulle: `French Fifth Republic` is regime context; Person–Polity target should be France/French Republic with relation `rules`.
- Bismarck: Prussian Minister-President relation must continue through 1890 and overlap German chancellorship.
- Benjamin Franklin: United States must not be back-projected to 1757.
- Peter I: Russian Empire must not be back-projected to 1682 if 1721 temporal state-form naming is retained.
- Kublai: Yuan must not be back-projected to 1260 if the Yuan naming/state-form boundary remains 1271.
- Hypatia: Production must not retain both competing 395 transition models as simultaneously authoritative.
- Toyotomi Hideyoshi: 1582–1598 one-row nationwide model is too coarse and requires historical split.

These are **not yet apply manifests**.

## 6. Current operational blocker

The normalized R0 inventory endpoint was merged to `main`, but the exact main SHA Production deployment has not become live because Vercel reports a build-rate-limit failure. The first read-only workflow run therefore received 404 for the full retry window.

This is an infrastructure/deployment blocker, not evidence that any requested Activity UUID is invalid.

Do not weaken the exact-SHA OIDC boundary and do not use the older Production deployment as a substitute for normalized destructive evidence.

## 7. R0 completion gate

R0 becomes complete only when:

1. the exact Production SHA containing the read-only audit route is deployed;
2. `ATLAS Audit Inventory` succeeds for the reviewed 53 Activity UUIDs;
3. its artifact is archived with digest;
4. each group above is assigned a normalized classification using actual Person/Polity/Role/Period-basis UUIDs;
5. destructive candidates list exact survivor/delete/relink UUIDs and child-reference preservation requirements;
6. all unresolved groups remain explicitly `DEFER` rather than receiving inferred mutations.
