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

Stage 2 is an additive semantic extension driven by the reviewed ATLAS domain model, not a repair of a four-field Production key.

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

This distinction is essential. A source upgrade from `approximate` to `exact`, or a confidence improvement after better research, must update the evidence attached to the same Activity rather than manufacture a new Activity UUID.

`content_hash` also remains content/idempotency evidence. It is not repurposed as the authoritative semantic identity.

## Why calendar is semantic

Calendar is retained in the temporal boundary identity because the same numeric year/month/day under different calendars can represent a different historical instant. Boundary certainty is excluded because it describes our epistemic confidence in that boundary, not the boundary's intended historical interpretation.

## Relation Type is mandatory for a v2-ready key

There is no automatic default such as `active_in` or `serves`.

An existing row whose historical Relation Type is unresolved remains representable in the additive Stage 2 schema, but it is **not Stage 2 semantic-key ready**. This preserves the ATLAS principle that unknown historical meaning is not filled by inference merely to satisfy a Runtime or database constraint.

## PostgreSQL rehearsal

`db/proposals/stage2_activity_semantic_key.rehearsal.sql` adds a rehearsal-only partial unique index over the actual semantic components.

The index:

- uses `NULLS NOT DISTINCT`, so NULL Role remains a real semantic component;
- includes Relation Type;
- includes complete start/end boundary interpretation;
- excludes certainty/content/provenance fields;
- applies only to rows with the minimum Stage 2 relation and temporal fields required for a ready identity.

The partial predicate is intentional. It permits current pre-cutover/unresolved rows to coexist while historical review and structural corrections are completed. It must not be interpreted as permission to leave future authoritative writes semantically incomplete after cutover.

The database index uses the real columns rather than a hash-only unique key. A hash may be used for advisory locking, fingerprints, cache keys, or diagnostics, but hash collision behavior must never become the final authority for historical identity.

## Rehearsal acceptance cases

The verifier proves on fresh PostgreSQL that:

- identical semantic identity with only certainty/confidence/notes changed is rejected as a duplicate;
- changing Relation Type produces a distinct Activity;
- changing year precision to a reviewed day boundary produces a distinct Activity;
- changing calendar produces a distinct boundary interpretation;
- NULL Role duplicates are still rejected;
- unresolved pre-cutover rows with NULL Relation Type remain representable;
- no Production migration is registered.

## Active-path cutover points

The following active paths intentionally remain v1 until additive schema deployment and reviewed historical backfill are ready:

1. `atlas-activity-semantics.js`
   - browser/admin normalized lookup key
2. `atlas-v2-command-planner.js`
   - request normalization and planned semantic identity
3. `atlas-admin-write-service.js`
   - direct-read matching before create/update
4. `server/atlas-postgres-v2-authoritative-transaction.js`
   - advisory semantic locks, duplicate query, create/update verification
5. `server/atlas-authoring-manifest-service.js`
   - inherits the authoritative transaction; approved historical `request_id` records must not be silently reinterpreted under a new manifest meaning
6. `server/atlas-relationship-reconciliation.js`
   - Phase 9 relationship conflict grouping must eventually include Relation Type and the full temporal boundary
7. `server/atlas-person-merge-service.js`
   - merge snapshots, live reconciliation, replay/audit behavior must use the same final Activity meaning

The cutover must be one coherent contract transition. Updating only one of these paths would recreate the semantic drift the maintenance work was designed to eliminate.

## Cutover prerequisites

Production activation remains blocked until, at minimum:

- the additive Stage 2 schema is reviewed and deployed;
- reviewed Relation Types are backfilled only where historically justified;
- structural split/relink/retire corrections are completed first where required;
- identity/continuity decisions that affect Activity targets are resolved;
- sub-year corrections such as the reviewed Yoshida split can be written correctly;
- authoring replay and correction manifests have an explicit versioned transition path;
- Phase 9 reconciliation/merge semantics are updated and re-proven;
- Production SHA deployment and post-deploy verification are possible.

## Conclusion

Stage 2 Activity identity is now defined as historical meaning rather than evidence quality:

`Person + Polity + Relation Type + Role + Period Basis + interpreted start boundary + interpreted end boundary`.

The contract is designed to preserve uncertainty without turning uncertainty into a duplicate identity dimension. The current Production writer remains unchanged until the historical data and all dependent active paths can move together.
