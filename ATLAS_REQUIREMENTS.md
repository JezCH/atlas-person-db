# ATLAS Requirements Source of Truth v1

> Status: **PRODUCTION THROUGH P9 COMPLETE / P10 CURRENT / P11 CAPTURE READY BUT NOT EXECUTED**
>
> As of: **2026-08-16**  
> Machine registry: `requirements/atlas-requirements.v1.json`  
> Validator: `scripts/verify-atlas-requirements.mjs`  
> Release policy: `RELEASE_GOVERNANCE.md`  
> Current release evidence: `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md`

ATLAS의 기준은 **100% traceable**, **0 known contradictions**, **0 silently omitted requirements**, **unknown stays unknown**이다. 역사적 사실은 구현 편의가 아니라 reviewed primary/academic evidence로 판정하며, 근거가 부족하면 unresolved를 보존한다.

이 문서는 현재 요구사항의 사람용 기준본이다. 과거 Baseline A 숫자·과거 branch 상태·실패한 workflow run은 역사적 증거로 보존하되 **현재 실행 위치로 재해석하지 않는다.** 현재 단계 판정은 machine registry와 `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md`가 함께 고정한다.

## 1. Binding constitution

| ID | Requirement |
|---|---|
| `ATLAS-RQ-0001` | Historical accuracy over completeness. |
| `ATLAS-RQ-0002` | UUID is identity; name/canonical key/display/alias are not identity. |
| `ATLAS-RQ-0003` | Polity is a source-backed historical political actor, not a string pattern. |
| `ATLAS-RQ-0004` | Government/Regime, PeopleGroup and HistoricalEvent are separate from Polity. People/Event links never imply Person–Polity Activity. |
| `ATLAS-RQ-0005` | Person never owns territory: Person → Activity → Polity → Territory → Geometry. |
| `ATLAS-RQ-0006` | Authoring, Compile and Runtime are distinct; Runtime convenience cannot distort Authoring. |
| `ATLAS-RQ-0007` | Territory control / boundary certainty / evidence confidence are independent axes. |
| `ATLAS-RQ-0008` | Territory is stored by meaningful change interval, not annual duplication. |
| `ATLAS-RQ-0009` | AI produces source-backed candidates, never truth by fiat. |
| `ATLAS-RQ-0010` | Person–Polity Relation is explicit: `rules`, `governs`, `serves`, `active_in`, `opposes`, `claims_rule`; no generic default. |
| `ATLAS-RQ-0011` | Final Activity identity = Person + Polity + Relation + Role/NULL + Period Basis + interpreted full start/end boundaries. |
| `ATLAS-RQ-0012` | Source provenance/locator/claims/descriptions/before-state survive correction and merge. |
| `ATLAS-RQ-0013` | Use Vercel-minimized release trains; exhaust branch/research/CI work before unavoidable live dependency barriers. |
| `ATLAS-RQ-0014` | Person is a first-class Authoring object, not merely the name column of an Activity row. |
| `ATLAS-RQ-0015` | Place and Source are first-class Authoring entities. Place identity is not Polity identity; Source identity is not merely an Activity locator. |
| `ATLAS-RQ-0016` | Compile emits Runtime-ready state. Unresolved Authoring assertions must never appear as valid Runtime truth merely because they exist in the authoring database. |
| `ATLAS-RQ-0017` | A known Person–Polity assertion with an **unknown start/end boundary** must remain representable without inventing an endpoint year. |

Polity naming follows the current Stage 2 entity-boundary contracts: historical names, historiographic names and explicitly tagged editorial catalog labels are semantically distinct. Editorial labels never become historical self-designations or UUID identity.

### Product-scope boundary

The row-oriented Persons screen is a working product surface, not the final ontology definition. The final Authoring System keeps the historical core small and composable:

- Person object: identity/names, descriptions, source-backed life facts such as birth/death date/place, representative media reference, optional typed biographical facts, and related Activities.
- Polity / Government / PeopleGroup / HistoricalEvent remain semantically separate objects.
- Place is reusable by life facts, events and later map/runtime navigation; it does not become a Polity merely because an event or Person is associated with it.
- Source is a reusable evidence object capable of bibliographic/web metadata plus artifact/hash metadata when an ingested file exists. File hash/bytes are not a substitute for citation metadata.
- AI research follows **candidate → evidence/source/confidence → human review → authoritative authoring**; it never bypasses the normalized writer.
- Game-specific or presentation-only fields are extensions/crosswalks, not Person/Polity identity.

