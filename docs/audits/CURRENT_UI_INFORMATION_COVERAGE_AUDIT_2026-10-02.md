# CURRENT UI INFORMATION COVERAGE AUDIT — 2026-10-02

## 0. Audit boundary

- Mode: **READ → INSPECT → COMPARE → CLASSIFY → REPORT**
- UI code mutation: **0**
- Production data mutation: **0**
- P14/Territory/Geometry implementation: **0**
- Base main SHA: `afb37aad0155a69191f1fbb6ae2cebd57ed62441`
- Deployed SHA observed during live checks: `50fda2d0ab9640fb2f91199f337f6469f2470a8e`
- The main/deployed delta at audit time is PR #1795's audit-document-only change. No UI/read/API implementation path differs.
- P14 state is **PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME**.

The companion machine-readable inventory is:

- `docs/audits/CURRENT_UI_INFORMATION_COVERAGE_AUDIT_2026-10-02.json`

## 1. Result

A total of **99 UI information/behavior checks** were classified.

| State | Count |
|---|---:|
| DONE | **65** |
| PARTIAL | **12** |
| MISSING | **15** |
| STALE_REQUIREMENT | **5** |
| INTENTIONALLY_NOT_EXPOSED | **2** |

The old August-era assessment that Main exposed only a small Activity subset is no longer current. Current Main + Evidence Inspector now expose explicit Polity, Relation, Role, Period Basis, full temporal boundaries, certainty/calendar, confidence, chronology status, notes, source title/type/URL/citation/locator, and canonical Person detail.

The highest-risk remaining gap is not cosmetic: **the current Admin Human Authoring form has drifted behind the canonical server registration contract for newly created Person/Polity identities.**

## 2. P0 findings

### P0-A — New Person registration UI cannot satisfy the current canonical contract

Current browser Human Authoring payload in `atlas-admin-identity.js` does **not** send `person.representative_domain`.

Current server Human Authoring requires a reviewed representative-domain decision when a Person is newly created. `server/atlas-human-authoring-service.js` fail-closes with:

`HUMAN_AUTHORING_NEW_PERSON_DOMAIN_REVIEW_REQUIRED`

when the newly created Person has no reviewed domain.

**Classification: MISSING / correctness defect.**

Required repair: add a controlled representative-domain field to canonical Human Authoring and lock a browser-contract regression proving a new Person request satisfies the server contract.

### P0-B — New Polity registration UI cannot satisfy the current canonical spatial obligation

Current browser Human Authoring payload does **not** send `spatial_disposition`.

`server/atlas-spatial-fact-contract.js` requires a new Polity to carry a canonical terminal spatial registration state plus evidence.

Therefore a Human Authoring request that must actually create a new Polity cannot satisfy the current backend contract.

**Classification: MISSING / correctness defect.**

Required repair: collect the canonical spatial terminal state and evidence only when a new Polity is being created; do not invent a display location or historical center.

### P0-C — Public authority catalog still presents P14 as an active future path

Current project state explicitly parks P14. However `atlas-ui-authority-catalog.ko.js` still describes Geometry as:

> 향후 단계 · P14

and frames P14 completion as the natural future implementation path.

That is stale project-state UI.

**Classification: MISSING / stale current-state copy.**

Required repair: represent Geometry/P14 as **parked / not active** and do not imply automatic resumption.

### P0-D — Source authority copy is stale after P13/CORE

`atlas-ui-authority-catalog.ko.js` says first-class Source authoring must still be completed in P13.

That is no longer true: `atlas-source-service.js` already owns first-class Source authoring metadata. What is still missing is the **independent public Source browser/read surface**, not the backend authoring authority itself.

**Classification: MISSING / stale current-state copy.**

## 3. Main / Person / Activity

### DONE

Current Main already provides:

- preferred KO and canonical EN Person names;
- aliases/name metadata;
- Person type and historicity;
- descriptions and Person-level sources;
- Polity/Relation/domain filtering;
- explicit Activity Relation semantics including `opposes` and `claims_rule`;
- Role and Period Basis;
- full start/end boundaries;
- ongoing read presentation;
- granularity, certainty, calendar;
- confidence and chronology status;
- Activity notes;
- BCE/CE and unresolved chronology presentation.

