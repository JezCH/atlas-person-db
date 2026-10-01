# ATLAS Requirements Source of Truth v1

> Status: **CORE RE-ENTRY ACTIVE / VERIFIED CLOSED WORK PRESERVED / P13 LIFECYCLE ACCEPTANCE REOPENED**
>
> As of: **2026-10-01**  
> Machine registry: `requirements/atlas-requirements.v1.json`  
> CORE architecture / invariants / unit topology: `docs/core/CORE_V2_MASTER_PLAN.md`  
> Active CORE status: GitHub Issue **#917** body only  
> Validator: `scripts/verify-atlas-requirements.mjs`  
> Execution policy: `WORK_EXECUTION.md`  
> Release policy: `RELEASE_GOVERNANCE.md`  
> Historical P10 closure evidence: `docs/release/P10_PRODUCTION_CLOSURE_2026-09-06.md`

ATLAS의 기준은 **100% traceable**, **0 known contradictions**, **0 silently omitted requirements**, **unknown stays unknown**이다. 역사적 사실은 구현 편의가 아니라 reviewed primary/academic evidence로 판정하며, 근거가 부족하면 unresolved를 보존한다.

이 문서는 현재 요구사항의 사람용 기준본이다. 과거 Baseline A 숫자·과거 branch 상태·실패한 workflow run은 역사적 증거로 보존하되 **현재 실행 위치로 재해석하지 않는다.** 현재 실행 절차는 `WORK_EXECUTION.md`가 우선하며, 아래의 과거 Train 1/Train 2 언급은 완료된 역사적 release evidence일 뿐 현재 작업을 직렬화하거나 release-train 절차를 반복하게 하는 규칙이 아니다.

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
| `ATLAS-RQ-0013` | Use risk-proportional release governance: preserve canonical writer/security gates while avoiding global serialization, duplicate verification, unnecessary deployments, and obsolete release-train ceremony. |
| `ATLAS-RQ-0014` | Person is a first-class Authoring object, not merely the name column of an Activity row. |
| `ATLAS-RQ-0015` | Place and Source are first-class Authoring entities. Place identity is not Polity identity; Source identity is not merely an Activity locator. |
| `ATLAS-RQ-0016` | Compile emits Runtime-ready state. Unresolved Authoring assertions must never appear as valid Runtime truth merely because they exist in the authoring database. |
| `ATLAS-RQ-0017` | A known Person–Polity assertion with an **unknown start/end boundary** must remain representable without inventing an endpoint year. |
| `ATLAS-RQ-0018` | CORE v2의 architecture, authority map, C-01~C-15 invariants, unit topology는 `docs/core/CORE_V2_MASTER_PLAN.md`가 단일 권위다. 동일 내용을 별도 active registry로 복제하지 않는다. |
| `ATLAS-RQ-0019` | **새 canonical Person 생성은 모든 생존 인물을 제외한다.** 현재 생존 여부가 unresolved이면 추측하지 않고 HOLD/BLOCK하며 Person write를 허용하지 않는다. |
| `ATLAS-RQ-0020` | **Person 역사 사실 집계는 `ATLAS-PHFC-4.3` 하나만 사용한다.** 모든 historical Person에게 동일한 E/R/T/D/G/S factual coverage schema·bounded review·산술·출력 계약을 적용하며 역할·직업·공직·이념·정치성에 따른 분기는 금지한다. 각 binary cell은 `VERIFIED(1) / REVIEWED_NOT_ESTABLISHED(0) / UNRESOLVED(?)`이고, **0은 해당 cell의 bounded closure가 `ZERO_REVIEW_CLOSED`로 명시된 경우에만 유효**하다. 모든 `1`과 `0` cell은 `evidenceRefs`에 최소 1개의 machine-valid evidence reference(`source:<uuid>` 또는 절대 `https://...`)를 가져야 한다. G는 국가 개수를 세지 않고 고정된 6개 외부수용 모드를 세며, geographic identity는 caller 자유문자열이 아니라 `data/un-m49-country-area-codes.v1.json`의 **3자리 UN M49 country/area code**만 사용한다. S는 6개 고정 successor class를 유지하고 한 class당 첫 qualifying downstream entity에서 count가 닫힌다. formatter는 raw profile에서 `E_COUNT/R_COUNT/T_COUNT/D_COUNT/G_COUNT/S_COUNT`와 **`VERIFIED_COUNT /36`**을 직접 산출한다. 이 숫자는 중요도·위대함·도덕성·정치적 가치·rank/tier/grade가 아니라 **닫힌 review packet에서 검증된 사전정의 factual coverage의 산술 개수**다. 세부 정의의 단일 권위는 `docs/ATLAS_PERSON_REGISTRATION_VALUE_STANDARD.md`다. |

