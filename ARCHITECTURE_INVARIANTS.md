# ATLAS Architecture Invariants

이 문서는 현재 ATLAS runtime의 강제 불변조건을 정의합니다. 과거 Phase 문서와 충돌하면 이 문서와 현재 코드/DB reconstruction contract가 우선합니다.

## 1. Authority

- `atlas_v2.*`가 유일한 application data authority입니다.
- 퇴역한 `public.person_politics`와 compatibility view는 runtime, fallback, bootstrap, reconciliation source가 될 수 없습니다.
- human-readable name은 identity가 아닙니다. Person/Polity/Role/Relationship의 authoritative identity는 normalized UUID입니다.

## 2. Browser boundary

- Browser는 same-origin API만 호출합니다.
- Browser는 PostgreSQL/Supabase DB credential, mutation bearer token, session signing secret을 알 수 없습니다.
- Browser direct DB writes는 금지합니다.
- GitHub OIDC 전용 authoring/audit/correction endpoints는 browser authoring surface가 아닙니다.

## 3. Read boundary

```text
Browser -> GET /api/atlas-read -> server normalized projection -> atlas_v2.*
```

- legacy fallback 없음.
- server configuration failure는 JSON 503으로 실패합니다.

## 4. Identity authoring boundary

```text
Admin -> authenticated POST /api/atlas-identity -> identity service -> SERIALIZABLE transaction
```

- Person/Polity는 canonical EN + preferred KO name을 같은 transaction에서 생성합니다.
- canonical EN은 기존 alias와 exact collision이 없어야 합니다.
- KO display collision은 자동 합치지 않습니다. 명시적 관리자 review override만 허용합니다.
- Role vocabulary 충돌은 fail closed입니다.

## 5. GitHub reviewed authoring boundary

```text
reviewed authoring/requests/*.json
 -> GitHub Actions short-lived OIDC
 -> exact main SHA Vercel Production endpoint
 -> one SERIALIZABLE manifest transaction
 -> existing Person/Polity/Role identity primitives
 -> existing v2 Activity writer
 -> post-write UUID binding verification
 -> atlas_v2 authoring audit + execution-result ledger
```

- GitHub Actions에 DB credential을 저장하지 않습니다.
- Vercel은 repository, immutable repository id, main ref, workflow identity, production environment, audience, exact deployment SHA를 검증한 뒤에만 DB를 엽니다.
- `atlas-authoring-manifest/v1`은 backward compatibility contract입니다.
- 새 작업은 `atlas-authoring-manifest/v2`를 사용합니다.
- v2는 Person과 Activity에 더해 아직 없는 Polity/Role을 같은 transaction에서 선택적으로 생성할 수 있습니다.
- 새 Polity/Role 선언이 Activity exact reference와 일치하지 않으면 자동 추론하지 않고 fail closed합니다.
- manifest orchestration은 identity service의 non-owning domain primitive를 재사용하며 nested transaction이나 별도 writer를 만들지 않습니다.
- Activity write 뒤 commit 전에는 normalized relationship의 실제 Person/Polity/Role UUID binding을 다시 읽어 선언/생성 결과와 대조합니다. mismatch는 전체 rollback입니다.
- `atlas_v2.authoring_manifest_runs.result_snapshot`은 최초 성공 실행의 entity-level UUID와 `created`/`reused`/`resolved_existing`/`not_applicable` disposition을 보존합니다.
- manifest-level replay와 entity disposition은 서로 다른 개념입니다. 동일 request replay는 최초 snapshot을 보존하고 다시 계산해 덮어쓰지 않습니다.
- snapshot이 있는 replay는 저장된 Person/Polity/Role/Period basis/Activity UUID가 live normalized relationship과 여전히 일치해야 합니다. drift는 fail closed입니다.
- snapshot 도입 이전 historical run의 create/reuse 상태는 추정하지 않습니다. exact replay 때 live UUID를 검증한 뒤 `provenance_complete=false` + `historical_unknown`으로만 backfill합니다.
- 동일 `request_id` + 동일 manifest는 idempotent replay, 동일 `request_id` + 다른 manifest는 fail closed입니다.

## 6. GitHub reviewed correction boundary

```text
reviewed corrections/requests/*.json
 -> dedicated GitHub Actions short-lived OIDC
 -> exact main SHA Vercel Production endpoint
 -> dry-run of the real SERIALIZABLE mutation transaction
 -> ROLLBACK
 -> only after successful dry-run: reviewed apply
 -> source/provenance-preserving normalized correction primitive
 -> correction result ledger
```

