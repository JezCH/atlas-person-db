# ATLAS UI 통합 고도화 마스터플랜 — 연구 근거·제품 경험·전체 실행 백로그

> 2026-11-19 KST / status: RESEARCH & PLAN DELIVERED, NOT UI FEATURE DELIVERED
>
> 대상: JezCH/atlas-person-db의 **기존 실제 UI**. 이 문서는 새로운 승인 없이 새로운 데이터·기능 범위를 창설하는 명령이 아니라 현행 승인된 UI-01~07과 전체 기존 UI 기획을 **연구 기반으로 개선하고 수용하는 실행 기준**이다.
>
> 감독: 기존 ATLAS 프로젝트 총괄 → UI 매니저 (docs/ui/UI_MANAGER_INTEGRATED_EXECUTION.md) → 실제 작업자. 원장: GitHub Issue #1896, 총괄 #2627. 기존 하루 8회 예약 변경/추가 없음.
>
> 명시한 연구 자료는 선별한 권위 있는 대표 근거이며, 세상의 모든 UX 연구를 검토했다는 주장은 아니다. 표준의 규범적 요구, 학술적 실험 결과, 전문가 휴리스틱, 타 제품 설계 예시, ATLAS 전용 설계 제안을 아래에서 구별한다.

## 1. 최종 제품 정의 — 화면이 아니라 역사 탐험이 성공해야 한다

사용자가 ATLAS에 들어온 뒤 아래 질문을 **막히지 않고, 역사적 사실을 오해하지 않고, 다시 돌아올 수 있게** 답해야 한다.

1. 지금 보고 있는 시대·지역·인물이 전체 인류사에서 어디에 위치하는가?
2. 특정 인물을 어떻게 검색·정렬·필터링하고, 연결된 정치체와 실제 Activity 기간을 보는가?
3. 같은 해에 검토된 다른 지역의 누가 있었는가? 화면의 동시대 인원수와 Activity 건수의 차이는 무엇인가?
4. 다른 두 인물의 실제 Activity/정치체가 언제 겹치는가? 미상·추정·역법이 달라 단정할 수 없는 것은 무엇인가?
5. 어떤 근거(Source)가 특정 Activity 주장을 뒷받침하는가? 서로 다른 왕위·관직·국가를 같은 URL로 부정확하게 설명하지 않는가?
6. 원래 탐색한 연도·권역·카메라·선택·필터로 정확히 되돌아오는가?
7. 모바일·키보드·보조기술에서도 이 작업이 가능한가? Admin에서만 허용된 원시정보/쓰기 기능이 Main에 유출되지 않는가?

**ATLAS의 핵심 플로우:** 세계/시대 전체 조망 → 인물·정치체·연대 필터/검색 → 선택한 기록과 사료 → 같은 시점 다른 지역 → 인물 2인 비교 → 원래 위치 복귀.

현행 확정 미학: Monumental Chronographic Modernism. 어두운 Graphite/Champagne 기반, 이름·시대·연대의 장중함과 계측기의 정확성을 함께 표현한다. 기존 **밀도 높은 인물 표**를 카드 목록으로 바꾸지 않는다. Main 인물 초상 금지, 상세에는 등록된 출처 확인 초상만 사용. 8개 분야 의미색(governance gold 등)은 장식용 금속색과 분리한다. 500% Spacetime 기본/최소 줌, 고정 시간 Y·세계 X, 통합 카메라, 지역 비율, LOD 및 역사 의미·출처 불변.

## 2. 근거 출처와 적용 판단

### 2.1 사용성·정보 구조 — 전문가 휴리스틱 / 설계 지침

