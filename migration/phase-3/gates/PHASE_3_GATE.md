# Phase 3 Gate — Target Schema Definition

## Purpose

Define and verify the normalized multilingual target schema without deploying it or modifying production behavior.

## Authorized paths

- `migration/phase-3/**`
- `.github/workflows/phase-3-schema.yml`
- `migration/MIGRATION_PLAN.md`

## Required checks

- [ ] Phase 2 gate remains valid.
- [ ] Phase 3 branch starts from `ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580`.
- [ ] Existing production files changed: 0.
- [ ] Database changes: none.
- [ ] Runtime changes: none.
- [ ] Target schema fragments assembled deterministically.
- [ ] Required types and tables present.
- [ ] Required foreign keys and delete actions present.
- [ ] Year-zero prohibition present.
- [ ] Legacy-field coverage complete.
- [ ] Prohibited SQL and deployment operations absent.
- [ ] Two independent runs are byte-for-byte identical.
- [ ] Protected-scope check passes.
- [ ] Workflow uses read-only repository permissions.
- [ ] Workflow uses no database or deployment secrets.
- [ ] Artifact uploaded and verified.

## Automatic failure conditions

- SQL deployment or database connection occurs.
- Existing `schema.sql`, runtime, data, locale, deployment, or pre-existing workflow file changes.
- Target schema references legacy `public.person_politics` for mutation.
- Required legacy field has no target destination.
- Required table, type, constraint, or referential action is absent.
- Output is non-deterministic.
- Workflow writes to the repository or references secrets.

## Completion record

Status: PENDING

- Branch:
- Phase 2 closing SHA:
- Phase 3 implementation SHA:
- Phase 3 reports SHA:
- Phase 3 closing SHA:
- Workflow run ID:
- Workflow conclusion:
- Artifact ID:
- Artifact name:
- Artifact digest:
- Schema bundle SHA-256:
- Contract validation:
- Safety validation:
- Legacy coverage:
- Determinism:
- Protected scope:
- Existing production files changed:
- Database changes:
- Runtime changes:
- Gate result:
- Phase 4 authorized: no
