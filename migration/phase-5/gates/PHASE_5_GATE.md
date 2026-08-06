# Phase 5 Gate — Supabase Shadow Schema

## Purpose

Create and load an isolated `atlas_v2` shadow schema without changing `public.person_politics`, UI behavior, runtime readers, or production write paths.

## Authorized paths

- `migration/phase-5/**`
- `.github/workflows/phase-5-shadow-dry.yml`
- `.github/workflows/phase-5-shadow-apply.yml`
- `supabase/migrations/20260806_phase5_atlas_v2_shadow.sql`

## Required checks

- [x] Phase 4 gate remains valid.
- [x] Branch starts from `3093cdd558e879338fdab31586eafbcf2cace217`.
- [x] Dry bundle is deterministic across two independent runs.
- [x] Deployment SQL creates only `atlas_v2` objects.
- [x] Rollback SQL is complete and guarded.
- [x] Legacy table mutation patterns are absent.
- [x] Expected Phase 4 counts are encoded exactly.
- [x] Required table, FK, UNIQUE, CHECK, index, RLS and privilege contracts pass.
- [x] Dry workflow uses `contents: read`, no database secret and no repository write.
- [x] Dry artifact uploaded and verified.
- [x] Apply workflow is `workflow_dispatch` only and validates exact authorization inputs.
- [x] Apply uses a single database transaction and advisory lock.
- [x] `atlas_v2` load counts match compiled counts.
- [x] `legacy_source_key` coverage is 349/349 and null count is 0.
- [x] Reference integrity, UUID collision and duplicate-key validation passed in the Phase 4 compiler and Phase 5 dry validator.
- [x] `public.person_politics` was not mutated by the deployment SQL; the post-apply verification recorded 319 legacy rows.
- [x] RLS enabled and `public`, `anon`, and `authenticated` privileges revoked from shadow objects.
- [x] Rollback readiness passes.
- [x] Apply artifact uploaded and verified.
- [x] Existing production application and legacy data files changed: 0.
- [x] Runtime reader and write-path changes: none.

## Verified counts

| Object | Rows |
|---|---:|
| `atlas_v2.persons` | 303 |
| `atlas_v2.polities` | 211 |
| `atlas_v2.person_politics_v2` | 349 |
| `atlas_v2.person_names` | 599 |
| `atlas_v2.polity_names` | 407 |
| `atlas_v2.roles` | 149 |
| `atlas_v2.sources` | 20 |
| Distinct `legacy_source_key` | 349 |
| Null `legacy_source_key` | 0 |
| `public.person_politics` after apply | 319 |

## Bundle evidence

- Schema SHA-256: `4da823489e560e430730c2ba30a4322ff0f69073c34ca4a369bbd573f551e1a5`
- Data SHA-256: `8bc1c126e1e44a106f7edf0ebdb7080713176f5a224cbaf3c9937995d5866f8d`
- Rollback SHA-256: `9c2d62238b0022fbdda6b0228dfcbe1200dedf7b9759d481f5055d01e7c161b8`
- Marker: `FULL_SHADOW_LOAD`
- Apply log ended with `COMMIT`.

## Completion record

Status: **PASS — FORMALLY CLOSED**

- Branch: `agent/phase5-shadow-schema`
- Phase 4 closing SHA: `3093cdd558e879338fdab31586eafbcf2cace217`
- Phase 5 governance SHA: `e7549e6179cf9fa5ac0227d418004e886d405f2c`
- Dry implementation SHA: `f1cc2a495c883367dd879befeaa00fd1f8c47be6`
- Dry workflow run ID: `31054044721`
- Dry workflow conclusion: `success`
- Dry artifact ID: `8949547140`
- Dry artifact digest: `sha256:a7f88cf80e2f4308bb90a8f527d2d09443feb5a3cb30c346f2f662c9fcea8835`
- Apply workflow definition SHA: `6e6a86ce8a5f134f5ccce62a4270f1f7df6f237b`
- Apply workflow run ID: `31067507081`
- Apply workflow conclusion: `success`
- Apply artifact ID: `8954361545`
- Apply artifact digest: `sha256:601fad94d7b51beae6970af3e5608ab4da9cf2f559771dfc5577d4dc6c285a5e`
- Database target: Supabase PostgreSQL through the Session Pooler stored in the protected `phase-5-shadow` GitHub Environment.
- Shadow schema created: `atlas_v2`
- Legacy table mutation: none in deployment SQL
- Gate result: `PASS`
- Phase 6 authorized: `yes`

## Scope note

Phase 5 did not switch production reads or writes to `atlas_v2`. The existing application continues to use the legacy runtime path until Phase 6 introduces and validates a compatibility adapter and controlled reader transition.
