# ATLAS Person × Polity Database

ATLAS의 인물–정치체 활동 관계를 관리하는 authoring application입니다.

## Current production architecture

Production runtime is normalized-v2 only.

- Read: browser → `GET /api/atlas-read` → server-side direct query of `atlas_v2.*`
- Write: browser/admin → authenticated same-origin session → `POST /api/atlas-mutate` → v2-authoritative transaction → `atlas_v2.*`
- Admin login: `POST /api/atlas-session` issues a signed HttpOnly session cookie
- Browser code does not connect to Supabase directly and does not contain database credentials.
- The retired MVP table `public.person_politics` and compatibility view are not valid application dependencies.

The public API surface is intentionally limited to:

- `api/atlas-read.js`
- `api/atlas-mutate.js`
- `api/atlas-session.js`

## Server environment

Production requires server-side environment variables. Do not expose these in browser JavaScript.

- `SUPABASE_DB_URL` — PostgreSQL connection string used only by server functions / protected workflows
- `ATLAS_MUTATION_TOKEN` — server mutation credential and session signing secret
- `ATLAS_ADMIN_PASSWORD` — human administrator login credential; keep separate from `ATLAS_MUTATION_TOKEN`

Environment changes on Vercel require a new Production deployment.

## Database schema policy

The old root `schema.sql` MVP bootstrap has been retired and must not be recreated or executed. It created `public.person_politics`, which is no longer part of the production architecture.

All current schema evolution must target the normalized `atlas_v2` model through reviewed migrations and protected database workflows. Historical migration/audit evidence is retained under `migration/`, but historical scripts are not production runtime entrypoints.

A fresh database must never be initialized by restoring the retired `public.person_politics` schema as an intermediate application dependency.

## Authoring behavior

The current UI supports:

- create/update/delete person–polity activity relationships
- desktop table and mobile presentation
- search and polity filtering
- Excel import/export
- BCE years as signed integers (`-44` = 44 BCE)
- nullable role semantics
- normalized relationship UUIDs as authoritative update/delete identifiers

Writes fail closed on unresolved/ambiguous exact identities and on new semantic duplicates. No fuzzy automatic merge/delete is performed by the runtime.

## Administration

`admin.html` currently exposes only the minimum authenticated normalized-v2 input path. The old string-based duplicate/audit panel has been retired. A new evidence-based duplicate review system is a separate future feature.

## Migration evidence

Phase 6–8 migration, cutover, observation and retirement evidence is retained under `migration/`. Runtime retirement is guarded by the C7/C8 zero-dependency contract, and final legacy database-object retirement is guarded by C9.
