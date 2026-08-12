# ATLAS Person × Polity Authoring System

ATLAS의 normalized 역사 identity와 인물–정치체 활동 관계를 저작·검토·교정하는 현재 시스템입니다. 이 repository의 **현재 Production surface는 Stage 2 이전의 Person × Polity authoring runtime**이며, 최종 제품 범위는 `ATLAS_REQUIREMENTS.md`의 first-class Person / Place / Source + Compile / Runtime 요구사항까지 포함합니다.

## Current architecture

Production runtime은 `atlas_v2` only입니다.

```text
Browser / Admin
  ├─ GET  /api/atlas-read
  ├─ POST /api/atlas-session
  ├─ POST /api/atlas-identity
  ├─ POST /api/atlas-mutate
  └─ GET|POST /api/atlas-duplicate-review

GitHub authoring request
  └─ authoring/requests/*.json
          ↓
reviewed authoring orchestration
          ↓
existing identity/activity transaction services
          ↓
      atlas_v2.*

GitHub correction request
  └─ corrections/requests/*.json
          ↓
exact-SHA dry-run → reviewed apply
          ↓
source-preserving correction transaction
          ↓
      atlas_v2.*
```

브라우저는 Supabase/PostgreSQL에 직접 접속하지 않으며 DB credential을 포함하지 않습니다. 퇴역한 `public.person_politics`와 compatibility view는 runtime·bootstrap 의존성이 아닙니다.

현재 `/api/atlas-read`가 normalized Authoring tables를 직접 projection하는 것은 **transition runtime**입니다. 최종 구조는 `Authoring → Compile → Runtime projection`이며 unresolved Authoring assertion은 Runtime-ready 역사 사실로 자동 노출되지 않습니다.

## Authoring domains

### Identity authoring

새로운 Person / Polity / Role은 normalized identity로 생성합니다.

- Person: EN canonical preferred name + KO preferred display name을 한 SERIALIZABLE transaction에서 생성
- Polity: 동일
- Role: 명시적 code/category/source label + EN/KO 이름 생성
- canonical 이름이 기존 alias와 충돌하면 fail closed
- 한국어 동명이인은 관리자 검토 후 명시적으로 허용 가능
- 이름은 identity가 아니며 UUID가 authoritative identity입니다.

현재 identity form은 first-class Person object authoring의 기반이지 최종 Person profile editor가 아닙니다. P13에서는 기존 identity/names/descriptions/sources를 유지하면서 source-backed life facts, Place links, media reference와 관련 Activity를 하나의 Person object surface로 완성합니다. Optional historical fact는 모르면 비워 두며 fake default를 만들지 않습니다.

### Activity authoring

Identity가 존재한 뒤 `person_politics_v2` 활동 관계를 생성·수정·삭제합니다.

현재 Production semantic activity identity는 다음 6개 차원입니다.

```text
Person + Polity + activity_start + activity_end + Role(nullable) + Period basis
```

P9 final semantic identity는 Relation Type + full interpreted temporal boundaries를 포함하도록 coherent cutover합니다. update/delete는 normalized relationship UUID를 사용합니다.

현재 Activity endpoint year는 required integer이지만 역사적으로 모르는 boundary를 year `0`이나 임의 연도로 채우는 것은 금지됩니다. 최종 P13 Authoring은 unresolved Activity assertion을 represent하고 Compile이 Runtime readiness를 판정합니다.

### GitHub authoring manifests

`authoring/requests/*.json`은 ChatGPT/GitHub 작업에서 검토 가능한 신규 등록 요청을 남기는 표준 진입점입니다.

이 파일 자체가 runtime DB가 되는 것은 아닙니다. `server/atlas-authoring-manifest-service.js`가 manifest를 검증하고 기존 identity/activity transaction primitives를 재사용하여 `atlas_v2`에 반영합니다.

새 작업의 권장 contract는 `atlas-authoring-manifest/v2`입니다.

- Person은 항상 manifest 안에서 생성 또는 idempotent reuse
- 기존 Polity/Role을 정확히 참조할 수 있음
- 아직 없는 Polity는 `polity_identity`로 같은 transaction 안에서 생성 가능
- 아직 없는 Role은 `role_identity`로 같은 transaction 안에서 생성 가능
- 새 Polity/Role 선언과 Activity 참조가 정확히 일치하지 않으면 fail closed
- Person + optional Polity + optional Role + Activity + audit ledger가 하나의 SERIALIZABLE transaction으로 commit/rollback
- 기존 `atlas-authoring-manifest/v1` manifest는 계속 호환됨

핵심 원칙:

- GitHub manifest는 audit/review surface
- `atlas_v2`만 authoritative authoring data
- raw SQL 직접 등록 금지
- legacy table write 금지
- 동일 `request_id`는 idempotent replay
- 동일 `request_id`에 다른 payload가 들어오면 fail closed
- 모든 기존 Polity/Role 참조는 exact resolve하며, 미해결/모호하면 중단

세부 형식은 `authoring/README.md`를 따릅니다.

### Place / Source / AI product scope

Place와 Source는 이미 확정된 최종 Authoring 범위이며 임시 UI 장식이 아닙니다.

