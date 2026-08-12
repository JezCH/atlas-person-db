# ATLAS Requirements Source of Truth v1

> Status: **FINALIZED REQUIREMENT RECONCILIATION / NO PRODUCTION MUTATION**
>
> Machine registry: `requirements/atlas-requirements.v1.json`  
> Validator: `scripts/verify-atlas-requirements.mjs`  
> Release policy: `RELEASE_GOVERNANCE.md`

ATLAS의 기준은 **100% traceable**, **0 known contradictions**, **0 silently omitted requirements**, **unknown stays unknown**이다. 역사적 사실은 구현 편의가 아니라 reviewed primary/academic evidence로 판정하며, 근거가 부족하면 unresolved를 보존한다.

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
| `ATLAS-RQ-0017` | A known Person–Polity assertion with an unknown start/end boundary must remain representable without inventing an endpoint year. |

Polity naming follows `stage2/contracts/entity-boundaries-current.v1.json`: historical names, historiographic names and explicitly tagged editorial catalog labels are semantically distinct. Editorial labels never become historical self-designations or UUID identity.

### Product-scope boundary

The current row-oriented Persons screen and Stage 2 political model are **not** the final product definition. The final Authoring System keeps the established historical core small and composable:

- Person object: identity/names, descriptions, source-backed life facts such as birth/death date/place, representative media reference, optional typed biographical facts, and related Activities.
- Polity / Government / PeopleGroup / HistoricalEvent remain semantically separate objects.
- Place is reusable by life facts, events and later map/runtime navigation; it does not become a Polity merely because an event or Person is associated with it.
- Source is a reusable evidence object capable of bibliographic/web metadata (for example title, author/institution, publication date/year, URL/reference and source type) plus artifact/hash metadata when an ingested file exists. File hash/bytes are not a substitute for citation metadata.
- AI research follows `candidate → evidence/source/confidence → human review → authoritative authoring`; it never bypasses the normalized writer.
- Game-specific or presentation-only fields must be extensions/crosswalks, not Person/Polity identity. They are not added merely because a UI could display them.

Unknown optional profile facts remain absent/unresolved. The system must not require religion, dynasty, gender, media, place or any other optional field merely to make a Person row “complete”.

## 2. Completed foundations — do not rebuild

| ID | Completed evidence |
|---|---|
| `ATLAS-RQ-0101` | normalized `atlas_v2` authority |
| `ATLAS-RQ-0102` | normalized identity authoring |
| `ATLAS-RQ-0103` | reconstructible current schema |
| `ATLAS-RQ-0104` | centralized ATLAS Integrity |
| `ATLAS-RQ-0105` | shared deterministic PostgreSQL client |
| `ATLAS-RQ-0106` | dedicated admin session secret role |
| `ATLAS-RQ-0107` | reviewed atomic authoring manifest v2 |
| `ATLAS-RQ-0108` | evidence-based Person duplicate review architecture |
| `ATLAS-RQ-0109` | isolated dry-run-first correction v1 |

`COMPLETED` means implementation/research evidence exists in the repository. Production deployment state is tracked separately.

## 3. Current P0–P14 execution order

### P0 — Production control
- `ATLAS-RQ-0201` — **COMPLETED:** use GitHub-enforced `ATLAS Integrity` protection whenever the repository/account can actually enforce it; while it cannot, use the documented fail-closed release gate: exact green PR head, zero unresolved review threads, expected-head merge, then exact `main` SHA = Vercel Production SHA before any Production mutation. A decorative non-enforced ruleset does not count as protection.
- `ATLAS-RQ-0202` — prove exact GitHub `main` SHA = Vercel Production SHA before mutation.

Current platform decision: `docs/release/P0_MAIN_PROTECTION_AVAILABILITY_2026-08-12.md`.

### P1 — Current-schema Train 1 cleanup
- `ATLAS-RQ-0203` — R0 only after future-semantic equivalence.
- `ATLAS-RQ-0204` — correction v1.1 remains bounded to coalesce / retire / interval update.
- `ATLAS-RQ-0205` — apply Franklin, Bismarck, Muhammad R1 corrections.

### P2 — Baseline A v2
- `ATLAS-RQ-0206` — create **Baseline A v2 full identity snapshot** on the same exact Production SHA after R0/R1.

Baseline A v2 captures one read-only repeatable snapshot containing all Activities plus all Persons/names, Polities/names including raw `name_type`, Roles/names, Period Bases/names, and Sources. Its digest covers `{rows, counts, catalogs}`. Unreferenced Person/Polity rows are included. It supplies live UUID inventory, not historical truth.

