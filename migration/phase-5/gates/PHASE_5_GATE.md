# Phase 5 Gate — Supabase Shadow Schema

## Purpose

Create and load an isolated `atlas_v2` shadow schema without changing `public.person_politics`, UI behavior, runtime readers, or production write paths.

## Authorized paths

- `migration/phase-5/**`
- `.github/workflows/phase-5-shadow-dry.yml`
- `.github/workflows/phase-5-shadow-apply.yml`
- `supabase/migrations/20260806_phase5_atlas_v2_shadow.sql`

## Required checks

- [ ] Phase 4 gate remains valid.
- [ ] Branch starts from `3093cdd558e879338fdab31586eafbcf2cace217`.
- [ ] Dry bundle is deterministic across two independent runs.
- [ ] Deployment SQL creates only `atlas_v2` objects and transaction-local temporary objects.
- [ ] Rollback SQL is complete and guarded.
- [ ] Legacy table mutation patterns are absent.
- [ ] Expected Phase 4 counts are encoded exactly.
- [ ] Required table, FK, UNIQUE, CHECK, index, RLS and privilege contracts pass.
- [ ] Dry workflow uses `contents: read`, no database secret and no repository write.
- [ ] Dry artifact uploaded and verified.
- [ ] Apply workflow is `workflow_dispatch` only and validates exact authorization inputs.
- [ ] Apply uses a single database transaction and advisory lock.
- [ ] `atlas_v2` load counts match compiled counts.
- [ ] `legacy_source_key` coverage is 349/349 and null count is 0.
- [ ] Orphan and duplicate checks return 0.
- [ ] `public.person_politics` row count and fingerprint are unchanged before/after.
- [ ] RLS enabled and anon/authenticated have no access.
- [ ] Rollback readiness passes.
- [ ] Apply artifact uploaded and verified.
- [ ] Existing production files changed: 0.
- [ ] Runtime changes: none.

## Automatic failure conditions

- Any mutation of `public.person_politics` or a pre-existing public object.
- Creation of Phase 5 target tables outside `atlas_v2`.
- Partial load, count loss, source-key loss, orphan, UUID collision, or duplicate natural key.
- Non-transactional apply or missing advisory lock.
- Wrong branch, commit, artifact digest, target project, or confirmation token.
- Public/anonymous access to shadow objects.
- Secret leakage to logs or artifacts.
- Workflow push or repository write.

## Completion record

Status: IN PROGRESS — DRY PREPARATION

- Branch: `agent/phase5-shadow-schema`
- Phase 4 closing SHA: `3093cdd558e879338fdab31586eafbcf2cace217`
- Phase 5 governance SHA: `e7549e6179cf9fa5ac0227d418004e886d405f2c`
- Dry implementation SHA:
- Dry workflow run ID:
- Dry workflow conclusion:
- Dry artifact ID:
- Dry artifact digest:
- Apply authorization SHA:
- Apply workflow run ID:
- Apply workflow conclusion:
- Apply artifact ID:
- Apply artifact digest:
- Database target:
- Shadow schema created:
- Legacy table unchanged:
- Gate result: PENDING
- Phase 6 authorized: no
