# ATLAS UI Information Coverage v1

> Status: UI source-of-truth baseline for `agent/ui-information-completeness`.
>
> Goal: **ATLAS가 알고 있는 중요한 정보가 UI 뒤에 숨어 있지 않게 한다.**
>
> - Main = 역사적 의미를 사람이 이해할 수 있게 가공해 빠짐없이 보여준다.
> - Admin = 저장·판정·검증·provenance·운영상태를 운영자가 추적 가능하게 보여준다.
> - Secret values = 노출하지 않는다. 대신 configured / missing / healthy 같은 상태만 보여준다.

This document is a coverage contract, not a new domain model. `ATLAS_REQUIREMENTS.md` and `DATA_MODEL.md` remain authoritative for semantics.

## Coverage states

- `REQUIRED` — 해당 surface에서 반드시 접근 가능해야 함.
- `DETAIL` — 기본 화면을 복잡하게 하지 않도록 상세/접기/inspector에서 제공.
- `ADMIN_ONLY` — 사용자용 역사 화면에는 불필요한 내부 정보.
- `FUTURE` — binding product requirement이지만 현재 backend/schema surface가 아직 없음.
- `SECRET_STATE_ONLY` — 값 자체는 금지, 설정/건강 상태만 허용.

## 1. Person identity and presentation

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Person preferred Korean display name | REQUIRED | REQUIRED | `person_names` | Main 일부 표시, Admin object inspector 부재 |
| Person canonical English name | REQUIRED | REQUIRED | `person_names` | Main 상세에서 충분히 노출되지 않음 |
| Other names / aliases / name type / locale / preferred | DETAIL | REQUIRED | `person_names` | 전용 UI 없음 |
| Person UUID | — | REQUIRED | `persons.id` | Admin 전용 inspector 필요 |
| Canonical key | — | REQUIRED | `persons.canonical_key` | Admin 전용 inspector 필요 |
| Person type | DETAIL | REQUIRED | `persons.person_type` | 현재 화면에서 거의 숨겨짐 |
| Historicity | REQUIRED | REQUIRED | `persons.historicity` | 사용자용 의미 표현 필요 |
| Person descriptions | REQUIRED | REQUIRED | existing `person_descriptions` foundation | 현재 Person 상세 surface 미완성 |
| Person-level Sources | DETAIL | REQUIRED | existing `person_sources` foundation | 현재 Person 상세 surface 미완성 |
| Birth/death date/place | FUTURE | FUTURE | P13 / `ATLAS-RQ-0226` | backend product model 선행 필요 |
| Representative media | FUTURE | FUTURE | P13 / `ATLAS-RQ-0226` | backend product model 선행 필요 |
| Optional typed biographical facts | FUTURE | FUTURE | P13 | unknown을 강제하지 않음 |

## 2. Person–Polity Activity

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Activity UUID | — | REQUIRED | `person_politics_v2.id` | Main browser에는 전달되나 Admin inspector 부재 |
| Person binding | REQUIRED | REQUIRED | Person UUID | Main은 display 의미, Admin은 UUID까지 |
| Polity binding | REQUIRED | REQUIRED | Polity UUID | Main은 display 의미, Admin은 UUID까지 |
| Relation Type | REQUIRED | REQUIRED | Stage 2 / semantic-key v2 | 기존 Main row에 미노출 |
| Role | REQUIRED | REQUIRED | Role UUID + names | 현재 표시되나 raw identity inspector 없음 |
| Period Basis | REQUIRED | REQUIRED | Period Basis UUID/code | Main 표시 있으나 설명/원시값 부족 |
| Start year | REQUIRED | REQUIRED | Activity temporal boundary | 표시 중 |
| Start month/day | REQUIRED when present | REQUIRED | full temporal boundary | Main 미노출 |
| Start granularity | DETAIL | REQUIRED | server-derived temporal semantics | 미노출 |
| Start certainty | REQUIRED | REQUIRED | full temporal boundary | 미노출 |
| Start calendar | DETAIL | REQUIRED | full temporal boundary | 미노출 |
| End year | REQUIRED | REQUIRED | Activity temporal boundary | 표시 중 |
| End month/day | REQUIRED when present | REQUIRED | full temporal boundary | Main 미노출 |
| End granularity | DETAIL | REQUIRED | server-derived temporal semantics | 미노출 |
| End certainty | REQUIRED | REQUIRED | full temporal boundary | 미노출 |
| End calendar | DETAIL | REQUIRED | full temporal boundary | 미노출 |
| Confidence | REQUIRED | REQUIRED | Activity confidence | Main 미노출 |
| Chronology status | REQUIRED | REQUIRED | Activity chronology status | Main 미노출 |
| Notes | REQUIRED | REQUIRED | Activity notes | 일부 표시 |
| Runtime-ready / unresolved state | FUTURE | FUTURE | Compile/Runtime P13 | Compile surface 선행 필요 |
| Runtime exclusion reason | FUTURE | FUTURE | Compile/Runtime P13 | Compile surface 선행 필요 |

### Main temporal presentation rule

