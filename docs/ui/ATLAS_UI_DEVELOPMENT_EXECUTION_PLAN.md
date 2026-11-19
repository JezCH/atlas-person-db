# ATLAS UI 구체적 개발 실행계획 v1.0

> 2026-11-19 KST · 대상 JezCH/atlas-person-db · 개발 작업지시서 작성 완료, UI 기능 구현 완료 아님.
>
> 권위: 사용자 최신 지시 / WORK_EXECUTION.md / ATLAS_REQUIREMENTS.md / DATA_MODEL.md > docs/ui/ATLAS_UI_DELIVERY_PLAN.md v1.1 > docs/ui/UI_MANAGER_INTEGRATED_EXECUTION.md > docs/ui/ATLAS_UI_EVIDENCE_BASED_MASTERPLAN_20261119.md(20개 연구 근거) > 본 상세 실행 단위.
>
> 관리: 기존 하루 8회 ATLAS 프로젝트 총괄 → UI 매니저(기존 예약 내부 역할) → 실제 구현자. Issue #1896이 UI 상태 원장, #2627이 전체 원장. 새 예약·유료 도구·독립 상주 AI는 만들지 않는다.
>
> 목표: 기존 제품의 역사 전체 조망 → 인물 검색·명부 → 활동/정치체/Source 상세 → 시공간 동시대 → 두 인물 실제 활동 비교 → 원래 탐색 위치 복귀를 PC·모바일·키보드에서 정확하고 아름답게 수행한다. 기존 밀집 인물표를 카드/초상 중심 화면으로 바꾸지 않으며 실제 연대·지리·8분야색·Source 의미를 손상하지 않는다.

## 1. 완료 상태와 안전 경계

CODE_CHANGED / FOCUSED_TEST_PASS / EXACT_HEAD_CI_PASS / MERGED / PRODUCTION_ASSET_HTTP_VERIFIED / BROWSER_ACCEPTED / USER_VISUAL_APPROVED는 **각각 서로 다른 단계**다. READY 또는 병합만으로 실제 UI가 완성되었다고 집계하지 않는다. 인증 제한·브라우저 도구 미제공·무료 플랜 자원 부족 시 마지막으로 검증한 단계까지 기록하고 **별개로 수행 가능한 단위**는 이어서 처리한다.

기존 소스 직접 통합, 리뷰와 정확한 head CI 성공, Production 동일 자산/버전·대표 HTTP 200, 변경된 화면 PC·모바일의 사람/브라우저 실제 동작 확인을 원칙으로 한다. 최초 검증은 무료 오프라인 fixture/기존 테스트를 활용하고, 운영 Production 무제한 호출·Vercel Sandbox·402 재시도·신규 과금을 하지 않는다.

승인 없는 Canonical DB/Source 변경·정치체 identity 통합/퇴역·실존하지 않는 관계 생성·P14 Territory/Geometry 재개·관리자 권한 우회·미승인 VIS3-06 장식 배포 금지. 8개 분야 의미색과 governance Gold의 의미, 연대 확실성/역법, Main/Admin 권한 구분, 시공간의 기존 world X / historical Y / region ratio / 카메라/LOD 보존.

## 2. 현황 스냅샷과 겹치는 개발 피하기

2026-11-19 GitHub 확인: main 2c79339ed99b2b81bea1fdcab06a6e8912cd581a, PR #2728(동시대 권역 필터에서 시공간 재렌더/포커스 소실 방지) 병합 완료. PR #2725(인물 상세에서 시공간으로 초점 이동하는 기존 UUID 링크)는 **열림 상태**로 이 문서 작성 시점 검토 중. 이후 업무 시작 시 상태를 재조회한다.