### P3 — Stage 2 integration
- `ATLAS-RQ-0207` — rebuild fresh integration from updated `main` + validated Baseline A v2; never merge the old 346-row stack as authority.
- `ATLAS-RQ-0208` — **COMPLETED** Sengoku model research.
- `ATLAS-RQ-0209` — **COMPLETED** six regional-authority model cases.
- `ATLAS-RQ-0210` — **COMPLETED** layered Rurik/Cao Cao/pre-221 Shu-Han model cases.
- `ATLAS-RQ-0211` — **COMPLETED** remaining Baseline-A-independent historical model research. Irreducible uncertainty is explicit, not guessed.
- `ATLAS-RQ-0214` — after Baseline A, bind reviewed structural Polity relations to surviving Polity/Source UUIDs.

The current pre-Vercel closure authority is `research/pre-vercel/stage2-pre-vercel-domain-closure.v1.json`. Territory/Geometry that does not alter Person Activity semantics is P14 work, not a reason to block or fabricate Stage 2 Activity identity.

### P4 — Identity decisions, no destructive merge
- `ATLAS-RQ-0212` — rebuild duplicate candidates and decide MERGE / KEEP_SEPARATE / REVIEW; execution stays blocked until P10.
- `ATLAS-RQ-0213` — bind reviewed Polity identity models to surviving Baseline A UUIDs. Names/keys only nominate review candidates.

### P5 — Additive Stage 2 schema
- `ATLAS-RQ-0215` — add nullable Relation Type, Governance Context, Polity relations/designations/identity transitions, full temporal boundaries, normalized provenance, Polity semantic name kind, PeopleGroup/PersonPeopleAffiliation, HistoricalEvent/PersonEventParticipation. Existing Runtime/write behavior remains valid until P9.

P5 is the Stage 2 political-semantic migration, **not** a license to force the whole future Person/Place/Source product model into the live database before the final authoring/runtime boundary is ready.

### P6 — Correction engine v2
- `ATLAS-RQ-0216` — exact UUID + exact before-state + reviewed after-state + provenance + postconditions + immutable audit for relink/split/semantic/governance/Polity relation/designation/identity/source operations.

### P7 — Historical correction/backfill
- `ATLAS-RQ-0217` — apply structural correction → identity → governance → Polity relation → temporal → Relation → People/Event/name-kind → provenance backfill.

### P8 — Global semantic gate
- `ATLAS-RQ-0218` — no cutover until every Runtime-required historical/identity/provenance/semantic key is computable. Explicit unresolved history may remain in Authoring but cannot be silently coerced into Runtime-ready state.

### P9 — Atomic semantic-key v2 cutover
- `ATLAS-RQ-0219` — DB index, planner, transactions, admin/import, replay, correction and duplicate reconciliation switch coherently; no v1/v2 split brain.

### P10 — Person physical merge
- `ATLAS-RQ-0220` — only after v2-aware reconciliation + P10 candidate revalidation. Current runtime interlock rejects physical merge before that lifecycle state. Until then MERGE/KEEP_SEPARATE/REVIEW decisions remain available but destructive execution must also appear disabled in the UI.

### P11 — Baseline B / end-state constraints
- `ATLAS-RQ-0221` — capture final live Baseline B, then enforce final required fields/uniqueness/checks for Runtime-ready semantic state. Do not turn optional/unknown historical facts into mandatory fake values.

### P12 — Legacy retirement
- `ATLAS-RQ-0222` — remove reachable v1 semantic identity, obsolete adapters/reconciliation, transitional writers, superseded rehearsals/CI/runtime paths.

### P13 — Full Authoring product + Compile/Runtime acceptance
- `ATLAS-RQ-0223` — pass complete Production product lifecycle acceptance.
- `ATLAS-RQ-0226` — finish first-class Person object authoring. Minimum scope is identity/names + description + source-backed life-event date/place + representative media reference + related Activity; optional biographical attributes are typed/source-backed and never forced when unknown.
- `ATLAS-RQ-0227` — finish reusable Place and bibliographic Source authoring as independent objects. Existing file/hash provenance remains valid but is not the whole Source model.
- `ATLAS-RQ-0228` — implement explicit `Authoring → Compile → Runtime` projection/materialization. Runtime search/list/detail consumes compiled readiness state rather than treating every Authoring row as publishable historical truth.
- `ATLAS-RQ-0229` — represent unresolved Person Activity boundary assertions without fake endpoint years. Such assertions remain authoring/review state until both boundaries are interpretable enough for the Runtime contract.
- `ATLAS-RQ-0230` — implement the already-established source-backed AI research candidate flow: candidate/evidence/confidence → human review → normalized authoring. No AI direct-to-truth write path.