Unknown optional profile facts remain absent/unresolved. The system must not require religion, dynasty, gender, media, place or any other optional field merely to make a Person row “complete”. **Person, Place and Source exist as first-class Authoring objects** in the intended end state.

## 2. Completed foundations — do not rebuild

| ID | State | Foundation |
|---|---|---|
| `ATLAS-RQ-0101` | COMPLETED | normalized `atlas_v2` authority |
| `ATLAS-RQ-0102` | COMPLETED | normalized identity authoring |
| `ATLAS-RQ-0103` | COMPLETED | reconstructible current schema |
| `ATLAS-RQ-0104` | COMPLETED | centralized ATLAS Integrity |
| `ATLAS-RQ-0105` | COMPLETED | shared deterministic PostgreSQL client |
| `ATLAS-RQ-0106` | COMPLETED | dedicated admin session secret role |
| `ATLAS-RQ-0107` | COMPLETED | reviewed atomic authoring manifest v2 |
| `ATLAS-RQ-0108` | COMPLETED | evidence-based Person duplicate review architecture |
| `ATLAS-RQ-0109` | COMPLETED | isolated dry-run-first Correction v1 |

`COMPLETED` means implementation plus repository/Production evidence exists. A successful branch rehearsal alone does not upgrade a Production requirement to completed.

## 3. P0–P14 execution state

### P0 — Production control — COMPLETED

- `ATLAS-RQ-0201` — **COMPLETED:** fail-closed release control exists when repository protection alone is insufficient.
- `ATLAS-RQ-0202` — **COMPLETED:** exact Production SHA deployment was proven for Train 1.

### P1 — Current-schema cleanup — COMPLETED

- `ATLAS-RQ-0203` — **COMPLETED:** R0 future-semantic gate and reviewed exact duplicate coalescence.
- `ATLAS-RQ-0204` — **COMPLETED:** bounded Correction v1.1 operations.
- `ATLAS-RQ-0205` — **COMPLETED:** reviewed current-schema R1 corrections.

### P2 — Baseline A v2 — COMPLETED / HISTORICAL SNAPSHOT

- `ATLAS-RQ-0206` — **COMPLETED:** full read-only Baseline A v2 captured from the then-live Production state.

Historical Baseline A v2 contains **338 Activities, 302 Persons, 212 Polities and 20 Sources**, digest `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`.

These counts are immutable historical evidence, **not current Production inventory counts**.

### P3 — Baseline A Stage 2 integration — COMPLETED

- `ATLAS-RQ-0207` — **COMPLETED:** Stage 2 integration rebuilt from validated Baseline A v2.
- `ATLAS-RQ-0208` — **COMPLETED:** Sengoku authority research closure.
- `ATLAS-RQ-0209` — **COMPLETED:** six regional-authority cases closure.
- `ATLAS-RQ-0210` — **COMPLETED:** layered-authority R1 cases closure.
- `ATLAS-RQ-0211` — **COMPLETED:** remaining Baseline-A-independent historical blockers closure.
- `ATLAS-RQ-0214` — **COMPLETED:** structural Polity-relation models and normalized Source handoff.

### P4 — Identity decisions — COMPLETED

- `ATLAS-RQ-0212` — **COMPLETED:** Person duplicate decisions completed without premature destructive merge.
- `ATLAS-RQ-0213` — **COMPLETED:** reviewed canonical Polity identities bound to surviving Baseline A UUIDs or explicitly modeled as new identities.

### P5 — Additive Stage 2 schema — COMPLETED IN PRODUCTION

- `ATLAS-RQ-0215` — **COMPLETED:** Relation, Governance, People/Event and semantic-name-kind schema package released through the controlled Production schema workflow.

Production evidence is summarized in `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md`. The first failed schema run is retained only as failure history; the later controlled run succeeded.

### P6 — Correction engine v2 — COMPLETED

- `ATLAS-RQ-0216` — **COMPLETED:** exact UUID + exact before-state + reviewed after-state + provenance-preserving Correction v2 supports the Stage 2 correction families used by Train 2 and later integrity repair.

