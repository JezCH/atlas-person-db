# POLITY-P2-06C — Sweden Stormaktstiden 1611–1718
2026-10-11 KST. Source-backed canonical Correction release PREPARED. Not Production accepted until observed protected apply, Runtime readback and independent provenance check.

## Real current Production before-state, not inference
Protected complete authenticated [run #38128160741](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741), full [artifact #11697859340](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741/artifacts/11697859340), exact deployed SHA 8a54de696d0a257a9a8a2a060994509376a39c97, REPEATABLE READ READ ONLY:
- Existing Sweden Polity 93613017-b4c4-5f82-8e96-3ce6b2d3a61e: 15 original Activities, ZERO existing designated periods, one direct Polity Source recording an old supplement rather than Stormaktstiden.
- Existing separate Sweden–Norway Union a47f57af-8ac2-4724-81b0-43074c64f84c: 3 Activities and ZERO existing designated periods; not a mutation target.
- Target four existing Sweden monarch Activities: Gustav II Adolf e889c50c-3a9b-4b30-90ab-0822ad5dffd6 1611–1632; Christina daf85f20-db1f-50c2-aff1-86830290da8e 1632–1654; Charles XI 931c792b-5039-4637-b418-4d04264b7b54 1660–1697; Charles XII b5a7fcfe-47ee-4332-9110-443c0d0a40be 1697–1718.
- The exact proposed bibliography URLs, https://lex.dk/Stormagtstiden and https://journals.lub.lu.se/scandia/sv/article/view/29334, had NO matched canonical_url among ALL 3,354 Sources. Proposed source keys and allocated UUIDs also absent at this audited snapshot, with mandatory pre-write exact-before.
- Existing global baseline: designations 59, designation Source triples 108, Activities original and Runtime 2523 each.

## Historical sources, verified 2026-10-11
1. Jürgen Beyer, [Stormagtstiden, Lex](https://lex.dk/Stormagtstiden), revised 2025-02-20: conventional Sweden great-power 1611–1718 period from Gustav II Adolf's accession to Charles XII's death. An HISTORIOGRAPHIC era, not a legal emperor/state style.
2. Harald Gustafsson, [Stormakten genom tiderna: En historiografisk skiss, Scandia 92(1), 11–32 (2026)](https://journals.lub.lu.se/scandia/sv/article/view/29334), published 2026-06-08, DOI 10.47868/scandia.v92i1.29334: scholars' Swedish Great-Power-Era terminology is retrospective nineteenth-century historiography.
3. Distinct 1611–1721 periodization also appears in [University of Vienna research](https://utheses.univie.ac.at/detail/57229). This release explicitly selects Lex's supported 1611–1718 convention, not a claim the later ending is false. No invented month/day or uniform calendar precision.

## Exact minimal change
[Reviewed plan](../corrections/plans/polity-sweden-historiographic-stormaktstiden-20261011.v1.json) contains ONLY two newly sourced bibliographic Source assertions and one source-linked HISTORIOGRAPHIC_PERIOD designation. New English preferred name Swedish Empire; Korean 스웨덴 제국. Notes expressly identify conventional Stormaktstiden and reject legal imperial state-form or Emperor ruler title. UUIDs for NEW owned rows deterministically derived using namespace 672fd6c6-f921-5ce9-86dc-c90a8796c53a; no fabricated preexisting Person/Polity/Source IDs.

Intended canonical global deltas: sources +2; polity_designations +1; polity_designation_names +2; polity_designation_sources +2; all Person/Polity/Activity/Activity-Source/Polity-Source/identity-relation/retirement rows unchanged.

## Completion contract and future scope
1. Full CI green before merge; protected OIDC Correction dry-run and atomic apply committed=true with no source URL/key/id clash; immutable artifact.
2. Actual public Polity/Person Runtime readback: four 1611–1718 Activities show Swedish Empire / 스웨덴 제국; at least two outside-window Sweden activities and all three Sweden–Norway union activities unchanged, Activity UUIDs/roles preserved. Do not create emperor roles.
3. One independent protected Source/designation readback or transactionally verified after-bundle replay and publication-current check; no 1718 day precision.
4. ONLY after verified operations, set canonical sweden-temporal-designation FIXED and ledger 75/66/9. Until then 75/65/10.
5. Parent #1895 stays OPEN for other historical families/ruptures, 83 Source URL groups, 25 orphan-polity candidates, Japan retirement tombstones, Place missing functions, France approval, Song P2-08E-C continuity and Human Authoring→Runtime source parity. P14 geometry parked.
