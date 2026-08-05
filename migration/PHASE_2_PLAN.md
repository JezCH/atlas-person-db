# Phase 2 — Baseline Inventory and Audit Tooling

## Objective

Establish a deterministic, read-only audit of the current repository state before any schema, data, runtime, or database migration begins.

Phase 2 does not alter production data, Supabase, Vercel behavior, runtime entrypoints, existing JSON datasets, locale files, or ingestion code.

## Allowed changes

Only the following paths may be added or changed during Phase 2:

- `migration/PHASE_2_PLAN.md`
- `migration/scripts/**`
- `migration/schemas/**`
- `migration/reports/**`
- `migration/gates/PHASE_2_GATE.md`
- `.github/workflows/phase-2-audit.yml`

The workflow exception is strictly limited to a read-only audit workflow. No other workflow file may be changed.

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
- `.github/workflows/**` except `.github/workflows/phase-2-audit.yml`

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

Discover and parse without executing repository JavaScript:

- `person-locales.js`
- `person-locales-supplement*.js`

The parser must accept only static object-literal assignments used by the locale files. Dynamic expressions, function calls inside locale data, or unsupported syntax are fatal audit-engine errors.

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

The audit engine accepts an explicit output directory:

```bash
node migration/scripts/audit-baseline.mjs --root . --output migration/tmp/run-1
```

Final committed outputs:

- `migration/reports/phase-2-file-inventory.json`
- `migration/reports/phase-2-baseline.json`
- `migration/reports/phase-2-baseline.md`
- `migration/reports/phase-2-anomalies.json`

## Validation tools

- `migration/scripts/audit-baseline.mjs`: generate deterministic audit outputs.
- `migration/scripts/validate-report.mjs`: validate JSON reports against the repository schema.
- `migration/scripts/verify-determinism.mjs`: compare two independent output directories byte-for-byte.
- `migration/scripts/verify-protected-paths.mjs`: verify that changes remain within the authorized Phase 2 paths.

## GitHub Actions execution

`.github/workflows/phase-2-audit.yml` is the authoritative execution environment.

The workflow must:

1. use `actions/checkout` with full history;
2. use a fixed Node major version;
3. run with `permissions: contents: read`;
4. use no Supabase, Vercel, or deployment secrets;
5. run the audit twice into separate temporary directories;
6. validate both reports;
7. compare both runs byte-for-byte;
8. verify protected paths against the Phase 1 baseline SHA;
9. upload the validated reports as an artifact;
10. never push commits or alter repository data.

Concurrency must cancel superseded runs on the same branch.

## Exit codes

Audit-engine exit codes describe execution failure only. Existing data-quality defects are reported in the outputs and do not make the audit engine fail by themselves.

- `0`: audit completed successfully;
- `10`: source access or required source failure;
- `11`: parse or structural source failure;
- `12`: report schema validation failure;
- `13`: deterministic output comparison failure;
- `14`: protected-path violation;
- `15`: baseline or branch invariant failure.

## Commit sequence

1. `docs(migration): amend phase 2 for isolated CI execution`
2. `refactor(migration): harden audit parsing and report validation`
3. `test(migration): add independent determinism and protected-path checks`
4. `ci(migration): add read-only phase 2 audit workflow`
5. Run GitHub Actions and inspect evidence.
6. `chore(migration): record verified phase 2 baseline reports`
7. `docs(migration): close phase 2 gate with workflow evidence`

## Stop condition

After the Phase 2 gate is recorded, no Phase 3 work begins without explicit authorization.
