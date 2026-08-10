# Phase 8C C5A — V2 Authoritative Writer Proof

Status: IMPLEMENTED / NOT PRODUCTION-ACTIVATED

## Objective

Prove a real committed v2-only persistence implementation before changing the production mutation handler.

C4E proved the current authenticated dual-write production path. C5A proves the replacement persistence path can commit the same core mutation shapes while `public.person_politics` remains byte-for-byte semantically unchanged.

## Authoritative identity

Production reads already use `public.atlas_person_politics_compat_v1`, and that projection exposes `atlas_v2.person_politics_v2.id` as `id`.

Therefore C5 establishes the normalized relationship UUID as the authoritative update/delete identifier. The v2-only writer does not translate normalized IDs back into legacy IDs.

## V2-only writer

`server/atlas-postgres-v2-authoritative-transaction.js`:

- contains no reference to `public.person_politics`
- contains no compatibility-view persistence dependency
- resolves person, polity, optional role and period basis by exact reviewed vocabulary only
- writes only `atlas_v2.person_politics_v2`
- create/import idempotency key: `v2-runtime:<request_id>:<row_index>` stored in the transitional `legacy_source_key` column
- direct-write source locator kind: `phase8c_v2_authoritative`
- direct-write confidence: `direct_asserted`
- chronology status: `exact_as_recorded`
- semantic payload hash recorded at creation
- update preserves creation provenance fields
- delete/update use normalized relationship UUID directly
- new semantic collisions fail closed
- historical pre-existing semantic duplicates are not rewritten; unchanged updates do not manufacture a new collision
- semantic advisory lock closes same-tuple concurrent create races even where historical data prevents a global non-null semantic unique index

`server/atlas-v2-authoritative-mutation-service.js`:

- uses the existing deterministic planner for normalization and validation
- reports `write_mode: v2-only`
- explicitly reports legacy attempted=false / committed=false
- verifies normalized persistence before transaction commit
- blocks mutating reconciliation with `RECONCILIATION_NORMALIZED_INPUT_REQUIRED` until reconciliation input is converted to normalized identity in the read/reconciliation cutover phase

## Protected committed proof

The protected proof commits synthetic rows through independent PostgreSQL transactions and checks them from a separate connection.

Required assertions:

- public legacy write policies remain zero
- baseline legacy -> compatibility missing rows = zero
- full ordered legacy rowset digest captured before test
- v2-only null-role create commits and is compatibility-visible
- normalized UUID returned and used for all subsequent update/delete operations
- null -> reviewed role update commits
- reviewed role -> null update commits
- mixed import (null role + reviewed role) commits
- direct provenance metadata is present
- legacy row count and full rowset digest remain unchanged after every committed operation
- normalized/compatibility counts increase only by synthetic v2 rows
- all synthetic rows delete through the same v2-only writer
- final normalized/compatibility/legacy counts return exactly to baseline
- zero normalized/compatibility/legacy synthetic residue
- fallback cleanup is not used on PASS

## Deliberate non-activation

C5A does not modify `server/atlas-vercel-mutation-handler.js`, app/admin runtime selection, or reader behavior. Production remains on the already proven dual-write path until this committed proof passes.

After PASS, C5B will switch the production server handler and browser success/ID semantics to v2-only, change admin exact-ID lookup to the v2 compatibility projection, and remove production reachability of the legacy writer. Direct normalized reads remain C6.
