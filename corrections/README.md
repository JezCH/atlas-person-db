# ATLAS Correction

## Current live contract

Production Correction accepts only `atlas-correction-manifest/v2` requests and
`atlas-stage2-correction-v2-execution-plan/v1` plans.

Live inputs are limited to:

- `corrections/requests/*.json` for reviewed v2 manifests;
- `corrections/plans/*.json` for reviewed v2 execution plans.

`corrections/intents/` and correction manifest schemas v1, v1.1, v1.2, v1.3 and
v1.4 are historical evidence only. They are not Production execution paths.

The current Production workflow is `.github/workflows/atlas-correction-apply.yml`.
Every selected mutation executes an exact-SHA dry-run before apply. GitHub Actions
uses the dedicated Correction OIDC audience and never receives the database URL.

## Authoring versus correction

Authoring creates or reuses historical identities and new Activity relationships.
Correction changes already-existing normalized data under exact before-state review,
idempotency and provenance-preserving invariants.

## Ledger compatibility

Historical correction manifests remain represented in
`atlas_v2.correction_manifest_runs`. The current v2 apply path therefore retains
the ordered correction-ledger migration chain:

1. `20260811_correction_manifest_runs.sql`
2. `20260812_correction_manifest_v1_1.sql`
3. `20260813_correction_manifest_v2.sql`
4. `20260815_correction_manifest_v1_2.sql`
5. `20260821_correction_manifest_v1_3.sql`
6. `20260827_correction_manifest_v1_4.sql`

These migrations are replay compatibility infrastructure. They do not make the
legacy mutation engines live again. Replay must remain schema-monotonic so existing
historical ledger rows cannot be invalidated by a later v2 apply.

Generic ledger hashing and lookup live in
`server/atlas-correction-ledger-service.js`; current v2 mutation services must not
depend on retired v1-v1.4 executable service modules.

## Historical schemas

v1-v1.4 request/intent JSON, migration SQL and immutable release/audit evidence are
retained for traceability. Git history contains the implementation details of those
retired mutation engines.

Do not reintroduce a legacy manifest service merely to replay historical evidence.
If historical ledger compatibility needs to change, update the canonical migration
chain and its monotonic replay tests instead.

## Safety invariants

- exact reviewed before-state or exact live snapshot;
- PostgreSQL transactional mutation boundary;
- stable request id + manifest hash idempotency;
- dry-run before commit;
- provenance/source preservation;
- exact Production deployment SHA;
- current v2-only live dispatch;
- historical evidence preserved without keeping historical writers reachable.