### P7 — Historical correction/backfill — COMPLETED THROUGH TRAIN 2

- `ATLAS-RQ-0217` — **COMPLETED:** reviewed structural/identity/governance/relation/temporal/provenance correction package was released through the controlled Train 2 Production path.

Later corrections remain ordinary governed maintenance; they do not reopen P7 as a roadmap phase.

### P8 — Global semantic gate — COMPLETED

- `ATLAS-RQ-0218` — **COMPLETED:** the reviewed cutover frontier reached zero known Runtime semantic blockers before P9.

Explicit unresolved history may remain Authoring-only; it must never be silently coerced into Runtime-ready truth.

### P9 — Activity semantic-key v2 — COMPLETED IN PRODUCTION

- `ATLAS-RQ-0219` — **COMPLETED:** Activity identity is coherently keyed by Person + Polity + Relation + nullable Role + Period Basis + full interpreted start/end temporal boundaries.

Production Train 2 run `31806129999` completed successfully. Its fail-closed final verification requires the v2 index present, legacy index absent, zero semantic duplicate groups, and the Person physical-merge interlock still closed at that release point.

### P10 — Person duplicate revalidation / physical merge — CURRENT, NOT COMPLETE

- `ATLAS-RQ-0220` — **PENDING:** upgrade reconciliation under semantic-key v2 and physically merge only Persons that survive complete reviewed revalidation and require a merge.

Current facts:

- non-destructive `ATLAS P10 Person Duplicate V2 Revalidation` is green on the audited current-main line;
- controlled Production P10 revalidation release attempts have not completed successfully;
- therefore a green CI revalidation is **not** an authorization for physical Person merge;
- physical merge remains fail-closed unless the exact live Production gate succeeds and reviewed candidates require execution.

P10 must not be marked completed merely because later P11 code exists.

### P11 — Baseline B / end-state snapshot — READY TO CAPTURE, NOT COMPLETE

- `ATLAS-RQ-0221` — **PENDING:** create the authenticated, read-only, repeatable-read Baseline B and enforce end-state constraints from the actual post-P10 Production state.

The P11 Baseline B implementation and readiness workflow are on main, but during the 2026-08-16 audit the Production capture workflow had **zero capture runs**. No Baseline B artifact may be claimed until that governed capture actually succeeds.

### P12 — Remove reachable legacy/transitional paths — PENDING

- `ATLAS-RQ-0222` — **PENDING:** after P10/P11 prove the live end state, remove reachable legacy and transitional writers/readers/contracts without destroying historical audit evidence.

Historical files may remain archived as evidence. “Remove” means no active Runtime/Authoring path can resurrect obsolete semantics.

### P13 — Full product lifecycle — PENDING

- `ATLAS-RQ-0223` — **PENDING:** pass full Production product lifecycle acceptance.
- `ATLAS-RQ-0226` — **PENDING:** complete first-class Person object authoring without forcing unknown optional profile facts.
- `ATLAS-RQ-0227` — **PENDING:** complete Place and bibliographic Source authoring as independent objects.
- `ATLAS-RQ-0228` — **PENDING:** implement explicit Compile → Runtime projection and readiness filtering.
- `ATLAS-RQ-0229` — **PENDING:** represent unresolved Person Activity boundaries without fabricated endpoints.
- `ATLAS-RQ-0230` — **PENDING:** complete source-backed AI candidate → human review → authoritative authoring workflow.

P13 acceptance requires Person, Place and Source exist as first-class Authoring objects, the normalized writer remains authoritative, and Runtime cannot publish unresolved Authoring data as if it were settled fact.

### P14 — Historical map contract — PENDING

- `ATLAS-RQ-0224` — **PENDING:** integrate the historical map contract using Person → Activity → Polity → Territory → Geometry.
- `ATLAS-RQ-0225` — **PENDING:** preserve the ATLAS map research standard and evidence discipline.

Territory/Geometry work must never back-propagate invented identity, chronology or political authority into the Person DB.

## 4. Current project-integrity cleanup lane

This cleanup lane does not change roadmap semantics and does not bypass P10/P11.

A read-only Baseline B audit is now the intended single sweep for:

