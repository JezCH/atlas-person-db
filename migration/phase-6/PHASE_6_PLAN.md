# Phase 6 Plan — Compatibility Reader and Controlled Cutover

## 1. Objective

Introduce a production-safe compatibility read layer over `atlas_v2` while preserving the existing application contract and keeping all production writes on `public.person_politics`.

Phase 6 is a **read-path migration only**. It must not switch, duplicate, or proxy writes.

## 2. Baseline and authority

- Phase 5 closing SHA: `4e12721dde17c0a4140ba7dbbcb03bb1ae2274fa`
- Phase 5 apply run: `31067507081`
- Phase 5 result: `PASS`
- Shadow schema: `atlas_v2`
- Legacy runtime source: `public.person_politics`
- Legacy rows observed after Phase 5 apply: `319`
- Compiled `atlas_v2.person_politics_v2` rows: `349`

The row-count difference is expected to remain visible during Phase 6 and must never be hidden by a permissive comparison. Parity is evaluated by the defined compatibility contract, not by raw table count alone.

## 3. Non-negotiable safety rules

1. `public.person_politics` remains the only production write target.
2. `atlas_v2` remains read-only for runtime clients.
3. No trigger, bidirectional synchronization, dual write, write-through view, or automatic reconciliation is permitted.
4. No direct browser access to base `atlas_v2` tables is permitted.
5. No fallback may silently mask contract violations.
6. Legacy remains the default source until the final Phase 6 cutover gate passes.
7. Every source switch must be reversible by one configuration change.
8. UI rendering, sorting, filtering, editing, deletion, export, and administration behavior must remain unchanged unless explicitly authorized by a later phase.
9. A failed or malformed v2 read must fail closed to legacy and emit a visible diagnostic in test/preview environments.
10. Phase 6 may not delete or rename any legacy object.

## 4. Existing runtime contract to preserve

The current browser code reads `public.person_politics` and expects rows with this shape:

```js
{
  id,
  person_name,
  politic_name,
  activity_start,
  activity_end,
  role,
  period_basis,
  notes
}
```

The compatibility layer must return exactly these fields with compatible scalar types and nullability.

### Required semantic behavior

- `id`: stable string/UUID suitable for row selection and equality checks
- `person_name`: canonical legacy-compatible display/source name
- `politic_name`: canonical legacy-compatible polity name
- `activity_start`, `activity_end`: integers
- `role`: string or `null`
- `period_basis`: one of the currently supported runtime values
- `notes`: string or `null`

### Required ordering behavior

Default query ordering must remain:

1. `politic_name`
2. `activity_start`
3. `activity_end`
4. `person_name`

## 5. Target architecture

```text
Browser application
        |
        v
Runtime reader adapter
        |
        +------------------------------+
        |                              |
        v                              v
legacy source                    v2 compatibility source
public.person_politics           public.atlas_person_politics_compat_v1
(default/write-safe)             (read-only projection)
        |                              |
        +---------------+--------------+
                        |
                        v
                identical row contract
```

The browser must not know the normalized `atlas_v2` schema. All normalized joins and name selection logic belong inside a database compatibility view or RPC owned by the migration.

## 6. Compatibility database object

Create one versioned, read-only compatibility object in `public`:

```text
public.atlas_person_politics_compat_v1
```

A versioned name is mandatory so future contract changes do not mutate a live contract in place.

### Projection rules

The compatibility object must project from `atlas_v2.person_politics_v2` and related normalized tables into the exact legacy runtime shape.

Required source rules:

- `id`: relationship UUID or a deterministic stable compatibility UUID
- `person_name`: English canonical person name selected by an explicit deterministic priority
- `politic_name`: English canonical polity name selected by an explicit deterministic priority
- `activity_start`, `activity_end`: relationship period values
- `role`: normalized role label mapped back to the legacy-compatible role string
- `period_basis`: normalized period basis code mapped exactly to the legacy enum
- `notes`: relationship note text or `null`

### Deterministic name-selection priority

The SQL must not rely on arbitrary row order. Name selection must use a documented priority, for example:

1. canonical English name
2. primary English name
3. lowest deterministic tie-break key

If the current schema uses different flags or columns, the implementation must document and test the exact equivalent rule.

### Permissions

