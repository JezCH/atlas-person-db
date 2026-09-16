# ATLAS Operations

> `WORK_EXECUTION.md` is the authoritative project-wide execution rule. Older operational wording that requires broader locking, whole-project revalidation, duplicate deployment proof, or full queue replay is superseded.

## 1. Required Production environment

Vercel Production server environment:

- `SUPABASE_DB_URL` — PostgreSQL connection string. Server only.
- `ATLAS_MUTATION_TOKEN` — server-to-server mutation bearer credential.
- `ATLAS_ADMIN_PASSWORD` — human administrator login password.

Recommended:

- `ATLAS_SESSION_SECRET` — independent high-entropy session-signing secret.
- `SUPABASE_DB_CA` — Supabase database CA certificate PEM.

Secrets must never be embedded in browser JavaScript or committed to Git.

`server/atlas-postgres-client.js` remains the runtime DB client boundary. Never bypass the server boundary with browser-side DB credentials.

## 2. Local / CI verification

Install committed dependencies:

```bash
npm ci
```

Run tests proportional to the changed surface.

Typical application/runtime checks:

```bash
npm test
npm run test:runtime
```

Schema verification uses a disposable PostgreSQL database only:

```bash
DATABASE_URL=postgresql://... npm run test:schema
```

Never point schema tests at the live ATLAS database.

Do not rerun unrelated broad suites merely because `main` advanced. Repository-required CI still applies to merged code.

## 3. Change classes and required verification

### A. Research / review / checkpoint only

No queue claim, Production proof, deployment, or runtime smoke is required.

Persist the decision/checkpoint and continue.

### B. Ordinary content/data mutation through an unchanged governed writer

Examples: reviewed representative_domain, NamuWiki reference, ordinary Spatial binding, existing compatible authoring/correction request.

Required:

1. exact target identity or deterministic resolver;
2. the canonical writer's own validation/security contract;
3. apply the reviewed batch;
4. one batched read-back of the changed records.

Do not add a second manual deployment/SHA proof beyond what the writer itself already enforces. If that writer currently fail-closes on exact deployed SHA/OIDC/environment identity, satisfy it; changing that transport contract is a separate CORE task.

### C. Code/UI change without live data mutation

Required:

1. focused tests;
2. repository-required CI;
3. merge.

Verify Production only when the task explicitly requires live behavior verification or when the code cannot be accepted without it.

### D. Schema/runtime/new-or-changed writer contract

Keep the strong gate:

1. reviewed code/migration;
2. required CI;
3. migration/replay safety;
4. exact deployed version when a live mutation depends on the changed code;
5. focused Production smoke/read-back.

### E. Destructive / identity-changing operations

Fail closed. Preserve explicit evidence, rollback/replay planning, conflict handling, and exact postcondition verification.

## 4. Production deployment

A merge to `main` is not automatically a reason to inspect Production.

Use exact-SHA deployment verification when the canonical writer requires it or when correctness depends on newly deployed code, including schema/runtime cutovers, writer/transport changes, or a live UI/API fix being accepted in Production.

For those cases:

```text
required CI
→ merge
→ canonical deployment/writer proof
→ focused smoke/postcondition checks
```

Do not duplicate the proof manually after the writer/workflow already verified the required deployment identity.

Do not repeatedly poll deployment state. Check it only when the operation actually depends on deployment.

## 5. Batching and deployment efficiency

Review long content work in small safe units, normally 5–12 records, and checkpoint each unit.

Release/apply reviewed work in the largest safe superbatch supported by the same writer and contract.

Avoid many tiny commits, PRs, Production runs, or read-backs when one coherent batch provides the same safety.

## 6. Schema baseline and migrations

`db/schema/atlas_v2.current.sql`:

- is for a clean PostgreSQL target;
- contains no application data;
- must not recreate retired legacy tables/views.

Structural change procedure:

1. inspect only the directly affected live dependency surface;
2. write a narrowly scoped migration;
3. prove it on a disposable database / reviewed live procedure;
4. apply with explicit authorization when destructive;
5. update the current baseline;
6. retain historical evidence under `migration/` when useful.

Do not rebuild retired compatibility layers as an intermediate step.

## 7. Data authoring

For reviewed Person × Polity Activity requests, use the current governed authoring contract and exact normalized identities.

Core rules remain:

- UUID is authoritative identity;
- no fuzzy identity creation;
- no historical year `0` or invented placeholder boundary;
- unsupported facts remain unknown;
- Source/provenance is preserved;
- Runtime readiness does not justify mutating historical truth.

Registration completeness may include representative_domain, NamuWiki, Spatial readiness, and other canonical obligations, but review them once and materialize companion payloads in the same completion chain. Do not repeatedly reopen the same Person for already-decided obligations.

Independent writers do not need to become one giant synchronous transaction.

## 8. Duplicate review and merge operations

Candidate review is non-destructive.

Physical identity merge or other destructive identity-changing action must use the governed merge/correction path, never manual SQL deletion.

Before execution, revalidate the specific live evidence/conflict groups involved. Do not rerun unrelated whole-database audits.

## 9. Compile / Runtime operations

Authoritative Authoring remains distinct from compiled/runtime representation.

After a write that actually affects compiled output, rebuild or invalidate only the affected projection as supported by the current compiler contract.

Do not maintain a second manually edited Runtime truth store.

Exact deployed-code proof is required when the canonical runtime/compiler/writer contract requires it or when correctness depends on code changed in the same release. Do not add duplicate proof outside that canonical gate.

## 10. Incident rules

If an endpoint returns `SERVER_CONFIGURATION_ERROR`:

- inspect server environment configuration;
- do not create browser-side fallback credentials.

If it returns `DATABASE_UNAVAILABLE`:

- verify connection/network/Supabase state;
- do not bypass the server boundary.

If Production behavior disagrees with expected source and the task depends on live code:

- identify the deployed version once;
- debug that version, not an undeployed branch.

If authoring returns `MISMATCH`, `COLLISION`, `AMBIGUOUS`, or `UNRESOLVED`:

- correct/review the exact identity or manifest;
- do not bypass the normalized resolver with raw SQL.

## 11. Historical files and queue logs

`migration/` and old issue comments are audit/history.

They are not normal bootstrap inputs when a current checkpoint/snapshot exists.

New conversations follow `WORK_EXECUTION.md`: current resume point → targeted resource check → forward progress. Full historical replay is exceptional recovery work only.
