# Phase 6 Gate — Compatibility Reader and Controlled Cutover

## Status

IN PROGRESS — DRY VALIDATION PENDING

## Authorized branch

- `agent/phase6-compatibility-reader`
- Baseline: `4e12721dde17c0a4140ba7dbbcb03bb1ae2274fa`
- Current implementation SHA: `d93bbd198ea37f28c48418acd1d334a783038361`

## Required gates

- [ ] Dry workflow executes successfully.
- [ ] Deployment and rollback SQL are deterministic across two builds.
- [ ] Compatibility contract columns and types are exact.
- [ ] No mutation of `public.person_politics` appears in migration SQL.
- [ ] No runtime write reaches `atlas_v2` or the compatibility object.
- [ ] Base `atlas_v2` tables remain inaccessible to browser roles.
- [ ] Compatibility object exposes read-only access only.
- [ ] Adapter defaults to `legacy`.
- [ ] Legacy write call sites remain unchanged.
- [ ] Database apply workflow is manually authorized and exact-SHA guarded.
- [ ] Compatibility object apply and post-apply verification pass.
- [ ] Shadow parity report records zero unexplained differences.
- [ ] Preview v2 read smoke test passes.
- [ ] Rollback drill passes.
- [ ] Production read cutover is explicitly authorized or deferred.

## Automatic failure conditions

- Any write to `atlas_v2`.
- Any mutation of legacy rows by Phase 6 migration SQL.
- Any base-table grant to `public`, `anon`, or `authenticated`.
- Missing or incompatible compatibility columns.
- Duplicate compatibility IDs.
- Unexplained lineage or parity difference.
- Silent preview fallback without diagnostics.
- Production default changed from `legacy` before gate closure.

## Evidence record

- Dry workflow run ID:
- Dry workflow conclusion:
- Dry artifact ID:
- Dry artifact digest:
- Apply workflow run ID:
- Apply workflow conclusion:
- Apply artifact ID:
- Apply artifact digest:
- Parity workflow run ID:
- Parity result:
- Preview smoke run ID:
- Rollback drill result:
- Gate result: PENDING
- Phase 7 authorized: no
