# ATLAS Operations

## 1. Required Production environment

Vercel Production server environment:

- `SUPABASE_DB_URL` — PostgreSQL connection string. Server only.
- `ATLAS_MUTATION_TOKEN` — server-to-server mutation bearer credential.
- `ATLAS_ADMIN_PASSWORD` — human administrator login password.

Recommended before the next Production release:

- `ATLAS_SESSION_SECRET` — independent high-entropy session-signing secret.
- `SUPABASE_DB_CA` — Supabase database CA certificate PEM.

Environment variables must never be embedded in browser JavaScript or committed to Git.

### Session-secret migration

Current code prefers `ATLAS_SESSION_SECRET`. If it is absent, it temporarily falls back to `ATLAS_MUTATION_TOKEN` so an existing Production deployment is not broken merely by the code rollout.

Operational target:

1. Generate a new independent high-entropy value.
2. Configure `ATLAS_SESSION_SECRET` in Vercel Production.
3. Redeploy Production.
4. Existing browser sessions signed by the old fallback secret become invalid and admins log in again.
5. Server bearer clients continue using `ATLAS_MUTATION_TOKEN` unchanged.

The fallback exists only for migration compatibility; new environments should set both secrets independently.

### PostgreSQL TLS hardening

`server/atlas-postgres-client.js` is the single runtime DB client boundary.

If `SUPABASE_DB_CA` is configured, certificate verification is enabled (`rejectUnauthorized: true`). Obtain the current Server root certificate from the Supabase database SSL settings; do not invent or copy a certificate from another project.

Without `SUPABASE_DB_CA`, the client currently preserves the already-deployed TLS compatibility mode. The operational target is to configure the project CA and, where appropriate, enable Supabase SSL enforcement/verify-full behavior.

For Vercel/serverless traffic, use the Supabase connection method appropriate for transient connections; keep prepared-statement limitations of transaction pooling in mind if the client/query strategy changes later.

## 2. Local / CI verification

Install exactly the committed dependencies:

```bash
npm ci
```

Run application contracts:

```bash
npm test
npm run test:runtime
```

Schema verification needs a disposable PostgreSQL database:

```bash
DATABASE_URL=postgresql://... npm run test:schema
```

Never point `test:schema` at the live ATLAS database. The baseline intentionally requires a clean target.

## 3. Pull request release gate

Before merge:

1. PR is based on current `main`.
2. `.github/workflows/atlas-integrity.yml` succeeds on the exact PR head.
3. No unresolved review thread blocks the change.
4. DB structure changes include both a reviewed migration strategy and an updated `db/schema/atlas_v2.current.sql`.
5. No data-destructive live DB action is hidden inside ordinary CI.

## 4. Production deployment

A merge to `main` is not itself proof that Production changed.

Release sequence:

```text
PR exact head PASS
→ merge to main
→ determine exact main SHA
→ Vercel Production deploy that SHA
→ verify deployed SHA/status
→ smoke current API boundaries
```

Minimum smoke expectations after a current deployment:

- `GET /api/atlas-read` → 200, `source: v2-direct`.
- `GET /api/atlas-session` → 200 JSON and authenticated true/false, not function crash.
- protected endpoint without auth → 401, not 500.
- admin page exposes authentication gate before protected tools.

Do not run candidate rebuild, identity creation, or other writes against a stale Production deployment.

## 5. Vercel deployment quota

Avoid pushing many tiny commits solely to trigger deployments. Complete a coherent unit locally/CI first, then push a small number of reviewed heads. If Vercel reports a deployment/build quota limit, stop retrying and wait for the platform limit rather than creating junk commits.

## 6. Schema baseline and migrations

`db/schema/atlas_v2.current.sql`:

- is for a **clean PostgreSQL target**;
- rejects an already-existing `atlas_v2` schema;
- contains no application data;
- must not recreate retired legacy tables/views.

Future structural change procedure:

1. inventory the live dependency surface when needed;
2. write a narrowly scoped migration;
3. prove it on a disposable database / reviewed live procedure;
4. apply only with explicit authorization when destructive;
5. update current baseline to the resulting schema;
6. keep historical evidence under `migration/`.

Never rebuild the retired MVP schema as an intermediate compatibility step.

## 7. Data authoring sequence

For a genuinely new historical object:

```text
Create/verify Person identity
Create/verify Polity identity
Create/verify Role vocabulary if needed
→ create activity relationship
→ inspect read projection
→ rebuild duplicate candidates when review is desired
```

If a Person/Polity name collision is reported, review the existing identity instead of bypassing it with direct SQL.

## 8. Duplicate merge operations

- Candidate rebuild is non-destructive.
- Review decision is non-destructive.
- Actual approved merge is destructive to the source Person and must use the application merge executor, never manual table deletion.
- Relationship conflict groups require explicit resolution.
- After merge, verify audit and candidate state.

## 9. Incident rules

If an endpoint returns `SERVER_CONFIGURATION_ERROR`:

- inspect server environment variables;
- do not create browser-side fallback credentials.

If it returns `DATABASE_UNAVAILABLE`:

- verify connection string/network/Supabase state;
- do not bypass the server boundary with direct browser DB access.

If Production behavior disagrees with GitHub `main`:

- identify the deployed SHA first;
- do not debug as though the undeployed source were live.

## 10. Historical files

`migration/` is audit/history. Root runtime and current docs are the active source of truth. Completed one-time migration scripts may be retained only when they are useful audit evidence; they must not be treated as reusable production entrypoints.
