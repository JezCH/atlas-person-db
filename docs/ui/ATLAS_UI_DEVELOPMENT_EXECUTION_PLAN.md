# ATLAS UI 구체적 개발 실행계획 v1.0

> 2026-11-19 KST · 대상 JezCH/atlas-person-db · 개발 작업지시서 작성 완료, UI 기능 구현 완료 아님.
>
> 권위: 사용자 최신 지시 / WORK_EXECUTION.md / ATLAS_REQUIREMENTS.md / DATA_MODEL.md > docs/ui/ATLAS_UI_DELIVERY_PLAN.md v1.1 > docs/ui/UI_MANAGER_INTEGRATED_EXECUTION.md > docs/ui/ATLAS_UI_EVIDENCE_BASED_MASTERPLAN_20261119.md(20개 연구 근거) > 본 상세 실행 단위.
>
> 관리: 기존 하루 8회 ATLAS 프로젝트 총괄 → UI 매니저(기존 예약 내부 역할) → 실제 구현자. Issue #1896이 UI 상태 원장, #2627이 전체 원장. 새 예약·유료 도구·독립 상주 AI는 만들지 않는다.
>
> 목표: 기존 제품의 역사 전체 조망 → 인물 검색·명부 → 활동/정치체/Source 상세 → 시공간 동시대 → 두 인물 실제 활동 비교 → 원래 탐색 위치 복귀를 PC·모바일·키보드에서 정확하고 아름답게 수행한다. 기존 밀집 인물표를 카드/초상 중심 화면으로 바꾸지 않으며 실제 연대·지리·8분야색·Source 의미를 손상하지 않는다.

## 2026-11-20 UI-03 시공간표 전면 품질 개선 실행계약 — UI-03A/B·VIS-02 (PLAN_RECORDED)

