# Phase 7 Execution Checklist and Gate Matrix

Status: PLANNED

This checklist operationalizes `PHASE_7_PLAN.md`. Every item must be marked with immutable evidence before advancing.

## Gate matrix

| Gate | Purpose | Production default | Required evidence | Authorization outcome |
|---|---|---|---|---|
| 7A | Control plane | `legacy` | contract tests, source validation, write guards | May proceed to 7B |
| 7B | Observability and rollback | `legacy` | dual-source live smoke, fallback test, rollback package | May request 7C authorization |
| 7C | Production activation | `v2-shadow` after merge/deploy | preflight, exact SHA approval, post-deploy smoke | Enter observation |
| 7D | Observation closure | `v2-shadow` or rolled back `legacy` | health evidence, fallback count, decision record | Close Phase 7 or remediate |

## Global invariants

- [ ] Phase 6 closing SHA is the declared baseline.
- [ ] Production writes target only `public.person_politics`.
- [ ] Compatibility objects remain application-role read-only.
- [ ] Legacy fallback remains enabled.
- [ ] No destructive SQL is introduced.
- [ ] No browser secret is introduced.
- [ ] Every workflow uses pinned SHA authorization.
- [ ] Every evidence artifact is retained at least 90 days.

## 7A — Control plane checklist

### Design

- [ ] One central source selector exists.
- [ ] Allowed values are exactly `legacy` and `v2-shadow`.
- [ ] Safe default is `legacy`.
- [ ] Invalid values resolve to `legacy` with diagnostics.
- [ ] Production has no query-string or local-storage override.
- [ ] Active source is visible to the operator.

### Tests

- [ ] explicit `legacy` resolution PASS
- [ ] explicit `v2-shadow` resolution PASS
- [ ] missing value resolves to `legacy`
- [ ] invalid value resolves to `legacy`
- [ ] reader validation contract unchanged
- [ ] v2 successful read returns effective source `v2-shadow`
- [ ] v2 read error falls back to `legacy`
- [ ] v2 contract failure falls back to `legacy`
- [ ] fallback diagnostic emitted exactly once
- [ ] deterministic diagnostics PASS

### Static write guards

- [ ] insert target is `person_politics`
- [ ] update target is `person_politics`
- [ ] delete target is `person_politics`
- [ ] no mutation references compatibility view
- [ ] no mutation references v2 physical tables

### Merge evidence

- [ ] PR changed-file allowlist reviewed
- [ ] expected head SHA verified
- [ ] CI PASS
- [ ] squash merge SHA recorded
- [ ] production default remains `legacy`

## 7B — Observability and rollback checklist

### Event model

- [ ] requested source recorded
- [ ] effective source recorded
- [ ] fallback boolean recorded
- [ ] row count recorded
- [ ] validation failure count recorded
- [ ] timestamp recorded
- [ ] no row payload or notes recorded
- [ ] no URL, key, token, or secret recorded

### Operator status

- [ ] active source shown
- [ ] fallback state shown
- [ ] row count shown
- [ ] validation state shown
- [ ] status does not expose sensitive data

### Live dual-source smoke

- [ ] legacy read PASS
- [ ] v2 read PASS
- [ ] legacy count captured
- [ ] v2 count captured
- [ ] row contract PASS for both
- [ ] lineage coverage PASS
- [ ] unexplained differences = 0
- [ ] compatibility SELECT grants intact
- [ ] compatibility write denial PASS

### Fallback injection

- [ ] controlled v2 read failure injected without DB mutation
- [ ] effective source becomes `legacy`
- [ ] fallback diagnostic emitted
- [ ] application remains usable
- [ ] write target unchanged
- [ ] normal source restored after test

### Rollback package

- [ ] exact activation file identified
- [ ] activation diff is one-variable change
- [ ] reverse diff prepared
- [ ] rollback target SHA pinned
- [ ] rollback workflow or documented deployment action prepared
- [ ] rollback verification script prepared
- [ ] rollback artifact deterministic
- [ ] rollback does not require DB migration

