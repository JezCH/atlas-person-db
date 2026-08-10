# Phase 8C C8 — Runtime Retirement

Status: IMPLEMENTED / CODE-ONLY RETIREMENT

## Objective

Remove every obsolete executable transition path after C5 established v2-only writes and C6 established direct normalized reads.

C8 is intentionally non-destructive at the database layer. It removes code, exposed API routes, historical transition tests and manually dispatchable migration workflows; it does **not** drop legacy database objects.

## C7 basis

Pre-retirement inventory commit: `4d8e6592bf0b6f1bf54879ea310059b7960c9345`.

C7 proved the intended production browser/server graph already had zero legacy dependency hits, but found one publicly reachable legacy Vercel route:

- `api/run-ingest-3-7f4c9a.js` — direct Supabase REST access to `person_politics`

C7 also found that `server/atlas-mutation-service.js` remained on the intended graph only because the v2-authoritative service imported two generic request helpers from it.

## C8 changes

### 1. Remove exposed legacy route and detached legacy runtime

The legacy ingest API and detached browser ingest scripts are removed together with obsolete dual-write, compatibility-control, shadow-write and reconciliation runtime modules.

### 2. Remove final active edge to legacy mutation service

`normalizeOperation` and `deterministicRequestId` move to `server/atlas-mutation-request-utils.js`.

`server/atlas-v2-authoritative-mutation-service.js` imports those pure helpers directly. The former dual-write mutation service and dual-write PostgreSQL transaction adapter are then deleted.

### 3. Retire completed migration workflows

Completed Phase 5–C6 apply/smoke/dual-write workflows are removed from the active `.github/workflows` surface so they can no longer be manually dispatched after retirement.

Active Actions after C8 are intentionally limited to:

- `phase-8c-c7-runtime-dependency-inventory.yml`
- `phase-8c-c8-active-v2-runtime.yml`

Exact historical workflow definitions remain recoverable from C7 commit `4d8e6592bf0b6f1bf54879ea310059b7960c9345` and workflow tree `80573157d2f1290fbed958d1ae291cd3090f995e`.

### 4. Keep migration evidence, remove executable baggage

Migration plans, SQL, reports, manifests and Git history remain. Executable runtime/tests/workflows whose only purpose was an already-completed transition are removed from the active codebase.

## Post-retirement production graph

### Reads

`Browser -> GET /api/atlas-read -> normalized read handler -> atlas_v2 normalized tables`

### Writes

`Browser/admin -> authenticated /api/atlas-mutate -> v2-authoritative service -> normalized PostgreSQL transaction`

### Authentication

`Browser/admin -> /api/atlas-session -> HttpOnly signed administrator session`

Only these three Vercel API entrypoints remain.

## C8 exit criteria

1. C7 post-retirement inventory reports `ZERO_REACHABLE_LEGACY_RUNTIME`.
2. Vercel API route set is exactly `atlas-read`, `atlas-mutate`, `atlas-session`.
3. No public/intended runtime forbidden dependency hit remains.
4. All listed transitional runtime files are absent.
5. Active workflow surface is exactly C7 + C8.
6. Current normalized read/write/auth tests pass.
7. No database drop/alter operation is performed.

## C9 boundary

The following database objects remain intentionally untouched until the separately authorized destructive stage:

- `public.person_politics`
- `public.atlas_person_politics_compat_v1`

C9 must first inspect live dependencies, grants, policies and counts, then retire the compatibility view before the legacy table under an explicit protected authorization. C8 does not pre-authorize that action.