- Correction은 신규 authoring과 별도 trust/workflow/audience를 사용합니다.
- `atlas-correction-manifest/v1`은 `coalesce_relationship` 하나만 허용하는 R0 compatibility contract입니다.
- `atlas-correction-manifest/v1.1`은 **Stage 2 이전 current-schema cleanup 전용**이며 `coalesce_relationship`, `retire_activity`, `update_activity_interval`만 허용합니다.
- v1.1은 `relink`, `split`, Polity identity mutation, Relation/Governance mutation을 절대 허용하지 않습니다. 이들은 Stage 2 schema 이후 correction v2 대상입니다.
- v1/v1.1의 모든 target은 normalized UUID와 exact reviewed before-state(Person/Polity/Role/Period basis/Start/End/notes/legacy source key)에 묶입니다.
- `update_activity_interval`은 start/end만 바꿀 수 있고 다른 semantic field가 변하면 fail closed입니다.
- `retire_activity`는 삭제 전 relationship row와 source links, chronology claims, relationship descriptions를 immutable correction result snapshot에 보존합니다. 퇴역한 잘못된 assertion의 child rows는 live semantic graph에 잔존시키지 않습니다.
- target relationship locks는 deterministic UUID order로 획득합니다.
- coalesce는 기존 Person merge의 검증된 source-preserving primitive를 재사용합니다.
- coalesce 시 relationship source links, chronology claims, relationship descriptions는 drop 전에 보존/이동합니다.
- 동일 source에 서로 다른 locator가 발견되면 fail closed합니다.
- dry-run은 실제 mutation primitive와 postcondition을 실행하고 transaction 전체를 rollback해야 하며 Production data/schema를 바꾸지 않습니다.
- apply는 dry-run 성공 후 동일 exact deployed SHA에서 실행합니다. 필요한 ordered correction-ledger migration은 apply handler가 실행할 수 있습니다.
- correction ledger는 삭제된 relationship UUID가 사라진 뒤에도 감사증거를 보존해야 하므로 dropped/retired Activity에 FK를 걸지 않습니다.
- 동일 `request_id` + 동일 manifest는 idempotent replay, 동일 request id + 다른 payload는 fail closed입니다.
- correction engine/workflow/API 코드 변경 자체는 Production correction workflow의 push trigger가 아닙니다. approved `corrections/requests/*.json`이 main에 들어오지 않는 한 자동 data mutation이 발생하지 않습니다.

## 7. Activity mutation boundary

```text
Browser/Admin/Import
 -> authenticated POST /api/atlas-mutate
 -> mutation transport
 -> v2-authoritative mutation service
 -> deterministic planner
 -> exact identity resolution
 -> one PostgreSQL transaction
 -> atlas_v2.person_politics_v2
```

- create/update/delete/import만 active mutation operation입니다.
- retired `reconcile` mutation surface를 다시 추가하지 않습니다.
- update/delete는 normalized relationship UUID를 사용합니다.
- Role은 nullable이며 synthetic unspecified role을 만들지 않습니다.
- 일반 delete surface는 provenance-preserving reviewed correction/coalesce의 대체 수단이 아닙니다.

## 8. Semantic activity identity

현재 Production pre-Stage-2 Activity semantic identity는 다음 6차원입니다.

```text
Person + Polity + Start + End + Role(nullable) + Period basis
```

UI/import/planner/DB transaction이 이 현재 identity를 서로 다르게 구현하면 안 됩니다.

Stage 2 최종 cutover identity는 다음으로 확장됩니다.

```text
Person
+ Polity
+ Relation Type
+ Role(nullable)
+ Period Basis
+ interpreted start boundary
+ interpreted end boundary
```

full boundary에는 year/month/day/granularity/calendar interpretation이 포함됩니다. DB index, planner, transaction, authoring/replay, correction collision check, duplicate reconciliation, Person merge가 **같은 release cutover에서 동시에** 이 identity로 전환되어야 하며 v1/v2 split-brain은 금지합니다.

## 9. Duplicate review and merge

- fuzzy similarity는 candidate evidence일 수 있으나 자동 identity 결정이 아닙니다.
- candidate decision: `MERGE`, `KEEP_SEPARATE`, `REVIEW`.
- `MERGE`는 승인일 뿐 실행이 아닙니다.
- Stage 2 이전에는 duplicate Person의 identity decision까지 할 수 있으나 destructive Person merge는 금지합니다.
- 실제 physical merge는 Stage 2 semantic identity cutover 이후 survivor UUID와 필요한 v2-aware relationship reconciliation을 명시해야 합니다.
- merge는 SERIALIZABLE transaction 안에서 live evidence를 다시 계산합니다.
- stale evidence, metadata conflict, unexpected FK drift, ambiguous relationship reconciliation은 fail closed입니다.
- source person은 dependent data 보존/이동 후 마지막에 삭제합니다.
- merge audit는 before-state와 applied mutation summary를 보존합니다.

## 10. Authentication and secrets

