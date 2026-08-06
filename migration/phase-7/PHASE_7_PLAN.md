# Phase 7 Plan — Controlled Production Read Cutover

Status: PLANNED / NOT AUTHORIZED FOR CUTOVER

Phase 7 changes the production **read** source from `legacy` to `v2-shadow` only after a sequence of independently reviewable gates. Production writes remain on `public.person_politics` throughout Phase 7. No schema removal, legacy-table removal, write migration, or destructive cleanup is in scope.

## 1. Objective

Promote `public.atlas_person_politics_compat_v1` from validated shadow source to the default production reader while preserving:

- immediate rollback to `legacy`
- unchanged writes to `public.person_politics`
- source observability and explicit diagnostics
- deterministic evidence for every authorization decision
- strict separation between deployment, activation, observation, and closure

## 2. Preconditions

Phase 7 work may start only from the Phase 6 closing commit and evidence set.

Required immutable inputs:

- Phase 6 closing merge SHA: `c1a74f794b4b47bc509ba2c7292b1de8c9246400`
- Compatibility apply run: `31090419063`
- Reader contract run: `31091172067`
- Lineage parity run: `31096650046`
- Preview smoke / rollback run: `31097861921`
- Phase 6 gate file: `migration/phase-6/PHASE_6_GATE.md`

Any changed row counts, privileges, view definition, reader contract, write target, or unexplained lineage difference invalidates the Phase 6 evidence and blocks cutover.

## 3. Non-goals

Phase 7 does not:

- write to v2 tables
- migrate inserts, updates, or deletes away from `public.person_politics`
- delete or rename `public.person_politics`
- remove the compatibility view
- remove legacy fallback
- normalize or deduplicate the 30 approved v2 expansion rows
- alter RLS, grants, schema ownership, or database functions
- perform Phase 8 cleanup

## 4. Target architecture

### Read path

The application calls `AtlasReader.loadPersonPolitics` through one explicit deployment-controlled source selector:

- `legacy`: reads `public.person_politics`
- `v2-shadow`: reads `public.atlas_person_politics_compat_v1`

The production default changes only in the activation step. The reader continues to validate row shape, chronology, period basis, and duplicate IDs before accepting data.

### Write path

All create, update, and delete operations continue to target:

```text
public.person_politics
```

No feature flag, environment variable, or fallback path may redirect writes during Phase 7.

### Fallback path

When the selected source is `v2-shadow`, failed reads or row-contract failures fall back to `legacy`. Fallback must be visible through diagnostics and telemetry; it must never be silent.

## 5. Control-plane design

The source selector must be defined in exactly one production configuration location. Precedence must be explicit and tested:

1. deployment-time source value
2. safe hard default `legacy`

Query-string, local-storage, user-provided, or arbitrary runtime overrides are prohibited in production.

Allowed values:

```text
legacy
v2-shadow
```

Unknown values must resolve to `legacy` and emit a diagnostic.

## 6. Required implementation units

Phase 7 is divided into small PRs. No single PR may both introduce the mechanism and activate production v2 reads.

### PR 7A — Cutover control plane

Deliverables:

- central production source configuration
- source-value schema and validation
- visible active-source status
- diagnostic event model
- tests proving invalid values resolve to `legacy`
- tests proving all writes still reference `person_politics`

Default after merge: `legacy`.

Gate 7A:

- reader contract PASS
- static write-target guard PASS
- source precedence tests PASS
- production behavior unchanged

### PR 7B — Observability and emergency rollback

Deliverables:

- structured reader outcome record containing requested source, effective source, fallback occurrence, row count, validation failure count, and timestamp
- non-sensitive operator-visible status
- rollback runbook
- exact rollback commit or configuration patch prepared before activation
- workflow that validates both source modes against the live database without mutation

Default after merge: `legacy`.

Gate 7B:

- legacy live smoke PASS
- v2 live smoke PASS
- fallback injection test PASS
- rollback package deterministic PASS
- no secrets or row payloads in telemetry

### PR 7C — Production activation

Single-purpose change:

```text
production default: legacy -> v2-shadow
```

No other code or documentation changes are allowed in the activation PR except the activation manifest and evidence references.

Activation requirements:

- exact approved commit SHA
- explicit confirmation token
- protected environment
- concurrency lock
- preflight live snapshot
- row counts: legacy 319, v2 349 unless a separately approved data-change gate supersedes them
- lineage coverage: 319/319
- unexplained differences: 0
- compatibility view SELECT permissions intact
- anonymous write denial intact
- legacy write target static guard PASS
- rollback artifact uploaded before activation completes

### PR 7D — Observation closure

Documentation-only unless rollback is required.

Deliverables:

- activation run and artifact IDs
- post-activation health evidence
- fallback count
- effective source evidence
- row-count evidence
- operator smoke results
- rollback decision
- Phase 7 gate decision

## 7. Deployment sequence

The sequence is mandatory.

1. Freeze unrelated production-reader changes.
2. Merge 7A with default `legacy`.
3. Run reader contract and static write guards.
4. Merge 7B with default `legacy`.
5. Run live dual-source smoke and rollback-package workflow.
6. Review all artifacts.
7. Create 7C activation PR containing only the source-default change.
8. Verify PR head SHA and changed-file allowlist.
9. Merge 7C.
10. Deploy to production.
11. Run immediate post-deploy smoke.
12. Observe the production reader for the defined observation window.
13. Roll back immediately on any stop condition.
14. Close Phase 7 only after evidence review.

