# ATLAS Architecture Invariants

이 문서는 현재 ATLAS runtime의 강제 불변조건을 정의합니다. 과거 Phase 문서와 충돌하면 이 문서와 현재 코드/DB baseline이 우선합니다.

## 1. Authority

- `atlas_v2.*`가 유일한 application data authority입니다.
- 퇴역한 `public.person_politics`와 compatibility view는 runtime, fallback, bootstrap, reconciliation source가 될 수 없습니다.
- human-readable name은 identity가 아닙니다. Person/Polity/Role/Relationship의 authoritative identity는 normalized UUID입니다.

## 2. Browser boundary

- Browser는 same-origin API만 호출합니다.
- Browser는 PostgreSQL/Supabase DB credential, mutation bearer token, session signing secret을 알 수 없습니다.
- Browser direct DB writes는 금지합니다.

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
 -> atlas_v2 authoring audit ledger
```

- GitHub Actions에 DB credential을 저장하지 않습니다.
- Vercel은 repository, immutable repository id, main ref, workflow identity, production environment, audience, exact deployment SHA를 검증한 뒤에만 DB를 엽니다.
- `atlas-authoring-manifest/v1`은 backward compatibility contract입니다.
- 새 작업은 `atlas-authoring-manifest/v2`를 사용합니다.
- v2는 Person과 Activity에 더해 아직 없는 Polity/Role을 같은 transaction에서 선택적으로 생성할 수 있습니다.
- 새 Polity/Role 선언이 Activity exact reference와 일치하지 않으면 자동 추론하지 않고 fail closed합니다.
- manifest orchestration은 identity service의 non-owning domain primitive를 재사용하며 nested transaction이나 별도 writer를 만들지 않습니다.
- 동일 `request_id` + 동일 manifest는 idempotent replay, 동일 `request_id` + 다른 manifest는 fail closed입니다.

## 6. Activity mutation boundary

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

## 7. Semantic activity identity

Activity semantic identity는 항상 다음 6차원입니다.

```text
Person + Polity + Start + End + Role(nullable) + Period basis
```

UI/import/planner/DB transaction이 서로 다른 semantic key를 사용하면 안 됩니다.

## 8. Duplicate review and merge

- fuzzy similarity는 candidate evidence일 수 있으나 자동 identity 결정이 아닙니다.
- candidate decision: `MERGE`, `KEEP_SEPARATE`, `REVIEW`.
- `MERGE`는 승인일 뿐 실행이 아닙니다.
- 실제 merge는 survivor UUID와 필요한 relationship reconciliation을 명시해야 합니다.
- merge는 SERIALIZABLE transaction 안에서 live evidence를 다시 계산합니다.
- stale evidence, metadata conflict, unexpected FK drift, ambiguous relationship reconciliation은 fail closed입니다.
- source person은 dependent data 보존/이동 후 마지막에 삭제합니다.
- merge audit는 before-state와 applied mutation summary를 보존합니다.

## 9. Authentication and secrets

- Human admin login과 server bearer credential은 별개입니다.
- `ATLAS_ADMIN_PASSWORD`: human login credential.
- `ATLAS_MUTATION_TOKEN`: server bearer credential.
- `ATLAS_SESSION_SECRET`: browser session signing 전용 secret. 설정 시 mutation token과 cryptographic role을 분리합니다.
- migration compatibility 때문에 session secret 미설정 시 mutation token fallback을 현재 허용하지만, 운영 목표는 dedicated secret 설정입니다.
- Session cookie는 HttpOnly + Secure + SameSite=Strict입니다.

## 10. PostgreSQL client

- 모든 runtime DB API는 `server/atlas-postgres-client.js` 하나를 사용합니다.
- client setup을 API entrypoint마다 복제하지 않습니다.
- `SUPABASE_DB_CA`가 설정되면 certificate verification을 강제합니다.
- DB 연결 실패는 deterministic JSON 503으로 처리합니다.

## 11. Schema governance

- `db/schema/atlas_v2.current.sql`이 clean-db current baseline입니다.
- baseline은 기존 `atlas_v2` DB에 적용하지 않습니다.
- future DB structure change는 reviewed migration으로 적용하고, 성공 후 current baseline을 같은 구조로 갱신합니다.
- data row count는 schema invariant가 아닙니다.

## 12. CI governance

현재 repository integrity CI source of truth는 `.github/workflows/atlas-integrity.yml`입니다.

반드시 검증:

- exact locked dependencies (`npm ci`)
- all `tests/*.test.mjs`
- active JS syntax
- zero reachable legacy runtime
- fresh PostgreSQL baseline rebuild

Production authoring operation은 `.github/workflows/atlas-authoring-apply.yml`이며 integrity CI를 대체하거나 병렬 architecture gate로 취급하지 않습니다.

과거 Phase workflow를 현재 gate로 병렬 유지하지 않습니다.

## 13. Release governance

`main` commit과 Production deployment는 동일하다고 추정하지 않습니다.

Release 완료 조건:

1. PR exact head ATLAS Integrity PASS.
2. reviewed merge to `main`.
3. Vercel Production deployed SHA가 merge된 main SHA와 일치.
4. production smoke가 read/session/protected API boundary를 확인.
5. authoring transport 변경 시 approved manifest replay가 exact deployment SHA에서 idempotently 성공.

배포되지 않은 main 코드를 Production 기능으로 간주하지 않습니다.