P13 acceptance therefore includes, at minimum:

```text
Person object create/edit
→ Place/Source reuse or create where needed
→ Polity reuse/create
→ Activity + Relation + full/unknown-aware period authoring
→ provenance and review state
→ Compile
→ Runtime list/search/detail
→ duplicate decision
→ v2 merge/reconciliation/audit
→ delete/reread/recompile
```

The present Activity-row table may remain a transition/editor surface until this phase, but it cannot be declared the final Person object UI merely because the underlying Stage 2 relation model is complete.

### P14 — Historical map
- `ATLAS-RQ-0224` — Person → Activity → shared Polity UUID → Territory Record → Geometry.
- `ATLAS-RQ-0225` — preserve source hierarchy, control/influence/contested separation, uncertainty/confidence and no invented GeoJSON.

P14 consumes shared UUIDs and compiled Runtime-ready historical state. Place and Territory remain different concepts: a Place is a location/entity reference; Territory is a time-varying Polity spatial assertion.

## 4. Superseded plans — never revive

- `ATLAS-RQ-0301` — early destructive Person merge → replaced by `ATLAS-RQ-0212`, `ATLAS-RQ-0219`, `ATLAS-RQ-0220`.
- `ATLAS-RQ-0302` — one post-cleanup baseline only → replaced by `ATLAS-RQ-0206`, `ATLAS-RQ-0221`.
- `ATLAS-RQ-0303` — correction v1 direct RELINK/SPLIT → replaced by `ATLAS-RQ-0204`, `ATLAS-RQ-0216`.
- `ATLAS-RQ-0304` — country/government labels interchangeable with Polity → replaced by `ATLAS-RQ-0003`, `ATLAS-RQ-0004`.

## 5. Negative requirements

| ID | Forbidden |
|---|---|
| `ATLAS-NO-0001` | Person-owned geometry |
| `ATLAS-NO-0002` | invented history or geometry |
| `ATLAS-NO-0003` | string-based automatic Polity classification |
| `ATLAS-NO-0004` | generic Relation default |
| `ATLAS-NO-0005` | v1/v2 split brain |
| `ATLAS-NO-0006` | early destructive Person merge |
| `ATLAS-NO-0007` | stale Stage 2 stack piecemeal merge |
| `ATLAS-NO-0008` | RELINK/SPLIT in correction v1.1 |
| `ATLAS-NO-0009` | placeholder geometry |
| `ATLAS-NO-0010` | Runtime-driven historical distortion |
| `ATLAS-NO-0011` | legacy runtime resurrection |
| `ATLAS-NO-0012` | unnecessary deployment churn |
| `ATLAS-NO-0013` | merge/deploy for branch-only work |

## 6. Release-train dependency

```text
branch-only contracts/research/CI
→ P0 release control (GitHub enforcement when available; fail-closed exact-head gate otherwise)
→ Production Train 1: R0/R1 + Baseline A v2 on one exact SHA
→ fresh branch-only Stage 2 live rebinding/build/test
→ Production Train 2: additive migration + correction/backfill + P8 + P9 + P10 + Baseline B
→ P12 legacy retirement
→ P13 full Authoring + Compile/Runtime acceptance
→ P14 historical map integration
```

Train 1 and Train 2 cannot be safely precombined by guessing future UUID state. Conversely, no additional Vercel deployment is justified merely to gather information already captured by Baseline A v2.

The P13 product requirements above are intentionally preserved now but do **not** expand Train 1. Their live implementation belongs after the Stage 2 semantic state is stable; otherwise we would couple a current-schema cleanup deployment to unrelated product-surface migration.

## 7. Completion definition

ATLAS development is complete only when:

- every binding requirement is ACTIVE or COMPLETED;
- `PENDING = 0`;
- known conflict = 0;
- silently omitted agreed core scope = 0;
- unverified release state = 0;
- reviewed semantic cutover blocker = 0;
- reachable legacy runtime/writer = 0;
- duplicate semantic identity implementation = 0;
- unresolved Authoring assertions are representable without fabricated values and excluded from Runtime until ready;
- Person, Place and Source exist as first-class Authoring objects at the product layer;
- Runtime consumes an explicit Compile output/readiness projection rather than raw unresolved Authoring semantics;
- final Baseline B exists;
- full Production lifecycle acceptance passes;
- historical map integration retains Polity-owned territory;
- avoidable Vercel Production deployment churn = 0.

Requirements or release-order changes must update this document, `requirements/atlas-requirements.v1.json`, and when applicable `RELEASE_GOVERNANCE.md` in the same reviewed change.
