# ATLAS Requirements Source of Truth v1

> Status: **FINALIZED REQUIREMENT RECONCILIATION / NO PRODUCTION MUTATION**
>
> Machine-readable registry: `requirements/atlas-requirements.v1.json`
>
> Validator: `scripts/verify-atlas-requirements.mjs`

이 문서는 ATLAS Person DB, Authoring System, Stage 2 semantic migration, duplicate/identity work, historical GIS/map integration에 흩어진 요구사항을 하나의 기준으로 통합한다.

최종 목표는 네 가지다.

- **100% traceable** — 유효한 요구사항과 폐기된 요구사항을 모두 추적한다.
- **0 known contradictions** — 최종 registry에 충돌 상태를 남기지 않는다.
- **0 silently omitted requirements** — 핵심 요구사항 ID가 사라지면 CI가 실패한다.
- **unknown stays unknown** — 역사적 불확실성은 구현 편의를 위해 추측으로 채우지 않는다.

## 1. 우선순위 규칙

프로젝트 요구사항이 충돌하면 다음 순서로 판정한다.

1. 사용자의 최신 명시적 결정
2. 반복적으로 유지된 프로젝트 원칙
3. 현재 GitHub 및 Production 실제 상태
4. 최신 인수인계
5. 이전 설계 문서
6. 과거 assistant 제안

역사적 사실은 별도다. 사용자 선호나 구현 편의로 역사 사실을 결정하지 않는다.

```text
reviewed primary / academic sources
→ reviewed historical decision
→ unresolved
```

## 2. ATLAS 헌법 — 계속 유효한 요구사항

| ID | 요구사항 |
|---|---|
| `ATLAS-RQ-0001` | Historical accuracy over completeness — 정확성 > 완전성. |
| `ATLAS-RQ-0002` | UUID is identity — 이름은 canonical/display/alias/evidence이지 identity가 아니다. |
| `ATLAS-RQ-0003` | Polity is a historical political actor — 문자열이 아니라 실제 정치적 행위자 여부로 판정한다. |
| `ATLAS-RQ-0004` | Government and regime are separate from Polity — 정부·정권·왕조·가문·사건·민족을 자동 Polity로 취급하지 않는다. |
| `ATLAS-RQ-0005` | Person never owns territory directly — Person → Activity → Polity → Territory → Geometry. |
| `ATLAS-RQ-0006` | Authoring, Compile and Runtime are distinct — Authoring은 불확실성을 보존하고 Runtime을 위해 왜곡하지 않는다. |
| `ATLAS-RQ-0007` | Territory semantics use independent axes — control / boundary certainty / evidence confidence를 분리한다. |
| `ATLAS-RQ-0008` | Territory is interval based — 매년 복제가 아니라 의미 있는 영토 변화구간을 저장한다. |
| `ATLAS-RQ-0009` | AI produces source-backed candidates, not truth by fiat — AI가 모르는 것을 창작하지 않는다. |
| `ATLAS-RQ-0010` | Final Person-Polity relation is explicit — `rules / governs / serves / active_in / opposes / claims_rule`, generic default 금지. |
| `ATLAS-RQ-0011` | Final Activity identity includes relation and full temporal boundaries. |
| `ATLAS-RQ-0012` | Source provenance survives correction and merge — source/locator/claim/description/before-state 보존. |

## 3. 이미 완료된 기반 — 다시 개발하지 않는다

| ID | 완료 기반 | 현재 증거 |
|---|---|---|
| `ATLAS-RQ-0101` | Normalized `atlas_v2` authoritative | `ARCHITECTURE_INVARIANTS.md`, `DATA_MODEL.md` |
| `ATLAS-RQ-0102` | Person/Polity/Role normalized identity authoring | `/api/atlas-identity`, identity service/admin |
| `ATLAS-RQ-0103` | Current schema reconstruction | `db/schema/atlas_v2.current.sql` + ordered migrations |
| `ATLAS-RQ-0104` | Central ATLAS Integrity CI | `.github/workflows/atlas-integrity.yml` |
| `ATLAS-RQ-0105` | Shared PostgreSQL client + deterministic config failure | `server/atlas-postgres-client.js` |
| `ATLAS-RQ-0106` | Dedicated admin session-secret role | session/architecture contract |
| `ATLAS-RQ-0107` | Reviewed authoring manifest v2 atomic lifecycle | authoring manifest service |
| `ATLAS-RQ-0108` | Evidence-based Person duplicate review architecture | detector/review/merge services |
| `ATLAS-RQ-0109` | Isolated dry-run-first correction v1 | correction service/workflow |

`COMPLETED`는 현재 `main` 코드에 구현 증거가 있다는 의미다. 해당 SHA가 Production에 배포됐는지는 별도 release requirement로 추적한다.

## 4. 최종 실행 순서와 남은 작업

### P0 — Production control

