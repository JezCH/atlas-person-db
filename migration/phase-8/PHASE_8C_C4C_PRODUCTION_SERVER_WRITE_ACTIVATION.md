# Phase 8C C4C — Production Server Write Activation

Status: PREPARED / BLOCKED ON PRODUCTION ADMIN CREDENTIAL

## Objective

Switch all current authoring/admin/import mutations from browser-direct Supabase legacy writes to the authenticated C3 server mutation service, then remove anonymous/client write authority on `public.person_politics` so the server boundary cannot be bypassed.

## Runtime activation

After this change is deployed:

- `index.html` loads `atlas-server-write-adapter.js`
- `app.js` selects only `ATLAS_SERVER_WRITE_ADAPTER`
- create/update/delete/Excel import use `/api/atlas-mutate`
- `admin.html` loads only the server write adapter for mutation work
- `admin.js` uses Supabase anon only to look up an existing legacy row id
- admin create/update goes through the authenticated server adapter
- legacy `atlas-write-mode`, browser `atlas-write-adapter`, and v2 shadow compiler are no longer loaded by authoring/admin production pages

The old files remain in the repository only as transitional cleanup debt until zero-runtime-dependency verification.

## Required deployment prerequisite

Before merging this activation PR, configure the Vercel Production environment variable:

`ATLAS_ADMIN_PASSWORD=<administrator credential>`

Do not reuse or expose `ATLAS_MUTATION_TOKEN`; it remains server-only.

After changing a Vercel environment variable, create a new Production deployment so the Function runtime receives the new value.

## Public legacy write lockdown

After the activated deployment is confirmed, run the protected workflow:

`Phase 8C C4C Lock Down Public Legacy Writes`

against the exact production activation SHA with confirmation:

`PHASE8C_C4C_LOCKDOWN_PUBLIC_WRITES`

The migration:

- requires the expected read policy to exist
- removes the three known public write policies
- revokes INSERT/UPDATE/DELETE from PUBLIC, anon and authenticated roles where applicable
- fails if any unexpected write-capable RLS policy remains
- requires at least one SELECT policy to remain
- does not delete or alter any data

Rollback SQL is retained separately and is not executed automatically.

## Observation

Once both the activated deployment and RLS lockdown are complete, bounded dual-write observation can start. During the observation window, every accepted app/admin/import mutation must report legacy committed + v2 committed + parity match. No v2-only promotion occurs until observation is clean and the optional-role contract is resolved.
