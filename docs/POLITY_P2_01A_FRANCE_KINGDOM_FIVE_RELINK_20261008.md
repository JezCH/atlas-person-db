# POLITY-P2-01A — Five Royal Activities / pre-1226 Kingdom designation

**Date:** 2026-10-08
**Final status:** CORRECTION_APPLIED / EXACT_PRODUCTION_AND_RUNTIME_READBACK_VERIFIED / NO_DELETION / FRANCE_FAMILY_REVIEW_REQUIRED.

## Narrow historical decision

Earlier #1357 consolidated 21 `Kingdom of France` Person Activities into stable `France` UUID `1eaa48b6-dc60-49d6-91c4-49db556f4ddf` and created 1226–1792, 1814–1815, and 1815–1830 royal `state_form` designations. #1378 retired old Kingdom UUID `2fcc634c-9806-5fe8-96fe-e4310124908a`. The *separate later-created* live Kingdom UUID `7e090994-f196-4957-8295-dcfa08c53fba` holds **five valid Person Activities** and must not be deleted or conflated with the earlier retired UUID.

**Pre-1226 review:** Bibliothèque nationale de France, Philippe II/Philippe Auguste authority (https://catalogue.bnf.fr/ark:/12148/cb11919570s) explicitly dates his French kingship to **1180–1223**. BnF Louis VIII authority (https://catalogue.bnf.fr/ark:/12148/cb11942861k) dates the succeeding reign to **1223–1226**. The 1180–1225 year-granularity interval is therefore a conservative additive *retrospective Kingdom of France state-form display* for the formerly uncovered span preceding the already-reviewed **1226** start. It does **not** silently revise the prior designation, require a new sovereign UUID, claim exact day boundaries, or retroactively assert the modern `rex Franciae` style continuously in 1180 (the royal title itself historically evolved). Existing Hundred Days and 1814/1815 restoration discontinuity unaffected.

## Canonical before-state

Connected Supabase project `wfrbxltvpmlprgwfysxq`; read-only exact current `atlas_v2` facts as of 2026-10-08:

| Person / fact | Activity UUID | Canonical years | Linked normalized Sources |
|---|---|---|---:|
| Philippe II, king | `2b038365-e813-49d9-96f5-b205aa6dc65f` | 1180–1223 | 1, BnF |
| Jacques Cartier, voyage 1 | `e905e9ac-93f5-4344-aaca-0988d38cbd39` | 1534 | 2 |
| Jacques Cartier, voyage 2 | `1ae0c204-97ad-4e5b-aa80-8e39394c43a3` | 1535–1536 | 2 |
| Jacques Cartier, voyage 3 | `15d08c77-e784-4695-8951-c62c2757df1b` | 1541–1542 | 2 |
| Jacques-Louis David, painter | `10d804aa-dd44-44d2-b83d-3dfea8c21482` | 1785 | 1, Louvre |

**Source-link conservation: 8 normalized links; five exact Activity UUIDs, Persons, role IDs, relation types, PeriodBasis IDs, time bounds, calendars and note text unchanged.** Current origin Kingdom: 5 direct Activities; stable France: 32; entire eight-UUID France proper family: 65 Authoring / 65 Runtime, zero identity/date precision drift (P2-01). Origin Kingdom has 2 preferred names, **zero other external live references** across polities relations/governance/territory/place/other person context/retirements. *No approval for deleting those two name rows or the Kingdom record is implied.*

## Atomic reviewed Correction

File: `corrections/plans/polity-france-reintroduced-kingdom-five-relink-20261008.v1.json`

1. Assert/author a new BnF Louis VIII documentary Source (absence guard; do not duplicate an existing Source).
2. Assert a **new**, non-overlapping `France` UUID `state_form` designation, **1180–1225**, preferred EN/KO Kingdom of France / 프랑스 왕국 names, normalized links to existing Philip II BnF Source and new Louis VIII BnF Source. Do **not** update the existing 1226–1792 designation ID `70124d31-f22b-4715-bfd8-99cadc18badb` or either Restoration designation.
3. Exact-before fail-closed `rewrite_activity` for the five Activity UUIDs to stable `France` UUID. Preserve all normalized Sources/locators and precise activity intervals (three Cartier voyages never combined), and all notes as-is.
4. The Correction workflow performs dry-run, authenticated apply, and Baseline A collection, followed by post-commit Runtime compile and independent exact read-back. No raw SQL writes, no retirement/deletion, no territory/Geometry edits.

**Commit invariant after successful apply and Runtime compile:** origin live Kingdom 0 direct Activities, stable France 37, eight-polity family exactly 65; each of five UUIDs resolves to the stable France UUID with identical historical time and 8 normalized source links. New state_form 1180–1225 and existing 1226–1792, 1814/1815 designations must all remain visible.

## Closeout and frontier

Correction applied and exact Production/Runtime read-back verified. **P2-01A is closed**; the next **independent** bounded unit is **P2-01B — French Third Republic (2 Activities) vs generic French Republic (14 Activities)**. Family seed `france-regime-family` remains `REVIEW_REQUIRED`; preserve all 25 current pending seeded reviews. Japan P1-02 stale tombstone 3-row repair and Place P1-03R data gap remain open acceptance blockers. P14 historical Territory Geometry remains user-parked. The current live Kingdom UUID **must not be deleted/retired without explicit user approval**, even after zero direct-Activity state.


## Final Production proof (2026-10-08 09:06:08 UTC / 18:06:08 KST)

- Merged Correction PR **#2157**, `main` commit **`a0352752298053ecde2c4a4c437b2912cf2bd704`**. PR CI **ATLAS Integrity #37754029266 SUCCESS** (full test suite + new five-Activity conservation tests).
- Connected Production Correction ledger `atlas_v2.correction_manifest_runs`: request ID **`polity_france_reintroduced_kingdom_five_relink_20261008_v1`**, committed `2026-10-08 09:06:08.969483+00`. Request identity and exact commit recorded independently, not inferred merely from merged files.
- Canonical Activity count: **new live Kingdom `7e090994…` 5 → 0** and stable France `1eaa48b6…` **32 → 37**; **five exact Activity UUIDs preserved**. None of the original Kingdom Polity's two preferred-name rows was deleted, and its live UUID remains in `atlas_v2.polities` pending explicit user approval for any retirement.
- All five original precise intervals unchanged: Philip II **1180–1223**, Jacques Cartier **1534 / 1535–1536 / 1541–1542**, Jacques-Louis David **1785**. Joined normalized-source link counts **1 + 2 + 2 + 2 + 1 = 8**, preserving their original evidence.
- **New temporal `state_form` UUID `1e6fbfa6-8b97-495f-87c5-bbfef17168a7`** materialized with 1180–1225 year granularity, **two bilingual name rows**, **two source links** including existing BnF Philippe II and newly added BnF Louis VIII institutional-reference UUID `48a4a961-3029-4c44-a4a2-b917027441cf`.
- **Old three** royal `state_form` UUIDs and dates unchanged: `70124d31…` 1226–1792, `719fa6e7…` 1814–1815, `21d2913e…` 1815–1830. Their source/name links remain present. No change to Hundred Days.
- Re-read complete **eight-UUID French family: Authoring 65 / Runtime 65 / 0 difference** for Person UUID, Polity UUID, Role UUID, PeriodBasis UUID, relation type, start/end year/month/day, granularity, certainty and calendar. Exactly **5/5 target Activities** resolve to `France` and their matching Runtime rows are present. All total counts conserved.

**Closure scope:** 5 Activity relinks + 1 additive BnF Source + 1 additive historical designation, not a full France-regime-family closeout. Remain `REVIEW_REQUIRED` at root #1895 (25 pending). Next unit P2-01B; P1-02 Japan tombstones and P1-03R Place remain open, P14 Geometry remains user-parked.
