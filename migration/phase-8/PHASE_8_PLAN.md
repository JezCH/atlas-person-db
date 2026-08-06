# Phase 8 — Legacy Retirement and Data-Quality Hardening Plan

Status: PLANNED / NON-DESTRUCTIVE WORK ONLY AUTHORIZED

## Objective

Retire the transitional legacy-read architecture only after proving that all production reads, writes, operational tooling, rollback procedures, and historical evidence can survive the cleanup. In parallel, define separate and reviewable workstreams for duplicate detection and Korean display-name completeness.

Phase 8 must not combine destructive cleanup with data-quality enrichment in one change set.

## Baseline

- Phase 7 closure document: `migration/phase-7/PHASE_7_GATE_CLOSE.md`
- production reads: `v2-shadow`
- production writes: `public.person_politics`
- legacy fallback: enabled
- rollback target: `legacy`
- compatibility view: `public.atlas_person_politics_compat_v1`
- approved live counts at Phase 7 closure: legacy `319`, v2 `349`

## Workstream separation

### 8A — Dependency and object inventory

Create a complete inventory before changing behavior:

- application read references
- application write references
- API and serverless references
- SQL functions, views, triggers, grants, RLS policies, and scheduled jobs
- GitHub Actions workflows and migration scripts
- administrator integrity tools
- rollback runbooks
- Vercel deployment configuration
- external clients and manually used SQL

Produce a machine-readable dependency report and a human-reviewed summary.

No object may be removed while an unresolved reference exists.

### 8B — Canonical write architecture design

The current production write path still targets `public.person_politics`. Before retirement, design and verify the final write model.

Required decisions:

- whether writes move directly to normalized v2 tables
- whether a controlled write API or stored procedure mediates mutations
- how person, polity, role, source, alias, and relationship records are created atomically
- transaction and idempotency rules
- duplicate prevention boundaries
- rollback and audit-log behavior
- compatibility behavior for existing administrator UI

This workstream is design and shadow implementation first. No production write switch is authorized by this plan.

### 8C — Shadow write and reconciliation

Implement the proposed v2 write route behind a non-production or explicitly disabled control.

Validate:

- insert
- update
- delete or retirement semantics
- multi-polity relationships
- aliases and Korean display names
- transaction rollback
- retry idempotency
- old-to-new row lineage
- deterministic reconciliation against the legacy write result

Production writes remain on `public.person_politics` until an independent gate passes.

### 8D — Duplicate detection hardening

Treat duplicate detection as a review system, not automatic destructive merging.

Candidate classes:

- exact canonical-name duplicates
- normalized punctuation and spacing variants
- alias collisions
- Korean-name collisions
- title or epithet variants
- same person across multiple political entities
- legitimate repeated activity rows
- date-overlap anomalies

Required output:

- candidate groups
- reason codes
- confidence level
- supporting fields
- explicit `MERGE`, `KEEP_SEPARATE`, or `REVIEW` decision
- immutable audit trail

Automatic merge and delete are prohibited until a separate approved policy exists.

### 8E — Korean display-name completeness

Measure rather than guess.

Create reports for:

- persons missing Korean display names
- polities missing Korean display names
- roles missing Korean display names
- English fallback currently exposed in the UI
- conflicting Korean transliterations

Each proposed Korean name must retain its source or review status. Machine-generated translations must not silently become canonical data.

### 8F — Production write cutover

Only after 8B and 8C pass:

- prepare a single-purpose production write cutover
- require exact-SHA authorization
- preserve immediate rollback
- verify administrator and general-page synchronization
- prove no writes reach retired objects
- monitor mutation failures and reconciliation drift

This step requires a separate explicit approval.

### 8G — Legacy read and compatibility retirement

Retirement order must be dependency-driven:

1. disable unused fallback invocation while retaining rollback code
2. observe production with fallback disabled
3. archive immutable schema and data evidence
4. revoke unnecessary read grants
5. remove application compatibility references
6. retire compatibility view only after zero dependencies are proven
7. retain legacy table read-only during a defined quarantine period
8. drop or archive legacy objects only under a separate destructive-change approval

No destructive action is authorized by this plan.

### 8H — Final closure

Phase 8 closes only when:

- production reads and writes use the approved final v2 architecture
- unresolved dependency count is zero
- reconciliation failures are zero
- rollback or forward-recovery procedure is proven
- duplicate candidates are classified without unauthorized merges
- Korean-name completeness metrics are recorded
- historical evidence is archived
- legacy and compatibility retirement decisions are individually documented

## Mandatory safety controls

- one purpose per PR
- exact changed-file and changed-object allowlists
- expected-head-SHA merges
- protected environments for live checks
- read-only transactions for audits
- write tests only in isolated or explicitly controlled environments
- evidence artifact on success and failure
- no deletion based only on code search
- no automatic translation promotion
- no automatic duplicate merge
- Phase 7 rollback capability retained until Phase 8 explicitly retires it

## Initial execution order

The first executable Phase 8 work is limited to:

1. Gate 8A repository dependency inventory
2. live database object and privilege inventory in read-only mode
3. current write-path architecture report
4. duplicate and Korean-name completeness metrics
5. Phase 8 execution checklist

After these reports are reviewed, the next implementation gate will be selected. Starting Phase 8 does not mean immediately deleting the legacy system.