- Base `atlas_v2` tables remain inaccessible to `public`, `anon`, and `authenticated`.
- Grant `SELECT` only on the compatibility object to the minimum role needed by the deployed client.
- No `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER` privilege.
- The object must not be automatically updatable.
- Prefer `security_invoker` semantics where supported; otherwise document the ownership and privilege model explicitly.

## 7. Runtime reader adapter

Introduce a single source-selection module instead of scattered `.from("person_politics")` calls.

Proposed API:

```js
window.ATLAS_DATA_SOURCE = "legacy" | "v2-shadow";

AtlasReader.loadPersonPolitics({
  source,
  client
});
```

### Adapter responsibilities

- resolve the configured source
- issue the correct Supabase query
- apply identical ordering
- validate the returned row shape
- normalize only representation differences explicitly allowed by contract
- return a consistent `{ data, error, source, diagnostics }` result
- never perform writes

### Write-path rule

All existing save/delete/admin mutations must continue to call:

```text
public.person_politics
```

The adapter must expose no write method in Phase 6.

## 8. Controlled rollout modes

### Mode A — legacy only

- Production default
- User-visible behavior unchanged
- V2 object exists but is not read by the application

### Mode B — shadow comparison

- UI still renders legacy data
- A separate non-blocking diagnostic reader loads v2
- Results are compared off-screen
- No v2 data reaches visible UI state
- Mismatches produce structured diagnostics

### Mode C — preview v2

- Enabled only in preview/test deployment through explicit configuration
- UI renders v2 compatibility rows
- All writes remain legacy
- Source indicator must be visible in preview/test builds
- Automatic fallback to legacy is permitted only with a recorded diagnostic

### Mode D — controlled production v2 read

- Authorized only after all Phase 6 gates pass
- Production reads use v2 compatibility object
- Writes remain legacy
- One-step rollback changes source back to `legacy`

## 9. Parity model

Raw row-count equality is not the only gate because Phase 5 recorded 319 legacy rows and 349 normalized relationships.

Comparison must classify every row into one of these outcomes:

- exact match
- expected normalized expansion
- expected normalized consolidation
- approved canonical-name difference
- approved role representation difference
- approved note representation difference
- unexplained missing legacy row
- unexplained extra v2 row
- incompatible scalar/type difference
- duplicate compatibility key

Only explicitly approved differences may pass.

### Stable comparison key

Use `legacy_source_key` as the primary lineage key where available. For legacy rows, derive the exact same key using the Phase 4 compiler contract. Do not compare only display names and periods.

### Required parity outputs

- total legacy rows
- total v2 compatibility rows
- lineage-covered rows
- exact matches
- approved differences by category
- unexplained differences
- duplicate keys
- null lineage keys
- invalid enum/type rows
- deterministic content fingerprint for each source

## 10. Implementation sequence

### 6.0 — Governance freeze

- create Phase 6 branch from Phase 5 closing SHA
- record authorized paths and forbidden paths
- capture hashes of production runtime files before changes
- inventory every legacy read and write call site

### 6.1 — Contract extraction

- formalize the legacy row JSON schema
- formalize allowed enum values and nullability
- document deterministic ordering
- create fixture data from representative BC/AD, null, multilingual, multi-polity, and duplicate-risk cases

### 6.2 — Compatibility SQL design

- implement versioned compatibility view/RPC
- add explicit deterministic joins and name selection
- add permission lockdown
- add existence, type, duplicate, orphan, and enum assertions
- add complete rollback SQL limited to Phase 6-created objects

### 6.3 — Database dry validator

Generate and validate the SQL without database mutation. Required checks:

- only approved objects are created
- no legacy mutation patterns
- no base-table grants
- no write privileges
- exact output columns and types
- deterministic SQL generation
- rollback completeness

### 6.4 — Database apply

Manual `workflow_dispatch` only, protected GitHub Environment, exact branch/SHA/digest/token validation, transaction, advisory lock, post-apply verification, evidence artifact.

### 6.5 — Reader adapter implementation

- create one adapter module
- replace only read calls with adapter calls
- leave every mutation call unchanged
- default source remains `legacy`
- add row-shape runtime validation

### 6.6 — Automated contract tests

At minimum:

- legacy source returns valid contract
- v2 source returns valid contract
- source selection defaults to legacy
- invalid source value fails safely
- v2 error fallback behavior is deterministic
- ordering parity
- ID stability across repeated reads
- enum parity
- nullability parity
- no write method exists on adapter
- existing write call sites still target legacy

