# ATLAS Person Activity Data Model

## 1. Authority

현재 application model은 normalized `atlas_v2` schema입니다. 핵심 identity/relationship tables:

- `persons`, `person_names`
- `polities`, `polity_names`
- `roles`, `role_names`
- `period_bases`, `period_basis_names`
- `person_politics_v2`

`public.person_politics`와 compatibility view는 퇴역했습니다.

이 문서는 **현재 구현 모델**을 설명합니다. 최종 제품 범위는 `ATLAS_REQUIREMENTS.md`가 우선하며, 현재 Activity-row projection을 최종 Person 객체/Runtime 모델로 오해해서는 안 됩니다.

## 2. Person identity

`persons.id` UUID가 Person identity입니다.

`persons.canonical_key`는 사람이 읽는 primary key가 아니라 stable unique key입니다. 신규 authoring 시 별도 값을 지정하지 않으면 EN canonical name을 기본값으로 사용합니다. 동명이인처럼 분리가 필요한 경우 explicit key를 지정할 수 있습니다.

`person_names`는 locale/name/name_type/preferred metadata를 보존합니다.

신규 historical Person 기본 계약:

```text
person_type = historical
historicity = historical
EN preferred name_type = canonical
KO preferred name_type = display
```

EN canonical과 KO preferred display는 한 transaction에서 같이 생성되어야 합니다.

최종 Authoring System에서 Person은 Activity row의 이름 칸이 아니라 first-class object입니다. 현재 schema가 아직 표현하지 않는 birth/death date/place, representative media, 추가 typed biographical facts 등은 `ATLAS-RQ-0226`의 후속 제품 범위이며, unknown을 채우기 위한 강제 column/default를 만들지 않습니다. 기존 `person_descriptions`, `person_sources`, `person_names`는 이 확장의 재사용 가능한 기반입니다.

## 3. Polity identity

`polities.id` UUID가 Polity identity입니다.

신규 historical Polity 기본 계약:

```text
polity_type = historical_polity
historicity = historical
EN preferred name_type = canonical
KO preferred name_type = display
```

Person과 마찬가지로 이름 자체가 identity는 아닙니다.

## 4. Role vocabulary

`roles.id` UUID와 unique `roles.code`가 vocabulary identity입니다.

Role authoring은 다음을 명시합니다.

- code
- category
- source_label
- EN preferred role name
- KO preferred role name

현재 relationship exact resolver가 code/source label/name을 사용하므로 Role vocabulary ambiguity를 자동 허용하지 않습니다.

## 5. Activity relationship

`person_politics_v2.id` UUID가 authoritative relationship identity입니다.

한 row는:

- person UUID
- polity UUID
- optional role UUID
- period basis UUID
- activity start/end
- confidence
- chronology status
- notes
- provenance locator/hash

를 연결합니다.

### Current semantic duplicate identity

현재 Production relationship semantic identity는 다음 전체 차원입니다.

```text
person_id
+ polity_id
+ activity_start
+ activity_end
+ role_id (nullable)
+ period_basis_id
```

Admin import, planner, PostgreSQL transaction이 동일 의미를 사용합니다. 같은 사람/정치체/기간이라도 Role 또는 Period basis가 다르면 별개 relationship일 수 있습니다.

`role_id`가 없으면 SQL `NULL`을 사용합니다. synthetic `unspecified` role은 만들지 않습니다.

### Stage 2 semantic identity

P9에서 최종 identity는 Relation Type과 interpreted full temporal boundaries까지 포함하도록 **한 번에** 교체됩니다. 현재 v1 semantic identity와 Stage 2 identity를 동시에 authoritative하게 유지하지 않습니다.

Unknown historical boundary는 fake year로 채우지 않습니다. 현재 `person_politics_v2`의 required integer endpoints는 transitional current-schema constraint이며, 최종 P13 Authoring model은 unresolved Activity assertion을 표현하면서 Compile이 Runtime-ready 여부를 판정해야 합니다.

## 6. Read projection

현재 Server read projection은 normalized Authoring tables를 직접 조인합니다.

