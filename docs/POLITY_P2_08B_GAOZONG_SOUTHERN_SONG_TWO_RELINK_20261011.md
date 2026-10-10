# POLITY-P2-08B — Song Gaozong two-reign owner correction, limited exact UUID relinks

**2026-10-11 KST | Correct exactly two existing Person Activities from the generic Song dynasty Polity to the already-existing Southern Song Polity; do not retire or delete any Polity or Person.**

## Authority

- [Original case P2-07D](POLITY_P2_07D_NORTHERN_SOUTHERN_SONG_CONTINUITY_AND_OWNERSHIP_20261010.md) adjudicated `northern-southern-song` as distinct operated-period entities within the continuous Song dynasty. The historical Song umbrella remains meaningful and cannot be unilaterally retired.
- [Successful protected Production audit P2-08A](POLITY_P2_08A_SONG_THREE_POLITY_AUTHENTICATED_INVENTORY_20261010.md), [run 38062024027](https://github.com/JezCH/atlas-person-db/actions/runs/38062024027) and immutable [artifact 11672968298](https://github.com/JezCH/atlas-person-db/actions/runs/38062024027/artifacts/11672968298), SHA `31c8931eda1f8f508c3b0f4d003c732898cbb5f2`, establish actual two source-backed Gaozong Activities currently wrongly attributed to generic Song while separate Southern Song operated-period entity exists.
- [Cambridge History of China — Introduction to Song dynasty](https://www.cambridge.org/core/books/abs/cambridge-history-of-china/introduction-the-sung-dynasty-and-its-precursors-9071279/A3F414452623A8AF8F3E397105B92FB7): Song as a continuous 960–1279 dynasty, Northern / Southern period distinction. [Metropolitan Museum of Art, *Courtly Odes*](https://www.metmuseum.org/art/collection/search/40052): Gaozong 1127–1162 emperor of Southern Song, capital Lin'an established in 1138. [Metropolitan Museum, Southern Song](https://www.metmuseum.org/ja/essays/southern-song-dynasty-1127-1279): Southern Song operates 1127–1279. [Original **Archontology**](https://www.archontology.org/nations/china/song/00_1127_1276_s.php): records 1129 brief interruption and restoration. External 1129 day/month boundaries are *not* imported into the original year-only model.

## Precise bounded mutation

Same Person `82809cc5-fc51-4e96-98e5-b290126fdcac` (송 고종), two retained existing `rules / Emperor` reign Activity UUIDs:
- `4517af83-d656-47b0-a558-3a3df717f726` 1127–1129, owner generic `1a1983fd-1850-5756-877c-3d2c17b85e1f` → Southern `fe073a4c-d967-56e2-bb31-f74bdde1af87`. Preserve normalized original NPM Source `0f511b10-277c-4b21-bf3d-878c663a80f7` and Archontology Source `5eba34b7-2b76-47b3-ae73-10e7814ad510` and both individual original locator URLs.
- `d5eaf14b-417d-4ed9-a594-d819314a1ff5` 1129–1162, same owner transition. Preserve original Archontology Source `43170824-bd9f-499b-9ffa-1c71bf86432d` and Met Source `569f3303-46db-40a3-ae3f-f7304f87c8b1` and locators. Archontology rows share a URL but are **two distinct existing Source UUIDs**; do not silently deduplicate.
- All original role/relation/period/confidence/chronology/notes/source_locator/content_hash and year-granular start/end details persist untouched; the only intentional field modification in the underlying Person Activity rows is `polity_id`.

**Do not bulk move generic Song six other rulers/regent Activities yet**; their exact individual Source quality differs and the dynasty umbrella/early ruler mapping remains a separate authoring/modeling gap. Do not move the three Northern Song intellectuals or three Southern Song non-sovereign activities. No polity deletion/retirement, no Source ID/new Person allocations, no Polity relation invented. Full before-case has 14 Activities / 19 normalized Source links and 0 temporal designations / 0 explicit identity relations / 0 governance periods; this two-row change must conserve all 14 / 19.

## Execution and mandatory postconditions

File `corrections/plans/polity-song-gaozong-southern-period-two-relink-20261011.v1.json` is a reviewed Stage2 v2 execution **plan** with `production_executable=false`, `production_mutation_authorized=false`. The protected workflow synthesizes it only after OIDC, newly refreshed exact same-Production before snapshot and canonical transaction checks. Never claim an historical P2-08A artifact is a fresh write transaction snapshot, or bypass active SHA/Source link checks.

On real canonical apply success, compile Runtime and **read back the same two IDs in Person and Southern Song Polity views**, preserving year-only 1129 split and four existing Source IDs/locators. Also check direct activity counts expected **generic Song 8→6, Southern Song 3→5, Northern Song unchanged 3** and 14 total / 19 links. If any apply or compile/Runtime postcondition fails, this unit is *not fully closed*; report exact failure as still blocking.

Parent `song-generic-polity-activity-ownership` remains **PARTIAL_REPAIR**, not FIXED; early six ruler/regent source authority, Northern Song direct Polity sources (zero), dynasty succession relationship (zero) must be handled separately. Seed registry **75 total / 63 terminal / 12 pending** unchanged. Sweden, Japan, Place, France, Oman, Liberia, Indonesia and *new full-Production Polity census* remain separate #1895 acceptance gates.
