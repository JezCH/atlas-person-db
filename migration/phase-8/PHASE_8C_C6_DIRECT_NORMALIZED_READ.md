# Phase 8C C6 — Direct Normalized Reads

Status: IMPLEMENTED / CODE-ONLY ACTIVATION

## Objective

Move every active application read path off transitional legacy/compatibility objects after C5 made normalized v2 authoritative for writes.

C6 does not change database schema or grants. It changes runtime routing only.

## Production read boundary

`Browser app/admin -> GET /api/atlas-read -> fixed server SQL -> atlas_v2 normalized tables`

The public endpoint is read-only and exposes the same row projection needed by the existing UI:

- normalized relationship UUID as `id`
- preferred English person name
- preferred English polity name
- activity start/end
- nullable role source label
- period-basis code
- notes

The fixed SQL reads only:

- `atlas_v2.person_politics_v2`
- `atlas_v2.person_names`
- `atlas_v2.polity_names`
- `atlas_v2.roles`
- `atlas_v2.period_bases`

It does not read `public.person_politics` or `public.atlas_person_politics_compat_v1`.

## Runtime changes

### Authoring page

- removes browser Supabase client dependency
- removes production source switch and fallback controls
- removes page-loaded canonical/reconciliation legacy stack
- `AtlasReader` performs one same-origin GET to `/api/atlas-read`
- endpoint/row-contract failures fail closed; there is no legacy fallback
- authenticated C5 v2-only write adapter remains unchanged

### Admin page

- removes browser Supabase client dependency
- exact activity lookup reads the same `/api/atlas-read` projection
- normalized UUID is used for update identity
- ambiguous historical duplicate keys still fail closed for review
- authenticated C5 v2-only mutation boundary remains unchanged

### Reconciliation

The old page-load dry-run reconciliation bootstrap is retired from application execution. Its historical implementation files remain in the repository only for migration evidence and later C8 deletion; they are no longer loaded by `index.html`.

## Safety boundary

- no browser PostgreSQL credentials
- no browser service-role secret
- no direct browser access to `atlas_v2` tables
- GET only
- fixed server-side SQL; no user-supplied SQL/filter fragments
- `Cache-Control: no-store`
- write route remains authenticated and v2-only

## Exit criteria

C6 closes when:

1. direct normalized read contracts pass
2. active runtime contains no legacy table/compatibility-view/fallback read dependency
3. authoring pages do not load Supabase/source-switch/reconciliation legacy runtime
4. C5 v2-only write contracts remain green
5. merged production deployment succeeds
6. production `/api/atlas-read` returns a valid `v2-direct` projection

After C6, Phase C7 performs a repository/runtime zero-dependency inventory before C8 deletes obsolete transitional code.
