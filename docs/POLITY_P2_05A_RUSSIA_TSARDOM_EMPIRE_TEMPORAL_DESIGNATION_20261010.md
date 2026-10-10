# POLITY-P2-05A — Russia: Tsardom (1547–1721) and Russian Empire (1721–1917) temporal designation repair

**2026-10-10 KST | source-backed exact Production diagnosis | `REVIEW_REQUIRED` / `repair` | no Production/Runtime mutation.**

## Project completion gate, not a tally

The #1895 objective is correct historically sourced Polity identities, names in historical time, authorities and Person activities, **not merely 75/75 seed closures**. Finish all seeded audits, then independently census **all current Production** Polity/Activity/Designation/Source identities; repair newly found false merges, duplicate aliases, government ruptures, missings and zero-Activity/tombstone anomalies; verify verified exact-before Authored data, compile, Runtime temporal display and row-level source integrity; resolve approval-gated Oman, Liberia, France, Japan and Place DB authority before any final acceptance. P14 Geometry excluded, as directed. User-driven Person registration lives in its separate lane.

## 1. Observed Production, **not inferred database state**

The public Vercel Production `/api/atlas-read?__atlas_read_surface=polity` returned **1,158 Polity rows**. Exactly one Russia monarchy match `Russian Empire` (러시아 제국), UUID **`dd07fc4c-b3ac-59ac-bdf2-9cc190893327`**, with **12 Activities spanning 1547–1917**, historical polity, no visible direct Activity temporal designation. **No separately named `Tsardom of Russia` Polity identity** was found in the 1,158-row public name list. The public Activity `polity_designation_name_en/ko` values were **all null** on that Polity's rows. This is proof **the public period label is not resolving**, not proof there is no `atlas_v2.polity_designations` row: a row could have missing names, invalid bounds, ambiguous overlap or unresolved source links.

| Scope | Existing live UUID | Actual sources / coverage |
| --- | --- | --- |
| Ivan IV Grand Prince, before Tsar | Grand Duchy of Moscow `119f3866-ce15-44a1-a4f6-aa139f06f9ef`; Activity `2acbc551-332c-4be5-bf89-ba9f30f865e3` | 1533–1547 (year/exact/`unspecified_historical`), reviewed/well established; Moscow Kremlin Museum Source. Preserve this distinct Grand Ducal phase. |
| Ivan IV **Tsar** | Russian Empire Polity above; Person `57b00bae-2420-4ddd-b374-f70c81479bff`; Activity `d6cdaf3b-2eab-4b98-8a17-b9c42342534f` | 1547–1584, `rules/reign`, Tsar; reviewed/well established, 3 external Source links. Current public designation **null** despite stored notes describing Tsardom of Russia. |
| Peter I **Tsar** | same Polity; Person `072f2262-acbb-53a8-a63f-c3e798c24132`; Activity `57cdefa5-9a5d-533c-b229-47e398f1d07a` | 1682–1721, year/exact/`unspecified_historical`, `exact_as_recorded`/`legacy_asserted`, 2 legacy correction-file Source labels, current designation **null**. |
| Peter I **Emperor** | same Person & Polity; Activity `9ec53325-3a97-58a8-a7e7-81a496a47e57` | 1721–1725, year/exact/`unspecified_historical`, `exact_as_recorded`/`legacy_asserted`, 2 legacy correction-file Source labels, current designation **null**. |
| Later Empire | same Polity | Catherine I, Elizabeth, Catherine II, Alexander I/II, Nicholas II etc. Post-1721 emperor/other activities 1725–1917, still null designation — stable Russian Empire name happens to render correctly for this later phase. |

Live `runtime-identity` gave **Production/main** at commit `2a44c586d23dad5e1a350dacfefbb159e25cb518`; `runtime-publication` showed Authoring **2523**, Runtime **2523**, `publication_current=true`. Count parity does not imply either designation historical correctness or per-field public parity.

## 2. Documentary timeline, calendar exactness

- **16 January 1547** (Russian historical Julian usage) Ivan IV was crowned the first Tsar of Russia, per Moscow Kremlin Museums' dedicated public collection. This delineates an appropriate **1547** Tsardom designation from Ivan's previously modeled Moscow grand-princely identity. Do not assert that Ivan III's occasional political title usages were the same 1547 **coronation** event.
- **22 October 1721 (Julian/Old Style) = 2 November 1721 (proleptic Gregorian/New Style)**: Peter I accepted the Russian Emperor title, under Senate/Synod proceedings. The **Russian Presidential Library holds the ORIGINAL Oct 22, 1721 printed Golovkin speech granting that title**; its official historiographic article explains the old/new-style date pair. Kremlin Museums also corroborate that Russia was declared an empire in **1721**. **Explicitly identify calendar** — never silently store Oct 22 as Gregorian or guess a default calendar based on the public 1721 year-only Activity.
- Political and institutional continuity persists under the monarch and Russian government through 1721. Russia's territorial-administrative changes were substantive but the **title/form designation transition alone** does not prove separate concurrent sovereign countries in the current normalized model; preserve `dd07fc4c-b3ac-59ac-bdf2-9cc190893327` until separately approved source-based identity/geometry review. Russian SFSR / Russian Federation 1991 seed already belongs to independent distinct normalized polity contexts.

