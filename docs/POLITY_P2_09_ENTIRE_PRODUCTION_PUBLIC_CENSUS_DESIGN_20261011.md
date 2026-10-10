# POLITY-P2-09 — All-Production Public Polity Census (one verified layer of final program audit)

**2026-10-11 KST — repeatable independent read-only full-population census; NOT a claim of full canonical database/Authoring parity.**

## The actual overall closure target

#1895 closes only after (a) original **75 audited seeds**, including **12 REVIEW_REQUIRED** as of today, reach source-backed terminal verdicts; (b) Japan tombstones / Place authority / France leftover approval / Sweden temporal designation are accepted in Production; (c) **all** live Production Polities, including those never included in the original seeds, receive a fresh identity, source, time, naming, orphan and collision census; and (d) **Authoring→Runtime** UUID/source/name/result parity is verified. User has parked P14 geometry.

## Public full-population layer, no database access

This unit adds `scripts/audit-polity-public-production-census.mjs` and [protected-only-by-GitHub-public-read] `.github/workflows/atlas-polity-p2-09-public-production-census.yml`.

- Single public `/api/atlas-read?__atlas_read_surface=polity` request enumerates the **entire** returned Polity list (not sample 50/seed-only). GET public Runtime identity before/after, fail if the `main` deployed SHA moves during capture.
- Strictly require `atlas-polity-read/v1`, counts matching public summary, unique Polity UUID, each complete public Activities array; compare true total Polities, linked/orphan Polities, unique Person UUIDs, unique Activity UUIDs, and reported unresolved chronology count. Treat malformed responses as a **failed audit**, not success.
- Classify **candidate** exact preferred Korean names colliding across distinct UUIDs, exact English names, orphan/no-Activity Polities, invalid/reversed Activity year bounds, unresolved starts/ends (ongoing handled separately), missing preferred Korean/English names and duplicate Activity UUID owners across Polities.
- Preserve **every candidate and entire original public snapshot** as 90-day immutable workflow artifact with numeric summary and exact deployed SHA. A Korean homonym does **not** license automatic merging, and an orphan Polity does **not** license retirement; periodized separate Identities may intentionally share display labels.
- Reusable Node standard-library-only analyzer with fixture tests; no DB writes, no new data rows, no Source/editor/API secret required.

## Explicit source/authority limits and next gates

The public Polity surface returns Activities, Names, and some governance context. It **does not expose** the internal normalized `sources`, `polity_sources`, `polity_identity_relations`, `polity_identity_retirements`, all raw authoring provenance and direct full Source joins. Consequently **this is full-population PUBLIC census only**; it cannot be presented as the completion of the mandatory **canonical Production Source/tombstone/identity** audit. The next protected read-only OIDC and SQL-schema-complete authority scan must separately cover those records (with no unauthorized mutation), and compare the emitted authoritative rows to Runtime projections.

**Release:** only after Integrity CI success, merge and inspect the actual Production workflow's artifact. Document measured current baseline and triage emerging unseeded candidates as **new open reviews**, without altering 75/63/12 until a verified and accepted explicit registry change. The 75 seed count is not the total Polity count or a completed audit census.