DB가 `uncertain`, `approximate`, 다른 calendar 또는 sub-year 정보를 알고 있으면 Main이 단순 정수 연도로 평탄화해서 확정 사실처럼 보여주면 안 된다. Main은 raw enum을 그대로 던지는 대신 사람이 이해하는 표현으로 변환하고, 상세에서 원 의미를 확인할 수 있게 한다.

## 3. Polity identity

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Preferred Korean name | REQUIRED | REQUIRED | `polity_names` | Activity row 위주만 존재 |
| Canonical English name | REQUIRED | REQUIRED | `polity_names` | Polity object page 없음 |
| Other names / aliases / name kind / locale | DETAIL | REQUIRED | `polity_names` + Stage 2 naming semantics | 전용 UI 없음 |
| Polity UUID | — | REQUIRED | `polities.id` | inspector 없음 |
| Canonical key | — | REQUIRED | `polities.canonical_key` | inspector 없음 |
| Polity type | DETAIL | REQUIRED | `polities.polity_type` | 미노출 |
| Historicity | REQUIRED | REQUIRED | `polities.historicity` | 미노출 |
| Governance / designation / identity relations | DETAIL | REQUIRED | Stage 2 | 전용 UI 없음 |
| Polity-to-Polity relations | DETAIL | REQUIRED | Stage 2 | 전용 UI 없음 |

## 4. Role / vocabulary

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Localized Role display | REQUIRED | REQUIRED | `role_names` | Main 일부 표시 |
| Role source label | DETAIL | REQUIRED | roles | Admin inspector 없음 |
| Role code | — | REQUIRED | `roles.code` | Admin inspector 없음 |
| Role UUID | — | REQUIRED | `roles.id` | Admin inspector 없음 |
| Category | DETAIL | REQUIRED | roles | 미노출 |
| Period Basis code / localized meaning | DETAIL | REQUIRED | period basis vocabulary | Main은 일부 hard-coded label 의존 |

## 5. Source / provenance

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Source title | REQUIRED | REQUIRED | normalized Source | Main에서 Activity provenance 미노출 |
| Author / institution | REQUIRED when present | REQUIRED | P13 Source product requirement / available metadata when present | 통합 surface 없음 |
| Publication date/year | REQUIRED when present | REQUIRED | Source metadata | 통합 surface 없음 |
| Canonical URL / bibliographic reference | DETAIL | REQUIRED | Source metadata | 통합 surface 없음 |
| Source type | DETAIL | REQUIRED | Source metadata | 미노출 |
| Citation/reference text | DETAIL | REQUIRED | assertion provenance | 미노출 |
| Assertion locator | DETAIL | REQUIRED | provenance locator | 미노출 |
| Source UUID | — | REQUIRED | `sources.id` | inspector 없음 |
| Artifact SHA-256 | — | REQUIRED when present | materialized Source artifact | inspector 없음 |
| Artifact bytes | — | REQUIRED when present | materialized Source artifact | inspector 없음 |
| Conflicting/competing evidence | REQUIRED when known | REQUIRED | reviewed authoring semantics | 전용 표현 필요 |

Main must allow a user to answer “왜 이 사실을 이렇게 표시했는가?” without opening GitHub or the database.

## 6. Duplicate / identity review

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Candidate existence | — | REQUIRED | `person_duplicate_candidates` | 현재 queue 존재 |
| Candidate UUID | — | REQUIRED | candidate table | inspector 강화 필요 |
| Candidate pair Person UUIDs | — | REQUIRED | candidate table | raw binding 노출 필요 |
| Detector version | — | REQUIRED | duplicate detector | 미노출/불충분 |
| Evidence fingerprint | — | REQUIRED | duplicate detector | 미노출/불충분 |
| Evidence/context details | — | REQUIRED | duplicate detector | 사람이 판정 가능한 구조로 강화 필요 |
| Decision `MERGE / KEEP_SEPARATE / REVIEW` | — | REQUIRED | review table | 현재 제공 |
| Review history | — | REQUIRED | review domain | 충분한 이력 surface 필요 |
| Evidence drift / stale decision | — | REQUIRED | P10 revalidation | 명확한 상태표시 필요 |
| Physical merge allowed | — | REQUIRED | server merge interlock | 반드시 서버 상태 그대로 표시 |
| Merge blocked reason | — | REQUIRED | server lifecycle state | 반드시 표시 |
| Merge audit | — | REQUIRED after execution | `person_merge_audits` | P10 execution 이후 surface 필요 |

Admin UI must never imply physical merge is possible when the server lifecycle says it is blocked.

## 7. Authoring execution / audit

| Information | Main | Admin | Current backend authority | Current UI gap |
|---|---|---|---|---|
| Request ID | — | REQUIRED | authoring ledger | 전용 audit UI 없음 |
| Manifest schema/version | — | REQUIRED | authoring ledger | 없음 |
| Manifest hash | — | REQUIRED | authoring ledger | 없음 |
| Person UUID result | — | REQUIRED | result snapshot | 없음 |
| Polity UUID result | — | REQUIRED | result snapshot | 없음 |
| Role UUID/null result | — | REQUIRED | result snapshot | 없음 |
| Period Basis result | — | REQUIRED | result snapshot | 없음 |
| Activity UUID result | — | REQUIRED | result snapshot | 없음 |
| Created/reused/resolved disposition | — | REQUIRED | result snapshot | 없음 |
| Replay state | — | REQUIRED | authoring ledger | 없음 |
| Provenance completeness / historical unknown | — | REQUIRED | result snapshot | 없음 |
| Applied at | — | REQUIRED | authoring ledger | 없음 |

