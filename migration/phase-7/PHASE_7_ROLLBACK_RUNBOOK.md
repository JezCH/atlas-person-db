# Phase 7 Emergency Read Rollback Runbook

Status: PREPARED / NOT EXECUTED

## Scope

This rollback changes only the production read-source declaration from `v2-shadow` to `legacy`. It does not alter database schema, grants, RLS, compatibility objects, or application write targets.

## Invariants

- Production writes remain `public.person_politics`.
- `public.atlas_person_politics_compat_v1` remains read-only for application roles.
- No database migration is required.
- No query-string or browser-storage override is permitted.
- Rollback is an exact one-variable source declaration change.

## Trigger conditions

Rollback immediately when any Phase 7 stop condition occurs, including:

- requested source differs from effective source
- any unexpected fallback in normal production traffic
- row-contract validation failure
- approved v2 row count mismatch without a new data gate
- search, filter, detail, sort, export, or refresh regression
- any mutation target other than `public.person_politics`
- privilege or compatibility-view definition drift

## Exact rollback target

File:

```text
atlas-production-source.js
```

Required content:

```javascript
window.ATLAS_CONFIG = Object.freeze({
  ...(window.ATLAS_CONFIG || {}),
  DATA_SOURCE: "legacy"
});
```

## Execution procedure

1. Freeze unrelated production-reader changes.
2. Capture the failed deployment SHA and current source-observability event.
3. Create a single-purpose rollback branch from the current production commit.
4. Change only `DATA_SOURCE` from `v2-shadow` to `legacy` in `atlas-production-source.js`.
5. Run Phase 7A and Phase 7B contracts.
6. Verify changed-file allowlist contains only the source manifest and rollback evidence record.
7. Verify the exact rollback head SHA.
8. Merge using squash with the expected head SHA guard.
9. Deploy the rollback commit through the protected production environment.
10. Verify requested source `legacy`, effective source `legacy`, fallback `false`, and approved legacy row count.
11. Verify insert, update, and delete code still targets `public.person_politics`.
12. Run refresh, search, filter, detail, sort, and export smoke checks.
13. Preserve failed-state and rollback evidence before remediation work begins.

## Rollback verification output

Required evidence fields:

```yaml
marker: PHASE_7_ROLLBACK_EVIDENCE
failed_deployment_sha: <sha>
rollback_approved_sha: <sha>
rollback_deployment_sha: <sha>
requested_source: legacy
effective_source: legacy
fallback: false
legacy_rows: <approved count>
validation_failures: 0
write_target: public.person_politics
functional_smoke: PASS
result: PASS|FAIL
```

## Retry rule

A failed activation may not be retried using the previous authorization. Root cause, corrective change, new CI evidence, and a new explicit production activation authorization are required.