| UI 트랙 | 재사용할 완료 작업 | 남은 실제 검증/구현 |
| --- | --- | --- |
| UI-01 인물 명부 | #2715 글자·행 가독성 CSS 병합/자산 확인 | PC·모바일 실제 표/정렬·검색·sticky·행 선택·장문 수용; 필요한 경우만 다중 활동 전개 |
| UI-02 인물·정치체 상세 | #2719 인물 Chronicle / #2721 Polity dossier 가독성, 기존 Source/Status 노출 | 상세 원본 대조·모바일/키보드/Source claim 시각 수용 |
| UI-03 시공간 | #2723 시대/권역/Inspector 가독성, #2728 카메라/포커스 보존 | dense label/LOD·실제 zoom·연대·pan·focus·모바일 수용 |
| UI-04 공통 UI | #2716 Dashboard 검증기 한국어 라벨 수정 | 기존 실패 run #44472651714는 실패 상태, 새 real browser run 및 쉘·접근성 |
| UI-05 정보·한국어·Admin | 기존 Main/Polity Reader·Admin inspector 등 구현 | UI_INFORMATION_COVERAGE 최신 Runtime 대조, 빠진 중요 정보/한국어·오류만 보완 |
| UI-06A 동시대 | #2722 24건 초과 전개, #2724 권역 필터, #2728 국소 재렌더 | 연도 직접 입력, 승인된 read-model 내 정치체 필터, 전체 Person/Activity 집계 수용 |
| UI-06B 탐험 복귀 | #2725 작업 중: Person Detail→Spacetime focus/새로고침/브라우저 이동 | #2725 종결 우선, 이후 탐험 연도·카메라·검색/필터의 **완전 복귀** 별도 개발 |
| UI-07 2인 비교 | 기존 Person reader/Activity semantics/route 활용 | 2명 선택·활동·기간·정치체/Source 비교·불확실성·모바일 완성 |

**검증할 문서-코드 차이:** 실제 atlas-person-spacetime-view.js는 기본 zoom 5(500%)와 최소 0.5, atlas-person-spacetime-control-state.js는 기본 500%와 최소 50%를 정의하고 있다. 일부 사용자 승인 계획은 '500% 기본/최소'라고 기술한다. **현재 도구판의 사용자 조작 범위·테스트·공간좌표/LOD를 먼저 대조**하고 의도된 값인지 판별한다. 이 문서 작성만으로 50↔500 상수를 변경하지 않는다.

## 3. 전체 실행 작업 패키지 — 독립적으로 종결되는 단위

각 작업은 실제 main의 원본 코드/파일 owner를 변경 직전에 재조회한다. 기존 파일은 실재하는 경로이며 NEW test는 구현 시 추가할 시험파일 제안이다. 작업 순서는 전역 독점 큐가 아니고 같은 소스 리소스만 충돌 조정한다.

### P0. 실제 Production 시각·동작 수용 (기 구현 작업의 가장 큰 병목)

**QA-01 — 실제 인물표·인물/정치체 상세 수용**
- 범위: 등록된 장문 한국어·영어 인물, 1/여러 Activity, 시대 구획, 검색·정렬·필터·행 선택, 인물·Polity 상세의 시작/종료·Source.
- 기존 파일: atlas-person-table-view.js/css, atlas-person-monumental-register.css, atlas-person-main.js, atlas-person-chronicle-detail.css, atlas-polity-dossier-view.js 및 관련 CSS. 시각·동작이 정상이라면 코드는 변경하지 않는다.
- 대표 기존 테스트: tests/ui-p13-person-mobile-column-balance.test.mjs, tests/ui-p12-person-multi-activity-visible-alignment.test.mjs, tests/ui-person-header-sorting.test.mjs, tests/ui-person-chronicle-evidence-readability.test.mjs, tests/ui-polity-dossier-factual-legibility.test.mjs.
- 완료: 390×844/768×1024/1440×900의 실제 동일 fixture 화면 캡처, 줄바꿈·가독성·sticky·focus·search/sort/selection 확인. 검증 실패한 부분만 실제 owner 소스 수정→CI→Production→재수용. CI만 통과한 경우 VISUAL_PENDING.