The Activity Evidence Inspector correctly groups chronology evidence and exact source locators without creating a second source of truth.

### PARTIAL

Still incomplete:

- Person UUID can drive deep links but is not visibly printed/copyable in detail.
- Timeline disposition is present in the Person read model and some card states, but detail lacks a dedicated canonical disposition/reason field.
- Representative domain drives filters/colors/portrait presentation but is not a persistent visible semantic label in Person detail.
- Runtime inclusion/exclusion is globally visible, but not explained per Person/Activity in detail.

## 4. Source / Evidence

### DONE

Main/Evidence already show:

- title;
- source type;
- canonical URL;
- citation/reference text;
- assertion locator.

Admin Source inspection exposes Source UUID and artifact hash/bytes.

### MISSING

Canonical Source metadata exists beyond what the current UI/read projections expose:

- author/creator;
- institution;
- publisher;
- publication date/year;
- external identifier;
- `citation_metadata`;
- `artifact_metadata`.

These should be projected from canonical Source authority. The UI must not reconstruct or infer missing bibliography from citation strings.

The old idea of a generic competing-evidence taxonomy is **not a current canonical requirement** and must not be invented in UI until the backend actually owns such semantics.

## 5. Polity

### DONE

Current Polity dossier exposes:

- UUID-backed identity;
- KO/EN names and aliases;
- polity type/historicity;
- Activity and Person links;
- temporal designation;
- observed Activity coverage caveat rather than presenting designation range as a fabricated polity-life span.

### MISSING

Still not visible:

- retired identity / redirect history;
- reviewed continuity / lineage information where canonical authority already exists.

Any future UI must read these from canonical identity/correction authority. It must not infer continuity from similar names or overlapping dates.

## 6. Spacetime

The core Spacetime Person UI is **DONE**, not an unfinished redesign lane.

Verified current functionality includes:

- unified camera;
- desktop zoom/pan;
- mobile pinch/pan;
- full Person-name labels;
- stable region/era semantic axes;
- shared representative-domain colors;
- opposed-polity handling;
- unresolved chronology handling;
- non-timeline exclusion from year placement;
- sticky inspector;
- minimap;
- bounded/lazy performance behavior.

Two old requirements are now stale:

1. **800% maximum zoom** — superseded by the current tested camera contract with 500% default and a wider allowed range.
2. **density-based regional width/compression** — superseded by stable world geometry; density is handled through zoom/LOD/labels, not regional distortion.

No new Spacetime redesign should start without a measured regression.

## 7. Portrait

### DONE

Current portrait architecture correctly provides:

- portrait present/absent/fallback states;
- upload / replace / delete;
- 4:5 subject composition;
- presentation background separate from canonical portrait asset;
- no requirement to bake domain/era frame, text, or badge into the canonical image;
- responsive rendering.

### PARTIAL

The durable revision/provenance backend exists, but Main lacks a clear read-only provenance/revision-history browser.

The older proposal to make era icons/material frames mandatory across portrait UI is **not a current binding contract** and should not be revived automatically.

## 8. Dashboard

### DONE

Dashboard already provides authoritative or canonical-derived views for:

- Person/Activity scale;
- incomplete-reason breakdown;
- representative-domain coverage;
- NamuWiki review coverage;
- Runtime exclusions with reasons/targets;
- source/provenance debt;
- Runtime publication funnel;
- explicit unknown states rather than fabricated zero.

### PARTIAL

- Exact canonical Polity inventory total is available in Admin DB status, while the public Dashboard mainly presents used-Polity concentration.
- Exact canonical Source entity total is likewise an Admin-level table count rather than a public KPI.

These are not correctness defects unless the product requires those exact inventory totals publicly.

## 9. Admin System / Inspector

### DONE

Admin already exposes:

- deployed SHA/ref/environment;
- safe configuration-presence state;
- DB/schema state and dynamic table counts;
- Runtime compile/publication diagnostics;
- readiness;
- duplicate lifecycle;
- UUID Object Inspector.

