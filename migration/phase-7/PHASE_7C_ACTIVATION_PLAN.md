# Phase 7C — Controlled Production Read Activation

Status: PREPARED / NOT AUTHORIZED / NOT ACTIVATED

## Objective

Promote the production read source from `legacy` to `v2-shadow` by changing exactly one deployment-controlled value while preserving all existing write paths, fallback behavior, rollback readiness, and evidence requirements.

## Immutable baseline

- Phase 7 plan merge SHA: `834e4071ed9cdcf4a35fa985861ebdb8136895db`
- Phase 7A merge SHA: `101daa0e34793bf2dfca6ae5f4a6ab40dd0a56d6`
- Phase 7B static merge SHA: `6fb5396b0b0612a16540cb521ebadcfc9b81ba64`
- Phase 7B live-smoke merge SHA: `b137c91084044d1422a063b6f2fa68b7a9537c52`
- Phase 7B gate-close merge SHA: `ac31662295290e0dcd36eba5062792d6b579d67d`
- Phase 7B live workflow run: `31104101781`
- Phase 7B artifact ID: `8968753297`
- Phase 7B artifact digest: `sha256:c654a885d63aecd5dbaa172dc396e8c6b5c67a03a9a8a39cd7c088b94f080ce3`
- Phase 7B report digest: `sha256:9505bd58432368173eedf535cc2e2e3581c0a73c5fd7181c8d02ec6795f13f00`

## Activation change

The activation PR must change only this value in `atlas-production-source.js`:

```diff
-  DATA_SOURCE: "legacy"
+  DATA_SOURCE: "v2-shadow"
```

No other application, database, workflow, schema, grant, RLS, compatibility-object, or write-path change is permitted in the activation PR.

## Invariants

- Production writes remain `public.person_politics`.
- `public.atlas_person_politics_compat_v1` remains read-only for application roles.
- Fallback to `legacy` remains enabled.
- Source values remain limited to `legacy` and `v2-shadow`.
- No query-string, localStorage, sessionStorage, or user-controlled source override is introduced.
- No v2 physical table mutation is introduced.
- No legacy table, compatibility view, or v2 object is deleted or renamed.
- Phase 8 remains unauthorized.

## Required activation workflow controls

The activation workflow must require all of the following:

1. exact approved target SHA
2. exact expected commit SHA
3. explicit confirmation token
4. protected production environment
5. concurrency lock with no cancellation of an in-progress activation
6. checkout of the exact approved SHA
7. preflight verification before any deployment action
8. immutable evidence upload even on failure
9. clear PASS, ROLLBACK, or HOLD result

## Required preflight checks

Before deployment, verify:

- checked-out SHA equals the authorized SHA
- activation diff changes only `atlas-production-source.js`
- the only semantic change is `legacy` to `v2-shadow`
- Phase 7A contract passes
- Phase 7B static contract passes
- live legacy count is `319`
- live v2 compatibility count is `349`
- both live datasets pass the reader row contract
- lineage parity remains PASS with no missing legacy lineage and no unexplained differences
- compatibility-view SELECT works for application roles
- compatibility-view write denial remains enforced
- application insert, update, and delete targets remain `public.person_politics`
- exact legacy rollback manifest is available

Any failed preflight check stops activation before deployment.

## Deployment sequence

1. Create a single-purpose activation branch from the approved main SHA.
2. Change only `DATA_SOURCE` from `legacy` to `v2-shadow`.
3. Open a single-file activation PR.
4. Verify changed-file allowlist and exact patch.
5. Verify all static CI checks pass.
6. Verify the exact PR head SHA.
7. Merge with expected-head-SHA protection.
8. Dispatch the activation workflow using the exact merged activation SHA and required confirmation token.
9. Run all preflight checks.
10. Deploy through the protected production environment.
11. Immediately verify production reader outcome and functional smoke.
12. Preserve activation evidence.
13. Enter Phase 7D observation only after immediate smoke passes.

## Immediate post-deploy acceptance

The first production reader outcome must show:

```yaml
requested_source: v2-shadow
effective_source: v2-shadow
fallback: false
row_count: 349
validation_failures: 0
```

Functional checks must pass for:

- initial load
- refresh
- search
- polity filter
- sort controls
- row selection and detail panel
- export
- insert
- update
- delete
- reload after mutation

All mutation operations must still target `public.person_politics`.

## Stop conditions

Rollback immediately if any of the following occurs:

- requested source differs from effective source
- fallback occurs during normal production traffic
- row count differs from the approved v2 count without a new data gate
- any row-contract validation failure occurs
- search, filter, sort, detail, export, refresh, or mutation behavior regresses
- any write references the compatibility view or v2 physical tables
- compatibility-view definition or privileges drift
- production error rate or load failure increases materially
- evidence is incomplete or contradictory

## Exact rollback

Rollback changes only:

```diff
-  DATA_SOURCE: "v2-shadow"
+  DATA_SOURCE: "legacy"
```

The rollback procedure and required evidence are defined in `PHASE_7_ROLLBACK_RUNBOOK.md`.

## Activation evidence schema

```yaml
marker: PHASE_7C_ACTIVATION_EVIDENCE
approved_activation_sha: <sha>
deployed_activation_sha: <sha>
workflow_run_id: <id>
artifact_id: <id>
artifact_digest: <sha256>
requested_source: v2-shadow
effective_source: v2-shadow
fallback: false
v2_rows: 349
validation_failures: 0
write_target: public.person_politics
preflight: PASS
immediate_smoke: PASS
rollback_package: READY
result: PASS|ROLLBACK|HOLD
```

## Authorization boundary

This document authorizes only the preparation of activation controls. It does not authorize changing `atlas-production-source.js`, merging an activation PR, dispatching a production activation workflow, or entering Phase 7D.
