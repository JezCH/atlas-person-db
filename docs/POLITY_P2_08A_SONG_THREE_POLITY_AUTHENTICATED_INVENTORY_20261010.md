# POLITY-P2-08A — Song triple-Polity exact authenticated Production source/ownership preflight

**2026-10-10 KST | Read-only authoritative Production audit SUCCESS, canonical owner repair remains `OPEN / P2-08B`.**

## Authority and immutable audit receipt

- Code/secured OIDC transport: [merged PR #2432](https://github.com/JezCH/atlas-person-db/pull/2432).
- Production SHA: `31c8931eda1f8f508c3b0f4d003c732898cbb5f2`, verified equal to protected main workflow `GITHUB_SHA` before querying.
- [Successful immutable Action #38062024027](https://github.com/JezCH/atlas-person-db/actions/runs/38062024027), [original artifact ID #11672968298](https://github.com/JezCH/atlas-person-db/actions/runs/38062024027/artifacts/11672968298), name `song-p2-08-source-before-readonly`, ZIP SHA256 `bdff0f2de9f0f34f6ec56f30879ff922f4cfddebcedac0433a5ffe224b171706`, retained 90 days. The artifact contains the *actual* `audit.json` and extracted `song-p2-08-exact-before.json` (~88 KB) plus small summary and runtime identity.
- The endpoint verified GitHub OIDC exact repository/ref/SHA/workflow/environment/audience and executed in one `REPEATABLE READ READ ONLY` transaction, marked `preflight_only=true`, `committed=false`.
- This is **real private Production DB reference/Source data**, not an inference from public null designation labels. It is **not** a Canonical Correction and cannot be counted as Authoring–Runtime post-mutation proof.

## Material findings — no source invention and no owner writes

| Existing normalized polity | Polity UUID | Canonical Activities |
|---|---|---:|
| Song Dynasty (generic) | `1a1983fd-1850-5756-877c-3d2c17b85e1f` | 8 |
| Northern Song | `407d91cf-7a97-45e3-81ea-d42a3cbfba35` | 3 |
| Southern Song | `fe073a4c-d967-56e2-bb31-f74bdde1af87` | 3 |
| **Total** | **3 existing UUIDs** | **14** |

- **19** normalized Activity–Source links covering all **14** Activities; **14** current Runtime Activities in exactly these three polities.
- **3** normalized Polity–Source links: **generic Song 2** (legacy repository-supplement dataset sources), **Northern Song 0**, **Southern Song 1** (legacy repository-supplement source). *Northern Song's absence of a Polity-level source is a real authority/provenance completeness blocker*, even though its three cultural/intellectual Activities each have a source.
- **Zero** normalized polity Designations, **zero** identity succession/continuity relations, **zero** governance periods for this three-Polity scope. A dynasty continuity relationship has **not** been authored in the DB; do not infer one as an existing relation merely because historians correctly describe the two operated court periods as the same Zhao Song dynasty.
- The generic Song eight linked Activities consist of six before the north–south transition (Taizu, Zhenzong, regent Liu E, Renzong, Shenzong, Huizong) and **two after 1127** (Gaozong's separate first and restored reigns). Early two Activities carry only repository-dataset sources (legacy provenance) and must not be silently upgraded.

### Exact Gaozong owner/source proof

**One Person:** `82809cc5-fc51-4e96-98e5-b290126fdcac`, *Emperor Gaozong of Song / 송 고종*. The two original Activity IDs remain **distinct** in Production, with identical `role_id=2a2e0e91-3db2-5d2f-a2f0-c70713ecf77e`, `period_basis_id=b5ebe21e-4e81-5678-8e0e-7f66ff56992b`, `relation_type_id=7ca4de8f-01d4-542c-acc1-a06848c6742c`, `confidence=well_established`, `chronology_status=reviewed`, year-level start/end with exact certainty and unspecified historical calendar.

1. `4517af83-d656-47b0-a558-3a3df717f726`, 1127–1129, `Song Dynasty` owner. Original Source IDs **`0f511b10-277c-4b21-bf3d-878c663a80f7`** (National Palace Museum, original URL locator) and **`5eba34b7-2b76-47b3-ae73-10e7814ad510`** (Archontology, original URL locator), both verified in DB.
2. `d5eaf14b-417d-4ed9-a594-d819314a1ff5`, 1129–1162, `Song Dynasty` owner. Original Source IDs **`43170824-bd9f-499b-9ffa-1c71bf86432d`** (Archontology, different normalized Source row despite matching URL locator above), and **`569f3303-46db-40a3-ae3f-f7304f87c8b1`** (Metropolitan Museum of Art). All four original exact per-Activity source link records/locator keys must be preserved; deduplicating similar URL sources by guess would lose original Source association/provenance.
   
Original authoring requests `authoring/requests/emperor-gaozong-of-song-song-dynasty-1127-1129.json` and `authoring/requests/emperor-gaozong-of-song-song-dynasty-restored-1129-1162.json` both explicitly selected generic `Song Dynasty`, and documented the real 1129 temporary removal and restoration with deliberate year-only bounds. Thus these are **not duplicate accidental Activities**. Their **Polity owner attribution** must be adjudicated independently using the court-period-specific model and existing person/source/identity continuity authority.

## Why automatic eight-Activity relinking is not yet authorized

The 75-seed `northern-southern-song` rupture review already resolved as `KEEP_SEPARATE` for operative Northern/Southern territorial periods under the *same* dynasty ([P2-07D](POLITY_P2_07D_NORTHERN_SOUTHERN_SONG_CONTINUITY_AND_OWNERSHIP_20261010.md)). However the current registry contains a distinct generic Song UUID with valid historical provenance. A blind bulk rebind of eight ruler Activities would strand the generic identity as zero-Activity while northern polity identity has **zero direct normalized polity sources**, and there is **no authoritatively linked succession relation**. No user approval to retire/delete generic Song is implied.

**P2-08B next bounded execution gate**:
1. Use actual authenticated Source inventory and already supplied University/Cambridge/Met historical evidence to verify whether source-defined generic dynastic umbrella should retain authority activities or only an explicit nonduplicate catalogue/lineage relationship should remain. Adjudicate all six Northern + two Southern ruler/regent Activity owners, including Liu E and both Gaozong segments; do not choose one of two conflicting entity models by convenience.
2. Supply direct independent historical Polity source authority for Northern Song (currently `Polity–Source=0`) and a reviewed source-backed continuity/lineage relation if the canonical model requires that, without fabricating source IDs or existing relations. Determine whether generic Song remains a real Polity or a dynasty-level relationship; physical retirement requires **explicit user authorization**, not inference.
3. Only then make the smallest `atlas-stage2-correction-v2-execution-plan/v1` exact-before plan for each actually authorized owner change. Preserve **all 14 original Activity UUIDs and 19 Source links plus locators**, original 1129 reign interruption, Person identity, role IDs, and year-only granularities. Run the protected Stage2 Correction dry-run/commit only after independent reviewed authority and collision preflight.
4. Compile/verify Runtime and read back all **14** Person/Polity relations, including representative negative controls and the two separated Gaozong segments. Mark the separate `song-generic-polity-activity-ownership` gate `FIXED` **only** on recorded Authoring and public Runtime truth. The `northern-southern-song` rupture seed remains terminal; **75 tracked / 63 terminal / 12 pending unchanged**. The Japan/Place/France/Oman/Liberia/Indonesia and final fresh **whole-Production Polity and Source/Activity census** remain explicitly open.

The preserved artifact is an authority before-state record, not future proof that Production has not changed. Any later Correction must obtain a **fresh exact before-state** on its own Production write transaction and fail closed on state drift.