Polity naming follows the current Stage 2 entity-boundary contracts: historical names, historiographic names and explicitly tagged editorial catalog labels are semantically distinct. Editorial labels never become historical self-designations or UUID identity.

### Product-scope boundary

The row-oriented Persons screen is a working product surface, not the final ontology definition. The final Authoring System keeps the historical core small and composable:

- Person object: identity/names, descriptions, source-backed life facts such as birth/death date/place, representative media reference, optional typed biographical facts, and related Activities.
- Polity / Government / PeopleGroup / HistoricalEvent remain semantically separate objects.
- Place is reusable by life facts, events and later map/runtime navigation; it does not become a Polity merely because an event or Person is associated with it.
- Source is a reusable evidence object capable of bibliographic/web metadata plus artifact/hash metadata when an ingested file exists. File hash/bytes are not a substitute for citation metadata.
- AI research follows **candidate → evidence/source/confidence → human review → authoritative authoring**; it never bypasses the normalized writer.
- Game-specific or presentation-only fields are extensions/crosswalks, not Person/Polity identity.
- **Roster scope:** every **living Person is excluded from new canonical Person creation**, regardless of office status. `living` → EXCLUDE/REJECTED with no Person write; `deceased` → reviewed life-status basis is carried into registration; unresolved current life status → HOLD/BLOCKED. Existing canonical Person reuse is not a new identity creation and follows the current registration contract.

Unknown optional profile facts remain absent/unresolved. The system must not require religion, dynasty, gender, media, place or any other optional field merely to make a Person row “complete”. **Person, Place and Source exist as first-class Authoring objects** in the intended end state.

## 2. Foundations — preserve verified work; repair only reopened invariants

| ID | State | Foundation |
|---|---|---|
| `ATLAS-RQ-0101` | COMPLETED | normalized `atlas_v2` authority |
| `ATLAS-RQ-0102` | COMPLETED | normalized identity authoring |
| `ATLAS-RQ-0103` | COMPLETED | reconstructible current schema — clean baseline + current registries + reviewed Stage 2 schema bodies + P9 cutover are proven on fresh PostgreSQL |
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

Production evidence is summarized historically in `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md`; the current execution position is summarized in `docs/release/STAGE2_CURRENT_STATUS_2026-08-19.md`. The first failed schema run is retained only as failure history; the later controlled run succeeded.

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

### P10 — Person duplicate revalidation / physical merge gate — COMPLETED IN PRODUCTION

- `ATLAS-RQ-0220` — **COMPLETED:** semantic-v2 Person duplicate revalidation and the governed physical-merge gate were closed against exact Production state.

The controlled `ATLAS P10 Revalidation Release` run `33981717352` completed successfully on exact Production/main SHA `f738e69f0b2cd218f9554da0332873f018b8ee07`. Immutable final verification recorded zero active requirements, zero active or pending duplicate candidates, zero blockers, and lifecycle `p10-v2-revalidated`. No automatic review or physical Person merge was executed by the closure release because no live candidate required one.

The one-shot Production release transport is historical after this completion. The live duplicate-review service, revalidation readiness, durable requirement ledger and Person merge interlock remain active safety contracts; future reviewed duplicate candidates must still satisfy those gates before any physical merge.

Durable closure evidence is preserved in `docs/release/P10_PRODUCTION_CLOSURE_2026-09-06.md`.

### P11 — Baseline B / end-state snapshot — COMPLETED / HISTORICAL EVIDENCE

