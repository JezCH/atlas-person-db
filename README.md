# ATLAS Person × Polity Authoring System

ATLAS의 normalized 역사 identity와 인물–정치체 활동 관계를 저작·검토하는 관리 시스템입니다.

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
reviewed manifest orchestration
          ↓
existing identity/activity transaction services
          ↓
      atlas_v2.*
```

브라우저는 Supabase/PostgreSQL에 직접 접속하지 않으며 DB credential을 포함하지 않습니다. 퇴역한 `public.person_politics`와 compatibility view는 runtime·bootstrap 의존성이 아닙니다.

## Authoring domains

### Identity authoring

새로운 Person / Polity / Role은 normalized identity로 생성합니다.

- Person: EN canonical preferred name + KO preferred display name을 한 SERIALIZABLE transaction에서 생성
- Polity: 동일
- Role: 명시적 code/category/source label + EN/KO 이름 생성
- canonical 이름이 기존 alias와 충돌하면 fail closed
- 한국어 동명이인은 관리자 검토 후 명시적으로 허용 가능
- 이름은 identity가 아니며 UUID가 authoritative identity입니다.

### Activity authoring

Identity가 존재한 뒤 `person_politics_v2` 활동 관계를 생성·수정·삭제합니다.

Semantic activity identity는 다음 6개 차원 전체입니다.

```text
Person + Polity + activity_start + activity_end + Role(nullable) + Period basis
```

update/delete는 normalized relationship UUID를 사용합니다.

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
- `atlas_v2`만 authoritative runtime data
- raw SQL 직접 등록 금지
- legacy table write 금지
- 동일 `request_id`는 idempotent replay
- 동일 `request_id`에 다른 payload가 들어오면 fail closed
- 모든 기존 Polity/Role 참조는 exact resolve하며, 미해결/모호하면 중단

세부 형식은 `authoring/README.md`를 따릅니다.

### Duplicate review / merge

Phase 9 evidence-based duplicate system은 현재 기능입니다.

- deterministic candidate detection
- evidence fingerprint
- `MERGE` / `KEEP_SEPARATE` / `REVIEW`
- MERGE approval과 실제 merge 분리
- explicit survivor selection
- explicit relationship reconciliation
- SERIALIZABLE merge transaction
- live evidence revalidation
- full merge audit

자동 fuzzy merge/delete는 없습니다.

## Database reconstruction

현재 normalized schema의 clean-database 기준본은:

`db/schema/atlas_v2.current.sql`

입니다. 이 파일은 **새 PostgreSQL에서 현재 schema를 재구축하기 위한 baseline**이며 기존 DB에 덮어쓰는 migration이 아닙니다. 자세한 계약은 `db/README.md`를 따릅니다.

## Verification

```bash
npm ci
npm test
npm run test:runtime
npm run test:schema   # fresh PostgreSQL DATABASE_URL 필요
```

GitHub의 current integrity gate는 `.github/workflows/atlas-integrity.yml`입니다. 모든 `tests/*.test.mjs`, runtime legacy reachability, fresh PostgreSQL schema rebuild를 검증합니다.

`.github/workflows/atlas-authoring-apply.yml`은 integrity gate와 별개의 production authoring operation workflow이며, approved manifest가 `main`에 들어온 경우에만 OIDC를 통해 정확한 Production deployment에 적용합니다.

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

- `ARCHITECTURE_INVARIANTS.md` — runtime/보안/transaction 불변조건
- `DATA_MODEL.md` — normalized entity·relationship·duplicate semantics
- `OPERATIONS.md` — 환경변수·배포·검증·복구 절차
- `db/README.md` — schema baseline 정책
- `authoring/README.md` — GitHub authoring manifest contract
- `migration/` — 과거 migration/audit evidence. 현재 runtime 설계 문서가 아님

## Historical evidence

Phase 6–9의 migration, cutover, retirement, duplicate-review 증거는 `migration/`에 남아 있습니다. 역사적 스크립트나 보고서가 현재 runtime entrypoint라는 의미는 아닙니다.