**QA-02 — 시공간/Meanwhile zoom·포커스·밀집 영역 수용**
- 범위: 500% 기본 화면, 한 BCE 및 CE 시점, 밀집 세계권역, 24+ 동시대 Activity, 권역 선택 후 전체 되돌림, 실제 선택 인물 Inspector/카메라.
- 기존 파일: atlas-person-spacetime-view.js, atlas-person-spacetime-lod.js, atlas-person-spacetime-label-overlap-guard.js, atlas-person-spacetime-instrument-tools.css.
- 대표 기존 테스트: tests/spacetime-label-packing.test.mjs, tests/spacetime-time-camera.test.mjs, tests/spacetime-meanwhile-region-filter.test.mjs, tests/spacetime-person-inspector-evidence.test.mjs, tests/ui-spacetime-chronology-legibility.test.mjs. #2728의 신규 포커스 테스트도 재사용.
- 완료: 390/1440 브라우저에서 zoom/pan/camera anchor/LODs, 키보드·focus, 뷰포트 clipping 및 연대 오류 없음. 실제 label packing 오류를 재현했을 때만 label engine 수정, 좌표 재배정·P14 변경 금지.

**QA-03 — Dashboard 실제 검증기 재실행**
- 선행: 이미 병합된 #2716 한국어 Runtime 집계 라벨 검증기.
- 기존 경로: .github/workflows/atlas-dashboard-production-acceptance.yml (workflow_dispatch input expected_runtime_sha), scripts/verify-dashboard-production-acceptance.mjs, tests/dashboard-production-runtime-metric-label-contract.test.mjs.
- 완료: 실배포 Runtime SHA를 입력해 **새** 기존 Chrome acceptance run 결과·artifact를 얻고 모델 수치=DOM 수치/세부 상태를 판별. 과거 FAIL run은 FAIL 유지. 워크플로 수동 실행 권한이 없으면 BLOCKED_BY_TOOL 기록 후 UI 독립 작업 진행. 402가 감지되면 중단.

### P1. 명부와 상세의 역사 정보 탐색성

**REG-01 — dense Person register의 인물·연대·분야·선택 위계**
- 파일: atlas-person-monumental-register.css, atlas-person-table-view.js/css, atlas-person-era-navigation.js (실재 증상 owner만).
- 변경: 이름>Activity 기간/Polity>Role/Relation>부가 메타 순서 정돈, 긴 한영 이름 wrapping, 연대 tabular numerals, 시대/열 sticky·선택 강조, 8분야 색은 얇은 의미 신호. 메인 Person table의 열/행, sort/filter, 역사 데이터·초상 금지 준수.
- 테스트: tests/ui-p13-person-mobile-column-balance.test.mjs, tests/ui-person-sticky-stack.test.mjs, tests/ui-person-header-sorting.test.mjs.
- 수용: PC/모바일 동일 Person/Activity 개수, 이름·날짜 잘림/겹침 및 원치 않는 horizontal overflow 0(의도된 2차원 표 스크롤 제외). QA-01에서 문제가 없으면 SKIP.

**REG-02 — 다중 Activity 1인 행의 요약/전체 접근 (REG-01 후 필요 시)**
- 파일: atlas-person-table-view.js/css, 기존 Person detail 진입/선택 동작.
- 변경: 대표 Activity를 요약하되 전체 활동·기간·Polity·Source로 접근하는 native 확장/상세 동선; 접기·펼치기가 검색/정렬/선택 상태를 손상하지 않음.
- 테스트: tests/ui-p12-person-multi-activity-visible-alignment.test.mjs, tests/ui-p3-person-activity-hierarchy.test.mjs, NEW tests/ui-person-activity-expand.test.mjs.
- 수용: 실제 다중 활동 인물 모든 Activity 접근, 중복/누락 0, native 키보드·터치 접근.

