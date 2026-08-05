# Normalized i18n Migration Workspace

## Purpose

This workspace governs the gradual migration from the current string-based `person_politics` structure to a normalized multilingual data model while preserving the existing production service, source data, and relationship integrity.

The migration must preserve:

- uninterrupted operation of the current UI and Supabase-backed authoring workflow;
- all existing source records and identifiers;
- all person–polity relationship semantics;
- deterministic and reversible transformation steps;
- explicit review of ambiguous identity or deduplication cases.

## Non-destructive migration rules

The following rules apply to Phase 1 and all later phases unless a later phase gate explicitly authorizes a controlled change.

1. Do not delete existing database tables.
2. Do not delete or rename existing JSON datasets.
3. Do not bulk-rewrite canonical names without an approved mapping and audit report.
4. Do not develop migration changes directly on `main`.
5. Do not switch the production UI read path before its phase gate passes.
6. Do not switch the Supabase write path before its phase gate passes.
7. Do not reuse, replace, or mutate existing UUIDs or row IDs.
8. Do not merge people or polities by name similarity alone.
9. Do not infer identity equivalence where the historical evidence or existing project records remain ambiguous.
10. Do not perform destructive cleanup as part of an additive migration phase.

## Operating principles

- additive migration
- backward compatibility
- deterministic transformation
- reversible commits
- fail closed
- one phase, one gate
- no destructive migration
- preserve legacy source keys
- stop on count, foreign-key, identity, or locale discrepancies

## Workspace layout

```text
migration/
  README.md
  MIGRATION_PLAN.md
  BASELINE_MANIFEST.json
  gates/
    PHASE_1_GATE.md
  reports/
    .gitkeep
  scripts/
    .gitkeep
```

Phase 1 creates only this isolated workspace. It does not modify runtime code, source datasets, database schema, deployment configuration, or production behavior.

## Rollback

Phase 1 is fully isolated on `agent/normalized-i18n-migration`. Rolling it back requires only deleting that branch. The `main` branch, Supabase schema, Vercel runtime, and current data files remain unchanged.
