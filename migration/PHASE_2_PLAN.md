# Phase 2 — Baseline Inventory and Audit Tooling

## Objective

Establish a deterministic, read-only audit of the current repository state before any schema, data, runtime, or database migration begins.

Phase 2 does not alter production data, Supabase, Vercel behavior, runtime entrypoints, existing JSON datasets, locale files, or ingestion code.

## Allowed changes

Only paths under `migration/` may be added or changed:

- `migration/PHASE_2_PLAN.md`
- `migration/scripts/**`
- `migration/schemas/**`
- `migration/reports/**`
- `migration/gates/PHASE_2_GATE.md`

## Protected scope

The following paths are read-only during Phase 2:

- `index.html`
- `admin.html`
- `app.js`
- `admin.js`
- `ingest.js`
- `atlas-canonical-data.js`
- `schema.sql`
- `pending-records*.json`
- `non-timeline-persons.json`
- `person-locales*.js`
- `.github/workflows/**`

## Audit coverage

### Canonical datasets

Discover and inspect:

- `pending-records.json`
- `pending-records-supplement.json`
- `pending-records-supplement-*.json`
- `pending-records-corrections.json`

### Non-timeline dataset

Inspect `non-timeline-persons.json` for historicity, chronology, duplicate names, canonical overlap, and missing Korean display names.

### Locale sources

Discover and safely parse:

- `person-locales.js`
- `person-locales-supplement*.js`

The audit must compare repository locale files with script references in `index.html` and `admin.html`.

### Runtime and schema references

Read only:

- `atlas-canonical-data.js`
- `index.html`
- `admin.html`
- `ingest.js`
- `app.js`
- `admin.js`
- `schema.sql`
- `migrations/*.sql`

## Deterministic normalization

Audit-only normalization:

- trim leading and trailing whitespace;
- collapse internal whitespace;
- normalize Unicode to NFC;
- retain original values alongside normalized comparison values;
- never merge entities solely by normalized name.

Relationship keys:

- strict key: person, polity, start, end, basis, role;
- compatibility key: person, polity, start, end.

## Severity model

- `fatal`: parse failure, missing declared file, invalid range, conflicting duplicate, locale conflict, report schema failure;
- `error`: canonical/non-timeline overlap, unloaded locale source, missing required Korean display name, orphan locale key, unsupported basis;
- `warning`: likely aliases, role-only differences, notes-only differences, approximate chronology without precision metadata.

Phase 2 may pass while current data remains imperfect. PASS means the audit is complete, deterministic, and accurately reports defects.

## Outputs

- `migration/reports/phase-2-file-inventory.json`
- `migration/reports/phase-2-baseline.json`
- `migration/reports/phase-2-baseline.md`
- `migration/reports/phase-2-anomalies.json`

## Execution

```bash
node migration/scripts/audit-baseline.mjs --check
node migration/scripts/audit-baseline.mjs --write
```

Default mode is `--check`. The audit must not execute repository JavaScript, use `eval`, write outside `migration/reports`, access the network, or connect to Supabase.

## Exit codes

- `0`: audit completed; no audit-engine fatal error;
- `1`: source parsing failure;
- `2`: required source missing;
- `3`: destructive data conflict detected;
- `4`: locale loader defect detected;
- `5`: report schema or determinism failure.

## Commit sequence

1. `docs(migration): define phase 2 audit scope and invariants`
2. `feat(migration): add deterministic baseline audit engine`
3. `test(migration): add audit report schema and determinism checks`
4. `chore(migration): record phase 2 baseline reports`

## Stop condition

After the Phase 2 gate is recorded, no Phase 3 work begins without explicit authorization.
