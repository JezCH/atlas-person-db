# Stage 2 Activity Semantic Key v2 — 2026-08-12

## Status

**REHEARSAL / CONTRACT ONLY — NO PRODUCTION MUTATION**

This step does not replace the current authoritative Activity key in Production. It proves the next semantic identity contract on fresh PostgreSQL before any schema migration, historical backfill, replay cutover, or merge cutover is authorized.

## Current v1 is not broken

The active repository already shares a six-dimension Activity meaning across the browser/import planner and authoritative PostgreSQL writer:

- Person
- Polity
- activity start year
- activity end year
- Role, including deliberate NULL Role
- Period Basis

Stage 2 is a semantic extension driven by the reviewed ATLAS domain model, not a repair of a four-field Production key.

## Stage 2 semantic identity

A ready Stage 2 Person–Polity Activity is uniquely identified by:

1. Person UUID
2. Polity UUID
3. Person–Polity Relation Type UUID
4. Role UUID or NULL
5. Period Basis UUID
6. Start historical boundary
   - year
   - month when granularity requires it
   - day when granularity requires it
   - granularity (`year / month / day`)
   - calendar
7. End historical boundary with the same components

The semantic key is versioned as `atlas-activity-semantic-key/v2`.

## Deliberately excluded from identity

The following are evidence/content state, not Activity identity:

- boundary certainty
- evidence confidence
- chronology status
- notes
- source/provenance links and locators
- display names / aliases / canonical text labels
- `content_hash`

A source upgrade from `approximate` to `exact`, or a confidence improvement after better research, must update evidence attached to the same Activity rather than manufacture a new Activity UUID. `content_hash` remains content/idempotency evidence and is not the authoritative semantic identity.

## Why calendar is semantic

Calendar is retained in temporal boundary identity because the same numeric date under different calendars can represent a different historical instant. Boundary certainty is excluded because it describes our epistemic confidence, not the intended historical boundary itself.

## Relation Type is mandatory for a v2-ready key

There is no automatic default such as `active_in` or `serves`.

A row whose historical Relation Type is unresolved remains representable before cutover, but it is **not Stage 2 semantic-key ready**. Unknown historical meaning is not filled merely to satisfy a Runtime or database constraint.

## Legacy NULL-Role index replacement is mandatory

The first full PostgreSQL rehearsal exposed an important cutover dependency.

The current v1 schema contains:

`person_politics_v2_null_role_semantic_uidx`

Its NULL-Role uniqueness is based on:

`Person + Polity + start year + end year + Period Basis`

It predates Relation Type and sub-year boundaries. Therefore two historically distinct Stage 2 Activities such as:

- same Person / Polity / years / Period Basis / NULL Role + `rules`
- same Person / Polity / years / Period Basis / NULL Role + `serves`

would be incorrectly rejected by the old index before the v2 identity rule can apply.

The final cutover consequently cannot just stack a new index on top of the old one. The reviewed v1 NULL-Role index must be replaced by the v2 semantic index in the same coordinated migration/cutover transaction.

The rehearsal SQL performs this replacement only on disposable PostgreSQL and intentionally fails if the expected legacy index is absent. **No Production index has been dropped or changed.**

## PostgreSQL rehearsal

`db/proposals/stage2_activity_semantic_key.rehearsal.sql` rehearses:

1. exact removal of the reviewed v1 NULL-Role semantic index;
2. creation of the v2 partial unique index over the real semantic columns.

The v2 index:

- uses `NULLS NOT DISTINCT`, so NULL Role remains a real semantic component;
- includes Relation Type;
- includes complete start/end boundary interpretation;
- excludes certainty/content/provenance fields;
- applies only to rows with the minimum Stage 2 relation and temporal fields required for ready identity.

The partial predicate allows pre-cutover/unresolved rows to remain representable while historical review is incomplete. It is a transition capability, not permission for post-cutover authoritative writes to remain incomplete.

The index uses real columns rather than a hash-only unique key. Hashes may support locks/fingerprints/cache diagnostics, but hash collision behavior must never become historical identity authority.

## Rehearsal acceptance cases

The verifier proves on fresh PostgreSQL that:

- the exact reviewed v1 NULL-Role index exists before transition;
- the legacy index is removed in the isolated rehearsal;
- identical semantic identity with only certainty/confidence/notes changed is rejected;
- changing Relation Type produces a distinct Activity even with NULL Role;
- changing temporal precision produces a distinct Activity;
- changing calendar produces a distinct boundary interpretation;
- NULL-Role duplicates under the same v2 relation are still rejected;
- unresolved pre-cutover rows with NULL Relation Type remain representable;
- no Production migration is registered.

## Active-path cutover points

The following active paths intentionally remain v1:

1. `atlas-activity-semantics.js` — browser/admin lookup key
2. `atlas-v2-command-planner.js` — request normalization/planned identity
3. `atlas-admin-write-service.js` — direct-read matching
4. `server/atlas-postgres-v2-authoritative-transaction.js` — locks, duplicate query, create/update verification
5. `server/atlas-authoring-manifest-service.js` — inherits authoritative transaction; approved historical `request_id` records cannot be silently reinterpreted
6. `server/atlas-relationship-reconciliation.js` — Phase 9 conflict grouping
7. `server/atlas-person-merge-service.js` — merge snapshots/reconciliation/replay/audit

The cutover must be coherent. Updating only one path would recreate semantic drift.

## Cutover prerequisites

Production activation remains blocked until, at minimum:

- the Stage 2 schema and exact v1-index replacement migration are reviewed together;
- Relation Types are backfilled only where historically justified;
- structural split/relink/retire corrections are completed first where required;
- identity/continuity decisions affecting Activity targets are resolved;
- sub-year corrections such as Yoshida can be represented correctly;
- authoring replay and correction manifests have an explicit versioned transition path;
- Phase 9 reconciliation/merge semantics are updated and re-proven;
- Production SHA deployment and post-deploy verification are possible.

## Conclusion

Stage 2 Activity identity is:

`Person + Polity + Relation Type + Role + Period Basis + interpreted start boundary + interpreted end boundary`.

The first real rehearsal also proved that the legacy NULL-Role uniqueness rule is an explicit cutover dependency. That dependency is now documented and tested instead of being hidden until Production migration time.
