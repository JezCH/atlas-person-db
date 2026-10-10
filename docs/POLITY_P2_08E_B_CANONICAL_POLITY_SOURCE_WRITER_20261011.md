# POLITY-P2-08E-B — Northern Song canonical direct Polity scholarly Source writer

**2026-10-11 KST — code-only implementation; Production canonical mutation NOT YET APPLIED.**
Parent review #1895; prior P2-08D and P2-08E-A evidence remain authoritative. This unit introduces an exact-before, source-safe **composite Polity–Source** operation inside the **existing** unified Stage2 v2 serializable Correction authority, not an independent SQL writer.

## Existing authenticated Production before-state

Protected Song preflight run **38066554389**, artifact **11674794701**, deployed `b00be80471a401a30a6a79b1448a86d82d4864b3`:

- Song generic `1a1983fd-1850-5756-877c-3d2c17b85e1f` — 2 direct Activities, 2 legacy Polity Sources.
- Northern Song `407d91cf-7a97-45e3-81ea-d42a3cbfba35` — 7 direct Activities, **0 direct Polity Sources**.
- Southern Song `fe073a4c-d967-56e2-bb31-f74bdde1af87` — 5 direct Activities, 1 legacy Polity Source.
- All three retain **14** Activities and **21** Activity–Source joins. The two remaining generic Song Activities are Taizu and Shenzong, scholarly-backed in P2-08D.
- Existing normalized Cambridge **Ari Levine Northern Song** Source UUID `a8766516-351a-4162-b477-0396f468eafe`, exactly URL:
  `https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54`.
- `atlas_v2.polity_sources` has **only** `polity_id uuid NOT NULL, source_id uuid NOT NULL` and a composite PK. It **does not** contain a locator, unique row UUID or extra identity.
- `polity_identity_relation_types` has **zero** live rows; there is no supported current vocabulary to assert a Song continuity relation. Structural dependency types are semantically inappropriate.

These facts establish a reviewed *candidate* for **one direct Northern Song Source join**, but are not a substitute for a new exact deployment/current live before-state.

## Writer and authorization boundary

The unified Correction v2 canonical authority now supports `assert_polity_source_link` in `stage2_assertions` of an approved execution plan. Normalized operation:

```json
{
  "type": "assert_polity_source_link",
  "decision_id": "song-northern-scholarly-polity-provenance",
  "exact_before": {
    "link_absent": {
      "polity_id": "407d91cf-7a97-45e3-81ea-d42a3cbfba35",
      "source_id": "a8766516-351a-4162-b477-0396f468eafe"
    }
  },
  "exact_after": {
    "link": {
      "polity_id": "407d91cf-7a97-45e3-81ea-d42a3cbfba35",
      "source_id": "a8766516-351a-4162-b477-0396f468eafe"
    },
    "source_canonical_url": "https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54"
  }
}
```

This is a **non-executable illustration** until authored as a separately reviewed `corrections/plans/*.json` release, after exact SHA Production readiness. The implementation performs the following:

1. Validate exact existing Polity/Source UUIDs, URL and absent composite before-state. Reject fabricated `source_locator_key` and join UUID.
2. On the **same SERIALIZABLE, request-ledger protected** Correction transaction, lock and check both parent IDs and source canonical URL; fail closed if the pair already exists or the bibliography differs.
3. Insert **one** `(polity_id, source_id)` pair; do not recreate a Source, delete a link or touch an Activity.
4. Extend global exact-before/after count assertion to `polity_sources` and verify the exact readback/replay of pair + canonical URL. Duplicate assertion IDs are blocked using composite identity.
5. Permit source-only/Activity-free approved Stage2 plans through both transport validation and protected OIDC Correction Apply workflow. Source creation *alone* remains disallowed as an assertion-only correction.

No direct DB access or alternate writer was introduced. No `corrections/plans/*.json` executable input is created in this PR, so no automatic Production mutation should be triggered.

## Pending gates and sequence

**Gate 1 — deploy/read:** CI validate this code, merge if green, obtain Vercel Production READY on the exact current main commit. Vercel previously rejected API production deployment HTTP 402 `api-deployments-free-per-day` with 24-hour retry; do not bypass quotas or relax SHA/OIDC. Re-run the P2-08E-A protected read-only Song audit only when exact deployed SHA matches its invocation; retain the earlier `b00be804...` artifact as valid historical source evidence.

**Gate 2 — one exact source-link commit:** after verifying current absence, exact existing Source UUID + URL and no foreign drift, create the explicit source-only Correction plan (with two complete `execution_rules` flags set to `false`), exercise dry run, then the governed single canonical apply. The only permitted count delta is **`polity_sources:+1`**. Check 14 Song Activities, original 21 Activity Sources, all existing Polity Sources, and public Northern Song bibliography unchanged except this addition. No manual SQL.

**Gate 3 — historical continuity modeling:** separate controlled-vocabulary/schema review before any `assert_polity_identity_relation`. Do **not** invent `successor_of` or use `vassal_of`/structural types to represent continuing Zhao Song dynastic lineage. Northern and Southern Song separate operated political entities remain KEEP_SEPARATE. Do not retire the generic dynasty, delete it, or relink its two remaining reign Activities without explicit user approval.

**Global completion:** 75 seeded reviews / 63 terminal / 12 REVIEW_REQUIRED remains unchanged. Then Japan tombstone, Place Production authority, France retirement approvals, Swedish designation, fresh entire-Production unseeded anomaly discovery, and verified Authoring–Runtime identity/source/read parity. P14 geometry is parked outside this scope.

All code changes are **non-destructive preparation** only. `POLITY-P2-08E-B` remains OPEN until accepted exact Production mutation and readbacks.