**DETAIL-01 — 인물 상세 Source/확실성/초상의 사실성 (QA-01 기반)**
- 파일: atlas-person-main.js, atlas-person-evidence-view.js, atlas-person-chronicle-detail.css.
- 변경: 이름과 독립 Activity, Relation/Role/Period Basis, 폴리티/기간, certainty/granularity/calendar/ongoing 및 claim-specific Source를 계층화; 기존 등록 초상 provenance만 보여주고 생몰연도를 Activity로 추정하지 않음.
- 테스트: tests/ui-person-activity-status-visibility.test.mjs, tests/ui-person-chronicle-evidence-readability.test.mjs, tests/ui-person-metadata-korean-projection.test.mjs.
- 수용: 같은 인물의 서로 다른 역할과 다른 Source 근거 분리·원본 일치, 390/1440 시각 검증. #2725가 해당 파일을 변경 중이면 먼저 종료.

**DETAIL-02 — 정치체 상세의 신원·명칭·기간·검토 근거 (DETAIL-01과 별도 가능)**
- 파일: atlas-polity-dossier-view.js, atlas-polity-review-workbench.js/css.
- 변경: Polity 자체 역사·지정 명칭·출처와 그에 속한 Person Activity 기간을 정확히 구분, 상세 페이지 탐색과 Admin 수정 기능을 시각적으로 분리하되 권한 보존.
- 테스트: tests/atlas-polity-dossier-view.test.mjs, tests/ui-polity-dossier-factual-legibility.test.mjs, tests/atlas-polity-temporal-designation-read.test.mjs.
- 수용: 명칭 변경·불확실한 시기·관련 인물/Source가 명확하며 사용자가 정치체 존속기간을 추측하도록 유도하지 않음.

### P1. 동시대 탐험과 원위치 복귀

**MEAN-01 — 직접 연도 입력·검증**
- 선행: #2722/#2724/#2728 완료 기능 재사용. SPACE owner와 atlas-person-spacetime-view.js 파일 충돌 점검.
- 파일: atlas-person-spacetime-view.js, atlas-person-spacetime-meanwhile.js(요약 의미 수정 필요한 경우만), atlas-person-spacetime-instrument-tools.css.
- 변경: 선택연도 입력·확인·초기화. BCE/CE, 0년 부재, 범위, unknown/빈 결과·부정확 입력 안내. 기존 primary_segments 기반 summarize와 ordinal을 사용. 연도만 바뀔 때 불필요한 전체 500% canvas 재생성 금지.
- 테스트: tests/spacetime-meanwhile-active-activity.test.mjs, tests/spacetime-semantic-axis.test.mjs, NEW tests/ui-meanwhile-year-entry.test.mjs.
- 수용: 기원전·기원후/빈시점/24+·복수 Activity에서 unique Person 수 vs Activity 수 일치, 원래 year/region 복원·키보드 포커스 유지.

**MEAN-02 — 실제 검토된 정치체 Activity 필터**
- 선행: 현재 Meanwhile entry.segment.activity 안에 **정치체를 안전하게 식별하는 필드가 실제 제공되는지** 검사. 없으면 가짜 매핑/이름 추론 금지, READ_MODEL_NEEDED로 명시하고 승인된 읽기 모델 개선 필요성을 따로 검토.
- 파일: atlas-person-spacetime-view.js, 확인된 existing Person/Polity read 모델.
- 변경: 연도·권역과 조합되는 Polity 선택/해제, Person/Activity 분모 둘 다 정확하게 표시, 필터링한 특정 인물의 다중 Activity 소속을 보존.
- 테스트: tests/spacetime-meanwhile-region-filter.test.mjs, NEW tests/ui-meanwhile-polity-filter.test.mjs.
- 수용: 단일/다중 정치체·복수 Activity·없는 정치체, filter reset/권역 이동/키보드 기능 정확.

**ROUTE-01 — 진행 중 PR #2725 종결 우선**
- 기존 작업: Person Detail에서 기존 source-backed primary track을 선택해 Spacetime의 해당 Person으로 이동하는 hash route. 미배치 인물에는 진실한 안내.
- 현재 수정 파일: atlas-entity-route.js, atlas-person-main.js, atlas-person-spacetime-view.js, atlas-main-authority-nav.js, atlas-person-chronicle-detail.css, index.html 등 **#2725 owner가 먼저 소유**.
- 테스트: tests/atlas-entity-route.test.mjs, #2725에 추가한 tests/ui-person-spacetime-crosslink.test.mjs 및 direct link 테스트.
- 수용: 정확한 PR head CI → 리뷰 → 병합 → 실제 배포 자산/HTTP → 직링크/refresh/back·실제 인물 이동을 390/1440 브라우저로 확인. 이것을 완전한 탐험 상태 복귀 완료로 오인하지 않음.