## 8. Observation window

Minimum observation requirement:

- one successful deployment cycle
- one cold page load
- one manual refresh
- search by person
- search by polity
- polity filter
- detail selection
- export projection
- create, update, and delete smoke against the legacy write target using an explicitly disposable test record or rollback transaction

The observation evidence must show:

- requested source: `v2-shadow`
- effective source: `v2-shadow`
- fallback count: 0
- read rows: 349
- write target: `public.person_politics`
- reader validation failures: 0
- user-visible errors: 0

A longer observation period may be used, but elapsed time alone cannot substitute for the required functional checks.

## 9. Stop conditions

Any one condition requires immediate rollback to `legacy`:

- effective source differs from requested source
- any fallback to legacy in normal production traffic
- v2 row count differs from the approved value without a new data gate
- missing or duplicate row IDs
- chronology or period-basis validation failure
- search, filter, detail, sorting, or export regression
- write operation targets anything other than `public.person_politics`
- anonymous or authenticated application roles gain write access to compatibility objects
- compatibility-view definition changes unexpectedly
- source selector cannot be independently verified
- operator cannot complete rollback with the prepared procedure
- unexplained lineage difference becomes nonzero

Rollback is considered a correct safety response, not a failed migration.

## 10. Rollback design

Rollback must be a one-variable reversal:

```text
production default: v2-shadow -> legacy
```

Rollback must not require a database migration.

Prepared rollback evidence must include:

- exact source file and line changed by activation
- prebuilt rollback commit or exact revert SHA
- expected deployment command or workflow
- verification that effective source is `legacy`
- verification that rows return to 319
- verification that writes remain on `public.person_politics`
- post-rollback smoke results

The compatibility view remains deployed after rollback for diagnosis.

## 11. CI and workflow controls

Every Phase 7 workflow must use:

- `workflow_dispatch`
- exact target SHA and expected SHA equality
- explicit confirmation token
- `contents: read`
- protected environment
- `persist-credentials: false`
- concurrency group with `cancel-in-progress: false`
- read-only SQL for inspection workflows
- `if: always()` evidence upload
- artifact retention of at least 90 days

Activation and rollback workflows must never infer the target branch head. They must check out a pinned approved SHA.

## 12. Required tests

### Unit and contract

- valid source resolution
- invalid source falls back to `legacy`
- v2 success path
- v2 error fallback path
- v2 row-contract fallback path
- legacy error path
- diagnostics are deterministic
- row validation unchanged

### Static safety

- every application mutation targets `person_politics`
- no mutation targets `atlas_person_politics_compat_v1`
- no direct v2-table mutation exists
- production selector has only two allowed values
- activation PR changes only allowlisted files

### Live read-only

- legacy count and contract
- v2 count and contract
- lineage coverage
- compatibility privileges
- write-denial test inside rollback transaction
- deterministic report generation twice

### Browser/operator smoke

- render
- sort
- search
- filter
- detail
- export
- refresh
- active-source indicator
- fallback indicator

## 13. Evidence model

Each gate report must contain:

- marker and phase
- repository and approved SHA
- workflow head SHA
- run ID
- artifact ID and digest
- database object names
- source requested and effective
- row counts
- validation results
- fallback results
- write-target guard result
- rollback readiness result
- final PASS/FAIL

Reports must be deterministic after excluding timestamps.

## 14. Security constraints

- do not expose database URLs, keys, row payloads, or user-entered notes in artifacts or logs
- use the existing protected environment secret
- application roles retain SELECT-only access to compatibility objects
- actual write-denial verification remains mandatory
- no service-role key is introduced into browser code
- no source control file may contain secret material

## 15. Data-change handling during Phase 7

Production data may change after Phase 6. Therefore fixed counts are a baseline, not permission to ignore legitimate writes.

If data changes before activation:

1. stop Phase 7 activation
2. capture a new legacy snapshot
3. recompile or synchronize v2 using the approved pipeline
4. rerun lineage parity
5. issue a superseding data gate with new counts and digests
6. update the Phase 7 activation manifest

The activation workflow must not silently edit expected counts.

## 16. Branch and PR discipline

Recommended branches:

- `agent/phase7-control-plane`
- `agent/phase7-observability-rollback`
- `agent/phase7-production-activation`
- `agent/phase7-gate-close`

Rules:

- branch from the latest approved `main`
- one concern per PR
- inspect full patch and changed-file allowlist before merge
- merge with expected head SHA
- squash merge
- no force-push after approval
- divergent PR `#4` remains excluded

## 17. Authorization boundaries

Approval of this plan authorizes implementation of 7A and 7B only.

It does not authorize:

- merging 7C
- production activation
- disabling fallback
- changing the write path
- removing legacy objects
- starting Phase 8

Production activation requires a separate explicit instruction after 7A and 7B evidence passes.

## 18. Phase 7 exit criteria

Phase 7 closes as PASS only when all are true:

- control plane merged with tested safe default
- observability and rollback package merged
- live dual-source preflight PASS
- activation PR reviewed and separately authorized
- production effective source verified as `v2-shadow`
- fallback count is zero during required checks
- all functional smoke checks PASS
- write target remains `public.person_politics`
- rollback remains executable
- evidence document merged

At Phase 7 closure, Phase 8 may be planned. Phase 8 remains separately authorized and is expected to address write migration, synchronization strategy, or legacy retirement—not Phase 7.
