# Phase 3 Gate — Target Schema Definition

## Purpose

Define and verify the normalized multilingual target schema without deploying it or modifying production behavior.

## Authorized paths

- `migration/phase-3/**`
- `.github/workflows/phase-3-schema.yml`
- `migration/MIGRATION_PLAN.md`

## Required checks

- [x] Phase 2 gate remains valid.
- [x] Phase 3 branch starts from `ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580`.
- [x] Existing production files changed: 0.
- [x] Database changes: none.
- [x] Runtime changes: none.
- [x] Target schema fragments assembled deterministically.
- [x] Required types and tables present.
- [x] Required foreign keys and delete actions present.
- [x] Year-zero prohibition present.
- [x] Legacy-field coverage complete.
- [x] Prohibited SQL and deployment operations absent.
- [x] Two independent runs are byte-for-byte identical.
- [x] Protected-scope check passes.
- [x] Workflow uses read-only repository permissions.
- [x] Workflow uses no database or deployment secrets.
- [x] Artifact uploaded and verified.

## Automatic failure conditions

- SQL deployment or database connection occurs.
- Existing `schema.sql`, runtime, data, locale, deployment, or pre-existing workflow file changes.
- Target schema references legacy `public.person_politics` for mutation.
- Required legacy field has no target destination.
- Required table, type, constraint, or referential action is absent.
- Output is non-deterministic.
- Workflow writes to the repository or references secrets.

## Completion record

Status: PASS

- Branch: `agent/phase3-target-schema`
- Phase 2 closing SHA: `ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580`
- Phase 3 implementation SHA: `c17c3e3f132dd2e32bdaf70992e41e116e36bfd0`
- Phase 3 reports SHA: `f0ab3a5d625d3603ff67970248b0a8fae1098fa6`
- Workflow run ID: `31019525433`
- Workflow conclusion: `success`
- Artifact ID: `8935968614`
- Artifact name: `phase-3-schema-reports-c17c3e3f132dd2e32bdaf70992e41e116e36bfd0`
- Artifact digest: `sha256:598d262e1bdcfa187faaa06f5d5a2855fa5c169dd0eea43a0290f429efcbdc5c`
- Schema bundle SHA-256: `b9f63fb2b5f1b87816b084a10588e54854d1ce51b0871330c05b53bd8deaa65d`
- Contract validation: `PASS` — 18 required tables, 10 required types, 11 required fragments, 0 failures
- Safety validation: `PASS` — 0 violations
- Legacy coverage: `PASS` — 10 mapped fields, 0 failures
- Determinism: `PASS`
- Protected scope: `PASS`
- Existing production files changed: `0`
- Database changes: `none`
- Runtime changes: `none`
- Gate result: `PASS`
- Phase 4 authorized: no
