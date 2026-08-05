# Phase 2 Gate — Baseline Inventory and Audit Tooling

## Gate purpose

Confirm that the current repository can be inventoried and audited deterministically without modifying production data, runtime behavior, Supabase, or Vercel configuration.

## Authorized paths

Only these paths may differ from the Phase 1 baseline during Phase 2:

- `migration/**`
- `.github/workflows/phase-2-audit.yml`

The workflow file must remain read-only with `permissions: contents: read` and must not use deployment or database secrets.

## Required checks

- [ ] Phase 1 gate remains valid.
- [ ] Migration branch remains based on the recorded main baseline.
- [ ] Existing production files changed: 0.
- [ ] Existing production files deleted or renamed: 0.
- [ ] Supabase changes: none.
- [ ] Vercel changes: none.
- [ ] No pre-existing workflow changed.
- [ ] Audit workflow has read-only permissions.
- [ ] Audit workflow contains no database or deployment secret references.
- [ ] All canonical dataset files discovered.
- [ ] All locale files discovered.
- [ ] All JSON sources parsed successfully.
- [ ] All locale sources parsed without executing repository JavaScript.
- [ ] Canonical loader references checked against repository files.
- [ ] `index.html` and `admin.html` locale script references compared.
- [ ] File inventory report generated.
- [ ] Machine-readable baseline report generated.
- [ ] Human-readable baseline report generated.
- [ ] Anomaly report generated.
- [ ] Report schema validation passed for both independent runs.
- [ ] Two independent executions against the same commit are byte-for-byte deterministic.
- [ ] Existing English-display locale loader defect is detected and documented.
- [ ] Audit engine returns exit code 0 when execution succeeds.
- [ ] Protected-path check passes against the Phase 1 baseline SHA.
- [ ] Validated report artifact uploaded by GitHub Actions.
- [ ] GitHub Actions workflow conclusion is `success`.
- [ ] Main-to-migration diff remains confined to authorized paths.

## Gate semantics

`PASS` means the audit process is complete, repeatable, non-destructive, and accurately reports current defects.

`DATA CLEAN` is a separate condition. Phase 2 may pass while reporting existing data or locale defects.

## Automatic failure conditions

- Existing runtime, data, locale, schema, deployment, or pre-existing workflow file changed.
- Any database, deployment, or network write other than artifact upload occurred.
- Repository JavaScript executed during locale parsing.
- Source file silently skipped.
- Declared source file missing without a fatal diagnostic.
- Non-deterministic report output.
- Audit report violates its schema.
- Audit tool writes outside its explicit output directory.
- Workflow has `contents: write` or broader permissions.
- Workflow references Supabase, Vercel, production, or deployment secrets.
- Workflow pushes a commit or updates a branch.

## Completion record

Status: PENDING

- Branch:
- Baseline main SHA:
- Phase 2 start SHA:
- Audited commit SHA:
- Phase 2 end SHA:
- Workflow file:
- Workflow run ID:
- Workflow conclusion:
- Artifact name:
- Existing production files changed:
- Database changes:
- Runtime changes:
- Audit exit code:
- Fatal anomalies:
- Errors:
- Warnings:
- Report schema validation:
- Determinism check:
- Protected-path check:
- Gate result:
- Data clean:
- Phase 3 authorized: no