```text
person_politics_v2
 + person_names
 + polity_names
 + roles/role_names
 + period_bases
```

EN canonical은 stable internal/search/export 값으로, KO preferred는 UI display 값으로 사용합니다. Browser에는 relationship UUID가 함께 전달됩니다.

이 direct projection은 **현재 transition runtime**입니다. `ATLAS-RQ-0006`과 `ATLAS-RQ-0228`의 최종형은:

```text
Authoring assertions
→ Compile / readiness validation
→ Runtime projection
→ list / search / detail / map
```

입니다. 따라서 final Runtime은 unresolved Authoring assertion을 단순히 raw table에 존재한다는 이유로 publish해서는 안 됩니다.

## 7. Place / Source boundary

Place는 Polity나 Territory의 별명이 아닙니다. Person life fact, activity/event location, map navigation이 같은 Place UUID를 재사용할 수 있어야 하며 Polity political authority는 별도 관계로 남습니다.

Source 역시 Activity의 `source_locator` 문자열이 아닙니다. `atlas_v2.sources` UUID가 normalized evidence identity이며, 최종 Source Authoring은 파일 artifact의 hash/bytes뿐 아니라 citation에 필요한 title/author-or-institution/publication date or year/URL or reference/source type을 보존할 수 있어야 합니다. Locator는 assertion-specific evidence location입니다.

현재 Stage 2 provenance join rehearsal은 source identity와 assertion locator를 분리하는 방향으로 이미 정렬되어 있습니다. Product-level Place/Source editors는 P13에서 완성합니다.

## 8. Write model

### Identity writes

`/api/atlas-identity` → `server/atlas-identity-service.js` → SERIALIZABLE transaction.

- canonical key replay는 exact same metadata일 때만 idempotent reuse.
- canonical key가 다른 entity와 충돌하면 fail closed.
- Person/Polity canonical EN이 기존 alias와 충돌하면 fail closed.
- KO 동명이인은 검토 없이 자동 통합하지 않음.

### Relationship writes

`/api/atlas-mutate` → transport → v2-authoritative mutation service → deterministic planner → transaction.

Active operations:

- create
- update
- delete
- import

update/delete는 normalized relationship UUID를 사용합니다.

### GitHub reviewed authoring writes

`authoring/requests/*.json` → OIDC-protected production apply → `server/atlas-authoring-manifest-service.js`.

`atlas-authoring-manifest/v2`는 한 authoring intent 안에서 다음을 원자적으로 수행할 수 있습니다.

```text
Person create/reuse
+ optional Polity create/reuse
+ optional Role create/reuse
+ Activity create
+ authoring manifest audit/idempotency ledger
```

전체 manifest는 하나의 PostgreSQL `SERIALIZABLE` transaction입니다. Identity helper는 transaction을 새로 열지 않는 domain primitive를 재사용하며, Activity는 기존 v2-authoritative transaction primitive를 같은 client/transaction 안에서 실행합니다.

새 Polity를 선언하면 `polity_identity.canonical_name_en`과 `activity.politic_name`이 정확히 일치해야 합니다. 새 Role을 선언하면 `activity.role`은 선언된 role의 code/source label/KO display token 중 하나와 정확히 일치해야 합니다. 불일치 시 자동 추론하지 않고 manifest 전체를 rollback합니다.

Activity insert 후 commit 전에는 실제 `person_politics_v2` row의 `person_id`, `polity_id`, `role_id`를 다시 읽어 선언/생성한 identity UUID와 대조합니다. 선언된 identity와 normalized relationship binding이 다르면 `AUTHORING_POSTWRITE_*_MISMATCH`로 전체 transaction을 rollback합니다.

기존 `atlas-authoring-manifest/v1`은 backward-compatible하며 Person + existing Polity/Role Activity authoring에 계속 사용할 수 있습니다.

### Authoring execution ledger

`atlas_v2.authoring_manifest_runs`는 manifest의 idempotency ledger이자 실행 provenance surface입니다.

현재 저장 필드:

