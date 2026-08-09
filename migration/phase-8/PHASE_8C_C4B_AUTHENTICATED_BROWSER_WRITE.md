# Phase 8C C4B — Authenticated Browser Write Boundary

Status: IMPLEMENTED / NOT YET PRODUCTION-ACTIVATED

## Objective

Prepare the browser-to-server mutation boundary required for bounded production dual-write observation without exposing `ATLAS_MUTATION_TOKEN` or PostgreSQL credentials to browser code.

## Security model

The server keeps `ATLAS_MUTATION_TOKEN` as the internal mutation bearer/signing secret.

Interactive browser authorization uses a separate `ATLAS_ADMIN_PASSWORD` credential. A successful same-origin login to `/api/atlas-session` creates an opaque, signed `atlas_admin_session` cookie with:

- HttpOnly
- Secure
- SameSite=Strict
- Path=/
- bounded lifetime (default 8 hours)

The browser never receives or sends the raw mutation bearer token. The signed session cookie is verified server-side before PostgreSQL is opened. Existing bearer authorization remains available for protected workflows and trusted server-to-server calls.

## Browser adapter

`atlas-server-write-adapter.js` exposes the existing activity-adapter surface:

- createActivity
- updateActivity
- deleteActivity
- importActivities
- reconcileCanonical

It calls `/api/atlas-mutate` with same-origin credentials only. If no valid session exists, it obtains an administrator credential interactively through an injectable credential provider, creates the HttpOnly session, and then performs the mutation. Session expiry causes one bounded re-authentication attempt.

## Deliberate non-activation

This unit does not change `index.html`, `admin.html`, `app.js`, or `admin.js` to select the new adapter. Production legacy browser writes therefore remain unchanged until the required server deployment secret is configured.

Activation requires Vercel production environment variable:

`ATLAS_ADMIN_PASSWORD=<administrator credential>`

`ATLAS_MUTATION_TOKEN` remains server-only and must never be copied into browser config or JavaScript.

## Next unit

After the production administrator credential is configured, switch app/admin/import mutations from `ATLAS_WRITE_ADAPTER` to `ATLAS_SERVER_WRITE_ADAPTER`, retain Supabase anon access for reads only, and begin a bounded production dual-write observation window. The legacy public write RLS policies must then be removed or disabled so the server boundary cannot be bypassed.

No v2-only promotion, read cutover, or destructive legacy retirement is authorized by this unit.