### 6.7 — Shadow comparison run

- render legacy only
- load and compare v2 independently
- store machine-readable parity report
- require zero unexplained differences
- run twice and compare report digests

### 6.8 — Preview cutover

- deploy preview with `v2-shadow`
- run full UI smoke suite
- verify add/edit/delete still modify only legacy
- verify refresh, filters, search, details, export, admin verification, and mobile layout
- verify rollback to legacy without redeploying database objects

### 6.9 — Production read authorization

Production v2 read may be authorized only after:

- database compatibility gate PASS
- adapter contract gate PASS
- parity gate PASS
- preview smoke gate PASS
- rollback drill PASS
- no open severity-1 or severity-2 defects

## 11. CI workflows

### `phase-6-compat-dry.yml`

- triggers: PR/push on Phase 6 branch paths
- permissions: `contents: read`
- no database secret
- validates SQL bundle, adapter contract, static call-site rules, deterministic outputs
- uploads evidence artifact

### `phase-6-compat-apply.yml`

- trigger: `workflow_dispatch` only
- protected environment
- exact approved branch/SHA/dry artifact digest/confirmation token
- applies only Phase 6 database compatibility objects
- verifies privileges and schema contract
- uploads apply evidence

### `phase-6-shadow-compare.yml`

- manual or protected scheduled execution
- read-only DB credentials
- reads both sources
- writes no database data
- emits parity JSON, summary Markdown, fingerprints, and failure list

### `phase-6-preview-smoke.yml`

- runs against explicit preview URL
- tests both legacy and v2 source modes
- must not run destructive production mutations

## 12. Static safeguards

CI must fail when any of the following is detected outside approved migration SQL:

- `.from("atlas_v2` or direct normalized-table access in browser code
- new runtime writes to any v2 object
- modified legacy write target
- removed legacy fallback
- unversioned compatibility object name
- direct grants on base v2 tables
- edits to production files outside the approved Phase 6 manifest

## 13. Required evidence artifacts

Every gate artifact must contain:

- branch and exact commit SHA
- source file manifest and hashes
- SQL bundle and rollback bundle hashes
- compatibility schema description
- privilege matrix
- legacy/v2 row-contract validation
- parity report
- deterministic fingerprints
- workflow run metadata
- explicit PASS/FAIL status and failure list

Secrets and connection strings must never be included.

## 14. Rollback plan

### Application rollback

Set source to:

```text
legacy
```

This must restore legacy reads without database migration or data mutation.

### Database rollback

Drop only Phase 6-created compatibility objects and revoke only Phase 6-created grants. Do not touch `atlas_v2` base tables or `public.person_politics`.

### Rollback drill requirement

Before production read authorization:

1. preview reads v2 successfully
2. switch preview to legacy
3. confirm identical legacy behavior
4. switch back to v2
5. compare fingerprints and UI smoke results

## 15. Automatic failure conditions

Phase 6 fails immediately if any of these occurs:

- any write reaches `atlas_v2`
- any existing legacy row is mutated by migration SQL
- any base v2 table becomes accessible to browser roles
- compatibility output lacks required columns or changes types
- nondeterministic name selection
- duplicate compatibility IDs or keys
- null/missing lineage where required
- unexplained parity difference
- silent fallback without diagnostics in preview/test
- production defaults to v2 before gate closure
- rollback requires SQL mutation of production data
- secret appears in logs or artifacts

## 16. Definition of done

Phase 6 is complete only when:

- compatibility object exists and is privilege-safe
- adapter is the sole production read abstraction
- legacy remains the sole write path
- parity report has zero unexplained differences
- preview v2 read passes full smoke tests
- rollback drill passes
- production v2 read is either explicitly authorized or explicitly deferred
- Phase 6 gate records all run IDs, artifact IDs, digests, counts, fingerprints, and closing SHA

## 17. Initial authorization

- Phase 6 branch: `agent/phase6-compatibility-reader`
- Starting SHA: `4e12721dde17c0a4140ba7dbbcb03bb1ae2274fa`
- Current status: `DESIGN COMPLETE — IMPLEMENTATION NOT STARTED`
- Database writes authorized now: **no**
- Runtime source switch authorized now: **no**
