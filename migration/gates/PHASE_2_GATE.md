# Phase 2 Gate — Baseline Inventory and Audit Tooling

## Gate purpose

Confirm that the current repository can be inventoried and audited deterministically without modifying production data, runtime behavior, Supabase, or Vercel configuration.

## Required checks

- [ ] Phase 1 gate remains valid.
- [ ] Migration branch remains based on the recorded main baseline.
- [ ] Existing production files changed: 0.
- [ ] Existing production files deleted or renamed: 0.
- [ ] Supabase changes: none.
- [ ] Vercel and workflow changes: none.
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
- [ ] Report schema validation passed.
- [ ] Two executions against the same input are byte-for-byte deterministic.
- [ ] Existing English-display locale loader defect is detected and documented.
- [ ] Audit command returns exit code 0 when the engine itself succeeds.
- [ ] Main-to-migration diff remains confined to `migration/**`.

## Gate semantics

`PASS` means the audit process is complete, repeatable, non-destructive, and accurately reports current defects.

`DATA CLEAN` is a separate condition. Phase 2 may pass while reporting existing data or locale defects.

## Automatic failure conditions

- Existing runtime, data, locale, schema, workflow, or deployment file changed.
- Any database or network write occurred.
- Repository JavaScript executed during locale parsing.
- Source file silently skipped.
- Declared source file missing without a fatal diagnostic.
- Non-deterministic report output.
- Audit report violates its schema.
- Audit tool writes outside `migration/reports`.

## Completion record

Status: PENDING

- Branch:
- Baseline main SHA:
- Phase 2 start SHA:
- Phase 2 end SHA:
- Existing files changed:
- Database changes:
- Runtime changes:
- Audit exit code:
- Fatal anomalies:
- Errors:
- Warnings:
- Determinism check:
- Gate result:
- Phase 3 authorized: no