- Korean preferred-name coverage across Person, Polity, Role, Period Basis, Governance Context, Polity Designation, PeopleGroup and HistoricalEvent catalogs;
- zero-source Activity detection;
- dangling Activity/Source/reference detection;
- semantic-key v2 completeness;
- exact Activity semantic duplicates;
- Activity-unreferenced Polity/Role/Period Basis candidates;
- Polity names that look Event-like, as **review signals only**;
- exact normalized Polity ↔ HistoricalEvent name collisions.

An unused catalog row is not automatically garbage. An Event-looking name is not automatically misclassified. No destructive cleanup is authorized by string heuristics.

Current audit implementation:

- `server/atlas-project-integrity-audit.js`
- `scripts/audit-atlas-project-integrity.mjs`
- `tests/atlas-project-integrity-audit.test.mjs`

Destructive data cleanup must wait for a fresh governed Production snapshot or use an existing exact correction/authoring path with source/provenance preservation.

## 5. Superseded requirements — historical only

| ID | State | Replacement |
|---|---|---|
| `ATLAS-RQ-0301` | SUPERSEDED | duplicate Person physical merge moved behind `ATLAS-RQ-0212`, `ATLAS-RQ-0219`, `ATLAS-RQ-0220` |
| `ATLAS-RQ-0302` | SUPERSEDED | Baseline A + future Baseline B (`ATLAS-RQ-0206`, `ATLAS-RQ-0221`) |
| `ATLAS-RQ-0303` | SUPERSEDED | bounded v1.1 plus Correction v2 (`ATLAS-RQ-0204`, `ATLAS-RQ-0216`) |
| `ATLAS-RQ-0304` | SUPERSEDED | strict Polity/entity boundaries (`ATLAS-RQ-0003`, `ATLAS-RQ-0004`) |

Superseded requirements are retained for traceability and never treated as current authority.

## 6. Permanent prohibitions

| ID | Prohibition |
|---|---|
| `ATLAS-NO-0001` | No Person-owned geometry. |
| `ATLAS-NO-0002` | No invented history or geometry. |
| `ATLAS-NO-0003` | No string-based automatic Polity classification. |
| `ATLAS-NO-0004` | No generic Relation default. |
| `ATLAS-NO-0005` | No v1/v2 split brain. |
| `ATLAS-NO-0006` | No early destructive Person merge. |
| `ATLAS-NO-0007` | No stale Stage 2 stack piecemeal merge. |
| `ATLAS-NO-0008` | No premature relink/split through legacy Correction v1.1. |
| `ATLAS-NO-0009` | No placeholder geometry for missing evidence. |
| `ATLAS-NO-0010` | No Runtime-driven historical distortion. |
| `ATLAS-NO-0011` | No legacy Runtime resurrection. |
| `ATLAS-NO-0012` | No unnecessary deployment churn. |
| `ATLAS-NO-0013` | No merge-to-main or deploy for branch-only work. |

## 7. Current execution queue

1. **P10:** settle the exact Production revalidation gate; do not physically merge Persons unless the reviewed live frontier requires it.
2. **P11:** execute the authenticated Production Baseline B capture after the preceding P10 condition is actually settled.
3. Run the read-only project-integrity audit against that Baseline B.
4. Convert confirmed data problems only into reviewed, provenance-safe correction/authoring operations; Korean-display gaps are data-quality work, not identity rewrites.
5. **P12:** remove only genuinely reachable legacy/transitional paths proven unnecessary by the captured end state.
6. **P13:** finish and acceptance-test the first-class Person/Place/Source Authoring → Compile → Runtime lifecycle.
7. **P14:** integrate the historical-map contract without weakening the Person/Polity evidence model.

UI presentation work may proceed independently where it does not alter Authoring identity or Production data semantics.

## 8. Completion definition

ATLAS is not “done” merely because the current table renders or a migration ran. Completion requires:

- every active requirement is either satisfied or explicitly unresolved;
- zero known contradictions between the human Source of Truth, machine registry, current Production evidence and Runtime contract;
- no silently omitted requirements;
- unknown stays unknown instead of being filled with convenient guesses;
- all destructive corrections preserve reviewed Source/provenance;
- no reachable legacy path can recreate v1/v2 split brain;
- Authoring, Compile and Runtime boundaries are explicit and acceptance-tested;
- Person, Place and Source exist as first-class Authoring objects;
- historical map integration consumes the political/territorial model rather than rewriting it for display convenience.
