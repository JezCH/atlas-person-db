# POLITY-P2-01J — France 1830 Restoration / July Monarchy state-form boundary closure

**Status:** CLOSED  
**Date:** 2026-10-09  
**Scope:** France regime family — Second Bourbon Restoration exact end, July Monarchy state-form, coarse Lafayette Activity preservation

## 1. Historical adjudication

The French National Assembly's regime chronology gives:

- Second Bourbon Restoration: 1815-07-08 → 1830-08-02
- July Monarchy: 1830-08-02 → 1848-02-24

The Assembly's separate constitutional history distinguishes the events inside that transition: Charles X abdicated on 1830-08-02, the Charter revision was adopted during the following days, and Louis-Philippe accepted/swore the revised Charter as King of the French on 1830-08-09. ATLAS therefore keeps the broad **state-form/regime boundary** and the narrower **constitutional-regime oath boundary** as different semantic axes instead of forcing them into one date.

P2-01J intentionally does **not** revisit the already reviewed 1815-07-09 modeled start of the existing Second Restoration designation. The bounded correction concerns the previously year-only 1830 end.

## 2. Canonical modeling decision

### Second Bourbon Restoration state_form

Existing designation UUID is preserved:

`21d2913e-c71a-40e9-865c-2d8a3a421b15`

- Polity: stable France `1eaa48b6-dc60-49d6-91c4-49db556f4ddf`
- type: `state_form`
- modeled start: 1815-07-09, unchanged
- old end: `1830` / year granularity
- corrected end: **1830-08-02 / day / exact / Gregorian**
- existing EN/KO names preserved
- both prior normalized source links preserved
- official Assemblée nationale regime chronology added as provenance
- designation UUID, owner, type and names unchanged

### July Monarchy state_form

A separate broad July Monarchy state-form designation was added on the same stable France identity:

`f198409a-fc42-45e1-80c4-ec2d68903297`

- interval: **1830-08-02 → 1848-02-24**
- type: `state_form`
- confidence: `reviewed`
- preferred names:
  - EN: `July Monarchy (France)`
  - FR: `Monarchie de Juillet`
  - KO: `프랑스 7월 왕정`
- three normalized designation-source links

The pre-existing P2-01I July Monarchy `constitutional_regime` remains **1830-08-09 → 1848-02-24**. This is deliberate: 2 August is the broad regime transition boundary used by the National Assembly chronology, while 9 August is Louis-Philippe's constitutional oath. ATLAS does not invent a one-day gap between Restoration and July Monarchy state-form intervals.

## 3. Lafayette coarse Activity

Activity UUID:

`b0b8e81a-14d7-5497-b0a9-d201fd0f9c24`

remains exactly year-granularity **1827 → 1830**. Month/day are still NULL. No attempt was made to shorten it to 1830-08-02 or to fabricate day precision.

The public temporal designation read contract already requires a Person Activity interval to be fully contained by exactly one matching designation. Therefore a coarse year-only Activity spanning all of 1830 does not get falsely forced into a day-exact Restoration or July Monarchy label; it safely falls back to stable `France`.

## 4. Correction infrastructure added

PR #2218 introduced a bounded `rewrite_polity_designation` Correction v2 writer for source-backed temporal precision corrections.

Its invariants are:

- exact-before live bundle required;
- designation UUID immutable;
- owning Polity immutable;
- designation type immutable;
- designation names immutable;
- prior provenance may not be removed;
- only reviewed temporal metadata/notes and additive Source links may change;
- complete Person Activity fingerprint must remain identical before/after;
- serializable transaction + correction ledger/idempotent replay.

This avoids destructive delete/recreate behavior solely to correct a date boundary.

## 5. CI / Production application

### PR #2218

- merged squash SHA: `50f7fefcd47f41149c82213b0f99a1468feb7d4f`
- PR Integrity: **#37852084390 SUCCESS**

The first Production Correction attempt **#37852316406 attempt 1** failed at the request-validation gate with:

