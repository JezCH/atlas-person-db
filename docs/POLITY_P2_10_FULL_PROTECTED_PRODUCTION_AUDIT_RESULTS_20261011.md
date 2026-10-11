# POLITY-P2-10 — Full authenticated Production provenance, retirement and compiled Runtime integrity result

**2026-10-11 KST — COMPLETE read-only INTERNAL DATABASE census accepted.** This is a **full normalized source/Polity/reference/tombstone/Runtime row snapshot**, not proof of Human Authoring input parity or semantic truth of all historical assertions.

## Execution and immutability

- [Read-only full scan writer PR #2470](https://github.com/JezCH/atlas-person-db/pull/2470), passed CI [#38127666563](https://github.com/JezCH/atlas-person-db/actions/runs/38127666563), merged handler SHA `964da1b266a1ac1cc1503206c85efbbd676ff00a`.
- Its first real OIDC audit [#38127762957](https://github.com/JezCH/atlas-person-db/actions/runs/38127762957) **failed** after authenticated Production DB access on `column f.id does not exist` — read-only, not accepted as successful. [Schema repair #2471](https://github.com/JezCH/atlas-person-db/pull/2471), CI [#38127884308](https://github.com/JezCH/atlas-person-db/actions/runs/38127884308) passed; actual PolityPlaceFunction table has no surrogate `id`.
- [Independent replay trigger / stronger stable SHA #2472](https://github.com/JezCH/atlas-person-db/pull/2472), CI [#38128077028](https://github.com/JezCH/atlas-person-db/actions/runs/38128077028) passed, merged main **`8a54de696d0a257a9a8a2a060994509376a39c97`**.
- **Actual protected complete Production OIDC run [#38128160741](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741) SUCCESS**, exact real Vercel Production SHA `8a54de696d0a257a9a8a2a060994509376a39c97` both **before AND after** full read, `ok=true,complete=true,read_only=true,committed=false` from the handler using a single `REPEATABLE READ READ ONLY` transaction.
- **Immutable full exact-row result [artifact #11697859340](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741/artifacts/11697859340)**, ZIP **SHA256 `92bfb11dec48bdfa54d967d94763aac931e667001e6f0ed2b03fbb303685b253`**. Contains `audit.json` (16.25 MB), `polity-p2-10-internal-full-census.json` (15.13 MB), `polity-p2-10-internal-summary.json`, exact three-Song Source snapshot and both Production SHA identities. Full exact all-row coverage across **15 listed canonical normalized tables plus all Polities and 17 known reference routes**, no LIMIT/truncation.

## Actual full-Production table counts

| Canonical table / category | Rows |
| --- | ---: |
| `atlas_v2.polities` | **1,158** |
| `atlas_v2.sources` | **3,354** |
| `atlas_v2.person_politics_v2` original Activities | **2,523** |
| `atlas_v2.runtime_person_politics_v1` compiled Activities | **2,523** |
| `atlas_v2.person_politics_sources` Activity–Source triples | **3,889** |
| `atlas_v2.polity_sources` exact pairs | **255** |
| `atlas_v2.polity_designations` | **59** |
| `atlas_v2.polity_designation_sources` | **108** |
| `atlas_v2.polity_governance_periods` | **11** |
| `atlas_v2.polity_governance_period_sources` | **20** |
| `atlas_v2.polity_identity_relation_types` | **0** |
| `atlas_v2.polity_identity_relations` | **0** |
| `atlas_v2.polity_identity_relation_sources` | **0** |
| `atlas_v2.polity_identity_retirements` | **89** |
| `atlas_v2.polity_identity_retirement_names` | **178** |
| **`atlas_v2.polity_place_functions`** | **0** |

17 dynamically discovered Polity-UUID FK/semantic-reference routes, public list **1,158 Polities/2,523 Activities**, and this full internal snapshot are reconciled. Counts alone are not equivalence proofs; exact UUID and common fields were compared.

## PASS: no detected referential/activity/public-name inconsistencies

- **0** missing Source/Polity/Activity/identity/governance reference UUIDs across enumerated joins; all Source link records enumerated without sample cap.
- **0** original Activities absent from compiled Runtime; **0** extra compiled Activities; **0** mismatches across common compared semantic fields (Person ID, Polity ID, role, time boundaries/precision, confidence, chronology, content hash).
- **0** duplicate direct Polity–Source pair; **0** duplicate `source_key`; **0** preferred Korean display-name collisions (after the already accepted 2-case correction in #2466).
- Old orphan crosswalk was **confirmed with a fresh actual 2026-10-11 protected read**: **25** Polities with zero discovered *external* references, exactly matching 25 public no-Activity Polities; **Myanmar retains one direct Polity Source**. No automatic retirement of any of these rows.

These are narrow **structural/canonical record acceptance results**. No proof yet that Human Authoring payloads, legacy source datasets, narrative truth, and temporal display all express the same intended history.

## OPEN: exactly three contradictory Japan retirement tombstones

Each UUID is simultaneously in the LIVE `polities` table and in `polity_identity_retirements`. These were already known historically; the fresh full 2026-10-11 protected census supplies current direct proof:

| Live Polity | Exact UUID | Original Activity count | Tombstone source case |
| --- | --- | ---: | --- |
| Tokugawa Shogunate / 도쿠가와 막부 | `46534f7e-9247-5644-b5ad-9525c3d4f5d6` | **6** | `polity-retire:tokugawa-shogunate` |
| Empire of Japan / 일본 제국 | `7f146e58-c3e9-5af7-8cb8-346f03cd7cf6` | **5** | `polity-retire:empire-of-japan-state-form-duplicate` |
| Toyotomi Regime / 도요토미 정권 | `e1548cb1-f89d-538b-9fb2-bad02ad87f8e` | **1** | `polity-retire:zero-activity-orphan:toyotomi-regime` |

**12 original Activity records retained**. The contradictory retirement rows are not evidence that the now-live Polities should be deleted. They must be explicitly withdrawn/archived/superseded through reviewed canonical lifecycle correction, respecting **user approval required for tombstone deletion**. Do not use raw SQL bypass; do not delete/retire restored Polity identities. Japan acceptance remains OPEN.

## OPEN: Authoring-driven Source duplication candidate review

All 3,354 Source keys are unique; **83** normalized `canonical_url` values appear in more than one Source UUID, encompassing **197** rows (**114 excess rows over one-per-URL**). Among the 83 groups, **78** share an identical Source title, **5** have differing titles; **79** are same source_type and **4** vary in type.

Large examples, sourced from actual complete Source rows:

- Mexican parliamentary gazette `https://gaceta.diputados.gob.mx/Gaceta/64/2019/feb/20190219-VII.html`: **11 different Source UUIDs**, same title, different activity-scoped `human-authoring:` keys.
- Peru's congressional Ramón Castilla PDF: **5 UUIDs** for same bibliographic title/URL.
- Swedish Royal Court's `https://www.kungahuset.se/english/the-monarchy-of-sweden`: **4 UUIDs** with same document title, across different Swedish monarch activities.
- Danish Royal House royal lineage page: **3 UUIDs**, two title variations.
- Japanese Cabinet's historical PM list page: **2 UUIDs**, two title variants.

**These are Source-normalization review candidates, NOT verified fraudulent or invalid claims.** A URL reused across several Person/Activity assertions is often valid. Do not collapse UUIDs or drop `person_politics_sources` provenance when Source keys encode intentionally different assertion scope, title, citation text or locator. Next analyze Source semantics and existing normalized link locations group-by-group, prioritize the 11-UUID group, and propose a true semantic deduplication policy only with a reviewed same-source proof and complete reference migration safeguards.

## OPEN: Place-authority count contradiction is now fresh fact

The actual `atlas_v2.polity_place_functions` contains **zero live rows**, despite older claimed backfill **20 Places, 27 Sources, 23 PolityPlaceFunctions**. Thus previous reported Place backfill is **not** accepted as live current-DB materialization. It may have targeted a wrong authority, failed, or been superseded; **reason not yet proven**. Next identify the true Place Authoring Apply/Compile writer and its exact destination, check current `places` and `polity_place_functions` authority and canonical request ledger, and use reviewed writer only if Source evidence and identities are exact. No fabricated capital/current Place functions. This is a distinct owner-sensitive blocker.

## Song dynasty and remaining seeded reviews

The live `polity_identity_relation_types` and corresponding identity relations are **both zero**. Therefore Song Zhao dynastic continuity cannot be asserted via a made-up code or structural vassal relation. The accepted Northern Song Cambridge direct Source is **still live**; exact three-Song family currently has generic 2 / Northern 7 / Southern 5 Activities, 14 total, and **4** direct `polity_sources` across the three entities (two generic legacy + Northern Cambridge + one Southern). Generic original Taizu/Shenzong Activities unchanged. P2-08E-C model vocabulary/source decision remains open.

**Registry remains 75 tracked / 65 terminal / 10 REVIEW_REQUIRED**, historical-family 5, Sweden 1, rupture 4. The 25 reference orphans, 83 Source URL duplication candidates and three Japan retirement conflicts are **outside** those 10 seeded dispositions; do not mistakenly add 111 to the original 75 or declare project acceptance because structural references passed. Additional France approval, legacy Japan/Place corrections, all Source semantic judgments, and **Human Authoring→Compile→Runtime exact provenance** remain outstanding. P14 geometry is user parked.

## Immediate next smallest work

1. Record the three exact Japan contradictions and 25 orphan inventory in the canonical audit checkpoint. **No destructive write without explicit user permission**.
2. Triage **Place writer authority** and **83 Source duplicate URL groups**, prioritizing metadata-matching groups while preserving activity-scoped source links.
3. Continue independently source-backed remaining 10 seeds while correcting internal constraints; avoid re-opening already-terminal Saudi and naming items.
4. Verify Human Authoring inputs and canonical correction ledger against compiled Runtime and latest Production deployment; then final unseeded anomaly census/semantic judgments and independent user-facing acceptance.

**P2-10 internal census itself: ACCEPTED as read-only evidence; all issues it detected remain individually OPEN until resolved.**
