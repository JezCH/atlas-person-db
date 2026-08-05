# Phase 1 Gate — Branch and Baseline Governance

## Baseline

- Repository: `JezCH/atlas-person-db`
- Base branch: `main`
- Base commit: `a8ed85b7cf8bf687450688eb7f2216c766112950`
- Migration branch: `agent/normalized-i18n-migration`

## Required PASS conditions

- [x] Migration branch created from the latest observed `main` commit.
- [x] Baseline `main` commit SHA recorded.
- [x] Existing runtime files unchanged.
- [x] Existing data files unchanged.
- [x] Existing locale files unchanged.
- [x] Existing files neither deleted nor renamed.
- [x] No Supabase schema or data changes performed.
- [x] No Vercel runtime or deployment-path changes performed.
- [x] `index.html`, `admin.html`, `app.js`, and `admin.js` unchanged.
- [x] No workflow files added or changed.
- [x] Branch diff is additive and restricted to `migration/`.
- [x] Rollback procedure documented.

## Failure conditions

Phase 1 must be marked failed if any of the following occurs:

- an existing repository file is modified, deleted, or renamed;
- production runtime code or loader order changes;
- a dataset or locale source is rewritten;
- a database operation or migration SQL is executed;
- deployment or workflow configuration changes;
- the migration branch is not based on the recorded `main` commit;
- a change outside `migration/` appears in the branch comparison.

## Verification record

The final branch comparison must use:

```text
base: main
head: agent/normalized-i18n-migration
```

Expected changed paths:

```text
migration/README.md
migration/MIGRATION_PLAN.md
migration/BASELINE_MANIFEST.json
migration/gates/PHASE_1_GATE.md
migration/reports/.gitkeep
migration/scripts/.gitkeep
```

## Rollback

Delete `agent/normalized-i18n-migration`. No rollback of `main`, Supabase, Vercel, runtime files, or source datasets is required because Phase 1 is isolated and additive.

## Result

**PASS**, subject to the final GitHub branch comparison showing only the expected `migration/` paths.