> **최신 사용자 지시:** 현재 시공간표의 글씨 크기, 비율, 배치 전반이 만족스럽지 않다. 폰트 몇 px 확대나 CSS 덧씌우기로 종결하지 말고 **화면 정보 구조·축/공간 비율·이름 배치·도구판 우선순위를 실브라우저 결과 기준으로 다시 정비**한다.
>
> **공식 owner:** UI [#1896](https://github.com/JezCH/atlas-person-db/issues/1896), 기존 UI-03A/B·VIS-02 / 기존 총괄·UI 매니저. 새 예약·독립 제품 트랙을 만들지 않는다. 다른 화면의 진행을 막는 전역 게이트도 아니다.
>
> **기존 구현 재사용:** [Draft PR #2776](https://github.com/JezCH/atlas-person-db/pull/2776)은 기존 명칭/영역/font metric 1차 보정으로, 아직 MERGED/PRODUCTION/BROWSER/USER 수용이 아니다. 현재 main과 다른 PR의 최신 상태를 확인하여 유효한 수정만 사용한다. 기존 코드와 500%/1500% 검증 계약을 다시 만드는 일은 금지한다.

### 0. 성공 정의

- 연도 → 대권역 → 하위지역/검토 장소 → 해당 시대 인물명·활동선의 시각적 위계가 분명하고, 실제 공간은 시공간표가 우선 점유한다.
- 사용자가 검색/시대 선택/인물 선택/한 시대의 동시대 비교/Inspector/원위치 복귀를 하는 과정에서 역사적 사실과 현재 탐색 맥락이 명확하고 안정적이다.
- 글꼴 크기, 대비, 줄높이, 정렬, 실제 길이, 지역 경계, 패널 폭, 표시 밀도를 함께 최적화한다. 글자를 키운 대신 겹침·잘림·누락이 늘면 미완료다.
- 역사적 normalized X, historical Y, 실제 Activity 연대, spatial precision, Source/Relation/Role, 8개 대표분야 의미색, selection/Meanwhile 강조 의미를 손상하지 않는다.
- 계획 문서/정적 단위테스트/CI/머지/Production READY는 각각 한 단계의 증거일 뿐, **실제 사용자 시각 수용의 대체물이 아니다**.

### 1. 확인된 원인 후보와 해결 전제

1. 소스 확인 사실: atlas-person-spacetime-space-axis.js의 createSpatialContinuum은 45개 하위권역에 같은 폭(1/45)을 부여하고 macroregion 폭은 포함한 하위권역 수의 합이다. 지역의 Person 밀도에 따라 폭이 바뀌는 것은 아니다.
2. **계약 불일치:** docs/spacetime-completion-contract.md 및 일부 이전 디자인 문서에는 9개 대권역의 equal stable band라는 서술이 있어 현재 45 leaf 기반 실제 구현과 일치하지 않는다. 9개 대권역을 CSS만으로 강제 재배분하거나 normalized X를 수정하지 않는다. P0에서 의도/기존 사용자 확정 선택/하위 좌표 의존성을 대조한다.
3. 현행 기본 계약: viewport-fit 유효 최소 줌, 기본/reset 500%, 최대 1500%, 전 세계 X/Y 공통 글로벌 줌, 공통 압축 0.748, 연도축 140px, 헤더 36px, 선형 역사 시간 Y, 지역/시대별 밀도 가변 압축 금지. 필요한 변화가 있다면 별도 근거와 사용자 결정 이후 정식 완료계약을 함께 갱신한다.
4. 현재 인물이름 엔진은 이미 표시용 이름 위치를 역사적 레일과 분리하고, visible rail의 표시 영역 안에서 가로공간을 빌리며 collision guard도 가로 이동만 한다. 문제는 이 기능의 부재가 아니라 **실제로 어떤 글자폭/실DOM/밀집 창에서 실패하는지 미측정**된 상태다.
5. 폰트/헤더 불균형, 부속 패널의 시공간표 면적 점유, 작은 조작부는 정적 소스상 개선 후보이지만 **실제 사용자 불편의 크기/최적 크기는 아직 실브라우저에서 재검증해야 할 가설**이다.

### 2. P0~P5 실행 순서 — 각 단계 별도 완료 판정

| ID / 상태 | 할 일(기존 원본에 직접 통합) | 반드시 남길 결과와 합격 기준 |
| --- | --- | --- |
| **P0 실측 기준선 / OPEN** | 실제 배포 SHA 확인 후 현행 브라우저의 390/768/900/1280/1600px, viewport-fit/500%/1500%, Person/Activity/Meanwhile 선택·미선택, 밀집·희박 화면을 캡처. computed font-size/line-height, 캔버스 면적, 패널 점유, 클리핑, rail/label ID, overlap/deferred를 측정. 기존 Chrome workflow/artifact 재사용 | **정확한 배포 SHA + 전 화면 기준 PNG/JSON + 재현 가능한 상위 병목**. 실브라우저 수단 부재 시 BLOCKED_VISUAL 표시; 정적 CSS 위험을 실제 화면의 확정 결함으로 오인하지 않음 |
| **P1 전체 배치 / OPEN** | atlas-person-spacetime-view.css / atlas-person-spacetime-instrument-tools.css / 필요시 view.js. 넓은 PC의 캔버스 우선·선택 전후 고정 패널, 900~1200px에서 풀폭 캔버스+아래 Inspector 대안, 모바일에서 탐색 행동을 정보 패널보다 먼저 노출. 중복 상태/장식·여백 제거 우선 | 390/768/900/1280/1600px에서 표/연도축/지역 헤더/컨트롤 잘림·겹침 없음, 선택 전후 캔버스 가로폭 도약 없음, 검색과 zoom/미니맵의 발견성 보존 |
| **P2 시간·지역축 정보 위계 / OPEN** | monumental-canvas.css, semantic-axis.js 및 헤더 DOM의 실제 winning CSS 확인. 대권역/하위지역/장소 LOD, major/minor year, activity/rail의 강조 수준을 일관된 서체·행간·대비로 정비. 36px 머리글 안에서 단계적 노출을 우선 비교 | 연도→대권역→인물명/활동선→세부지역의 위계가 실화면에서 분명. 연도·권역의 절단/가림 없음. 헤더 2단/140px 연도축 변경 또는 지역 비율 변경은 별도 승인 전 보류 |
| **P3 인물 이름·활동선 엔진 / OPEN** | view.js, presentation-layout.js, label-engine.js, label-overlap-guard.js, label CSS. 한글/한자/로마자 혼합·장문 이름의 실제 렌더 글자폭과 추정값 정합, 후보 horizontal placement, 연결선 업데이트, 선택/Meanwhile 우선순위, 성능 측정. 이름표를 위해 historical rail Y/normalized X 이동 금지 | 유럽 AD 1800~1950 및 동아시아 AD 500~1900에서 **500%·1500% 실제 Chrome**의 이름 overlap 0 / deferred 0 / 가시 rail Person ID와 label Person ID 정확히 동일 / historical Y 편차 0px. 물리적 수용량 부족을 가리거나 글자 축소로 속이지 않음 |
| **P4 Inspector·탐색 동선 / OPEN** | Inspector·미니맵·검색·Meanwhile 실제 상태 owner 및 CSS/DOM. Person 이름/실제 기간/Activity/Polity·Role/Source·precision 순으로 읽는 흐름을 정돈. keyboard/touch/History, 선택 전후·화면 이동 중에도 컨텍스트 유지 | 줌(포인터 중심 포함)·reset·미니맵·검색/선택·동시대 탐색·Person/Activity 상세·Back/Forward 정상. 390/1600px의 조작부 명칭/터치/선택 상태 판독 |
| **P5 통합 및 실브라우저 수용 / OPEN** | 동일 SHA·화면폭·연대·지역·배율의 **수정 전/후 PNG/JSON 비교**, 집중 회귀, 정확한 PR head CI, 승인된 병합, Production exact-SHA/HTTP 확인, 실 Chrome과 사용자 시각 승인 | CODE_CHANGED → FOCUSED_TEST_PASS → EXACT_HEAD_CI_PASS → MERGED → PRODUCTION_ASSET_HTTP_VERIFIED → BROWSER_ACCEPTED → USER_VISUAL_APPROVED 각각 실증. 사용자 불만 해소 확인 없이 DONE 금지 |

**타이포그래피 시작 가설(확정 값 아님):** PC Person 14~16px, 대권역 14px, 하위권역 11~12px, 주요 연도 13~14px, Activity 11~12px, Inspector 본문 12~14px를 비교한다. 실제 CJK 글자폭·pack height·collision·culling과 CSS를 반드시 함께 검증하고, 브라우저 화면의 읽기 품질과 한 화면 정보량으로 선택한다.

### 3. 지역 비율 결정: A안 우선, B안은 별도 사용자 선택

- **A / 기본 실행:** 현재 45 leaf 기반 지역 폭과 normalized X, 모든 역사 Y 및 통합 줌 계약을 유지한다. 우선 제목/표시 레벨/패널 공간/레이블 배치만 개선하여 실제 가독성이 해결되는지 판정한다.
- **B / 의사결정 대기:** 9대권역 동일 폭, 내부 leaf 재배분 등 정규화 공간 모델 변경안을 원인 증거, 기존 합의와 회귀 범위, 기존 위치/탐색 영향과 함께 비교만 한다. **이 계획 저장으로 B안을 승인한 것이 아니며, 코드는 사용자 선택 전 변경 금지**.
- 36px 헤더/140px 연도축을 바꾸거나 2단 헤더를 채택하는 일도 기존 계약과 대조하고 실제 개선 효과 확인 후 승인 처리. 지역별 인물 밀도 가변폭, 시대별 Y 가변압축, 허구의 정확 좌표는 A/B 모두 금지.

### 4. 기존 소스·검증·안전 경계

- **주요 코드:** atlas-person-spacetime-view.css, atlas-person-spacetime-monumental-canvas.css, atlas-person-spacetime-instrument-tools.css, atlas-person-spacetime-view.js, atlas-person-spacetime-presentation-layout.js, atlas-person-spacetime-label-engine.js, atlas-person-spacetime-label-overlap-guard.js, atlas-person-spacetime-semantic-axis.js. **atlas-person-spacetime-space-axis.js는 현 단계 진단 대상이며 재설계 승인 전 쓰기 금지**.
- **기존 테스트 재사용:** tests/spacetime-dense-label-acceptance.test.mjs, tests/ui-spacetime-chronology-legibility.test.mjs, 기존 camera/navigation/LOD/space-axis 회귀 및 scripts/verify-spacetime-production-visual.mjs. 오래된 고정 font px 기대값 수정 = 회귀 검증이며 실브라우저 미학 승인 아님. 최종 exact-SHA gate는 [현재 렌더러 수용 계약](../spacetime-current-renderer-final-acceptance.md) 적용.
- **권한/비용:** 역사 정규화 데이터·Polity/Place/Source·8분야 의미색·권력자색 변경 없음, P14 지도·신규 스키마/유료 API/Vercel Sandbox 금지, Production 잦은 재검증 금지. 기존 #1896·#2776의 상태/충돌 확인 후 실변경은 코드·테스트·브라우저 증거로 별도 기록한다.
- **현재 완료:** 이 절은 PLAN_RECORDED뿐이며 시공간표의 실제 추가 개발/병합/Production 적용/시각 수용을 의미하지 않는다.


## 2026-11-20 실개발 체크포인트 — 오래된 §2·§5 스냅샷보다 우선

> §2의 2026-11-19 GitHub 상태와 §5의 당시 작업 순서는 **역사적 작업 설계 근거**다. 현재 살아 있는 작업 목록이 아니다. 완료된 #2725, #2722, #2728 및 UI-07 구현을 재실행하지 않는다. 정확한 최신 owner는 [#1896](https://github.com/JezCH/atlas-person-db/issues/1896)이고 상위 프로그램 범위는 [전 프로젝트 업그레이드 로드맵](../ATLAS_PRODUCT_UPGRADE_ROADMAP_20261120.md)이다.

| 실제 작업 단위 | 최신 실행 결과 | 현행 미종결 수용 |
| --- | --- | --- |
| **REG-01/02 (UI-01)** | [#2756](https://github.com/JezCH/atlas-person-db/pull/2756) **MERGED** 모바일 Person 사실 2단 정렬 | 390/600/768px의 이름·기간·Polity/Role·다중 Activity, 검색·정렬·선택, overflow 확인 |
| **DETAIL-01 (UI-02)** | [#2762](https://github.com/JezCH/atlas-person-db/pull/2762) **CI SUCCESS** [#44683878773](https://github.com/JezCH/atlas-person-db/actions/runs/44683878773), **MERGED** main `c28559726c13bb171647cdfccbd38ee726463e5d`, Production `dpl_Fnv2vdfd2aNgxArpcaHB9jjSpAGP` **READY exact SHA / official alias** | **QA-01 / UI-02 P0:** 실제 초상 없는 인물에서 첫 화면에 이름·연대·시공간/비교 동작이 나타나는지, 등록 초상 있는 인물은 4:5 이미지를 유지하는지, Source/Activity/분야·모바일 스크롤·가로폭을 390/600px 브라우저 확인 |
| **ROUTE-01/02 (UI-06B)** | [#2725](https://github.com/JezCH/atlas-person-db/pull/2725) **MERGED**, [#2761](https://github.com/JezCH/atlas-person-db/pull/2761) **MERGED** native History 여정 검사 수정 (검사만 변경) | **QA-02 deep Production:** Person A→Spacetime/동시대 Person B(실제로 A와 다른 인물)→native Back/Forward→활동 원점/카메라/검색 복귀·새로고침. 여정 스크립트 존재 ≠ 성공 실행 |
| **COMP-01~03 (UI-07)** | 2인 비교/기간·출처, History 저장, 기존 390px 모바일 Chrome 비교 PASS는 구현 완료 이력. 추가 scroll/focus [#2760](https://github.com/JezCH/atlas-person-db/pull/2760) **CI SUCCESS** [#44668346374](https://github.com/JezCH/atlas-person-db/actions/runs/44668346374), **MERGED** main `c0c438be908390353cb47d7146e3c451466e9b22`, Production `dpl_8u4mUvzUwMkZEaoqnPjcuCNdkcJg` **READY exact SHA / official alias** | **QA-03 UI-07:** 실제 PC/390px 두 번째 선택 직후 결과 패널이 읽을 수 있는 위치로 scroll/focus되고 결과/source가 온전히 보이는지; reload/Back/Forward는 초점 탈취 없이 복원되는지 확인 |

**검증상태 경계:** 두 #2760/#2762 모두 `CODE_CHANGED → FOCUSED_TEST/EXACT_HEAD_CI_PASS → MERGED → VERCEL_PRODUCTION_READY_EXACT_SHA`까지만 관찰. 해당 exact SHA의 공개 HTTP 200, Chrome 실조작/스크린샷, 사용자 수용 여부는 **NOT VERIFIED**다. 다른 이전 SHA Chrome PASS를 신규 UX 검증으로 합산하지 않는다. 현행 [WORK_EXECUTION](../../WORK_EXECUTION.md)의 생산 완료 단계 구분을 유지한다.

**바로 다음 독립 실행:** 기존 Chrome/브라우저 수단을 활용한 위 UI-02·UI-07 두 수용을 우선하고, 별도로 [#2761](https://github.com/JezCH/atlas-person-db/pull/2761) deep History 실제 Production manual workflow 수용. 도구/권한이 없으면 그대로 PENDING으로 기록하고 다른 독립 승인 작업 진행. Vercel Hobby 반복 호출/새 자동 실행기/유료 API/중복 PR 생성 금지. 새 데이터/스키마/P14/대량 초상은 포함하지 않는다.

## 2026-11-20 전면 UI 체감 품질 실행 패키지 — VIS-00~VIS-07 (ACTIVE)

> **근거 및 범위:** 사용자는 기존 PC 인명·모바일 명부·시공간 3건만의 수정을 거부하고 **전체 ATLAS 화면을 동일한 판독성/정보 배열/공간 효율/실제 역사 탐험 기준으로 재검토·개선**하도록 지시했다. 상위 [UI 제품화 계획의 2026-11-20 전면 가독성 수용계약](ATLAS_UI_DELIVERY_PLAN.md)을 따른다. 이 단위는 UI-01~07, QA/REG/DETAIL/SHELL/A11Y/ADMIN에 **귀속**하며 새 독립 디자인 큐나 자동 승인된 기능 확장이 아니다.
>
> 증거: [2026-11-20 이전 Production SHA 54598faf Chrome 캡처/JSON #44662938810](https://github.com/JezCH/atlas-person-db/actions/runs/44662938810) 및 [#1896 전면 감사](https://github.com/JezCH/atlas-person-db/issues/1896#issuecomment-7028385317). 해당 SHA 이후 **#2756 2단 모바일 명부, #2760 비교 결과 scroll/focus, #2761 History 검사, #2762 무초상 상세**가 반영됐다. 이를 다시 개발하거나 이전 SHA의 시각적 결함을 최신 결함으로 단정하지 말 것.

| 작업 ID / 기존 owner | 최우선 사용자 결과 | 구체 소스 범위(변경 전 재확인) | 정확한 인수/중복 방지 |
| --- | --- | --- | --- |
| **VIS-00 / QA-01~03** | 이미 병합된 UI 변경의 사용자 가시 효과 확인 | 기존 production Chrome acceptance / #1896 | #2756 모바일 2단·#2762 유/무초상·#2760 비교 scroll/focus·#2761 native History를 **현행 Production exact SHA**로 확인. CI/READY/기존 구버전 PASS 재사용 금지. 자동 기존 검사 통과만으로 UX 합격 금지 |
| **VIS-01 / REG-01/02** | 1600/390 화면에서 **이름·기간·정치체·다중 Activity가 정돈되어 잘 읽힘** | atlas-person-monumental-register.css, atlas-person-table-view.js/css, atlas-person-era-navigation.css | PC 이름/활동 폰트·계층, 모바일 #2756 2단 그리드/행간·장문/다중 Activity/연대 미상. 기존 행·관계·Source/검색·정렬·시대·분야 유지. 이전 #2746 가로 397px 문제는 당시 수정 전 기준일 뿐 |
| **VIS-02 / QA-02, UI-03** | 첫 화면부터 실제 인물을 발견하고 확대해도 **인명이 읽힘** | atlas-person-spacetime-view.js, atlas-person-spacetime-monumental-canvas.css, atlas-person-spacetime-mobile-v8.css, atlas-person-spacetime-label-engine.js, 실제 충돌/LOD owner | PC 500%, 모바일 390, 고확대 1500%에서 빈 화면 발견/검색·이동, 이름·눈금·범례/Inspector, 실제 중첩·가림/라벨 개수. **CSS 글자 크기와 label metrics/packing을 같이 검증**. historical world X/Y·region ratio·camera·LOD·History 불변 |
| **VIS-03 / DETAIL-01, UI-02** | 인물·정치체 화면에서 **역사 사실/탐색 행동을 먼저** 봄 | atlas-person-chronicle-detail.css, atlas-person-main.js, atlas-polity-review-workbench.css, 관련 Polity DOM owner | #2762 무초상 축소는 재사용. 출처·Activity 우선, 유초상 디자인 보호. 정치체 검색·목록이 소개·KPI에 밀리는지 현행 모바일 첫 화면 확인 후 국소 교정. retired/redirect·Source/Role/Relation 유지 |
| **VIS-04 / SHELL-01, QA-03** | 대시보드·메뉴·시대/분야/검색에서 즉시 탐색할 수 있음 | atlas-dashboard.css, atlas-dashboard-monumental-v11.css, atlas-ui-mobile-v8.css, atlas-ui-visual-foundation.css, atlas-person-era-navigation.css, nav DOM owner | 6~10px dashboard caption/7~9px era·분야 label은 **코드 위험**. Dashboard 실화면 부재이므로 현행 브라우저 확인 후 필요부만 개선. 메뉴 탐색 우선순위·사용자 지향 빈/오류 상태, 터치영역 측정 |
| **VIS-05 / COMP-01~03, ADMIN-01** | 비교와 등록검토에서 **판정에 중요한 원문이 명확히 보임** | atlas-person-compare-view.css, atlas-registration-review.css, 실제 Admin owner | 비교 A/B 기간·근거 먼저, 경고/반복 제목 시각 위계 조절. 기존 #2760 scroll/focus 보호. Admin은 권한·원시 provenance/UUID 보존, 헤더/상태 readable·오작동/비인가 없음. Admin도 현재 실화면 미검증 시 FAIL 단정 금지 |
| **VIS-06 / A11Y-01, I18N-01** | 모바일·확대·키보드에서 같은 사실과 동작에 접근 | 실제 수정 표면 CSS/JS owner만 | 390/600/768/1440/1600px, 200/400% 확대, Tab/Shift+Tab/Enter/Escape/Back, 키보드 focus, 44px 내외 실터치 목표, 긴 한/영 이름, BCE/CE/근사·ongoing·미상·Source 0/다수. 역사 원문 숨김·가짜 생성·임의 색 의미 변화 금지 |
| **VIS-07 / SHELL/A11Y/PERF** | 화면 간 스타일 일관성과 원래 탐험 상태 보존 | index.html 스타일 로드 순서, 현재 owner stylesheet, navigation/history/LOD JS **실제로 증상 발생한 부분만** | computed winning CSS·기존 media/!important 중복 원인 확인, 불필요한 덮어쓰기 *제거* 우선. 데이터 로딩/Origin 비용·재렌더/상태 복귀 악화 금지. 결과는 Production 인물표/상세/정치체/시공간/비교/대시보드/Admin 각각 별도 수용 |

**작업 실행 판별:** VIS-00의 실제 미완료 수용을 우선하되, 각 화면의 직접 재현 가능한 미해결 결함은 **검증·수정·통합 가능한 독립 단위**로 이어간다. 외관만 수정한 것은 대상 캡처 전후 비교를 필수로 한다. 글자를 키워 겹치거나 중요한 정보를 숨긴 경우에는 합격하지 않는다. 현재/과거 source mixed state를 섞지 않는다.

**지켜야 할 원본:** 기존 표형 Person register(카드 전환 금지), 초상은 이미 등록된 자산만, 8분야 의미색·금색, 역사적 Activity/period basis/precision/calendar/Source/certainty, Person↔Polity identity, 시공간 고정 세계·시간 좌표/LOD/camera. P14·대량 초상·역사 데이터/DB/API·추가 유료 인프라는 이번 UI 계획에 포함하지 않는다.

**종결 상태:** 개별 `VIS-xx | 실제 current SHA 기준 화면/스크린샷 | 재현 증상 | 실제 수정 파일·PR | CI | MERGED | PRODUCTION SHA/HTTP | BROWSER_ACCEPTED | USER_VISUAL_APPROVED | 남은 문제`로 #1896에 기록. **본 표 자체는 PLAN_RECORDED일 뿐 기능·시각 수용 완료가 아니다.** 구버전 Chrome 시각 증거는 '당시 PASS'로만 분류한다.

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

이 문서의 **계획 작성/병합은 UI 기능 완료가 아니다.** #2725와 UI-06A 핵심 기능, UI-07 두 인물 비교·History, #2756 인물 모바일 2단 표, #2760 결과 scroll/focus, #2762 무초상 상세 표시 등은 실제 main 반영된 코드를 재개발하지 않는다. 최신 UI 사용자 완료를 위해 남은 **우선 게이트**는 #2760/#2762 exact-SHA PC·390px 실브라우저 수용, #2761 deep Activity/History 왕복 실조작, UI-01/02/03 및 Dashboard/Admin·정보완전성·키보드/접근성의 실제 미합격 범위 확인/수리다. 계획의 MEAN/ROUTE/COMP 실행 순위는 2026-11-19의 역사 기록이며 현재 남은 작업은 이 문서 첫머리의 **2026-11-20 실개발 체크포인트와 #1896 최신 원장**이 정한다. P14·Canonical DB 변경·대량 초상·추가 과금은 사용자 별도 승인 범위다.