The Admin also intentionally refuses to turn GitHub Actions into a fabricated runtime PASS signal, which is correct.

### MISSING / PARTIAL

Still useful:

- bounded last successful authoring/correction references;
- bounded read-only authoring ledger/history inspection;
- unified blocker/obligation debt only after a real canonical read surface exists.

Raw secret values remain intentionally hidden and must stay hidden.

## 10. Admin Authoring

### DONE

- primitive direct Person/Polity forms are browser-disabled;
- server also rejects primitive Person/Polity creation at the public identity endpoint;
- Relation/Role/Period Basis/full boundaries/Source basic fields are available;
- NamuWiki review fields are available.

### MISSING / PARTIAL

In addition to the two P0 contract defects:

- ongoing Activity authoring UI is missing although backend supports ongoing/as-of;
- non-timeline Person-only canonical authoring UI is missing although `atlas-human-person-authoring/v1` exists;
- Person place facts are supported by backend but not exposed in normal Admin;
- Source subsection only covers basic title/URL/citation and not the full canonical bibliographic model.

## 11. Old plan disposition

| Old plan / requirement | Current disposition | Reason |
|---|---|---|
| UI 개발 현황 점검 | **PARTIAL** | Information completeness improved substantially; Source/Polity/Admin contract gaps remain. |
| 시공간 인물도 구현 진행 | **DONE** | Current core Spacetime interaction/model contract is implemented and tested. |
| 시공간 표 축소 방향 수정 | **DONE** | Stable world geometry/global scale principle is now the operative contract. |
| 색채 구분 강화 계획 | **DONE** | Shared 8-domain semantics are integrated across current surfaces. |
| 인물 분야 색상 디자인 | **DONE** | Controlled Person domain registry is reused; NULL remains neutral. |
| 시대별 대표 아이콘 선정 | **SUPERSEDED as mandatory UI requirement** | Era classification remains, but mandatory icon/material visual language is not in the current binding UI/portrait contract. |
| Historical-map polygon UI work | **PARKED** | P14 is explicitly parked and separate from current Person Spacetime UI. |

## 12. Recommended implementation batches

### UI-R1 — P0 — Admin canonical registration contract parity

Likely files:

- `atlas-admin-identity.js`
- `tests/atlas-admin-human-authoring-contract.test.mjs`
- `atlas-admin-identity.css` only if field layout requires it

Scope:

- representative-domain review for new Person;
- spatial terminal state + evidence for new Polity;
- prove browser payload parity against the current server contract.

Risk: **HIGH** because this is write-path correctness.

Browser verification: **required, authenticated, with no Production mutation**.

### UI-R2 — P0 — Public authority-state copy correction

Likely files:

- `atlas-ui-authority-catalog.ko.js`
- related authority/navigation tests

Scope:

- P14 shown as parked;
- Source/P13 stale copy corrected;
- Place copy corrected to distinguish backend authority from missing public browser.

Risk: **LOW**.

### UI-R3 — P1 — Canonical Source bibliographic coverage

Project richer canonical Source metadata into Person Evidence and Admin Source Inspector.

Risk: **MEDIUM**.

### UI-R4 — P1 — Polity identity lifecycle visibility

Expose canonical retirement/redirect/continuity facts only where backend authority exists.

Risk: **MEDIUM/HIGH**.

### UI-R5 — P1 — Person detail lifecycle completeness

Add visible UUID, domain label, timeline disposition/reason and only canonically-supported entity lifecycle state.

Risk: **LOW/MEDIUM**.

### UI-R6 — P2 — Admin mutation/ledger observability

Add bounded read-only authoring/correction references and history.

Risk: **MEDIUM**.

### UI-R7 — P2/P3 — Portrait provenance/history visibility

Read-only revision/source history before considering any editing expansion.

### UI-R8 — P3 — Spacetime/mobile polish only from measured regressions

No speculative redesign. Current core Spacetime work is considered complete.

## 13. Exact next work unit

**UI-R1 — Admin canonical registration contract parity — NOT STARTED**

This audit does not start UI-R1.