**ROUTE-02 — 시공간/명부/상세의 실제 탐색 상태 복구 (ROUTE-01 이후)**
- 파일: atlas-entity-route.js, atlas-main-authority-nav.js, atlas-person-spacetime-exploration.js, atlas-person-spacetime-control-state.js, atlas-person-spacetime-view.js, Person main (필요한 접점만).
- 상태 계약: Person/Activity UUID, 이전 도메인/목록 위치, 선택 ordinal/year, camera center+zoom, Meanwhile 권역/Polity 필터와 검색어. 공유해야 할 URL identity와 일시적인 사용자 interaction history를 구분. 기존 hash/history 우선 재사용, 새로운 영속 DB 도입 금지.
- 변경: 진입 전 snapshot → 시공간에서 동일 해/위치 초점 → 다른 권역 사람 방문 → 뒤로/앞으로/새로고침/직링크 시 합당한 계약으로 맥락 복원. 사실이 없는 Activity 연도를 임의 생성하지 않음.
- 테스트: tests/atlas-entity-route.test.mjs, tests/person-spacetime-navigation-contract.test.mjs, tests/spacetime-horizontal-camera-context.test.mjs, NEW tests/ui-exploration-return-state.test.mjs.
- 수용: 실제 확인된 Person/Activity에서 원래 연도·카메라·줌·검색·권역·선택·스크롤이 복귀, hash history가 쌓이거나 이전 선택을 잃는 문제 없음.

### P1. 두 인물의 직접 비교

**COMP-01 — 비교 대상 0/1/2명 선택과 복귀 (ROUTE-02 계약 재사용)**
- 파일: atlas-person-browser-reader.js, atlas-person-main.js, atlas-entity-route.js, 필요한 경우에만 NEW atlas-person-comparison-view.js/css.
- 변경: 기존 명부·상세의 선택 동작을 깨지 않으면서 두 Person을 선택/교체/해제, 동일인 중복 방지, 이전 목록·시공간으로 원위치 복귀. bounded detail 두 개만 조회.
- 테스트: tests/atlas-entity-route.test.mjs, NEW tests/ui-person-compare-selection.test.mjs.
- 수용: 0/1/2 Person UI 정상, 모바일에서도 선택 대상 명확, 잘못된/미등록 UUID 안전 처리.

**COMP-02 — Activity 기간·Polity·Role·Source 사실 비교 (COMP-01 이후)**
- 파일: existing Person reader, atlas-activity-semantics.js, comparison view. 권위 있는 reader에서 제공하지 않는 정보는 만들지 않음.
- 변경: 두 Person의 실제 Activity 시작/끝, Role/Relation/Period Basis, Polity, 각각의 출처/locator를 같은 기준으로 비교. 검토된 확정 ordinal끼리만 기간 교집합을 확정; approximate/unknown/disputed/calendar·ongoing은 단정하지 않고 원문 상태 보존. 동시대=교류/영향/전쟁/우열 추론 금지.
- 테스트: tests/atlas-person-spacetime-temporal-certainty.test.mjs, tests/ui-person-activity-status-visibility.test.mjs, NEW tests/ui-person-comparison-evidence.test.mjs.
- 수용: ①확정 겹침 ②확정 비겹침 ③BCE/CE ④복수 Activity ⑤불확실·미상 ⑥다른 Source 각각 정확.

**COMP-03 — 비교 모바일·접근성·성능 (COMP-02 이후)**
- 파일: comparison view CSS/DOM, atlas-ui-mobile-v8.css 필요분.
- 변경: 390px에서 대상 A/B 혼동 없이 세로 쌓기 또는 전환형, 고정 인물명과 activity/Source의 연결, 대상 변경·키보드·touch·Escape/back.
- 테스트: NEW tests/ui-person-comparison-mobile.test.mjs.
- 수용: 두 인물의 차이를 어느 폭에서도 잘못 읽지 않으며, 새 전체 Person API 조회/유료 성능 비용 증가 없음.