`CORRECTION_V2_EXECUTION_PLAN_ASSERTION_ONLY_SCOPE_INVALID`

This happened **before any database mutation**. The GitHub workflow had been updated to permit `assert_polity_designation`, but the deployed endpoint's `requireExecutionPlan()` whitelist still allowed only Source/Governance assertion-only plans.

### PR #2220 hotfix

- endpoint and workflow rules aligned
- regression test directly invokes `requireExecutionPlan(plan)`
- Integrity: **#37852473558 SUCCESS**
- merged squash SHA: `53c55bd9f98ee6f08e1d2acd3c00d8a19f34eeaf`
- Vercel Production deployment: **READY** at exact hotfix SHA

### Production retry

The failed Correction job only was retried after the fixed endpoint was live.

- Correction Apply **#37852316406 attempt 2 SUCCESS**
- dry-run SUCCESS
- apply SUCCESS
- Second Restoration rewrite committed
- July Monarchy state-form/source assertions committed

For the exact Second Restoration rewrite step:

- designation count: **57 → 57**
- designation-name count: **117 → 117**
- designation-source count: **102 → 103**
- Person Activity rows: **2495 → 2495**
- Activity fingerprint before: `98e1b9cb889d7bf99c95a97e5ef25d65`
- Activity fingerprint after: `98e1b9cb889d7bf99c95a97e5ef25d65`

No Person Activity mutation occurred.

Baseline A after application:

- Persons: 2120
- Polities: 1155
- Sources: 3305
- Activities: 2495
- Activity Source links: 3835
- baseline digest: `sha256:d2cb478063cfd7e65a6740ba1b145df5bfa3781a604058cbdaa7b9355bd60645`

## 6. Direct Production read-back

Connected Production Supabase was queried after the authenticated Correction run.

Verified:

1. Second Restoration designation UUID unchanged; end is now exact **1830-08-02**.
2. New July Monarchy `state_form` exists at exact **1830-08-02 → 1848-02-24**.
3. Existing Restoration EN/KO name row UUIDs and texts are unchanged.
4. New July Monarchy EN/FR/KO preferred names exist.
5. Both original Restoration Source links remain and the Assembly regime source was added.
6. New July Monarchy state-form has all three intended Source links.
7. Official Assembly regime Source exists as `official_government_reference`.
8. Lafayette Activity remains exactly 1827→1830 with year granularity, unchanged notes/source locator/content hash.

## 7. Runtime publication

Runtime Projection Compile:

**#37852774201 SUCCESS**

- Runtime SHA: `53c55bd9f98ee6f08e1d2acd3c00d8a19f34eeaf`
- Authoring SHA: same
- input rows: **2495**
- output rows: **2495**
- excluded: **0**
- published: **2495**
- `authoring_delta_since_compile = 0`
- `authoring_matches_active_compile = true`
- `projection_matches_active_compile = true`
- `publication_current = true`

P2-01J therefore satisfies Authoring → Compile → Runtime verification.

## 8. France-family status after P2-01J

The specific historical/data defect that opened P2-01J is **resolved**:

- no year-only 1830 Restoration end remains;
- broad July Monarchy state-form exists;
- constitutional 9 August boundary remains separately modeled;
- coarse Lafayette Activity remains honest rather than precision-fabricated.

The parent `france-regime-family` is **not marked FIXED**. Two known zero-Activity legacy Polities (the reintroduced Kingdom and Third Republic identities) remain live, and any retirement/deletion requires explicit user authorization under the project's non-destructive rule. P2-01J does not grant that authorization and performs no retirement/deletion.

Accordingly:

- `POLITY-P2-01J`: **CLOSED**
- `france-regime-family`: **REVIEW_REQUIRED / approval-gated residual**
- no further automatic France data mutation is authorized
- the next automatic historical-family review seed, after this response boundary, is **Macedon → Macedonian Empire**
- that next unit is not started in P2-01J