| ID | 실제 출처 | ATLAS에 검토·적용할 원리 | 근거 종류 및 한계 |
| --- | --- | --- | --- |
| R01 | [Nielsen Norman Group, 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | 현재 연도/권역/결과 수/필터/로딩 상태를 보이고, 일관된 통제·복구·오류 메시지를 제공 | 전문가 휴리스틱. 효과량 수치가 아님 |
| R02 | [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | 1차 화면은 역사 이름·기간 중심, Source 세부·원시 메타데이터는 명확한 펼침/상세로 접근 | 정보 숨김 허가가 아님. 각 기록 전체 접근 유지 |
| R03 | [NN/g, Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/) | 표는 비교·패턴 탐지·탐색·행동에 효율적. 레지스터 유지, 정렬·필터·고정 헤더·다중 Activity 접근 강화 | 원래 상품/업무 표의 원리; 역사적 사실성 검증 별개 |
| R04 | [IBM Carbon, Data Table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines), [accessibility](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/accessibility) | 정렬 상태, 열 이름, 행 선택·확장, 툴바, 키보드 포커스와 스크린리더 동작 재사용 | UI 패턴 참고; 라이브러리 도입 필요 없음 |
| R05 | [NN/g, Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) | 2인 비교는 같은 필드의 나란한 구조, 좁은 화면은 명확한 비교대상 유지/전환 | 인물의 역사적 우열이나 가상 인과 추론은 금지 |
| R06 | [NN/g, Breadcrumbs / Wayfinding](https://www.nngroup.com/articles/breadcrumbs/), [Information Scent](https://www.nngroup.com/articles/information-scent/) | 현재 위치·상위 범주·이동 목적지를 읽기 쉽게 제공; 브레드크럼과 세션 탐색 뒤로 가기를 혼동하지 않음 | 계층 구조 없는 시공간 경로에는 단순 역추적 UI 우선 |

### 2.2 인류사 데이터 탐색·지도·연대 — 학술 연구 / 실무 설계

| ID | 실제 출처 | ATLAS 적용 | 한계 |
| --- | --- | --- | --- |
| R07 | [Ben Shneiderman (1996), The Eyes Have It](https://drum.lib.umd.edu/items/155a868e-fb83-4115-9899-9187ea8c0498) | 전체 조망 → 확대/필터 → 요청 시 상세; 추가 과제 relate/history/extract를 UI-06/07·탐색 복원에 연결 | 오래되지만 정보 시각화의 대표 개념. 특정 배율·레이아웃의 실증 정답 아님 |
| R08 | [Mapbox, Guide to Map Design](https://www.mapbox.com/insights/map-design-process), [Label Placement](https://docs.mapbox.com/help/dive-deeper/optimize-map-label-placement/) | 대비·계층·밀도·판독성; zoom별 라벨 선택과 collision·선택 앵커 유지. 모든 인명을 항상 표시하는 오류 방지 | 실제 Mapbox 렌더러로 교체하라는 지침 아님 |
| R09 | [Visual Encodings of Temporal Uncertainty: Comparative User Study](https://pubmed.ncbi.nlm.nih.gov/26529717/) | 불확실 연대 시각 부호가 독해 시간/오류를 바꾸므로 검토·비교; 원본 certainty·granularity·calendar 노출 | 특정 방식(점선/그라데이션 등)을 ATLAS 정답으로 확정할 근거가 아님 |
| R10 | [Temporal and Categorical Uncertainty on Timelines: Evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC12774288/) | 시간상 불확실성을 반복해서 드러내되 범주적 불확실성과 혼동하지 않고 테스트 | 원 연구의 맥락은 역사 DB가 아닌 인간 활동 회상; 도메인 일반화 주의 |
| R11 | [W3C WAI, Complex Images](https://www.w3.org/WAI/tutorials/images/complex/) | 시공간 시각화가 접근 불가능한 환경에 동등한 텍스트·목록·검색 경로 제공 | 모든 그림이 동일 alt 텍스트로 충분하다는 의미 아님 |

### 2.3 접근성·반응형 — 표준과 구현 참고

| ID | 실제 출처 | 적용 기준 |
| --- | --- | --- |
| R12 | [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | AA를 기본 수용 목표로 채택. 일반 텍스트 대비 4.5:1 / 큰 텍스트 3:1, 의미 있는 UI 경계·상태표식 3:1; 색만으로 의미 구분 금지. 개별 성공기준의 예외는 명시적으로 판단 |
| R13 | [WCAG Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) | 포인터 타깃 원칙 24×24 CSS px(간격·인라인 등 예외 있음), 좁은 뷰/확대·재배치. **의미를 보존해야 하는 2차원 지도/표에는 예외가 존재**하므로 무조건 단일열 강제 금지 |
| R14 | [W3C WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | 실제 상호작용 그리드가 필요할 때만 grid 키보드 모델; 일반 표는 우선 native table/heading semantics. 브라우저 기본 동작을 무의미하게 재작성 금지 |
| R15 | [W3C, Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility) | sticky header·Inspector가 focus를 가리지 않게 조정; 모션 감축 선호 존중 |
| R16 | [Android/Material adaptive layout guidance](https://developer.android.com/codelabs/adaptive-material-guidance) | compact/medium/expanded에 따른 정보구조 변경 참고. 웹에 Android 전용 API를 강제하지 않는다 |

### 2.4 성능·검증 — 산업 기준 / 평가 방법

| ID | 실제 출처 | ATLAS 적용 |
| --- | --- | --- |
| R17 | [web.dev Core Web Vitals](https://web.dev/articles/vitals) | 측정할 성능 지표: LCP ≤2.5초, INP ≤200ms, CLS ≤0.1은 '좋음' 기준. 실제 ATLAS 실측값은 아직 없음; 측정 전 PASS 선언 금지 |
| R18 | [NN/g, UX Benchmarking](https://www.nngroup.com/articles/product-ux-benchmarks/) | 대표 역사 탐험 과제를 고정한 전후 비교: 성공률·오류 유형·소요시간·되돌아가기 성공·신뢰성 이해 |
| R19 | [NN/g, Qualitative vs Quantitative User Testing](https://www.nngroup.com/articles/5-test-users-qual-quant/) | 5명 내외의 소규모 질적 테스트는 결함 발굴의 출발점일 뿐 통계적 성과 증명 아님. 필요 시 유형별로 추가 |
| R20 | [NN/g, Heuristics for Complex Applications](https://www.nngroup.com/articles/usability-heuristics-complex-applications/) | Admin/역사 상세처럼 고밀도 업무 UI에서 부차 조작을 접고 현재 작업의 오류 복구를 우선 |

**근거 채택 원칙:** WCAG는 기준을 직접 확인한다. 시각화·시간 불확실성 논문은 설계 가설을 준다. 패턴 문서는 라이브러리 강제 도입 지시가 아니다. ATLAS 특유의 BCE/CE, Source claim 구별, 8분야색, P14 제약은 프로젝트 원본 계약이 우선한다.

## 3. 공통 UX·시각 규칙 — 모든 화면에 적용하되 보존검증 후

- **위계:** 사람에게 가장 중요한 것은 언제/어디/누가/무슨 활동인가. 제목·연대·이름 > 핵심 직책·정치체 > 근거/불확실성 > 운영상 메타데이터. Admin에는 운영 추적을 별도 제공한다.
- **판독성:** 실사용 본문 및 조작 라벨은 14~16px 수준부터 구조를 평가하고, 빽빽한 데이터 행은 12~14px 가능성을 검토한다. 10px 이하를 불가피한 비상호작용 눈금/보조 레이블로만 한정하는 것이 장기 목표지만, collision·기존 열폭이 허용하는지를 먼저 검증한다. 숫자를 올리는 것만으로 품질 완료로 보지 않는다. 기존 최근 9~10.5px 배포는 단계적 개선의 근거일 뿐 최종 가독성 합격 근거는 아니다.
- **타이포그래피:** 큰 역사 제목은 기존 승인된 절제된 현대 명조 방향, 본문·표·키보드·시간축은 판독성 높은 sans, 연대·집계는 tabular numerals. 국문/영문/로마 숫자/긴 이름의 줄바꿈은 실제 렌더로 검증한다.
- **색채:** 기존 8분야 대표색은 의미 신호; neutral Champagne는 선택·경계·재질감. 색맹·무색 화면에서도 모양/라벨/위계로 분야와 선택 구별. 금색 과용과 대형 프레임 재도입 금지.
- **상태:** 선택 연도/권역/검색어/필터 수/보이는 건수와 원본 집계 분모를 혼동하지 않도록 분리. 로딩·비어 있음·요청 실패·검토되지 않은 연대·권한 제한을 각각 다른 한국어 상태로 제공.
- **탐색:** 위치와 방향은 항상 명시. 상세 진입·동시대 이동·비교·뒤로 가기에서 원래 연도·카메라·검색·활동 선택을 잃지 않는다. history stack의 의미와 계층적 breadcrumb의 의미를 분리한다.
- **정보 밀도:** 세부 사료/원시 코드는 필요할 때 펼치되, 핵심 확실성·Role·기간·정치체를 숨겨 결과를 왜곡하지 않는다. 한 행의 전체 Activity 접근·전체 동시대 필터 결과 접근 보장.
- **작동 모델:** 마우스 hover가 유일한 기능 노출 경로가 되지 않게 키보드·터치 등가 조작을 제공. 선택/현재 위치·오류 설명·복구 동작이 항상 확인 가능하게 한다.
- **시각 서사:** 메인=전체 역사 기록의 구조, 상세=한 인물/정치체의 심도, 시공간=시간과 세계의 동시 탐험. 장식은 실제 인과·좌표·역사를 그린 것처럼 보이지 않는 비사실 레이어로 분리한다.
- **구현:** 실소스의 마지막 CSS owner/cascade를 먼저 확인. 중복 stylesheet·새 전역 토큰·프레임워크를 무작정 추가하지 않는다. 성능·안전·데이터 관찰을 기능의 일부로 간주한다.

## 4. 전체 화면 단위 실행 백로그 (우선순위는 변경 가능)

**상태 용어:** CURRENT-MERGED(실소스 병합 확인), DEPLOYMENT-READY(배포 상태만), PRODUCTION-HTTP-VERIFIED, VISUAL-PENDING, IMPLEMENTATION-PENDING, APPROVAL-HOLD, PARKED. 현재 주장이 아닌 과거 원장 사항은 반드시 재검증.

### P0 — 새 기능보다 먼저 해결할 실사용 수용 병목

| 작업 | 구체적 결과 | 최소 적용 범위 | 완료 증거 |
| --- | --- | --- | --- |
| P0-1 실화면 수용 | UI-01/02/03의 현재 운영 배포에 대한 390/768/1440(필요시1600) 대표 화면 캡처, 긴 명칭·1/복수 Activity, 시대 선택·정렬·필터·Source/Polity 이동 | 기존 브라우저/CI 수용 경로, UI #1896 | 가시적 줄바꿈/겹침·콘트라스트·기능 결과 비교. 실패 시 **실제 재현된 한 결함**만 코드 수정 |
| P0-2 시각 수용 정직성 | CI/배포 READY/HTTP200/실화면/User 승인 각 단계 구분 | UI 매니저 #1896 | 이전 실패한 검증을 성공으로 재명명하지 않음 |
| P0-3 Dashboard verifier | #2716의 현재 한국어 라벨 수정에 따른 실제 Production browser run 재수용 | 기존 dashboard production acceptance | 새 실제 run SUCCESS와 DOM↔모델 동일성, 값 2593 등의 과거 스냅샷은 실측 전 재사용 금지 |
| P0-4 흐름 기초 측정 | 사용자 핵심 6~7개 과제의 현재 성공/실패, 클릭 왕복, 소요시간/오류 지점에 대한 baseline; 통계적 점수 창작 금지 | 현재 live UI, 적은 수의 대표 fixture | 재현 가능한 작업 기록 + 화면 증거 |
| P0-5 단일 소스 관리 | 같은 파일/화면의 열림 PR 중복 방지, UI-06A 진행 중 PR #2724 재사용 | main / PR / #1896 | 정확한 충돌 소스·base SHA와 이전 완료 구분 |

### P1 — UI-01 인물 명부: '역사의 도록'과 업무용 데이터 표의 장점 결합

- UI01-1: 큰 한국어 이름/영문 canonical과 활동기간/정치체를 **열 단위로 시각 그룹화**; 연대 숫자 정렬, 시대·활동 헤더의 대비를 측정. 현재 9~10px까지 고친 코드를 초기 상태로 삼고 실제 DOM 조건에서만 조정.
- UI01-2: 행 선택·hover·focus·sticky header와 선택 상세 간 명확한 일대일 연결; 키보드·모바일 등가 기능.
- UI01-3: 검색 결과의 복수 이름/별칭·동명이인/동명이정치체 설명은 이미 있는 이름정보 안에서만; 문자열 자동 교정으로 identity 변경 금지.
- UI01-4: 시대·기간·권역·대표분야 필터와 정렬을 **현재 실제 지원 범위 안**에서 재구성; 필터링 전에 전체/현재/표시 건수를 정확히 구별. 없는 region 필드를 만들어내지 않는다.
- UI01-5: 다중 Activity 1인 사례를 기준으로 핵심 요약·전체 펼침·출처 접근의 선택 가능한 밀도를 실제 테스트. 2차 상세 접힘은 역사적 데이터 삭제가 아님.
- UI01-6: 검색→선택→상세→복귀의 입력값·스크롤과 선택 상태 회복. UI-06B의 route contract와 공통화.
- 관련 현행 파일 후보: atlas-person-monumental-register.css / atlas-person-table-view.js/css / atlas-person-era-navigation.js / atlas-person-main.js. 실제 touch set은 최신 main에서 좁힌다.

### P1 — UI-02 인물·정치체 상세: 역사 의미와 신뢰성

- UI02-1: 상세의 이름·시대·실제 Activity 기간·정치체·Role·Relation·Period Basis·Source가 일관된 인지 계층을 이루도록 재구성; 모든 Activity 접근 보장.
- UI02-2: 날짜 precision(일·월·연), certainty(확정·근사·논쟁), calendar, ongoing/미상 구분; 불확실성을 단정 연도 또는 임의 생년/사망년으로 표현 금지.
- UI02-3: Source를 “그 사람에 대한 웹 링크”가 아니라 “어떤 Activity의 어느 주장을 뒷받침하는 사료”로 표시. citation text, 기관/저자·날짜가 있을 때 읽기 쉽게 보여주되 공개 금지 UUID/키/아티팩트는 Main에 노출하지 않음.
- UI02-4: 동일 인물의 독립 왕위·관직·정치체 역할에 동일 royal.uk URL이 있어도 구체적 claim citation을 구별 (#2707 기존 수정 재수행 금지).
- UI02-5: 인물 실재 초상·출처·시대적 확실성은 표시 가능한 경우에만; 자료 없음/재구성/현대 이미지 혼동 방지. 메인 명부로 초상 확대 금지.
- UI02-6: Polity 상세의 명칭 역사·정치체 동일성·역할/통치기간/명칭기간/관측 Activity 기간은 엄격히 분리. 신규 원본 등록·Polity 통합을 UI 변경으로 수행 금지.
- UI02-7: 연관 상세 진입과 돌아가기; 모바일 Source 접기/펼침과 공유/직접링크를 제약 내 재활용.
- 관련 파일 후보: atlas-person-main.js, atlas-person-chronicle-detail.css, atlas-polity-review-workbench.css, atlas-polity-dossier-view.js, server/atlas-person-read-service.js **(읽기 계약 변경이 진짜 필요할 때만)**.

### P1 — UI-03 시공간: '조망 → 시대·권역 → 활동·근거' 심도

- UI03-1: 이미 배포된 #2723 UI-03A 가독성 수정의 **실 브라우저** 수용. timestamp/범례/선택 Inspector 가독성/대비/좁은 화면 검증.
- UI03-2: 중복되는 도구판·설명/디버그 카운터보다 “선택 연도·세계권역·시간축·검색”을 우선 배치. 익숙하지 않은 첫 사용자에게 지도처럼 조작방법 안내.
- UI03-3: 시간축 큰 눈금·작은 눈금·시대·연도 형식과 BCE/CE 경계의 혼동 방지. 데이터 Y값·global camera·기존 region assignment는 불변.
- UI03-4: 충돌·밀집 레이블은 **의미적 LOD·우선순위·검색 결과 포커스**로 해결. 한 단계에서 모든 레이블을 표시하려고 세계 축을 왜곡하지 않는다. 선택한 인물이 언제나 Inspector에 접근 가능해야 함.
- UI03-5: 확대/축소·패닝·초기화·미니맵·선택포커스·터치·키보드 동작과 500% 기본/최소 계약 보존. LOD 변경은 사용자가 느끼는 처리속도까지 검증.
- UI03-6: 정보가 없는 권역·미확정 정밀도, '화면에 없어서 실재하지 않는다'는 오해 차단. Region/Activity 집계의 분모와 예외 표시.
- 파일 후보: atlas-person-spacetime-view.js, atlas-person-spacetime-lod.js, atlas-person-spacetime-monumental-canvas.css, atlas-person-spacetime-instrument-tools.css, atlas-person-spacetime-mobile-v8.css. P14 geometry/DB는 별도 승인 없이는 불가.

### P1 — UI-06·UI-07: 연속 탐험의 핵심 경험

- UI06A-1: 이미 병합된 #2722(24개 초과 결과 펼침)를 재구현하지 않음. 현재 열림 #2724(기존 reviewed world-region 필터) 충돌·CI·Production·모바일 검증까지 마무리.
- UI06A-2: 허용된 연도 직접 입력과 검증, 정치체별 필터(실제로 권위있는 기존 필드에 한함), 모든 해당 결과 접근. Person 수/Activity 수/미확정 제외를 다른 표현으로 표시.
- UI06A-3: 최초 결과 → 전체 펼침 → 권역/정치체 좁힘 → Person 선택에 끊김이 없는 동선. 결과 24+, 0, BCE, 1인 복수 활동·겹치는 권역 경계 회귀.
- UI06B-1: Person→시공간→동시대→타지역 Person→원래 연도/카메라/줌/검색·필터 복귀. 기존 atlas-entity-route.js와 nav state를 재사용. 브라우저 Back/Forward·직접 링크·새로고침 동작 검증.
- UI06B-2: 권한과 미상/미확정 연대의 경우 복귀 상태를 정확히 보존하되 존재하지 않는 년도를 임의 설정하지 않는다.
- UI07-1: 2인 선택·교체·해제, 동일 구조의 실제 Activity/Polity/Role/Source 비교; 모바일은 세로 레이아웃+공통 헤더 또는 전환형 비교로 항목이 누구 것인지 항상 표시.
- UI07-2: 확정된 겹침은 기존 temporal semantics 기반. approximate/unknown/disputed/calendar 차이는 '겹침 불확정'으로 명확히 안내. 동시대라는 이유로 개인적 교류/전쟁/영향을 추론하지 않는다.
- UI07-3: 2인 비교 중 선택·필터·복귀, 출처로의 상세 진입 등 네비게이션 상태 유실 방지.
- 후보: atlas-person-spacetime-meanwhile.js, atlas-person-spacetime-view.js, atlas-entity-route.js, atlas-main-authority-nav.js, Person read; 현재 #2724와 파일 충돌 방지 필수.

### P2 — UI-04 쉘·대시보드·모바일·접근성·한국어

- UI04-1: 일반 탐험의 일차 내비게이션을 '인물 명부 / 시공간 / 정치체'로 구분하고 Dashboard·Edit·Admin·준비 중인 Place/Event를 이용자에게 오인 없이 표시. 실제 구체 기능/권한 보존.
- UI04-2: 모든 화면의 제목·경로·현재 위치·이전 위치를 통일. UX가 요구하지 않으면 전역 장식이나 메뉴를 증가시키지 않음.
- UI04-3: Dashboard의 숫자는 사람/Activity/Source 등 분모·현재 활성화 시점이 분명해야 함. 옛 결과와 새 배포 결과의 차이는 숨기지 않는다. 예전 검증기 오탐은 수정되었으나 실제 run 재검증 필요.
- UI04-4: 390/600/768/1440/1600px, 200%·400% zoom, 폰트 확대, 가로·세로 화면 전환, 터치 영역·sticky의 포커스 가림 여부 검증. 의미적 2차원 표·세계 지도의 수평 탐색은 적절한 대안과 함께 제공 가능.
- UI04-5: 세밀한 키보드 tab 순서, 선택/포커스 가시성, ESC/Back, ARIA row/sort/expanded/live region, 스크린리더와 색각차 확인. CSS 아이콘만으로 동작 의미 전달 금지.
- UI04-6: 로딩·빈 결과·오류·권한 만료, 조회 취소·재시도, 알 수 없는 enum을 **오류복구 가능한 한국어**로 표현. raw 오류 코드/영어 예외를 Main에 노출하지 않음.
- UI04-7: 운영·역사 화면에서 무의미한 애니메이션을 제거하고 prefers-reduced-motion 반영. 선택 강조는 빠르고 실제 조작 상태와 연결.
- UI04-8: 중복/상충 CSS 소유권을 측정한 화면에 한정하여 정리하고 시각 토큰·focus·간격을 현행 코드 안에서 재사용. 전체 프런트 리빌드 금지.

### P2 — UI-05 정보·Admin·전면 한국어·제품 수용

- UI05-1: docs/ui/UI_INFORMATION_COVERAGE.md의 REQUIRED/DETAIL/ADMIN_ONLY/FUTURE/SECRET_STATE_ONLY 전체를 **최신 Runtime·Main·Admin**과 필드 단위 비교. 2026-08 스냅샷에 '없음'이라는 문구만으로 갭 재선언 금지.
- UI05-2: Main에는 읽을 수 있는 의미·기간·Source·상태, Admin에는 원시 UUID/요청 ID/중복 판정/Authoring·Correction·Runtime 상태를 역할에 맞게 표시. 비밀 키, 해시, 운영 인증토큰의 사용자 노출 금지.
- UI05-3: Source는 institution/author/publication_date/source_type/citation/locator가 실제 존재할 때만 표시. null/근거 없는 값은 채우지 않음. Source 본문·citation을 임의로 요약하여 증거성을 약화하지 않는다.
- UI05-4: 전체 한국어 UI 문구·API 기반 enum·오류·도움말·ARIA 번역, 실제 역사적 고유명사와 영어 원문 출처를 보존. 기존 10월 미완료 포인터는 현행 main에서 확인 후 교정.
- UI05-5: 미구현 장소·사건·지리형상/표현을 이미 존재하는 것처럼 보여주지 않음. P14 PARKED 명확화.
- UI05-6: 관리자 전용 수정·삭제·등록/검토에 오해되는 버튼/상태를 제거하지 말고, 서버의 유효 승인·권한·상태를 정확히 표시.
- UI05-7: 경량 클릭 통계가 필요하더라도 개인 식별/추적과 별도 유료 분석 서비스를 기본값으로 추가하지 않음. user consent·운영 승인 별도.

### P3 — 제품 품질 유지·성능·실사용자 검증

- Q1: 현재 배포 서비스의 LCP/INP/CLS는 실측치 미확인. 우선 Chrome의 기존 무료 도구로 대표 라우트·모바일 조건의 제한된 실측; Vercel Hobby 과금/Origin 부담을 만들지 않는 fixture를 선호.
- Q2: 수천 Person/Activity에 기존 virtualized rendering과 검색 인덱스/선택 상태를 유지. 거대 public list 전체 매번 다운로드, 지도 전체 DOM 노드 상주, 고비용 Source/DB 조회를 만들지 않는다.
- Q3: 시각 회귀는 화면·viewport·fixture·상태를 고정한 전후 캡처로 비교. WCAG 대비·ARIA·keyboard·스크롤·네트워크 실패의 단위/통합 검사를 더한다.
- Q4: 실제 사용자 대상 작은 정성 검증(예: 경험 수준이 다른 약 5명)을 **권한·참여 의사가 있을 때** 진행; 이는 문제 발견, 통계적 대표성 아님. 성공률·소요시간의 추세를 말하려면 적절한 표본과 같은 과제 비교가 필요.
- Q5: 최종 디자인 수용은 기술 통과 + 실제 사람의 화면·동선 평가로 결정; 자동화가 마음대로 미적 'USER APPROVED' 판정하지 않는다.

## 5. 판별력 높은 실제 대표 과제

1. 인물명부: 장문 국문/영문을 가진 등록 인물 검색 → 시대·활동기간 확인 → 정렬 변경 → 이름 선택 → 뒤로 돌아와 동일 선택·검색/스크롤 유지.
2. 복수 Activity 인물: 정확한 서로 다른 2+ Activity 기간·Role·Polity 및 claim-specific 출처를 빠짐없이 탐색. 하나의 URL을 공유해도 다른 출처 문구를 확인.
3. 시공간: 검토된 특정 BCE 시기와 CE 시기를 찾아 선택 → 카메라 pan/zoom 500% 이상 → 지역 전환 → 선택 검사, 좌표 불변.
4. Meanwhile: 모델이 24개보다 많은 검토된 Activity를 보유한 실제 시점에서 전원 접근 → 권역별 필터 → 전체 Person/Activity 수와 화면 표시 수 구분.
5. 연속 탐험: 실제 등록된 특정 해의 인물 선택 → 다른 권역 인물 상세 → 원래 해/카메라/검색 복구. 등록 여부가 보장되지 않은 1592 등의 임의 시나리오를 억지로 PASS로 단정하지 않음.
6. 2인 비교: 확정 Activity가 실제 겹치는 두 인물과 불확실/미상 경계를 가진 다른 두 인물을 비교 → 정확한 교집합·판정불가 구별, Source 클릭, 모바일 대상 교체.
7. 관리자: 정상세션과 비인가 방문 모두에서 Main은 일반 정보만, Admin은 서버에 허가된 원시 이력만. 운영 API의 secret/개인정보가 DOM·로그에 유출되지 않음.

작업 전/후에 **정답 자료는 현행 Canonical 및 Runtime의 확정된 UUID·Source·시기**에서 만든다. 역사 해설을 테스트가 임의로 만들어 사실처럼 취급하지 않는다.

## 6. 수용 기준과 계측(과장 금지)

| 영역 | 합격 판정 방법 |
| --- | --- |
| 역사적 무결성 | 기존 Person/Activity/Polity/Source ID·연대/불확실성·정치체 binding·분야색·카메라 불변 테스트/읽기 확인, 데이터 수 무단 변경 0 |
| 기능 탐색 | 대표 7개 과제에서 선택·검색·필터·더보기·비교·돌아가기 수행, 정보 누락·중복·잘못된 수치 0. 수용 테스트 범위 외 전체 무결성 주장 금지 |
| 시각 위계 | 고정 fixture의 PC/모바일 원본과 변경 화면을 동일 상태에서 비교, 장문 줄바꿈·밀집·고대비·선택/hover/focus/통제·Source 가독성 확인 |
| 접근성 | WCAG 2.2 AA 관련 기준: 의미 있는 일반 문자 4.5:1, 큰 문자/주요 비텍스트 상태표시 3:1, 키보드 전체 탐색, 올바른 포커스·라벨·예외 처리; 자동 검사만으로 완전 준수 주장 금지 |
| 반응형 | 390/600/768/1440/1600px에 주요 작업 가능. 200/400% zoom 및 표·지도 특수 reflow 예외를 개별 검사 |
| 성능 | 진짜 측정된 LCP/INP/CLS를 기록하고 web.dev 좋음 구간을 목표로 개선. 측정 전/샘플 부족 때 수치·PASS 날조 금지 |
| 배포 | focused test → exact-head Integrity → review/merge → 변경 리소스에 맞는 실제 Production SHA/자산 HTTP200 → 실제 화면/조작 → 사용자 평가가 필요한 미적 승인 별도 |
| 진행 관리 | 새 UI PR 개수보다 해결한 재현 결함·완성된 실제 플로우·전후 탐색 성공/오류/시간을 기록. 단순 계획문서 저장은 사용자 기능 완료 0 |

## 7. 구현 순서 — 억지 일정·게이트 없이 실제 최종가치 기준

**Wave A — 이미 배포된 작업의 수용 빈칸 닫기:** UI-01/02/03의 PC·모바일 실화면 정합성, Dashboard verifier 실제 재실행. 확인된 CSS/DOM 결함만 수정한다. 동시에 충돌 없는 기존 UI-06A #2724를 독립 진행할 수 있다.

**Wave B — 역사탐험의 끊김 제거:** UI-06A 필터·직접 연도와 집계/미상 설명, UI-06B 브라우저 history·카메라·필터·선택 상태 복원. UI-01/02의 탐험 진입·복귀를 같은 계약으로 묶는다. UI-04 핵심 메뉴를 이 흐름에 맞게 우선 조정.

**Wave C — 정보 신뢰와 비교 완성:** UI-07 2인 Activity 비교, Source claim/Uncertainty/Polity 상세 의미 표시, UI-05 Main/Admin 및 한국어 정보 누락 검증. 데이터 모델 바뀌지 않은 범위에서만 실행.

**Wave D — 화면 전체의 세련미·편의·접근성·성능 수용:** 공통 CSS 소유권/서체/상태, 모바일·키보드·스크린리더, 리얼 사용자 사용성 측정, 성능 개선, 제품 전체의 실제 화면 수용. A~D는 작업 의존성 단위일 뿐 다른 독립 작업의 병렬 진행을 금지하지 않는다.

**실행 단위의 크기:** 하나의 재현 문제 + 관련 최소 소스 + 집중 테스트 + 실제 완료 경계까지. 1차 분석만 반복하거나 오래된 Phase II/III 문서를 무한하게 재조사하지 않는다. 단, 사용자 승인과 역사적 의미·상충되는 디자인 지시가 있으면 해당 원본 확인 후 결정한다.

## 8. 현행 GitHub 체크포인트(반드시 다음 회차 최신 상태로 교체)

2026-11-19 23:44 KST 인근 확인:
- 최신 main: 4dea97a3e757c5e312926f31c2c75c7eadd9a7e3 (#2723 UI-03A 시공간 가독성 병합).
- UI-01 #2715, UI-02 인물 #2719 / 정치체 #2721, UI-03A #2723: 원장상 코드·CI·Vercel READY. 정식 PC/모바일 실제 브라우저 시각 수용과 화면 회귀는 별개 미완료.
- UI-06A 첫 24개 초과 펼침: #2722 merged; 현재 별도 열린 #2724는 reviewed macroregion별 동시대 필터 코드(기존 Person vs Activity 집계). **현재 열린 PR이므로 같은 파일을 다시 구현하지 말 것.**
- UI-04 Dashboard 검증기 #2716 병합, 과거 Production acceptance #44472651714는 FAIL이며 수정본의 새 브라우저 검증 완료 확인 필요.
- UI-06A 남은 연도 직접 입력·Polity 필터, UI-06B 상태 복귀, UI-07 2인 Activity 비교는 현재 기획상 계속 열려 있음. UI-05 Admin/한국어/정보 완전성도 전체 완료 아님.
- VIS3-06-R1의 미승인 장식 A/B2, P14 geometry/territory, 사용자 미승인 새 초상/대량 인물 기록 생성은 자동 범위 아님.

**NEXT concrete route:** UI 매니저는 #1896와 #2724 최신 CI/충돌 및 Production 가시 상태를 비교한다. 브라우저로 수용 가능한 도구가 있으면 UI-01/02/03 동일 fixture 한 번의 bounded 실제 시각 수용·핵심 조작을 하고 검증 장애만 코드로 수정한다. 동시에 독립된 UI-06A #2724 후속을 승인·CI 경계 내에서 진행한다. 다음으로 UI-06B 기존 route/state contract의 실제 유실/복원 요구를 한 구현 단위로 묶는다. 사용자 재승인을 요구하는 UI 장식·미학 결정은 자동으로 강행하지 않는다.

## 9. 유지·변경 원칙

이 문서는 **현재 승인된 목표를 연구 근거로 구현하기 위한 하나의 전략/수용 안내**이지 또 하나의 병렬 독립 UI 백로그가 아니다. docs/ui/ATLAS_UI_DELIVERY_PLAN.md와 docs/ui/UI_MANAGER_INTEGRATED_EXECUTION.md의 상단 링크에서 이 문서를 찾아 사용하며, UI 매니저는 매 회차 연구 원문을 다시 검색하지 않는다. 이후 근거가 바뀌어 실제 사용성 판단이 달라질 때만 해당 URL과 연구 날짜/범위를 갱신한다.

**변경 불가능/승인 게이트:** WORK_EXECUTION.md, ATLAS_REQUIREMENTS.md, DATA_MODEL.md, 사용자 명시된 디자인 선택. 별도 승인 없는 Canonical writer/Source/Polity identity/퇴역/삭제, P14, 신규 과금, Vercel Sandbox, 402 우회, 대량 Production 크롤링, 신규 예약 금지.