### P2. 전역 디자인·정보·한국어·접근성·성능

**SHELL-01 — 탐험 우선 메뉴/화면 구조**
- 파일: atlas-main-authority-nav.js/css, atlas-responsive-shell.js/css, index.html, atlas-dashboard.js 필요분.
- 변경: 인물 명부·시공간·정치체를 사용자 핵심 탐험 진입점으로, Dashboard·관리자·등록검토와 아직 준비 중인 장소/사건/지리 영역을 정확히 구별. 기존 인증·URL·hash 계약은 보존.
- 테스트: tests/dashboard-control-center.test.mjs, tests/atlas-entity-route.test.mjs, tests/ui-r1-mobile-ownership.test.mjs.
- 수용: 사용자가 첫 화면에서 시작·전환·뒤로 가기 가능, 미구현 기능을 완료처럼 보이지 않음.

**SHELL-02 — Graphite/Champagne·서체·상호작용 통일**
- 파일: atlas-ui-visual-foundation.css, atlas-ui-mixed-script-typography-v2.css, atlas-responsive-shell.css, 현행 화면별 owner stylesheet.
- 변경: 시대·인물명·활동기간 위계, 숫자 tabular 정렬, 8개 의미색과 장식용 neutral metal 분리, hover/selected/keyboard focus, 절제된 전환/여백. 실제 computed CSS 중복·오버라이드로 확인된 문제만 제거.
- 테스트: tests/ui-global-material-normalization.test.mjs, tests/ui-v9-motion-material-polish.test.mjs, tests/ui-premium-dark-surface-verifier.test.mjs.
- 수용: 화면 간 시각 리듬 일관, 기존 긴 글·모바일 정보 손실·과잉 역사 장식·인물카드화 없음.

**I18N-01 — 전 화면 자연스러운 한국어/오류 처리**
- 파일: atlas-ui-localization.js, atlas-ui-authority-catalog.ko.js, 실제 문제 재현된 atlas-person-main.js, atlas-dashboard.js, atlas-person-spacetime-view.js, atlas-polity-review-workbench.js, Admin UI.
- 변경: enum/code, 오류·권한·로딩·빈 상태, placeholder·ARIA의 설명을 한국어 사용자용으로. 역사 원문 인명/Source·기술 identifier 자체를 멋대로 번역하지 않고 사용자 화면에 raw API exception 직접 노출 금지.
- 테스트: tests/ui-korean-visible-copy-sweep.test.mjs, tests/ui-ko-localization-current.test.mjs, tests/phase9-ui-localization-contract.test.mjs.
- 수용: Main/Admin 핵심 표면의 설명 없는 영문 UI 상태코드 0 또는 원본 보존이 필요한 예외 사유 기록.

**ADMIN-01 — 정보 완전성·운영자용 정확한 표시**
- 파일: docs/ui/UI_INFORMATION_COVERAGE.md, atlas-admin-identity.js, atlas-admin-observability.js, atlas-admin-workspace.js, Person/Polity current read UI.
- 변경: REQUIRED/DETAIL/ADMIN_ONLY/FUTURE/SECRET_STATE_ONLY를 **최신 main+Runtime**에 대조. Main은 사람이 읽는 역할/기간/확실성/Source, Admin은 허용된 UUID·request/audit/중복판정·authoring/status. 미구현 P13/P14를 가짜 데이터로 채우거나 비밀 토큰/원시 권한 유출 금지.
- 테스트: tests/admin-session-ui-contract.test.mjs, tests/ui-person-activity-status-visibility.test.mjs, 변경한 read contract 집중 테스트.
- 수용: 모든 기존 정보 항목을 DONE/PARTIAL/MISSING/STALE/INTENTIONALLY_NOT_EXPOSED로 구분, 관리자 권한/비인가 동작 확인.