- Place는 Polity/Territory와 별개의 reusable historical location identity입니다.
- Source는 reusable evidence identity이며 citation metadata와 assertion-specific locator를 분리합니다.
- AI research는 source-backed candidate/evidence/confidence를 만들고 human review 후 normalized writer를 통과합니다. AI direct-to-truth write는 없습니다.

이 범위는 P13에서 구현하며 Production Train 1에는 끼워 넣지 않습니다.

### Reviewed corrections

기존 authoritative 관계를 역사 감사 결과에 따라 교정할 때는 신규 authoring 경로를 재사용하지 않고 별도의 `corrections/requests/*.json` contract를 사용합니다.

현재 `atlas-correction-manifest/v1`과 v1.1은 Stage 2 Train 1에서 검증된 current-schema correction만 수행합니다.

- exact reviewed before-state 필수
- SERIALIZABLE transaction
- relationship source / chronology claim / relationship description 보존
- 동일 source의 locator 충돌은 fail closed
- 실제 mutation transaction을 수행한 뒤 rollback하는 dry-run 필수
- dry-run 성공 후에만 exact-SHA apply
- dedicated correction OIDC audience/workflow
- idempotent correction ledger
- correction engine 코드 변경만으로는 Production write workflow가 실행되지 않음

v1.1은 `coalesce_relationship`, `retire_activity`, `update_activity_interval`만 허용합니다. relink/split/semantic migration은 correction v2까지 기다립니다. 세부 형식은 `corrections/README.md`를 따릅니다.

### Duplicate review / merge

Phase 9 evidence-based duplicate **review** system은 현재 기능입니다.

- deterministic candidate detection
- evidence fingerprint
- `MERGE` / `KEEP_SEPARATE` / `REVIEW`
- MERGE identity decision과 실제 physical merge 분리

현재 physical Person merge는 **의도적으로 비활성화**되어 있습니다.

```text
current reconciliation = v1-polity-period-year-role
required reconciliation = v2-relation-full-temporal
current lifecycle = pre-p10-blocked
required lifecycle = p10-v2-revalidated
```

서버는 `EXECUTE_APPROVED_MERGE`를 DB connection 전에 `PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION`으로 거부하고, Admin UI도 실제 survivor/relationship 실행 controls를 P10 전에는 보여주지 않습니다. Candidate rebuild와 MERGE / KEEP_SEPARATE / REVIEW 판정은 계속 가능합니다.

P10 이후 physical merge가 다시 열릴 때는 explicit survivor selection, v2 relationship reconciliation, live evidence revalidation, SERIALIZABLE merge transaction, full merge audit가 모두 필요합니다. 자동 fuzzy merge/delete는 없습니다.

## Database reconstruction

현재 normalized schema의 clean-database 기준본은:

`db/schema/atlas_v2.current.sql`

입니다. 완전한 현재 schema는 이 clean baseline에 reviewed ordered migration registries를 순서대로 적용하여 재구성합니다. 이 파일은 기존 DB에 덮어쓰는 migration이 아닙니다. 자세한 계약은 `db/README.md`를 따릅니다.

## Verification

```bash
npm ci
npm test
npm run test:runtime
npm run test:schema   # fresh PostgreSQL DATABASE_URL 필요
```

GitHub의 current integrity gate는 `.github/workflows/atlas-integrity.yml`입니다. 모든 `tests/*.test.mjs`, runtime legacy reachability, fresh PostgreSQL schema rebuild와 Stage 2 rehearsals를 검증합니다.

`.github/workflows/atlas-authoring-apply.yml`은 approved 신규 authoring manifest용 Production workflow입니다.

`.github/workflows/atlas-correction-apply.yml`은 approved correction manifest만 대상으로 하며, 별도 OIDC 경계에서 dry-run을 먼저 통과한 뒤 정확한 Production SHA에 apply합니다.

## Server environment

필수:

- `SUPABASE_DB_URL`
- `ATLAS_MUTATION_TOKEN`
- `ATLAS_ADMIN_PASSWORD`

권장 hardening:

- `ATLAS_SESSION_SECRET` — browser session signing 전용 secret. 설정되면 mutation bearer token과 분리됩니다. 미설정 환경은 배포 호환성을 위해 `ATLAS_MUTATION_TOKEN`으로 fallback합니다.
- `SUPABASE_DB_CA` — Supabase database CA PEM. 설정되면 PostgreSQL client가 certificate verification을 강제합니다.

브라우저 JavaScript에 이 값을 넣지 마십시오.

## Documentation source of truth

- `ATLAS_REQUIREMENTS.md` — 전체 제품/도메인/roadmap source of truth
- `ARCHITECTURE_INVARIANTS.md` — current runtime/보안/transaction 불변조건
- `DATA_MODEL.md` — current normalized entity·relationship·duplicate semantics + final boundary notes
- `OPERATIONS.md` — 환경변수·배포·검증·복구 절차
- `db/README.md` — schema baseline + ordered migration 정책
- `authoring/README.md` — GitHub authoring manifest contract
- `corrections/README.md` — reviewed correction manifest contract
- `docs/audits/` — current semantic/system audits
- `migration/` — 과거 migration/audit evidence. 현재 runtime 설계 문서가 아님

## Historical evidence

Phase 6–9의 migration, cutover, retirement, duplicate-review 증거는 `migration/`에 남아 있습니다. 역사적 스크립트나 보고서가 현재 runtime entrypoint라는 의미는 아닙니다.
