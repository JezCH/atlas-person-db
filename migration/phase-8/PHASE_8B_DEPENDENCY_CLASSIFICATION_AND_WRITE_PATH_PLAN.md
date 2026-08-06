# Phase 8B — Dependency Classification and Write-Path Transition Plan

Status: PLANNED / NON-DESTRUCTIVE

## Objective

Classify the dependencies discovered in Phase 8A and define a reversible migration path from the legacy write target `public.person_politics` toward an approved v2 write contract without changing production behavior during this gate.

## Authorized scope

- classify repository findings by runtime relevance
- classify live database dependencies by object and access mode
- identify every writer to `public.person_politics`
- identify every reader of legacy and compatibility contracts
- map grants, RLS policies, triggers, functions, admin tools, APIs, workflows, rollback controls, and operational procedures
- define a target write contract and compatibility strategy
- define shadow-write or dual-write validation requirements
- define rollback criteria and evidence requirements
- produce machine-readable classification evidence

## Prohibited scope

- no production write cutover
- no application source switch
- no privilege or RLS mutation
- no trigger or function mutation
- no legacy table or compatibility view deletion
- no fallback or rollback removal
- no automatic duplicate merge
- no destructive data cleanup
- no Korean-name promotion without an explicit reviewed rule

## Classification model

Each dependency must receive:

- `dependency_id`
- `source_type`: repository or database
- `path_or_object`
- `access_mode`: read, write, control, migration, evidence, documentation, unknown
- `runtime_scope`: production, admin, CI, migration-only, documentation-only, test, unknown
- `target_contract`: legacy, compatibility, atlas_v2, control-plane, none, unknown
- `retirement_blocker`: true or false
- `reason`
- `recommended_action`: retain, migrate, replace, isolate, document, investigate
- `verification_method`

## Mandatory workstreams

### 1. Writer inventory

Produce a complete list of code paths, admin actions, APIs, scripts, functions, triggers, and grants capable of writing `public.person_politics`.

No write transition may begin until all writers are accounted for.

### 2. Reader inventory

Separate production readers from admin, CI, migration, documentation, and historical evidence references. Identify which readers require the compatibility view and which can use atlas_v2 directly.

### 3. Security inventory

Classify the `anon` and `authenticated` privileges, four RLS policies, and any trigger/function behavior discovered in Phase 8A. Do not revoke or modify them during Phase 8B.

### 4. Target write contract

Define the exact target tables, required fields, identity rules, transaction boundaries, validation rules, and compatibility behavior for future writes. The target must preserve current production behavior and support rollback.

### 5. Transition strategy

Design a reversible sequence such as:

1. instrument current legacy writes
2. introduce a reviewed v2 write adapter behind a disabled flag
3. validate shadow or dual-write parity
4. verify idempotency and error handling
5. run non-production and protected production evidence
6. authorize cutover only in a later gate

Phase 8B does not execute these steps; it defines and validates the plan.

### 6. Duplicate-review boundary

The future duplicate system must be review-oriented rather than auto-destructive. Minimum decision states:

- `MERGE`
- `KEEP_SEPARATE`
- `REVIEW`

Candidate evidence should support exact, normalized, alias, Korean-name, polity, role, and period signals. Decisions must be auditable and reversible. Phase 8B may design this contract but must not merge or delete records.

## Acceptance criteria

Phase 8B may close only when:

- every Phase 8A repository finding is classified or explicitly unresolved
- all live database dependencies are classified
- every known writer is mapped
- production and non-production references are separated
- a reversible target write contract is documented
- security and rollback blockers are explicit
- no prohibited mutation occurs
- preserved evidence supports the next gate recommendation

## Starting evidence

- Phase 8A run: `31129294577`
- repository artifact: `8975468520`
- repository digest: `sha256:7a2a4e1e35c3df1ed173faafdfaf6fbb95b24a0cb686c0d56351074ed90aaa74`
- live database artifact: `8975475492`
- live database digest: `sha256:85de6aeb409645e177ee30500312cbd1aa4f7b819f791f2376a74d58375d8f7e`

## Gate boundary

Successful completion of Phase 8B may authorize a later implementation gate for a disabled, reversible write adapter. It does not itself authorize production cutover or retirement.
