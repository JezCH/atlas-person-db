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
4. DB structure changes include both a reviewed migration strategy and an updated `db/schema/atlas_v2.current.sql` when they become Production-authorized.
5. No data-destructive live DB action is hidden inside ordinary CI.
6. If GitHub branch/ruleset protection is actually enforceable, it must require `ATLAS Integrity`.
7. If protection is unavailable for the current private-repository/account configuration, do not create a decorative non-enforced ruleset. Instead use the fail-closed release procedure below.

Current protection availability decision: `docs/release/P0_MAIN_PROTECTION_AVAILABILITY_2026-08-12.md`.

### Fail-closed release procedure when GitHub protection is unavailable

All of the following are mandatory:

- exact PR head SHA has green `ATLAS Integrity`;
- unresolved review threads are zero;
- merge uses the exact expected head SHA so a moved PR cannot be merged accidentally;
- resulting `main` SHA is read after merge;
- no Production mutation occurs until Vercel Production proves that exact `main` SHA;
- authoring/correction/audit transports continue to reject SHA mismatch.

If any proof is missing, stop. Green CI on some other SHA is not sufficient.

## 4. Production deployment

A merge to `main` is not itself proof that Production changed.

Release sequence:

```text
PR exact head PASS
→ exact-head merge to main
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

Authoring transport 변경이 포함된 release에서는 `.github/workflows/atlas-authoring-apply.yml`이 exact Production SHA를 기다린 뒤 기존 approved manifest를 idempotent replay하는 것도 확인합니다. replay는 새 historical row를 만들면 안 됩니다.

Do not run candidate rebuild, identity creation, or other writes against a stale Production deployment.

## 5. Vercel deployment quota

Avoid pushing many tiny commits solely to trigger deployments. Complete a coherent unit locally/CI first, then push a small number of reviewed heads. If Vercel reports a deployment/build quota limit, stop retrying and wait for the platform limit rather than creating junk commits.

Production-dependent operations are grouped into release trains. Branch-only requirements, research, rehearsals and CI should be exhausted first, but unrelated future product migrations must not be stuffed into Train 1 just because they can be drafted without Production access.

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

### Preferred GitHub/ChatGPT route

For a reviewed new Person × Polity Activity request, create one `authoring/requests/*.json` manifest.

Use `atlas-authoring-manifest/v2` for new work:

```text
reviewed manifest
→ create/reuse Person
→ optional create/reuse Polity
→ optional create/reuse Role
→ create Activity
→ write authoring audit ledger
→ commit all or rollback all
```

- If the Polity already exists, omit `polity_identity` and reference its exact normalized name in `activity.politic_name`.
- If the Role already exists, omit `role_identity` and reference an exact resolver token in `activity.role`.
- If either vocabulary item is genuinely new, declare it in the same v2 manifest.
- Declared Polity/Role identity and Activity reference must match exactly; do not use fuzzy inference to connect them.
- `review_status` must be `approved` before the Production workflow will select the manifest.
- Stable `request_id` makes exact replay idempotent; never recycle a request id for changed content.
- Historical year `0` is invalid. Unknown boundary is not encoded as 0 or an arbitrary placeholder year.

Existing v1 manifests remain valid but cannot declare new Polity/Role identities.

### Admin route

Interactive administrators may still create Person/Polity/Role through `/api/atlas-identity` and then create the Activity through `/api/atlas-mutate`.

If a Person/Polity name collision is reported, review the existing identity instead of bypassing it with direct SQL.

After authoring, inspect the normalized read projection and rebuild duplicate candidates when review is desired.

### Final product authoring boundary

The current Person × Polity writer is not the whole final Authoring System. P13 must add the established first-class Person / Place / Source object workflows and explicit Compile → Runtime projection without replacing normalized UUID identity with UI strings.

Important operational rules for that phase:

- optional Person profile facts remain unknown when unsupported;
- Place is reusable and separate from Polity/Territory;
- Source citation metadata is separate from assertion locators and file/hash metadata;
- a Person Activity with an unresolved boundary remains Authoring/review state rather than receiving a fake year;
- AI research creates reviewed candidates only and uses the same normalized writer after approval;
- Runtime consumes compiled readiness state, not every raw Authoring assertion.

## 8. Duplicate review and merge operations

### Current state

- Candidate rebuild is active and non-destructive.
- MERGE / KEEP_SEPARATE / REVIEW decisions are active and non-destructive.
- **Physical Person merge is currently disabled** until final semantic-key-v2 reconciliation and P10 candidate revalidation are both active.
- The server returns `PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION` before opening a DB connection for an attempted early `EXECUTE_APPROVED_MERGE`.
- The Admin UI consumes the same server lifecycle state and must not offer survivor/relationship execution controls while `allowed=false`.

### P10 execution state

Only after P10 revalidation:

- actual approved merge is destructive to the source Person and must use the application merge executor, never manual table deletion;
- survivor Person is explicit;
- relationship conflict groups require explicit v2-aware resolution;
- live evidence is revalidated;
- provenance/claims/descriptions are preserved;
- the whole merge is SERIALIZABLE and audited;
- after merge, verify audit and rebuild candidate state.

Do not re-enable the UI merely because P9 code exists. Both reconciliation semantic version **and** P10 lifecycle version must be ready.

## 9. Compile / Runtime operations

Current `/api/atlas-read` is a transitional direct projection from normalized Authoring data.

Final P13 release acceptance requires:

```text
Authoring data
→ deterministic Compile/readiness validation
→ Runtime projection/materialization
→ list/search/detail consumers
```

Compiler rules must be deterministic and reproducible from authoritative Authoring UUIDs/assertions. An assertion rejected as Runtime-not-ready must remain reviewable in Authoring and must not be mutated merely to satisfy Runtime convenience.

After any authoritative write that changes compiled output, the accepted runtime flow must either recompile deterministically or invalidate/rebuild the affected projection. Do not maintain a second manually edited Runtime truth store.

## 10. Incident rules

If an endpoint returns `SERVER_CONFIGURATION_ERROR`:

- inspect server environment variables;
- do not create browser-side fallback credentials.

If it returns `DATABASE_UNAVAILABLE`:

- verify connection string/network/Supabase state;
- do not bypass the server boundary with direct browser DB access.

If Production behavior disagrees with GitHub `main`:

- identify the deployed SHA first;
- do not debug as though the undeployed source were live.

If authoring returns an identity/reference `MISMATCH`, `COLLISION`, `AMBIGUOUS`, or `UNRESOLVED` error:

- correct or review the manifest/vocabulary;
- do not bypass the normalized identity resolver with raw SQL.

If physical merge returns `PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION`:

- this is the intended lifecycle gate, not a schema failure;
- keep review decisions, but do not attempt manual deletes or bypass the interlock.

## 11. Historical files

`migration/` is audit/history. Root runtime and current docs are the active source of truth. Completed one-time migration scripts may be retained only when they are useful audit evidence; they must not be treated as reusable production entrypoints.