## 8. System / operational transparency

Admin needs one System surface. Values must come from authoritative runtime/backend state, not duplicated hard-coded frontend constants.

| Information | Admin | Surface requirement |
|---|---|---|
| Production/runtime deployed SHA | REQUIRED | exact value |
| Runtime/application version | REQUIRED | exact value when defined |
| Current schema/baseline version | REQUIRED | exact value when defined |
| Activity semantic-key version | REQUIRED | `v2-relation-full-temporal` or actual active version |
| Person merge lifecycle state | REQUIRED | allowed/blocked + reason |
| Authoring readiness | REQUIRED | ready/bootstrap/blocker reason |
| Compile version/readiness | FUTURE | P13 |
| Last successful authoring write | REQUIRED when backend can expose | timestamp + request/result reference |
| Last correction | REQUIRED when backend can expose | timestamp + correction reference |
| Persons count | REQUIRED | current DB |
| Activities count | REQUIRED | current DB |
| Polities count | REQUIRED | current DB |
| Sources count | REQUIRED | current DB |
| Duplicate candidate counts by state | REQUIRED | duplicate domain |
| Unresolved Runtime blockers | FUTURE | Compile/readiness P13 |
| Integrity checks relevant to live operation | REQUIRED when runtime-readable | PASS/FAIL/UNKNOWN; GitHub-only state must be explicitly labelled as such |
| Production/main drift | REQUIRED when verifiable | do not silently claim equivalence |

### Secret handling

The following values must never be displayed:

- database passwords / full connection strings
- `SUPABASE_DB_URL` value
- admin password
- session signing secret
- bearer tokens
- GitHub OIDC token
- private API credentials

Instead Admin may display only states such as:

```text
Database connection      healthy / unhealthy
Session secret           configured / missing
Admin credential         configured / missing
GitHub OIDC capability   available / unavailable / not checked
```

## 9. Future first-class product objects

These are binding future UI areas but must not be faked before the corresponding P13/P14 backend model exists.

| Object / capability | Main | Admin | Status |
|---|---|---|---|
| Place object | REQUIRED | REQUIRED | FUTURE P13 |
| Source object editor | REQUIRED read | REQUIRED edit | FUTURE P13 |
| Person life facts | REQUIRED | REQUIRED | FUTURE P13 |
| Representative media | REQUIRED when present | REQUIRED | FUTURE P13 |
| AI research candidates | —/reviewed result only | REQUIRED | FUTURE P13 |
| Compile readiness / Runtime projection | REQUIRED publication meaning | REQUIRED diagnostics | FUTURE P13 |
| Territory records | REQUIRED via map/detail | REQUIRED | FUTURE P14 |
| Geometry | REQUIRED via map | REQUIRED diagnostic/editor | FUTURE P14 |

A disabled/shell UI may indicate a planned object, but it must not invent data or pretend the backend already supports authoritative authoring.

## 10. UI implementation gates

Every UI change in this branch must obey these gates.

1. **No historical information loss** — an authoritative fact may be folded into a detail panel, but not silently dropped.
2. **No certainty flattening** — uncertain/approximate/calendar/sub-year state cannot be rendered as an unqualified exact year.
3. **No raw-only Main** — Main translates codes to readable historical meaning; raw identifiers remain available in Admin.
4. **No hidden Admin state** — if an operator needs GitHub/DB/source code to discover an operational state that backend can expose safely, it is a UI gap.
5. **No secret disclosure** — operational transparency never means credential disclosure.
6. **Server authority wins** — duplicate lifecycle, readiness, semantic version and writeability are not reimplemented as frontend guesses.
7. **No future-data fabrication** — P13/P14 shells may exist, but absent backend facts remain unavailable/unresolved.
8. **No parallel semantics** — UI does not introduce its own identity, Relation, temporal or confidence meanings.

## 11. First implementation order

This branch will proceed in small checkpoints:

1. **Coverage contract** — this document.
2. **Read/API inventory** — map each REQUIRED item to an existing API response or mark `BACKEND_SURFACE_NEEDED`.
3. **Main Persons redesign** — information-complete list/detail using only already-authoritative readable data.
4. **Admin object inspector** — raw identity, Activity semantics and provenance.
5. **Admin System surface** — runtime/schema/readiness/counts without secrets.
6. **Duplicate review UI alignment** — consume the P10 server lifecycle after P10 branch semantics settle.
7. **Future object shells only where useful** — Place/Source/Compile/Territory without fabricated data.

No UI checkpoint requires a Vercel deployment by default. Vercel is used only at an intentional runtime integration checkpoint.