- `ATLAS-RQ-0221` — **COMPLETED:** post-P10 semantic-v2 blocker frontier was closed and the final Baseline B capture checkpoint was sealed in the P11 lineage.
- Final checkpoint lineage includes PR **#960** / commit `0a951b51bce082c617b274a835a058ef3ef0748f`; the preceding current-delta backfill run recorded by that PR was **34002929679 — SUCCESS** with Baseline-B blocking rows reduced to zero.
- P11 is **not an active recapture task**. Its one-shot Production backfill/capture transports were subsequently retired by the cleanup lineage (#1484, #1497, #1504).
- The surviving current contract is generalized **canonical-data readiness**, implemented by `server/atlas-canonical-data-readiness.js`, its workflow and regression tests.

Historical Baseline B evidence remains audit history. Current correctness must be checked through current canonical contracts rather than repeatedly re-running the retired P11 release ceremony.

### P12 — Remove reachable legacy/transitional paths — COMPLETED

- `ATLAS-RQ-0222` — **COMPLETED:** current correction runtime accepts only `atlas-correction-manifest/v2` or the reviewed v2 execution-plan path.
- Live `corrections/intents/` dispatch and correction manifest v1/v1.1/v1.2/v1.3/v1.4 service dispatch are unreachable; current regression tests explicitly reject those schemas and assert zero legacy executable correction-service dependencies.
- Historical migration/request artifacts may remain as replay/audit evidence. Their presence is not live compatibility.

### P13 — Full product lifecycle — REOPENED FOR TARGETED REMEDIATION

- `ATLAS-RQ-0223` — **PENDING:** full Production product lifecycle acceptance is reopened because the post-closure audit found integration gaps that Unit 17 did not exercise end-to-end.
- `ATLAS-RQ-0226` — **COMPLETED:** complete first-class Person object authoring without forcing unknown optional profile facts.
- `ATLAS-RQ-0227` — **COMPLETED:** complete Place and bibliographic Source authoring as independent objects.
- `ATLAS-RQ-0228` — **COMPLETED:** implement explicit Compile → Runtime projection and readiness filtering.
- `ATLAS-RQ-0229` — **COMPLETED:** represent unresolved Person Activity boundaries without fabricated endpoints.
- `ATLAS-RQ-0230` — **COMPLETED:** source-backed candidate review is immutable and human-authorized, approved revisions are queued by exact revision, and the consolidated Production Authoring API applies only the stored reviewed payload through canonical Human Authoring with exact ledger/replay read-back; stale/non-approved revisions fail closed.

P13 acceptance requires Person, Place and Source exist as first-class Authoring objects, the normalized writer remains authoritative, and Runtime cannot publish unresolved Authoring data as if it were settled fact.

CORE v2 Unit 17 remains historical acceptance evidence, but its terminal closure was superseded by the 2026-10-01 re-entry audit for the specifically reopened invariants above. Verified completed requirements remain closed; P14 historical-map content and research integration remain separately pending.

### P14 — Historical map contract — PENDING

- `ATLAS-RQ-0224` — **PENDING:** integrate the historical map contract using Person → Activity → Polity → Territory → Geometry.
- `ATLAS-RQ-0225` — **PENDING:** preserve the ATLAS map research standard and evidence discipline.

Territory/Geometry work must never back-propagate invented identity, chronology or political authority into the Person DB.

## 4. Project-integrity maintenance surface

The read-only project-integrity audit remains useful maintenance tooling, but it is **not an active P11 gate and does not reopen completed P11/P12 work**.

Current implementation:

- `server/atlas-project-integrity-audit.js`
- `scripts/audit-atlas-project-integrity.mjs`
- `tests/atlas-project-integrity-audit.test.mjs`

It may be used for Korean preferred-name coverage, zero-source/dangling-reference detection, semantic-key completeness, exact duplicate detection, unreferenced catalog candidates, and Polity/Event collision review signals. An unused catalog row or Event-looking name is never destructive authority by itself.

Confirmed data corrections still use the current provenance-safe canonical correction/authoring path. No string heuristic authorizes destructive cleanup.

## 5. Superseded requirements — historical only

| ID | State | Replacement |
|---|---|---|
| `ATLAS-RQ-0301` | SUPERSEDED | duplicate Person physical merge moved behind `ATLAS-RQ-0212`, `ATLAS-RQ-0219`, `ATLAS-RQ-0220` |
| `ATLAS-RQ-0302` | SUPERSEDED | historical Baseline A + completed Baseline B (`ATLAS-RQ-0206`, `ATLAS-RQ-0221`) |
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

## 7. CORE v2 execution authority

The old P10→P14 numbered queue is retained above only for requirement traceability. It is **not** the active execution queue.

Current execution truth is intentionally split so it cannot drift:

- **architecture / invariants / exact unit definitions:** `docs/core/CORE_V2_MASTER_PLAN.md`
- **current active unit and exact resume point:** GitHub Issue **#917 body only**
- **execution mechanics / Response Barrier / verification rules:** `WORK_EXECUTION.md`

Historical #917 comments, old P11/P12 release tasks, stale PRs and old P-phase queue prose are audit evidence only. A new CORE turn resumes from #917, completes one unit, advances #917 to the next exact unit, then stops unless the user explicitly requests multiple units.

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
- historical map integration consumes the political/territorial model rather than rewriting it for display convenience;
- CORE v2 preserves one canonical authority and one canonical writer per resource, with Authoring/Derived/Runtime boundaries explicit;
- active operational state is not duplicated into historical documentation or old issue comments.
