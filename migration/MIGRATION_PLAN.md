# Normalized Multilingual Data Migration Plan

## Phase 1 — Branch and baseline governance

- Create an isolated migration branch from the latest `main` commit.
- Record the immutable baseline commit.
- Establish non-destructive migration rules.
- Record the current runtime, dataset, locale, and schema paths.
- Define the protected scope that Phase 1 must not modify.

## Phase 2 — Baseline inventory and audit tooling

- Discover all canonical, supplemental, locale, correction, and non-timeline sources.
- Count source rows, normalized rows, people, polities, relationships, locale entries, duplicates, conflicts, and omissions.
- Build repeatable audit tooling.
- Generate machine-readable and human-readable baseline reports.
- Do not modify production data or runtime behavior.

## Phase 3 — Target schema definition

Define, but do not deploy, the normalized target model:

- `persons`
- `person_names`
- `polities`
- `polity_names`
- `person_politics_v2`
- role vocabulary
- period-basis vocabulary
- chronology claims
- localized descriptions
- source linkage and provenance

The SQL produced in this phase remains unapplied until its gate is approved.

## Phase 4 — Deterministic migration compiler

- Convert legacy JSON records into normalized entities and relationships.
- Preserve stable legacy source keys.
- Generate deterministic target identifiers.
- Produce ambiguity and collision reports instead of guessing.
- Verify that every accepted legacy relationship has exactly one target relationship.
- Stop on count loss, unresolved reference, duplicate identity, or locale conflict.

## Phase 5 — Supabase shadow schema

- Add new shadow tables alongside the existing schema.
- Keep `public.person_politics` unchanged and operational.
- Load compiled target records into the shadow schema.
- Validate foreign keys, uniqueness, source-key coverage, counts, and rollback readiness.

## Phase 6 — Compatibility read adapter

- Read v2 records and expose the current row-shaped interface.
- Keep the existing UI unchanged while comparing old and new read results.
- Produce deterministic diffs for names, political entities, periods, roles, notes, sorting, and row counts.
- Do not switch production reads during this phase.

## Phase 7 — Locale-aware UI read switch

- Implement locale fallback: exact locale → base language → English → canonical name.
- Switch read paths only after old/new parity gates pass.
- Verify search, sorting, filtering, details, desktop, mobile, public, and administrator views.
- Preserve rollback to the legacy reader.

## Phase 8 — Write-path migration

- Move create, update, and delete operations to transactional v2 writes.
- Preserve the existing meaning of deleting a person–polity activity relationship.
- Prevent partial creation of entities, names, and relationships.
- Roll back the entire transaction on any validation or persistence failure.
- Retain a controlled rollback path to legacy writes until the gate passes.

## Phase 9 — Legacy freeze and cleanup preparation

- Mark legacy datasets and tables read-only after proven parity.
- Define an archival and retention period.
- Produce a final deletion proposal and impact report.
- Do not delete legacy tables or files without a separate explicit approval.

## Global gate policy

Each phase must:

1. change only the scope authorized for that phase;
2. produce a documented gate result;
3. preserve reversibility;
4. stop before the next phase;
5. require explicit user authorization to continue.