- `ATLAS-RQ-0201` — **Protect main with ATLAS Integrity.** `main` branch protection과 required integrity gate를 실제로 강제한다.
- `ATLAS-RQ-0202` — **Restore exact Production SHA deployment proof.** GitHub main과 Vercel Production SHA가 같음을 검증하기 전 Production mutation을 진행하지 않는다.

### P1 — Current-schema cleanup

- `ATLAS-RQ-0203` — **Apply R0 only after future-semantic equivalence gate.** 현재 6 Activity duplicate pair가 final Relation/full temporal semantics에서도 동일함을 확인한 뒤 dry-run/apply한다.
- `ATLAS-RQ-0204` — **Add bounded correction v1.1 operations.** pre-Stage-2에는 `coalesce + retire_activity + bounded interval update`만 허용한다.
- `ATLAS-RQ-0205` — **Apply the three current-schema R1 corrections.** Franklin invalid U.S. row retire, Bismarck Prussia interval update, Muhammad pre-622 Medina retire.

### P2 — Baseline A

- `ATLAS-RQ-0206` — **Create Baseline A from live Production.** R0/R1 뒤 실제 DB를 다시 읽어 row count를 추측하지 않고 authoritative Activity UUID set을 만든다.

### P3 — Historical research + Stage 2 integration

- `ATLAS-RQ-0207` — **Rebuild Stage 2 integration on Baseline A.** 346-row old stack을 순차 merge하지 않고 Baseline A에 reviewed decisions/rehearsal을 rebind한다.
- `ATLAS-RQ-0208` — **Close Sengoku authority research.** Oda, Uesugi, Hideyoshi/Toyotomi pre/post-unification authority를 source-backed로 닫는다.
- `ATLAS-RQ-0209` — **Close six regional-authority cases.** Liu Yan, Yuan Shao, Ma Teng, Liu Biao, Lü Bu, Fang Guozhen.
- `ATLAS-RQ-0210` — **Close layered-authority R1 cases.** Rurik/Kievan Rus, Cao Cao/Cao Wei, pre-221 Shu-Han.
- `ATLAS-RQ-0211` — **Close remaining historical blockers.** historical-research-first 잔여와 Qubilai pre-1271 territory를 해결하되 근거가 부족하면 unresolved를 보존한다.
- `ATLAS-RQ-0214` — **Finalize structural Polity relation intervals and provenance.** Polity→Polity assertion을 exact interval/UUID/source에 묶는다.

### P4 — Identity decisions, no destructive Person merge

- `ATLAS-RQ-0212` — **Complete Person duplicate decisions without early destructive merge.** candidate rebuild 후 MERGE/KEEP_SEPARATE/REVIEW를 확정하되 Person 삭제는 P10까지 금지한다.
- `ATLAS-RQ-0213` — **Close canonical Polity identity decisions.** Polity alias/weak identity/continuity의 surviving UUID를 확정한다.

### P5 — Additive Stage 2 schema

- `ATLAS-RQ-0215` — **Apply additive Stage 2 schema.** Relation Type, Governance Context, Polity relations, designation/state form, identity relation, full temporal boundary, normalized provenance를 nullable/additive하게 추가한다. old runtime은 아직 유효해야 한다.

### P6 — Correction engine v2

- `ATLAS-RQ-0216` — **Implement correction engine v2 on the final schema.** relink, split, semantic update, governance assignment, Polity relation assertion, designation/identity transition, source link를 exact before/after state + immutable audit로 처리한다.

### P7 — Historical correction and backfill

- `ATLAS-RQ-0217` — **Apply full historical correction and semantic backfill.** structural correction → Polity identity → Governance → Polity relation → exact temporal correction → Relation Type → provenance 순으로 적용한다.

### P8 — Global semantic cutover gate

- `ATLAS-RQ-0218` — **Require a zero-known-blocker semantic cutover gate.** 필수 historical/structural/identity/provenance/semantic-key blocker가 0일 때만 cutover를 허용한다.

### P9 — Semantic-key v2 cutover

- `ATLAS-RQ-0219` — **Cut over Activity semantic-key v2 coherently.** DB index, planner, transaction, admin/import, GitHub replay, correction, duplicate reconciliation, Person merge가 동시에 같은 semantic identity를 사용한다.

End-state Activity identity:

```text
Person
+ Polity
+ Relation Type
+ Role / NULL
+ Period Basis
+ interpreted start boundary
+ interpreted end boundary
```

### P10 — Person physical merge

- `ATLAS-RQ-0220` — **Upgrade Phase 9 reconciliation and physically merge Persons.** v2-aware Activity grouping, explicit survivor, live evidence 재검증, source preservation, immutable merge audit 뒤에만 source Person을 삭제한다.

### P11 — Baseline B + end-state constraints

- `ATLAS-RQ-0221` — **Create Baseline B and enforce end-state constraints.** final live inventory 뒤에만 final unique/FK/required-field constraints를 강제한다.

### P12 — Legacy/transitional cleanup