## 3. Root cause — public resolver and coarse-year interval mismatch

`server/atlas-polity-temporal-designation-read.js` SQL is shared by public Person, Polity and normalized Activity readers. It only resolves a designation when:

1. both Activity temporal boundaries are present;
2. the designation's start/end fully includes **every date within the Activity range** (coarse year start coerced Jan 1, coarse year end Dec 31); and
3. exactly ONE designation row fully contains that Activity. Otherwise fail-closed to the stable normalized Polity name.

This is intentionally safe against false positives, and must **not** be replaced with `ORDER BY ... LIMIT 1` or a heuristic from the person's role.

**Critical counterexample:** a real designation window `Tsardom: 1547 ... 1721-11-01 (Gregorian)` and `Empire: 1721-11-02 ... 1917` cannot each fully contain Peter's extant **year-only** `1682–1721` and `1721–1725` Activities: the Tsar Activity's coarse `1721-12-31` end lies **after** Nov 1, while the emperor Activity's coarse `1721-01-01` start lies **before** Nov 2. Creating two designation rows with only boundaries `to 1721` and `from 1721` risks ambiguous same-year spans and exposes historical inaccuracies. No invented exact days should be written to Activity facts based on era headings alone, and existing Authoring metadata is `unspecified_historical` calendar.

**Neither database existence nor nonexistence of the underlying designation bundle can be asserted from public labels**, so direct authenticated **read-only** exact source-linked `polity_designations`, `polity_designation_names`, `polity_designation_sources` data is the next safe authority step.

## 4. Scoped repair acceptance (preflight before any writer)

1. Authenticated current `atlas_v2` baseline for one Polity UUID and all matching designations/names/source associations, plus 1547, 1682–1725 Activity UUIDs and source associations. Verify old/bad rows and expected source IDs without guessing.
2. Approve the design to express labels for two non-overlapping time phases: `Tsardom of Russia` / `러시아 차르국` and `Russian Empire` / `러시아 제국`. Reuse any existing correct designation row, and use source-linked non-destructive mutation through the repository's reviewed Authoring/Correction writer, not an ad-hoc SQL insert.
3. Resolve Peter's existing `legacy_asserted` year-only source quality first; if source-backed precise boundary is registered, determine exact original calendar vs translated Gregorian and whether Peter's overlapping civil date requires both historical office end/start recorded on **the same** cutover date. Never rewrite as day-exact without authoritative evidence and correct Role/Period semantics; preserve Person, original Activity IDs, their two distinct offices, and provenance.
4. Validate the existing **shared temporal resolver** with focused regression on full-containment and a 1721 same-year cutover; ensure no fabricated designation assigned to partial-overlap or unresolved Activities; no opportunistic SQL rank-by-name.
5. Non-destructive manifest only after exact-before; dry-run, reviewed approval, canonical write, Authoring source/name/date readback, Runtime projection compile and **actual Person/Polity Activity display checks** for Ivan IV, Peter before/after cutover, Catherine I, and modern 1917 boundary. A passing CI on registry code is **not** proof of finished Production repair.
6. Only then mark `russia-temporal-designation` **terminal**. This work unit does not access private DB credentials and makes NO Production mutation, name/Activity rewrite or retirement.

**Disposition:** `REVIEW_REQUIRED`, `suggested_action=repair`, `reviewed_decision=retain_russian_polity_repair_1547_1721_temporal_designations_and_1721_precision`, `terminal_status=null`.

**Ledger unchanged:** **75 tracked / 58 terminal / 17 pending**, designation pending **2**. Next independent seed: `sweden-temporal-designation`. Other source/approval gated records (Indonesia/Assaat, Chuzan, Oman, Liberia, France/Japan/Place) persist.

## 5. Historical sources and system contracts

1. Moscow Kremlin Museums, Ivan IV coronation **16 January 1547**: https://old.kreml.ru/exhibitions/virtual-exhibitions.coronations-of-tsars-in-the-moscow-kremlin/venchanie-na-tsarstvo-ivana-groznogo/
2. Moscow Kremlin Museums, 1721 imperial reform: https://kreml.ru/ru/museums/uspenskii-sobor/istoriia-2
3. Russian Presidential Library, *Gavriil Golovkin: speech granting Peter I Emperor title*, **22 Oct 1721 old-style primary printed artifact**: https://www.prlib.ru/item/442015
4. Russian Presidential Library, 1721-10-22 Old Style / 1721-11-02 New Style transformation: https://www.prlib.ru/node/619684
5. Library of Congress, Peter Great *Tsar, later Emperor*: https://guides.loc.gov/peter-the-great
6. United States Library of Congress, *Russia, a Country Study*, 1721 empire and reforms: https://tile.loc.gov/storage-services/master/frd/frdcstdy/ru/russiacountrystu00curt.pdf
7. Repository source of truth: `server/atlas-polity-temporal-designation-read.js`, `tests/atlas-polity-temporal-designation-read.test.mjs`; exact Production/Authoring read/compile required for final repair.