- `request_id` — stable whole-manifest idempotency key
- `manifest_hash` — exact reviewed payload hash
- `manifest_schema` — v1/v2 contract version
- `person_id`
- `relationship_id`
- `result_snapshot` — 최초 성공 실행의 entity-level outcome snapshot
- `applied_at`

`result_snapshot` version 1은 다음 normalized binding을 보존합니다.

```text
Person UUID + disposition
Polity UUID + disposition
Role UUID/null + disposition
Period basis UUID + disposition
Activity UUID + disposition
```

신규 실행의 disposition은 `created`, `reused`, `resolved_existing`, `not_applicable` 중 하나입니다. Manifest-level `replay=true`와 entity disposition은 별개입니다. 즉 동일 request를 재실행해도 최초 실행에서 Person이 생성됐는지 기존 identity를 재사용했는지에 대한 snapshot은 바뀌지 않습니다.

Snapshot 도입 이전의 기존 ledger row는 original create/reuse 사실을 추정하지 않습니다. 동일 manifest가 다시 실행될 때 live UUID binding을 검증한 뒤 `provenance_complete=false`와 `historical_unknown` disposition으로 1회 backfill합니다.

Snapshot이 이미 존재하는 replay에서는 저장된 Person/Polity/Role/Period basis/Activity UUID와 live normalized relationship을 다시 비교합니다. drift가 있으면 replay를 성공 처리하지 않고 fail closed합니다.

## 9. Duplicate candidate/review domain

현재 tables:

- `person_duplicate_candidates`
- `person_duplicate_reviews`
- `person_merge_audits`

Candidate는 deterministic evidence-bearing suggestion입니다. identity 결론이 아닙니다.

Decision:

- `MERGE`
- `KEEP_SEPARATE`
- `REVIEW`

Evidence fingerprint는 name과 polity/chronology context를 포함한 canonical evidence 전체에 묶입니다.

## 10. Person merge lifecycle

`MERGE` decision은 **identity review decision**이며 현재 physical execution과 분리됩니다.

현재 상태:

```text
reconciliation = v1-polity-period-year-role
required = v2-relation-full-temporal
lifecycle = pre-p10-blocked
required lifecycle = p10-v2-revalidated
physical merge allowed = false
```

따라서 현재는 candidate rebuild와 MERGE / KEEP_SEPARATE / REVIEW 판정만 계속할 수 있습니다. 실제 Person 삭제/이관은 server interlock과 Admin UI 모두에서 P10까지 차단됩니다.

P10에서 v2-aware revalidation이 완료된 뒤 허용되는 실제 merge 절차는:

1. survivor UUID를 명시.
2. candidate/person/activity를 lock.
3. live detector evidence 재계산.
4. stale approval 거부.
5. 필요한 relationship reconciliation을 명시적으로 적용.
6. dependent provenance/claims/descriptions 보존.
7. survivor에 relationship remap.
8. source person을 마지막에 삭제.
9. full before-state/audit summary 기록.

전체 실행은 하나의 PostgreSQL SERIALIZABLE transaction입니다.

### Relationship reconciliation

현재 v1 reconciliation의 context group은 같은 polity + period basis + start/end를 기반으로 Role conflicts를 분리합니다. 이 구현은 P10 execution authority가 아닙니다.

P9/P10은 final Relation Type + full temporal boundary semantics로 reconciliation을 다시 만들고 후보를 재검증해야 합니다. 그 후에만 다음 action이 physical merge에 사용될 수 있습니다.

- `KEEP_DISTINCT_ROLES`
- `KEEP_ONE_RELATIONSHIP`

`person_politics_sources`, `chronology_claims`, `relationship_descriptions`는 redundant relationship 삭제 전에 보존/이동됩니다.

## 11. Schema baseline

현재 DB structure의 clean reconstruction source는 `db/schema/atlas_v2.current.sql`입니다. Live row counts는 data state이며 schema contract가 아닙니다.

최종 Product model은 현재 schema baseline과 동일한 개념이 아닙니다. Stage 2/P13 migration이 끝나면 clean baseline도 그 최종 구조로 갱신되고, P12에서 transition-only schema/runtime residue를 제거해야 합니다.