**A11Y-01 — PC/모바일·키보드·확대/스크린리더**
- 파일: atlas-ui-mobile-v8.css, atlas-person-spacetime-mobile-v8.css, 실제 변화된 DOM/label owner.
- 변경: 390/600/768/1440/1600 px와 200/400% zoom, Tab/Shift+Tab/Enter/Escape, native disclosure, aria-sort/pressed/expanded, focus not obscured, reduced-motion, 색만으로 분야 구분하지 않는 보조 라벨. 2차원 지도/표 WCAG reflow 예외는 개별 원문 검토.
- 테스트: tests/spacetime-mobile-presentation.test.mjs, tests/ui-r1-mobile-ownership.test.mjs, 변경한 control의 실제 keyboard 테스트.
- 수용: WCAG 2.2 AA의 해당 성공기준을 실제 측정(일반 문자 4.5:1, 큰 문자·해당 UI 경계/상태 3:1 등), 모바일·키보드로 핵심 사용자 과제 수행. 자동 lint만으로 전면 접근성 합격 선언 금지.

**PERF-01 — 체감 탐색 속도·Origin 비용 안정성**
- 파일: atlas-person-spacetime-performance.js, atlas-person-spacetime-view.js, atlas-client-data-store.js 및 실제 병목 owner만.
- 변경: #2728의 국소 Meanwhile 갱신 재사용, 전환 때 불필요한 전체 캔버스 갱신/과잉 API 요청/대량 DOM 재생성 방지, 기존 virtualized 레이블·캐시 유지.
- 테스트: tests/spacetime-performance.test.mjs, tests/spacetime-performance-ui.test.mjs, tests/vercel-public-ui-build.test.mjs.
- 수용: 비교 가능한 전후 실측과 Origin 호출량을 기록. 목표는 web.dev 좋음 구간 LCP ≤2.5초, INP ≤200ms, CLS ≤0.1이나 **측정하지 않은 현재 성능을 통과로 선언하지 않는다**. Vercel Hobby 요금·402 제한 존중.

## 4. 실제 사용 시나리오 기반 종합 테스트 7개

| 케이스 | 단일 탐험 과제 | 합격 증거 |
| --- | --- | --- |
| A01 | 장문 이름 Person 검색→시대/활동 정렬→상세→원위치 | 실제 Person/Activity 수·검색어·선택·스크롤/포커스 정확 |
| A02 | 한 Person의 2+ 다른 활동과 정치체/Source 비교 | 각 Activity 기간·근거 누락/중복 없음, certainty 보존 |
| A03 | BCE와 CE 시점에서 world region zoom/pan·인물 선택 | 역사 연도/ordinal/region X/Y/LOD 불변, 카메라/라벨 포커스 |
| A04 | Meanwhile 24+ 결과→권역/정치체→연도 직접 입력 | 전체 고유 Person·Activity 분모/지역별 집계 일치, 키보드 focus 보존 |
| A05 | Person 상세→시공간→동시대 타지역 Person→Back | 원래 연도/줌/카메라/검색·선택 복귀, 미배치 사실성 |
| A06 | 확정 겹침/비겹침/불명 두 Person 비교·대상 교체 | 정확 기간·출처, 불확실 교집합 억지 확정 없음 |
| A07 | 390px·키보드/터치·Admin 비인가·오류/빈 상태 | 해당 사용자 탐험 완료, 한국어 복구, raw secret/권한 유출 없음 |

대표 사례는 **현행 Canonical/Runtime에서 확인된 UUID·Source·기간**으로 고정한다. 1592년 등 문서 예시 연도에 특정 인물이 실제 배치됐다는 사실은 확인 전 가정하지 않는다. 동일 viewport·데이터/선택 상태·브라우저를 기준으로 전후 캡처하고 실제 시각 수용을 검증한다.

## 5. 의존성·병렬 개발·실행 순서

