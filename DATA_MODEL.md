# ATLAS Person Activity Data Model

## 1. Authority

현재 application model은 normalized `atlas_v2` schema입니다. 핵심 identity/relationship tables:

- `persons`, `person_names`
- `polities`, `polity_names`
- `roles`, `role_names`
- `period_bases`, `period_basis_names`
- `person_politics_v2`

`public.person_politics`와 compatibility view는 퇴역했습니다.

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

### Semantic duplicate identity

신규 relationship semantic identity는 다음 전체 차원입니다.

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

## 6. Read projection

Server read projection은 normalized tables를 직접 조인합니다.

```text
person_politics_v2
 + person_names
 + polity_names
 + roles/role_names
 + period_bases
```

EN canonical은 stable internal/search/export 값으로, KO preferred는 UI display 값으로 사용합니다. Browser에는 relationship UUID가 함께 전달됩니다.

## 7. Write model

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

## 8. Duplicate candidate/review domain

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

## 9. Person merge

`MERGE` decision은 실행 승인이며 실제 merge와 분리됩니다.

실제 merge는:

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

같은 polity + period basis + start/end context의 rows는 conflict group이 될 수 있습니다.

허용 action:

- `KEEP_DISTINCT_ROLES`
  - 다른 Role은 유지.
  - 동일 Role duplicate는 representative relationship UUID를 명시.
- `KEEP_ONE_RELATIONSHIP`
  - context 전체에서 유지할 relationship UUID 하나를 명시.

`person_politics_sources`, `chronology_claims`, `relationship_descriptions`는 redundant relationship 삭제 전에 보존/이동됩니다.

## 10. Schema baseline

현재 DB structure의 clean reconstruction source는 `db/schema/atlas_v2.current.sql`입니다. Live row counts는 data state이며 schema contract가 아닙니다.
