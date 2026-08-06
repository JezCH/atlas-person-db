# Phase 8A — Dependency and Object Inventory

Status: IN PROGRESS / NON-DESTRUCTIVE

## Objective

Build a complete repository and live-database dependency inventory before any legacy, compatibility, fallback, rollback, or write-path retirement work begins.

## Authorized scope

- repository reference inventory
- application read/write dependency inventory
- API and serverless dependency inventory
- workflow and migration-script inventory
- administrator-tool inventory
- rollback and fallback inventory
- live database object, privilege, function, trigger, policy, and dependency inventory in read-only mode
- machine-readable and human-readable evidence

## Prohibited scope

- no application behavior change
- no production source change
- no write-path change
- no schema mutation
- no grant or RLS mutation
- no compatibility-view mutation or deletion
- no legacy-table mutation or deletion
- no fallback or rollback removal
- no automatic duplicate merge
- no automatic Korean-name promotion

## Repository inventory targets

Search and classify references to:

- `public.person_politics`
- `person_politics`
- `public.atlas_person_politics_compat_v1`
- `atlas_person_politics_compat_v1`
- `atlas_v2.`
- `DATA_SOURCE`
- `v2-shadow`
- `legacy`
- fallback and rollback controls
- administrator mutation calls
- API and serverless database calls
- Vercel configuration
- workflow secrets and protected environments
- migration and audit scripts

Every finding must include:

- path
- line number
- matched token
- category
- access mode: read, write, control, migration, evidence, documentation, or unknown
- retirement relevance

## Live database inventory targets

Read-only inspection must report:

- relations in `public` and `atlas_v2`
- object types and owners
- views and materialized views
- view definitions
- functions and procedures
- triggers
- RLS-enabled tables
- policies
- grants for `anon` and `authenticated`
- dependencies involving `public.person_politics`
- dependencies involving `public.atlas_person_politics_compat_v1`
- dependencies involving `atlas_v2` objects
- row counts for approved baseline objects

## Acceptance criteria

Gate 8A may close only when:

- repository inventory executes deterministically
- live SQL runs inside a read-only transaction
- machine-readable reports are generated
- unresolved references are explicitly listed
- no destructive action occurs
- evidence artifacts are preserved
- the next gate recommendation is based on actual dependency counts

## Baseline

- Phase 7 closure merge SHA: `e94f6c085021660225b67ba67d07d82be7e37c05`
- production reads: `v2-shadow`
- production writes: `public.person_politics`
- compatibility view: `public.atlas_person_politics_compat_v1`
- fallback and rollback target: `legacy`
- approved Phase 7 counts: legacy `319`, v2 `349`