| 순위 | 먼저 실제로 닫을 단위 | 후속 종결 조건 |
| --- | --- | --- |
| 1 | **ROUTE-01 #2725** 현재 열린 PR의 exact-head CI/리뷰→merge→Production/browser, 겹치면 그동안 QA 독립 실행 | 제대로 된 Person→시공간 전환. 아직 완전한 상태복원 아님 |
| 2 | **QA-01/02/03** 기존 배포 UI의 실제 PC·모바일·Dashboard 검증 | 실화면 결함만 추가 최소 변경, 정상 화면은 추가 CSS PR 생략 |
| 3 | **MEAN-01/02** 연도 직접 입력·정치체 필터와 정확한 Person/Activity 분모 | #2722/#2724/#2728 완료 기능 활용, read 모델 없으면 안전한 경계 확인 |
| 4 | **ROUTE-02** 역사탐험 전체 맥락 복귀 | 이후 Person 비교의 재진입/복귀 상태 계약 제공 |
| 5 | **COMP-01→02→03** 2인 선택·진짜 활동 비교·모바일 완성 | 두 Person의 기간/Polity/Source 정확성 및 불확실성 검증 |
| 6 | REG/DETAIL/SHELL/I18N/ADMIN/A11Y/PERF의 **실제 재현 결함** | 제품 전체 7개 과제·접근성·성능 검증, 새로운 리브랜딩 아님 |

**충돌 파일:** atlas-person-main.js, atlas-person-spacetime-view.js, atlas-entity-route.js, atlas-main-authority-nav.js, index.html는 현재 또는 후속 PR 사이 공용 소스. 서로 독립인 I18N/Admin/QA와 CSS owner만 병렬 진행하고, 정확히 같은 파일 쓰기는 기존 PR 재사용·merge/rebase 후 순차 처리. 전체 프로젝트/CORE 작업을 UI 때문에 봉쇄하지 않는다.

## 6. 매 회차 UI 매니저 운영 절차 (기존 총괄 감독)

1. 최신 main SHA, 열린 PR/CI, #1896 최신 UI 완료원장, 승인된 전체 UI-01~07 frontier와 본 작업표를 **짧게** 확인한다. 방금 완료된 작업을 다시 백로그로 만들지 않는다.
2. 가장 가치가 큰 **실제 사용자 행동의 미완료 하나**를 골라 정확한 source owner, 입력 fixture, 실패/인수 조건, 작업파일, 담당자를 지정한다. P0·권한·도구 제약이 없으면 그 회차에 실제 코드 변경까지 진행한다.
3. 바로 구현하여 focused tests → exact-head Integrity → conflict/approval review → merge → 실제 Production asset SHA/HTTP → PC·모바일 조작·시각 수용. 실행할 수 없는 단계는 미수행으로 남긴다.
4. 원본 역사 정보·Relation/Source/Political identity·X/Y/semantic LOD·8분야색·Main/Admin 비밀 데이터 불변성 확인. 성능·Origin 비용 회귀도 같은 작업의 완료 조건.
5. UI 결과는 UI-ID | 사용자 결과 | 실제 파일/PR/head | CI | merge | Production HTTP·자산 | PC/모바일 결과 | blocker | 다음 실행점을 #1896에, 전체 수행결과는 #2627에 간결히 기록. **수정/병합/배포 수치가 0이면 0이라 기록**.
6. 사용자 미감·미승인 장식 변경/DB·P14·삭제/retire/추가요금은 사용자 추가 승인 없이는 하지 않는다. 이미 반영한 Plan/README만 반복 작성하는 회차를 성과로 계산하지 않는다.

## 7. 완료 조건 요약

이 문서를 병합하면 **UI 작업에 필요한 작업 패키지·의존성·기존 파일/테스트·검증 기준을 저장한 것**만 완료다. 남아 있는 #2725의 독립 release, UI-01/02/03/06A의 실제 브라우저 수용, Dashboard verifier 새 run, MEAN-01/02·ROUTE-02·COMP-01~03 및 Main/Admin/모바일 최종 검증이 끝나야 전체 사용자 경험이 완료된다. 보류된 Phase III B2 장식 선택·P14·Canonical DB 변경은 여전히 별도 승인 범위.