### Merge evidence

- [ ] PR changed-file allowlist reviewed
- [ ] expected head SHA verified
- [ ] CI PASS
- [ ] live smoke run ID recorded
- [ ] artifact ID and digest recorded
- [ ] squash merge SHA recorded
- [ ] production default remains `legacy`

## 7C — Activation authorization checklist

No item in this section may be executed without separate explicit authorization.

### Preflight

- [ ] no unrelated reader changes are pending
- [ ] latest main SHA recorded
- [ ] latest production deployment SHA recorded
- [ ] legacy and v2 live snapshots captured
- [ ] lineage parity rerun PASS
- [ ] expected counts approved or superseding data gate recorded
- [ ] privilege verification PASS
- [ ] write-denial test PASS
- [ ] rollback package artifact verified
- [ ] stop conditions reviewed

### Activation PR

- [ ] PR changes only allowlisted activation files
- [ ] source default changes `legacy` to `v2-shadow`
- [ ] no fallback change
- [ ] no write-path change
- [ ] no schema change
- [ ] no dependency change
- [ ] exact head SHA recorded
- [ ] independent patch review complete
- [ ] explicit production activation approval recorded

### Deployment

- [ ] protected environment used
- [ ] concurrency lock active
- [ ] exact approved SHA deployed
- [ ] deployment result recorded
- [ ] rollback operator available

### Immediate post-deploy

- [ ] requested source = `v2-shadow`
- [ ] effective source = `v2-shadow`
- [ ] fallback = false
- [ ] rows = approved v2 count
- [ ] validation failures = 0
- [ ] render PASS
- [ ] refresh PASS
- [ ] person search PASS
- [ ] polity search PASS
- [ ] polity filter PASS
- [ ] detail PASS
- [ ] sort PASS
- [ ] export PASS
- [ ] disposable write smoke PASS on legacy target
- [ ] disposable record cleaned up or transaction rolled back

## 7D — Observation and closure checklist

### Observation evidence

- [ ] effective source remained `v2-shadow`
- [ ] fallback count remained 0
- [ ] validation failure count remained 0
- [ ] user-visible read errors remained 0
- [ ] write target remained legacy
- [ ] required functional checks repeated after cold load
- [ ] no privilege drift detected
- [ ] no view-definition drift detected
- [ ] no unexplained lineage difference detected

### Decision

Choose exactly one:

- [ ] PASS — retain `v2-shadow` production reads
- [ ] ROLLBACK — restore `legacy`
- [ ] HOLD — insufficient evidence; do not close Phase 7

### Closure evidence

- [ ] activation run ID recorded
- [ ] activation artifact ID and digest recorded
- [ ] deployment SHA recorded
- [ ] observation report digest recorded
- [ ] fallback count recorded
- [ ] rollback readiness recorded
- [ ] gate document merged
- [ ] Phase 8 remains separately unauthorized

## Stop-condition response

When any stop condition occurs:

1. [ ] declare rollback decision
2. [ ] apply the prepared one-variable reversal
3. [ ] verify effective source `legacy`
4. [ ] verify legacy row count
5. [ ] verify write target
6. [ ] run functional smoke
7. [ ] preserve failed-state evidence
8. [ ] document root cause
9. [ ] require a new authorization before retry

## Evidence record template

```yaml
marker: PHASE_7_GATE_EVIDENCE
phase_gate: 7A|7B|7C|7D
repository: JezCH/atlas-person-db
approved_sha: <sha>
workflow_head_sha: <sha>
run_id: <id>
artifact_id: <id>
artifact_digest: sha256:<digest>
requested_source: legacy|v2-shadow
effective_source: legacy|v2-shadow
fallback_count: <integer>
legacy_rows: <integer>
v2_rows: <integer>
validation_failures: <integer>
unexplained_differences: <integer>
write_target: public.person_politics
rollback_ready: true|false
result: PASS|FAIL|HOLD
```
