# Phase 3 — Target Schema Definition

## Scope

Phase 3 defines and validates the normalized multilingual target schema. It does not deploy SQL, modify Supabase, change runtime behavior, transform production data, or switch any read/write path.

## Authorized paths

- `migration/phase-3/**`
- `.github/workflows/phase-3-schema.yml`
- `migration/MIGRATION_PLAN.md`

## Baseline

- Phase 2 closing SHA: `ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580`
- Phase 1 immutable main SHA: `a8ed85b7cf8bf687450688eb7f2216c766112950`

## Outputs

- modular target SQL
- deterministic assembled SQL bundle
- schema contract
- legacy-field coverage contract
- prohibited-operation contract
- machine-readable validation reports
- human-readable schema summary
- Phase 3 gate evidence

## Explicitly prohibited

- executing SQL against any database
- modifying `schema.sql`
- modifying existing runtime/data/locale files
- changing Supabase or Vercel configuration
- introducing deployment or database secrets
- changing existing workflows
- generating random identifiers during validation

## Identifier policy

Target entities use deterministic UUIDv5 identifiers generated in Phase 4 from stable canonical keys. Phase 3 defines the columns and constraints only.

## Chronology policy

- BC years are negative integers.
- AD years are positive integers.
- Year zero is prohibited.
- Unknown years are `NULL`.
- Conflicting or approximate chronology is represented as claims, not silently collapsed.