- Human admin login과 server bearer credential은 별개입니다.
- `ATLAS_ADMIN_PASSWORD`: human login credential.
- `ATLAS_MUTATION_TOKEN`: server bearer credential.
- `ATLAS_SESSION_SECRET`: browser session signing 전용 secret. 설정 시 mutation token과 cryptographic role을 분리합니다.
- migration compatibility 때문에 session secret 미설정 시 mutation token fallback을 현재 허용하지만, 운영 목표는 dedicated secret 설정입니다.
- Session cookie는 HttpOnly + Secure + SameSite=Strict입니다.
- GitHub reviewed authoring/audit/correction은 각자의 dedicated OIDC audience + exact workflow identity를 사용하며 서로의 token을 수용하지 않습니다.

## 11. PostgreSQL client

- 모든 runtime DB API는 `server/atlas-postgres-client.js` 하나를 사용합니다.
- client setup을 API entrypoint마다 복제하지 않습니다.
- `SUPABASE_DB_CA`가 설정되면 certificate verification을 강제합니다.
- DB 연결 실패는 deterministic JSON 503으로 처리합니다.

## 12. Schema governance

- `db/schema/atlas_v2.current.sql`이 clean-db baseline입니다.
- 완전한 현재 구조의 재구성 contract는 `clean baseline + ordered reviewed migration registries`입니다.
- baseline은 기존 `atlas_v2` DB에 적용하지 않습니다.
- structural DB change는 reviewed migration으로 적용하고 ordered registry에 포함합니다.
- authoring migration source of truth: `server/atlas-authoring-migrations.js`.
- correction migration source of truth: `server/atlas-correction-migrations.js`.
- fresh-schema CI는 baseline과 모든 current ordered migrations를 적용한 뒤 exact final table/constraint surface와 migration replay를 검증해야 합니다.
- reviewed migrations는 운영 이력을 보존합니다. maintenance 시점에 current baseline을 새 구조로 refresh할 수 있으나 migration evidence를 임의 삭제하지 않습니다.
- data row count는 schema invariant가 아닙니다.

## 13. CI governance

현재 repository integrity CI source of truth는 `.github/workflows/atlas-integrity.yml`입니다.

반드시 검증:

- exact locked dependencies (`npm ci`)
- all `tests/*.test.mjs`
- active JS syntax
- requirements source of truth
- Vercel-minimized release governance
- R0 future-semantic equivalence while the R0 request is staged
- zero reachable legacy runtime
- fresh PostgreSQL baseline + current ordered migrations rebuild

Production authoring operation은 `.github/workflows/atlas-authoring-apply.yml`, Production correction operation은 `.github/workflows/atlas-correction-apply.yml`이며 integrity CI를 대체하거나 병렬 architecture gate로 취급하지 않습니다.

과거 Phase workflow를 현재 gate로 병렬 유지하지 않습니다.

## 14. Release governance

`main` commit과 Production deployment는 동일하다고 추정하지 않습니다.

상세 release-train 정책은 `RELEASE_GOVERNANCE.md`가 source of truth입니다.

- branch/PR research, docs, code, disposable PostgreSQL rehearsal, manifest preparation은 Vercel Production build를 이유로 main에 조기 merge하지 않습니다.
- `vercel.json`은 non-Production build를 skip해야 합니다.
- main merge/deployment는 live-state dependency barrier마다 하나의 coherent Production train으로 묶습니다.
- 현재 Baseline A가 R0/R1 live result에 의존하므로 Train 1(current-schema cleanup)과 Train 2(Stage 2 transition)는 구조적으로 분리합니다. 미래 Baseline A를 추측해서 배포 횟수를 줄이지 않습니다.
- 한 exact deployed SHA에서 migration/correction/backfill/cutover 등 여러 operation을 순서대로 실행할 수 있으면 별도 배포로 쪼개지 않습니다.

Release 완료 조건:

1. PR exact head ATLAS Integrity PASS.
2. reviewed merge to `main`.
3. Vercel Production deployed SHA가 merge된 main SHA와 일치.
4. production smoke가 read/session/protected API boundary를 확인.
5. authoring transport 변경 시 approved manifest replay가 exact deployment SHA에서 idempotently 성공.
6. authoring replay 결과 snapshot이 live normalized UUID binding 검증을 통과.
7. correction request가 있는 경우 같은 main SHA에서 correction dry-run이 먼저 성공하고 `committed=false`임을 확인.
8. correction apply가 `committed=true`로 성공한 뒤 result artifact와 live post-state를 검증.
9. 해당 train의 live-state 결과(Baseline A/B 등)가 후속 branch work의 authoritative input으로 capture된다.

배포되지 않은 main 코드를 Production 기능으로 간주하지 않습니다.