- `ATLAS-RQ-0222` — **Remove all reachable legacy and transitional paths.** v1 semantic key/index/reconciliation, obsolete compatibility path, superseded rehearsal/CI/runtime writer를 dependency 확인 후 제거한다.

### P13 — Product acceptance

- `ATLAS-RQ-0223` — **Pass full Production product lifecycle acceptance.** 신규 Person/Polity reuse-or-create → Activity → Relation → precise period → update/search → duplicate review → merge → audit → delete → reread 전체 사이클을 검증한다.

### P14 — Historical map integration

- `ATLAS-RQ-0224` — **Integrate the historical map contract.** Person → Activity → shared Polity UUID → Territory Record → Geometry를 실제 지도 프로젝트와 연결한다.
- `ATLAS-RQ-0225` — **Preserve the ATLAS map research standard.** source hierarchy, direct/influence/contested 분리, confidence, unresolved, no invented GeoJSON 원칙을 지도 Authoring에 유지한다.

## 5. 과거 계획 중 폐기된 순서 — 다시 실행하지 않는다

- `ATLAS-RQ-0301` — **Merge duplicate Persons before Stage 2** → `ATLAS-RQ-0212`, `ATLAS-RQ-0219`, `ATLAS-RQ-0220`으로 대체. v1 merge는 final Relation/full temporal identity를 보지 못하므로 destructive merge가 너무 이르다.
- `ATLAS-RQ-0302` — **Use one post-cleanup baseline only** → `ATLAS-RQ-0206`, `ATLAS-RQ-0221`로 대체. Baseline A와 B의 목적이 다르다.
- `ATLAS-RQ-0303` — **Expand correction v1 directly to relink and split** → `ATLAS-RQ-0204`, `ATLAS-RQ-0216`으로 대체. Stage 2 schema-dependent operation은 v2로 미룬다.
- `ATLAS-RQ-0304` — **Treat country/government labels as interchangeable Polity identity** → `ATLAS-RQ-0003`, `ATLAS-RQ-0004`로 대체.

## 6. Negative requirements — 절대 되돌리지 않는다

| ID | 금지사항 |
|---|---|
| `ATLAS-NO-0001` | No Person-owned geometry. |
| `ATLAS-NO-0002` | No invented history or geometry. |
| `ATLAS-NO-0003` | No string-based automatic Polity classification. |
| `ATLAS-NO-0004` | No generic Relation default. |
| `ATLAS-NO-0005` | No v1/v2 split brain. |
| `ATLAS-NO-0006` | No early destructive Person merge. |
| `ATLAS-NO-0007` | No stale Stage 2 stack piecemeal merge. |
| `ATLAS-NO-0008` | No premature relink/split in correction v1.1. |
| `ATLAS-NO-0009` | No placeholder geometry for missing evidence. |
| `ATLAS-NO-0010` | No Runtime-driven historical distortion. |
| `ATLAS-NO-0011` | No legacy runtime resurrection. |
| `ATLAS-NO-0012` | No unnecessary deployment churn; coherent reviewed change units를 사용한다. |

## 7. 핵심 의존성

### Person duplicate decision ≠ Person deletion

```text
candidate rebuild
→ MERGE / KEEP_SEPARATE / REVIEW decision
→ Stage 2 semantics applied
→ semantic-key v2 cutover
→ v2-aware physical Person merge
```

### Baseline은 두 번 필요하다

```text
current reviewed baseline
→ R0/R1 current-schema cleanup
→ Baseline A
→ Stage 2 migration/correction
→ v2 Person merge
→ Baseline B
```

### Correction generation을 분리한다

```text
v1 / v1.1
  coalesce
  retire
  bounded interval update

v2
  relink
  split
  semantic update
  governance
  polity relation
  designation / identity transition
  normalized source linkage
```

## 8. 완료 정의

ATLAS Person DB / Authoring 개발 완료는 다음을 모두 만족하는 상태다.

- binding requirement가 `ACTIVE` 또는 `COMPLETED`
- `PENDING = 0`
- known conflict = 0
- unverified release state = 0
- reviewed semantic cutover blocker = 0
- reachable legacy runtime/writer = 0
- duplicate semantic implementation = 0
- final Baseline B captured
- full Production authoring lifecycle acceptance PASS
- Person-owned geometry 없이 historical map contract 성립

## 9. CI contract

`npm run test:requirements`는 다음을 fail closed로 검증한다.

- registry schema/version/finalized flag
- `P0..P14` roadmap order
- requirement ID uniqueness
- 허용된 status만 사용
- PENDING requirement의 roadmap binding
- COMPLETED requirement의 evidence path 존재
- SUPERSEDED replacement target 유효성
- mandatory core requirement 누락 금지
- 이 문서와 machine-readable registry 간 ID drift 금지

앞으로 요구사항이나 실행 순서를 바꾸려면 **이 문서와 `requirements/atlas-requirements.v1.json`을 같은 PR에서 함께 변경**한다.
