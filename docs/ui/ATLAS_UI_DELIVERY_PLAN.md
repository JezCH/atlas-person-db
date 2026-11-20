# ATLAS UI 실전 고급화·역사탐험 개발계획 v1.1

> 확정: 2026-11-19 · 사용자 승인 / 실행 대상 · 저장소 `JezCH/atlas-person-db`
>
> **11월 19일 보완 승인:** 표 중심 단계 가독성/시각화와 역사탐험 UX 개발을 이 기존 계획에 구체화. UI-01~05 기존 실행 순서는 보존하고 UI-06~07을 후속 기능으로 추가한다. 아래 추가 실행 계약 참조.
>
> 총괄: 기존 [ATLAS 프로젝트 총괄] 예약 · UI 실행원장: [#1896](https://github.com/JezCH/atlas-person-db/issues/1896)
>
> 본 문서는 **실제 화면을 배포·수용하기 위한 개발 순서**이다. `docs/ui/UI_INFORMATION_COVERAGE.md`, `ATLAS_REQUIREMENTS.md`, `DATA_MODEL.md`, `WORK_EXECUTION.md`의 데이터·권한·운영 규칙을 대체하지 않는다.

## 현재 실행 상태 갱신 — 2026-11-20 (이전 11월 19일 계획 우선순위보다 최신)

**이 문서는 여전히 승인된 UI-01~07 범위를 정의하며, 다음 상태는 해당 계획의 실제 구현 체크포인트입니다.** 정확한 세부 CI/commit/배포 증거와 다음 수용은 [전 프로젝트 로드맵 §1](../ATLAS_PRODUCT_UPGRADE_ROADMAP_20261120.md)의 2026-11-20 체크포인트 및 [UI #1896](https://github.com/JezCH/atlas-person-db/issues/1896#issuecomment-7031754503)을 참조합니다.

- **UI-01:** 모바일 인물명/정치체/활동 연대의 2단 정렬 PR [#2756](https://github.com/JezCH/atlas-person-db/pull/2756) MERGED. 새 구조를 다시 설계하지 않고 최신 실화면에서 가독성·다중 활동·가로 넘침 수용.
- **UI-02:** 모바일 상세 **무초상일 때만** 정보 먼저/빈 4:5 그림 축소 PR [#2762](https://github.com/JezCH/atlas-person-db/pull/2762) CI PASS / MERGED / Vercel READY exact SHA. 실제 등록 초상 디자인과 역사 Source 보존. **390px 실브라우저 수용은 OPEN**.
- **UI-06B:** Person→시공간 이동 PR [#2725](https://github.com/JezCH/atlas-person-db/pull/2725) 이미 MERGED, 네이티브 History 검증 수정 [#2761](https://github.com/JezCH/atlas-person-db/pull/2761) 이미 MERGED. **원점 복귀 deep Production 브라우저 여정은 OPEN**.
- **UI-07:** 2인 비교 및 History 영속 복원과 기존 모바일 Chrome 비교 수용은 구축됨. 비교가 완성될 때 자동 scroll/focus PR [#2760](https://github.com/JezCH/atlas-person-db/pull/2760) CI PASS / MERGED / Vercel READY exact SHA. **새 초점 UX의 실제 PC·390px 실브라우저 수용은 OPEN**.
- **해당 작업의 우선순위:** 새로운 디자인 계획이나 UI-07 재구축보다 #2760/#2762 실제 화면 검증과 #2761 deep History 여정 결과 수용 → 발견된 현재 결함만 실제 원본 수정. CI/READY만으로 BROWSER_ACCEPTED·USER_VISUAL_APPROVED 기입 금지.
- 전체 제품의 전 영역 업그레이드 후보는 [ATLAS 전체 업그레이드 로드맵](../ATLAS_PRODUCT_UPGRADE_ROADMAP_20261120.md)에 보존한다. 신규 제안은 자동 승인/구현 큐가 아니고, P14·대량 초상은 PARKED.

## 2026-11-20 사용자 재지시 — ATLAS 전면 가독성·화면 효율·탐험성 수용계약 (ACTIVE)

> **최신 승인 의도:** 'PC 인물명·모바일 인물표·시공간 이름 세 건만 고치는 것이 아니라, 같은 관점으로 ATLAS의 **모든 실제 화면**을 제대로 검토하고 개선한다.' **스타일 장식보다 사람이 읽고 발견하고 이동하는 역사적 사실**이 우선이다.
>
> 이 절은 기존 **UI-01~07 / #1896**의 사용자 지시를 수용 기준으로 구체화한 것이다. 새로운 독립 UI 트랙·기능 승인·CSS 전체 재작성·과거 작업 재수행을 뜻하지 않는다. 상단 **2026-11-20 실개발 체크포인트**가 현재 구현·배포 상태의 우선 기록이다. 각 패키지의 실제 작업은 [상세 실행계획](ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md)의 **VIS-00~VIS-07**과 동기화한다.
>
> **근거:** 2026-11-20 Production 정확한 SHA `54598faf3c5f4f48d7ad315e425273a209896d94`의 [Chrome 아티팩트 #44662938810](https://github.com/JezCH/atlas-person-db/actions/runs/44662938810), 실제 1600px/390px 인물 명부·상세·정치체·시공간·비교 캡처, 당시 CSS/label-engine, [UI owner #1896 감사 체크포인트](https://github.com/JezCH/atlas-person-db/issues/1896#issuecomment-7028385317). 이 근거는 **후속 #2756/#2760/#2761/#2762가 병합되기 전의 기초 화면**이다. 후속 변경을 포함한 현재 Production을 재검증하여 같은 결함인지 확인한 뒤 수정할 것. 구 배포본의 진단은 현행 미해결 판정이 아니다.

### A. 모든 화면에 적용할 제품 원칙

1. **읽는 순서가 장식보다 우선:** 인물명·연대·소속/정치체·활동과 근거가 먼저 보이고, 상태 텔레메트리·장식적 프레임·중복 소개·원시 식별자는 이를 방해하지 않아야 한다. 첫 화면에 탐색 대상이나 바로 접근 가능한 탐색 행동이 있어야 한다.
2. **가독성은 '글꼴 확대'가 아니라 시스템:** 본문 크기·대비·행간·탭 숫자·줄바꿈·열 너비·보이는 정보량·중요도·hit target·sticky 오프셋을 함께 결정한다. 명부의 이름을 크게 하고 사실을 숨기는 방식, 전역 zoom/scale, 전체 overflow:hidden은 불가.
3. **권장 출발점(합격 수치의 단정 아님):** 핵심 인물명 데스크톱 약 17~18px·모바일 약 16~17px, 필수 활동·기간·정치체/Source 텍스트 약 12~14px부터 실측 비교. 지도 인명은 현행 desktop 10px/mobile 9px 기준을 개선하되 label-engine 폭·높이와 충돌 회피를 동기화. 6~9px은 실제로 읽어야 하는 UI 필수 사실·조작 라벨에 사용하지 않는 방향을 우선 검토. 숫자만 키워서 가려짐·라벨 소멸이 증가하면 재설계.
4. **반응형은 동일 정보와 안정적인 시선 흐름:** 1 Activity·2+ Activity·장문 한영 이름·BCE/CE·연대 미상·근사/불확실·ongoing·출처 0/다수·초상 유무 모두에서 같은 정보에 접근해야 한다. 역사/행 수를 희생하는 '깔끔함' 금지.
5. **정확성/권한 불변:** Person/Activity/Polity UUID, 8분야 의미색/권력자 금색 의미, 역사적 기간/역법/확실성/Source·relation·role, 시공간 world X/historical Y/지역 비율/통합 카메라/semantic LOD를 보존. Admin 권한 정보는 권한 내에서 유지하되 일반 탐험 화면을 압도하지 않게 한다.

### B. 화면별 전수 개선 대상과 원인·수용 조건

| 기존 승인 트랙 / 화면 | 확인·해소할 실제 사용자 문제 | 수용 기준 / 중복 방지 |
| --- | --- | --- |
| **UI-01 · PC 인물 명부** | 명부명/주요 역사 사실이 프레임·간격·선에 비해 작고 약함. 열 정보 우선순위·행 높이·긴 이름/연대 표시 검토 | 이름→활동 기간/정치체→역할·근거가 한눈에 구분, 검색·정렬·sticky·선택 보존. 1600/1440 실화면 대조 |
| **UI-01 · 모바일 인물 명부** | 다중 Activity마다 이름/정치체/연대의 위치가 들쭉날쭉한지 검증 | **#2756 2단 정렬 재사용**. 실제 390/600/768에서 1/2+ Activity의 줄·열 위치, 가로 넘침, 원문 전항목 접근을 검증; 실패만 수정. #2746 이전의 397px overflow를 현재 미완료로 재기록 금지 |
| **UI-01/04 · 시대/분야/검색 필터** | 작은 시대 숫자·분야 칩(구 화면 일부 7~9px/20px hit target)과 모바일 상단 도구 과밀 | '검색/현재 필터/인물 목록'에 신속히 도달, 시대 이동·필터 전체 접근, 44px 내외 실터치 목표와 가로 스크롤 정당성 측정 |
| **UI-02 · 인물 상세** | 무초상 장식 프레임 및 설명/메타가 실제 활동·출처보다 먼저 보이는지 | **#2762 무초상 정보 우선 개선 재사용**, 등록 초상 4:5 그대로; 390/600에서 이름/연대/관계/Source와 시공간 진입 발견성·화면 깊이 재수용 |
| **UI-02 · 정치체 검색/상세** | 첫 화면의 장문 소개/다수 KPI가 검색·실제 정치체 목록을 밀어내는지. 역사 핵심 정보와 운영 UUID/상태 위계 | 검색/목록과 주요 정치체 사실 먼저; 근거·연속성·retirement/redirect·관리 정보는 해당 기능에서 계속 접근. 모바일 열린/닫힌 상세 검증 |
| **UI-03 · 시공간 PC 500%** | 넓은 캔버스 대비 인물 이름·축/범례·선택 하이라이트의 판독력이 약함 | canvas/rail 실제 라벨 수·겹침·읽을 수 있는 크기/대비 동시 확인. **CSS만 확대 금지**: label-engine의 폭/높이/CJK/packing 연동, pan/zoom/LOD/기존 시간축 불변 |
| **UI-03 · 시공간 모바일 최초 진입** | 390px 초기 화면에서 빈 격자만 보여 인물 발견·시작 행동이 어려운 상황 | 현재 viewport에 인물이 없으면 명확한 안내와 실제 Person 검색/해당 시대 이동 제공. 초기 카메라·지역 비율·historical Y를 역사 데이터 편의로 임의 이동시키지 않고 기존 경로를 재사용 |
| **UI-03 · 큰 확대/희박 권역** | 1500% 등에서 넓은 빈 영역과 맥락 상실; 적은 라벨 자체를 역사 누락으로 오인할 위험 | 현재 연도·권역·확대 수준/원래 시점/최근 인물로 돌아갈 수 있는 탐색 통제와 공간 맥락; historical 위치 왜곡/가짜 인물 금지 |
| **UI-03/06 · Inspector/Meanwhile/도구판** | 8~11px 레이블·작은 버튼·빈 Inspector·미니맵이 실제 탐험보다 두드러지거나 정보량이 불균형 | 선택 전후 핵심 정보 우선, 연도 입력/검색/필터/24+ 공개 및 Person vs Activity 분모 정확, 터치·키보드·복귀 검증 |
| **UI-07 · 2인 비교** | 모바일 주의문/반복 제목이 비교한 두 사람·기간·근거를 늦게 보이게 하는지 | 기존 진짜 Activity/Source/History 구현 유지. **#2760 결과 scroll/focus는 새 실브라우저 수용 전 OPEN**. 390/PC에서 두 인물·기간·근거 발견/닫기·Back/Forward 검사 |
| **UI-04 · 대시보드** | 과밀 KPI·보조 캡션(소스 일부 6~10px)과 실제 탐험 시작점이 불명확할 가능성 | **현행 실화면 증거 미확보**: 실제 렌더링·숫자·레이블/대비·첫 행동 확인 후 결함만 변경. 상태용 운영 대시보드를 역사 콘텐츠와 혼동하지 않음 |
| **UI-04/05 · 등록검토/Admin** | 표 헤더/상태·필터/행 라벨 일부 9~10px; 모바일 정밀 조작·오류·권한 상태 | **현행 실화면 증거 미확보**: 권한 내 중요한 상태/원시 UUID/근거는 유지, 관리자 중요 판정과 조작 readable, 유출 없음 |
| **UI-04 · 앱 쉘·전역 내비게이션** | 실제 탐험 메뉴와 운영/준비 중 정보의 우선순위, 모바일 앱바·메뉴에서 흐름·상태가 불명확함 | 인물/시공간/정치체 간 위치·복귀·현재 상태 인지, 준비 중 기능은 정직히 표시; 삭제/가짜 페이지 금지 |
| **UI-04/05 · 전역 CSS 일관성** | 다층 스타일 소유권·중복 @media/!important가 화면·해상도마다 예상 외 최종 스타일을 만듦 | 실제 computed winning rule로 owner 확인 → 국소 수정 또는 **검증된 중복만** 감산. 새 !important 덮어쓰기 파일 계속 쌓기 금지 |
| **UI-04/05 · 접근성/정보 완전성** | 읽어야 할 글씨·터치·Tab focus·언어/미상·오류·Source 패널, 200/400% 확대의 실제 수용이 불충분 | 대표 실제 사용자 여정/다국어 긴 이름/키보드/확대 확인. Source/period certainty/Role/Relation 누락 0, 허가된 Admin만 노출 |
| **전 공통 · 성능/탐색 지속성** | 장식/재렌더로 탭 전환·카메라·검색/비교 상태·브라우저 History가 사라지면 개선 실패 | 실제 같은 화면·동일 자료 전후 비교; 느려짐/Origin 과다 호출 방지, 기존 자동 회귀 PASS는 필요조건일 뿐 사람이 읽는 품질 증거가 아님 |

### C. 실행 순서와 다음 정확한 미완료

1. **먼저 이미 병합한 작업을 완료 판정:** #2756 최신 모바일 2단 가독성, #2762 무초상 상세, #2760 비교 결과 scroll/focus, #2761 deep History에 대해 **동일 현재 배포 SHA** PC/390px(필요시 600/768) 실제 화면·동작을 수용. 이전 SHA의 Chrome PASS를 새 변경의 PASS로 승격하지 않는다.
2. **그 다음 값 높은 미해결 UI-01/03:** PC·모바일 이름과 역사 사실을 '읽는 것' 자체, 시공간 최초 인물 발견·라벨 CSS+충돌 엔진을 가독성 검증과 함께 구현. 브라우저에서 깨지는 증상과 source owner가 확인된 부분만 변경한다.
3. **가시적 정보 발견성 확대:** 정치체 첫 화면, Person 상세, 시공간 도구/비교, 공통 메뉴/필터, 대시보드·등록검토(Admin)까지 **동일한 잣대**로 실제 렌더링을 확보하고 우선순위를 판별. 검증이 없는 화면의 'FAIL' 확정·미리 CSS 증설 금지.
4. **공통 회귀·마무리:** 범위 390/600/768/1440/1600px, 브라우저 200/400% 확대(해당 WCAG 예외는 정당화), 긴 인명/다중 Activity/BCE·CE/uncertain/ongoing/Source/선택·상세·복귀. 직접 측정한 대비/실제 터치/겹침/가로 넘침, 정확한 인물·Activity·Source 수를 기록. 통과하면 불필요한 문서·새 기능·CSS 증설 없이 종결.
5. **완료 증거:** `CODE_CHANGED → FOCUSED_TEST_PASS → EXACT_HEAD_CI_PASS → MERGED → PRODUCTION_ASSET_HTTP_VERIFIED → BROWSER_ACCEPTED → USER_VISUAL_APPROVED` 별도 상태로 기록. 코드 없이 계획만 저장한 단계는 `PLAN_RECORDED`이며 UI 완료가 아니다.

**총괄/매니저 적용:** 기존 하루 8회 총괄과 [UI 매니저](UI_MANAGER_INTEGRATED_EXECUTION.md)는 새 예약 없이 이 절과 현행 #1896 체크포인트를 통해 '전 화면 판독성·정보 발견성·실사용'을 평가한다. 매 회차 **추가 계획보다 실제 미완료 화면의 소스 수정·검증·가능한 Production 수용**을 우선하며 해당 작업자와 충돌하는 파일은 기존 PR을 재사용한다. P14/대량 초상/새 스키마·유료 도구는 계속 보류.

## 최종 목표
**연구 기반 전체 화면 개선·검증 실행표:** [ATLAS_UI_EVIDENCE_BASED_MASTERPLAN_20261119.md](ATLAS_UI_EVIDENCE_BASED_MASTERPLAN_20261119.md). W3C/NN-g/정보시각화/디자인 시스템/성능 등 외부 연구를 ATLAS의 승인된 UI-01~07에 연결한 후속 구현 및 PC·모바일 수용 기준이다. 이 문서는 새 독립 백로그나 보류된 기능의 자동 재승인이 아니며, 본 파일의 최신 사용자 승인·실제 소스/런타임 권위가 우선한다.


실제 ATLAS의 역사 데이터, 연대·정치체·출처와 시공간 좌표를 손상하지 않으면서 기존 사이트를 아름답고 정확하며 사용하기 쉬운 **기념비적 역사 아틀라스**로 고급화한다. 설계 명칭은 확정된 **Monumental Chronographic Modernism**. Graphite/Champagne, 정밀 계측기의 눈금·재질감, 역사적 기록의 장엄함, 8개 Person 대표분야의 의미색을 재사용한다.

**이제 새 디자인 연구나 별도 목업이 먼저가 아니다. 실제 `main`의 구현 코드를 수정하고 기존 화면과 비교한다.** 과거 제안된 개별 장식 40개, 강제 시대 아이콘/프레임, 미승인 세부 디자인은 모두 자동 개발 의무가 아니다. 메인 Person 표는 표로 유지하며 초상 중심 카드 UI로 바꾸지 않는다.

## 실행 우선순위 / 인수 기준

### UI-01 — 인물 메인 표 (최우선·즉시 착수 후보)

- 실제 화면과 계산된 CSS, 현재 렌더러를 짧게 대조해 중복 스타일/우선순위 충돌의 **실재 증상**을 확인한다. 소스의 오래된 CSS 조각만 보고 결함을 단정하지 않는다.
- 타이포그래피, 연대 구획, 정보 위계, 인물 행과 선택·hover, 분야색, 명판/분할선, 밀도·여백을 기존 시각 기준으로 고급화한다.
- 기존 표 레이아웃, 열·행, 검색·필터·정렬, 장문 이름, 반응형, 역사적 연대·확실성은 보존한다.
- 대표 변경 대상은 `atlas-person-monumental-register.css`, `atlas-ui-visual-foundation.css`, `atlas-person-compact-shell.css`, `atlas-person-desktop-domain-wash.css` 등 **실제 소유권을 검증한 파일만**이다.

**완료:** 실제 소스 반영 → 집중 회귀 검사 PASS → PR 병합 → Production 동일 자산/버전 확인 → PC·모바일 인물표를 열어 전후 시각/핵심 동작 수용. CI/병합만 성공한 경우 제품 완료가 아니다.

### UI-02 — 인물 상세 및 정치체 상세

- 이미 존재하는 상세 UI의 정보 위계와 시각언어를 통일한다.
- Main에서 현재 지원되는 한국어/영어 이름, 역사성, Activity의 Relation·Role·Period Basis, 월·일 및 uncertainty/calendar, 관련 정치체와 근거/Source를 인간이 읽기 쉽게 표시한다.
- 역사적 정보가 숨겨지거나 확정/추정이 뒤섞이지 않도록 `UI_INFORMATION_COVERAGE.md`의 **현행 계약**을 따른다. Admin의 원시 ID·출처도 보존한다.
- 기존 등록 초상만 사용하며 미등록 인물의 얼굴을 새로 만들지 않는다.

**완료:** 실제 인물·정치체의 대표 사례 및 관련 근거가 정확히 보이고 반응형으로 기능한다.

### UI-03 — 시공간 인물도 비파괴적 시각 완성

- continuous world, stable world X, historical Y 고정, 500% 기본/최소, X/Y 통합 카메라, semantic LOD, 지역 비율·밀집 영역 충돌 회피, 선택·검색·탐색 로직을 보존한다.
- 확인된 문제에 한해 시간축/눈금, 경계, 라벨 대비, 선택 표식, 미니맵, 정밀한 재질/선 표현만 수정한다.
- 단순 장식 때문에 X·Y나 라벨 좌표를 바꾸거나 시공간 엔진을 재작성하지 않는다.

**완료:** 실제 시공간 동작과 확대·축소 회귀가 없으며 시각 개선을 브라우저에서 검증.

### UI-04 — 쉘·모바일·접근성 마감

- 대시보드, 사이드 내비게이션, 모바일 앱바, 필터, 패널, 로딩·빈 상태·오류를 동일 디자인 시스템으로 정돈한다.
- 측정한 문제만 수정하고 대표 뷰포트(필요한 경우 390/600/768/1440/1600px), 키보드 focus, reduced-motion을 확인한다.

**완료:** 주요 화면의 시각 일관성과 핵심 기능, 모바일·접근성 검증.

### UI-05 — 정보 완전성 및 최종 수용

- #1896과 `UI_INFORMATION_COVERAGE.md`를 **최신 main + 실제 Runtime** 기준으로 점검한다.
- `DONE / PARTIAL / MISSING / STALE_REQUIREMENT / INTENTIONALLY_NOT_EXPOSED`로 분류; 실제 현행 필수 누락만 수정한다.
- 운영자 전용 정보와 비밀값은 Main에 노출하지 않고, 아직 없는 백엔드 기능/데이터를 만들어낸 것처럼 렌더링하지 않는다.
- 제품 전체의 Production 실화면 및 데이터 정합성을 수용하고 승인 대기·PARKED를 구별한다.

**완료:** 현재 승인된 범위의 누락·회귀가 해소되고 사용자에게 실제 정상 화면이 보인다.

## 개발 단위 표준 흐름

**실제 작업지시·파일 소유권·우선순위·테스트·수용의 상세 실행계획:** [ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md](ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md). 본 v1.1의 승인된 UI-01~07을 작업 패키지(QA/REG/DETAIL/MEAN/ROUTE/COMP/SHELL/I18N/ADMIN/A11Y/PERF)로 분해한 종속 실행표다. 실행 중인 기존 PR을 먼저 종결하고, 완료/보류 항목을 재구현하지 않는다. 이 문서의 계획 저장은 새 기능의 개발·Production 수용을 뜻하지 않는다.


```text
정확한 화면/현재 미완료 PR 확인(짧게)
→ 실제 기존 소스 수정
→ 영향 범위 집중 테스트 / 필요한 브라우저 비교
→ 기존 관련 PR 재사용 또는 소규모 신규 PR
→ CI/동시 수정·권한 검증
→ 안전하고 허용된 범위에서 병합
→ Production 배포 자산/SHA 및 HTTP 정상 확인
→ 변경된 PC·모바일 실화면 수용
→ #1896 checkpoint 기록 → 다음 미완료 화면
```

**상태는 반드시 분리:** `CODE CHANGED`, `CI PASS`, `MERGED`, `PRODUCTION LIVE`, `VISUALLY ACCEPTED`. 마지막 상태 없이 **UI 완료**라고 하지 않는다. Production 접근 장애 시 비차단 오프라인 작업을 이어 가되 `BLOCKED - PROD NOT LIVE`로 표시한다.

## UI 매니저 — 전 UI 계획 통합 관리 및 총괄 감독

**매니저의 공식 운영계약:** [UI_MANAGER_INTEGRATED_EXECUTION.md](UI_MANAGER_INTEGRATED_EXECUTION.md). 총괄은 매 실행에서 기존 본 계획 UI-01~05와 새로 승인된 UI-06A/B·UI-07, Phase II/III 디자인/사용자 결정, 색상·서체, 시공간, 한국어 전면화, 정보 완전성·Admin, 모바일/접근성, 실제 PC/모바일 Production 수용 상태를 하나의 현행 트랙 관제표로 확인하고 빠진 기획·충돌·미승인·이미 완료된 항목을 판별한다. 매번 수십 개의 과거 원문을 재독하지 않고 매니저 인덱스와 새로 바뀐 원본만 다시 확인한다. UI-05 1차 수용은 UI-06/07 완료를 뜻하지 않는다.

총괄은 UI 매니저가 적절한 실소스 개발을 실행/분배했는지, 리뷰/CI/병합/실제 Production/PC·모바일 기능 검증이 어디까지 되었는지, 구체적 사용자 결과와 다음 미완료가 무엇인지 **매 회차 감사**한다. 별도 스케줄이나 비용·하위 AI가 자동으로 만들어졌다고 가정하지 않으며, 지원 도구가 없으면 매니저 역할을 직접 수행한다. 승인되지 않은 장식·자료·P14를 자동 실행 과제로 만들지 않는다.

## 총괄 오케스트레이터 운영

새 예약을 만들지 않고 **기존 ATLAS 프로젝트 총괄(하루 8회)**이 이 계획을 정식 개발 트랙으로 관리한다.

1. 각 실행에서 실제 현재 GitHub PR/Issue 및 #1896, 본 계획의 최상위 **미완료 화면**을 짧게 확인한다. 완료된 PR·오래된 감사·중복 조사 재실행 금지.
2. 전역 P0 운영안정·보안과 승인된 기존 PR의 안전한 종료를 우선하되 **UI의 실화면 개선을 독립된 지속 과제로 선정**한다. UI가 다른 분야가 끝날 때까지 대기하는 전역 게이트를 만들지 않는다.
3. UI 작업은 막연한 CSS 감사·계획 갱신으로 끝내지 말고 **적어도 한 화면의 실소스 변경·테스트·가능한 통합/배포**를 목표로 진행한다. 동일 파일/PR에서 다른 worker가 작업 중이면 그 아티팩트를 재사용하거나 충돌 없는 다른 화면을 선택한다.
4. 한 회차가 끝날 때 UI-xx / 실제 사용자 결과 / 파일·PR·commit / CI / merge / Production / 시각 확인 / 다음 정확한 미완료를 간략히 기록한다.
5. 문서·이슈·PR의 개수가 아니라 **Production의 사용자 가시적 완성 화면과 실제 미완료 감소**를 성과로 집계한다.

## 비범위 및 안전

- 신규 프런트엔드 프레임워크로 전면 재작성, 불필요한 전체 repo 감사, 이미 작동하는 화면 재구현, 과거 디자인 문서 재논쟁 금지.
- P14 Territory/Geometry(별도 PARKED), 대량 AI 초상 생성, 승인 없는 데이터 삭제/퇴역·정치체 identity 변경, 운영 DB 모델 변경은 포함하지 않는다.
- `WORK_EXECUTION.md`의 canonical writer·승인·fail-closed·CI 규칙을 준수한다. Vercel Hobby 리소스 보호: Vercel Sandbox/추가 유료 API/과금 전환/불필요한 대량 Production 조회·402 재시도 금지.
- 직접적인 shared-resource 충돌만 자원 범위로 조정한다. CORE·인물 데이터 등록·정치체 작업은 UI 때문에 통째로 중단하지 않는다.

**기록 형식:** `UI-xx | 화면 | 코드/PR | CI | 병합 | Production 자산/SHA | 실화면(PC/모바일) | 다음 미완료`.

**현재 완료 수준:** 본 계획의 저장은 UI 소스 변경·병합·Production 수용을 뜻하지 않는다. **첫 구현 타깃은 UI-01 인물 메인 표**이다.


---

# 표 중심 단계 보완: 가독성·시공간 조망·역사탐험 실행계약 (2026-11-19 승인)

## 0. 목적과 범위

**완료상태:** 이 절의 저장은 기획 승인·개발계획 반영이며 코드 구현, Production 릴리스, 사용자 실화면 수용을 의미하지 않는다.

**제품 목표:** 지금의 표 중심 ATLAS를 시간·지역·인물·정치체 관계를 스스로 탐험할 수 있는 완성형 역사 인터페이스로 만든다. 핵심 가치 순서는 (1) 세계사 전체 조망, (2) 인명·연대·지역의 식별성, (3) 선택 후 세부 기록, (4) 동시대의 다른 지역으로 확장되는 탐험 흐름이다.

**기존 자산 재사용:** 시대별 Person 명부·검색·정렬·필터, Person·Polity 상세, Spacetime의 연속 공간 X/시간 Y, 500% 기본 줌/통합 카메라, virtualized rendering, label collision/LOD, minimap, Meanwhile 동시대 집계와 검토된 공간 배치를 재사용한다. 새 프런트 프레임워크, 독립 시연 사이트, 또 다른 인물명부/연대표 구현은 금지한다.

**변경하지 않는 의미 계약:** DB/API 권위, Person/Activity/Polity UUID, canonical data, 정확한 Activity 기간·calendar·certainty·Source·unresolved 상태, 8개 분야 의미색과 권력 분야 의미는 보존한다. 출생·사망연도와 Activity 연도를 혼동하지 않는다. 부정확한 가상 사건·지리·역사적 접촉 관계를 생성하지 않는다. P14 Territory/Geometry는 PARKED_BY_USER/DO_NOT_AUTO_RESUME 그대로이고 별도 사용자 재개 전 착수 금지.

## 1. 일감 분해와 확정 우선순위

| ID | 사용자에게 보이는 결과 | 작업 대상 | 선행·승인 상태 |
| --- | --- | --- | --- |
| **UI-01A** | 인물명·시대·활동 기간이 한눈에 들어오는 명부 | 표형 레지스터 CSS, 시대 내비게이션 | 최우선: 기존 UI-01 세부단위 |
| **UI-01B** | 다중 Activity가 있어도 과밀하지 않고 모두 접근 가능 | 명부 renderer·행 상세/밀도 | UI-01A 이후 실제 과밀 확인 시만 |
| **UI-02A** | 인물/정치체 상세의 제목·활동·출처가 명확한 정보 위계 | Person Main, Chronicle Detail, Polity Dossier | 기존 UI-02 세부단위 |
| **UI-03A** | 연도/세계 권역/선택 인물의 가독성 높은 시공간표 | Spacetime canvas+instrument stylesheet | 기존 UI-03 세부단위 |
| **UI-03B** | LOD에서 중요 인물이 겹치거나 사라지는 문제 개선 | Spacetime label/LOD owner | UI-03A 후 실제 collision 관찰 시 |
| **UI-04** | 탐험 중심 진입·메뉴와 안정적인 모바일·접근성 | Shell/nav/mobile 스타일 | 기존 UI-04 |
| **UI-05** | UI-01~04 및 최신 정보완전성의 1차 실화면 수용 | 현행 #1896 + 정보완전성 계약 | 기존 UI-05; 확장기능 완료와 구분 |
| **UI-06A** | 특정 연도 동시대의 모든 해당 결과에 접근 | Meanwhile + Spacetime view | 신규 승인, UI-03 접점 안정 후 |
| **UI-06B** | Person→Spacetime→동시대→다른 Person→원래 위치 복귀 | Nav/route/Person/Spacetime state | 신규 승인, UI-06A와 연결 |
| **UI-07** | 두 인물의 실제 Activity 기간/정치체 나란히 비교 | Person read + 경량 compare view | 신규 승인, UI-06B 상태계약 재사용 |

**기존 UI-01→02→03→04→05의 권한과 순서를 무단 변경하지 않는다.** UI-06~07은 계획상 신규 확장 기능으로 추가하며 다른 트랙의 기존 완료/작업 중 PR을 중복 재작성하지 않는다. 독립 준비는 병렬 가능하나 정확히 충돌하는 파일·리소스만 조정한다.

## 2. UI-01A — 표형 인물 명부 재정돈

**현재 증거:** atlas-person-monumental-register.css와 atlas-person-table-view.css에서 기본 이름 외의 일부 보조·활동 텍스트가 약 8~10px, 여러 Activity가 단일 행에 표시된다. 현행 필터/시대 구획은 이미 있으므로 재구현하지 않는다.

1. 최신 Production에서 허용되는 한 번의 실제 화면 확인 또는 동일 JS/CSS 빌드 렌더링으로 390/768/1440px 기준선 확보. 장문 한국어·영어 이름, 1 Activity, 여러 Activity, 선택·검색·정렬·필터·시대 구획을 대표 사례로 기록한다.
2. 시선 우선순위: **인물명 > 대표 Activity 기간/정치체 > Relation·Role > 상태/근거/관리 메타**. 이름은 표의 가장 중요한 앵커로 강조, 연대는 tabular numerals 정렬. 색은 의미색·선택 강조에 제한적으로 사용하고 장식은 정보에 방해되지 않게 한다.
3. 표/시대 열/인물 열/활동 열의 기능적 구조는 보존하면서 그리드 폭, 글자 간격, 구분선, padding, hover·선택·focus와 sticky 오프셋을 조정한다. 신규 카드 그리드·메인 초상 도입 금지.
4. 글자 크기 초기 목표: 이름 14~16px, 읽어야 할 보조 사실 12~13px; 장식성 보조 눈금은 예외. 고대비/명도 확보, 일반 텍스트 대비 WCAG AA 4.5:1 이상을 목표로 실제 측정한다.
5. 다중 Activity가 실제로 읽기 어려울 때만 후속 UI-01B에서 **기본 요약 + 전체 Activity 펼치기 / 밀도 선택**을 비교한다. 접힘이 정보 접근성이나 검색을 악화시키면 폐기한다. 활동 건수, 모든 관계/기간/출처 접근은 불변.

**인수:** 기존 Person 행·Activity 건수·정렬/검색/필터·시대 이동이 동일한 결과를 내고, 전후 캡처에서 명확한 읽기 개선을 확인. 모바일 가로 overflow 없음.

## 3. UI-02A — Person/Polity 상세에서 읽기 경험 완성

1. 큰 제목, 한국어/영어 명칭, 시대, 확인된 대표 분야, 활동 기록, Source를 순서대로 구조화. 출생/사망은 실제 개별 근거가 있을 때만 사용하며 first_activity_year를 생년으로 표시하지 않는다.
2. Activity별 Relation/Role/Period Basis/시작·끝/세부 정밀도·불확실성/Source를 유지. 근거는 필요시 접되 근거 접근 경로를 없애지 않는다.
3. 기존 초상은 상세에서만 보여주고 provenance/원본·재구성 구별을 보존. 정보 없는 초상·사건·계보를 창작하지 않는다.
4. Polity에서는 관측 Activity 연대와 정치체 실존기간을 혼동하지 않는다. Admin 편집·삭제 UI는 사용자의 역사 해설보다 앞에 나오지 않게 정리하면서 권한 기능 유지.
5. 관련 Person·Polity 이동 진입점을 마련하되 뒤로 가기/시공간 상태 보존의 최종 기능은 UI-06B에서 완성.

**인수:** 다중 활동, 불확실 기간, 근거 풍부/부재, 직접 링크 사례에 대한 원본 대조와 모바일/접근성 확인.

## 4. UI-03A/B — 시공간 인물도 가시성·정보 위계

**현재 증거:** atlas-person-spacetime-monumental-canvas.css의 헤더·지역·시간 보조 글자에 7~10px 구간이 있으며 검색·줌·상태 카운터·범례·Inspector가 함께 노출된다.

1. 연도/시대·대권역을 첫 수준, 인물명/활동 구간을 둘째, Role/근거를 Inspector로 분리. 기술적 디버그 카운터/정밀도는 접는 보조 계층으로 이동한다. 불확실성 경고는 완전히 숨기지 않는다.
2. 실제 계산 스타일에 따라 시간축 major/minor tick, 권역/하위권역, 인물명, 선택 rail/label의 크기·대비·굵기를 개선한다. 선택 표시는 색뿐 아니라 선/굵기/focus 등 복합 단서 제공.
3. **전체세계→시대→인물/Activity** 흐름으로 기존 LOD 가중치의 정보 위계를 조정. 무작정 글자 크기를 키워 겹침·미표시를 늘리지 않으며 필요 시 label collision/defer과 함께 테스트. 숨은 인물은 검색·포커스로 접근 가능해야 한다.
4. 통합 camera X/Y, temporal projection, stable X region ratio, spatial precision, 500% 기본/최소, minimap 및 virtualized layer는 그대로 유지.
5. 밀집 권역, 기간 불명, BCE·CE 경계, 텍스트 충돌, 확대/축소/초기화, 키보드 pan, touch/pinch, 검색 이동·카메라 anchor 회귀를 같은 대표 fixture로 확인한다.

**인수:** 주요 축 정보와 선택 인물의 눈에 띄는 개선이 확인되고 위치·연대 정확도/표시 대기 인물·렌더 성능 회귀 없음. 디자인 변경 때문에 historical coordinates를 수정하지 않는다.

## 5. UI-04/05 — 탐험 중심 쉘과 1차 제품 수용

- 완성된 **시공간 인물도 / 인물 명부 / 정치체**를 일반 사용자 주요 탐험 동선으로 배치하고, 현재의 ATLAS 편집·대시보드·등록검토·관리자·미구현 사건/장소/지리형상 영역과 시각적으로 구별한다. 기존 관리자 접근/URL/Auth 동작 보존; 신규 인증 체계나 권한 정책 변경은 범위 밖.
- 일반 탐험 사용자는 첫 화면에서 어디서 시작할지 알 수 있어야 한다. 모든 메뉴를 한 단계에 같은 중요도로 놓지 않는다.
- CSS 파일을 또 쌓기보다 computed style을 기준으로 실제 마지막 스타일 owner를 수정하고 명확히 중복된 국소 선언을 정리한다.
- 폭 390/600/768/1440/1600px, 장문 이름, 필터, sticky, 터치 크기/keyboard focus/reduced-motion을 검증한다.
- UI-05에서는 기존 docs/ui/UI_INFORMATION_COVERAGE.md의 오래된 갭을 현재 main/API에 다시 대조하여 실재 부족만 보완. **UI-05의 완료는 UI-01~04의 시각·정보 수용**이며, 이후 UI-06/07의 탐험 기능 완료를 뜻하지 않는다.

## 6. UI-06A — 동시대 전체 결과 탐색

**현재 코드:** atlas-person-spacetime-meanwhile.js의 summarize()는 유효한 primary_segments 기반 동시점 Activity와 지역별 인원 집계를 계산. atlas-person-spacetime-view.js의 renderMeanwhile()는 entries.slice(0, 24)만 출력한다. 이는 **UI 표시의 첫 24개 제한**이지 전체 동시대 인물이 24명이라는 증거가 아니다.

1. 기존 summarize()의 person_ids/entries/region_counts 의미를 보존하면서 연도 직접 입력(검증 포함), 지역별/정치체별 탐색, 전체 결과 페이지/더 보기를 제공한다.
2. 전체 Activity 건수와 중복 없는 Person 건수를 분리 표기하며 필터 전후 분모를 혼동하지 않는다. 한 인물이 복수 Activity를 보유하더라도 인물수는 중복 계산하지 않는다.
3. 결과 모델은 **확정된 해당 시점 주 위치 Activity**를 다루므로 위치 미확정·연대 미확정/미등록 Person을 포함했다고 주장하지 않는다. unresolved 경로 접근 유지.
4. 같은 시점에 활동한 사람을 실제로 교류·전쟁·협력한 관계로 자동 서술하지 않는다.
5. 24개 초과, 빈 시점, 다중 Activity, 기원전 연도, 경계/지속 상태·모바일 테스트.

**인수:** 기존 24개 제한을 넘어 모델이 포함한 모든 해당 결과를 찾아갈 수 있고, 지역/정치체별 필터링·집계가 안정적으로 일치한다.

## 7. UI-06B — 연속 탐험 상태 복원

1. 기존 atlas-entity-route.js/hash와 atlas-main-authority-nav.js를 우선 재사용. 최소 상태는 현재 Person/Activity, 선택 년도·ordinal, 세계 화면 camera anchor/zoom, 검색/필터와 이전 도메인.
2. 인물 상세의 '해당 시기 세계에서 보기'에서 복수 Activity면 기준 활동을 사용자가 선택하게 한다. 확인된 연대가 없으면 시점 임의 추정 없이 안내.
3. 시공간→동시대 패널→다른 권역 인물→Person 상세→이전 시점으로 돌아가기를 구현. 브라우저 back/forward, 새로고침, 직접링크, 비동기 패널 로딩, 모바일 전환에서 상태/선택 일관성 검증.
4. 검색/필터 초기화·카메라 튐·이전 탐색 위치의 손실을 막되 별도 DB나 사용자 프로필 저장 기능을 추가하지 않는다.

**인수 시나리오:** '1592년 선택 → 동아시아 Person 상세 → 세계 동시대 보기 → 다른 지역 Person 상세 → 원래 연도와 카메라/검색 상태 복귀' 실데이터 시나리오. 대상 Person은 해당 연도에 실제 등록·배치되었는지 확인한다.

## 8. UI-07 — 두 인물의 활동기간·정치체 직접 비교

1. 명부·상세에서 두 Person을 선택해 나란히 비교. 이미 있는 Person reader/선택적 bounded detail 조회를 사용해 전체 테이블·신규 DB를 재로딩하지 않는다.
2. 항목: 이름/대표 분야, 실제 Activity 시작·종료, Polity/Relation/Role/Period Basis, 확인된 시간 교집합 및 원 Source 접근. 필요하면 모바일에서는 세로 스택으로 변환.
3. 두 사람의 생몰 기간과 실제 Activity 기간을 구별. 불확실·미상·근사·논쟁·ongoing·역법 차이는 정확한 교집합으로 단정하지 않는다. BCE/CE ordinal은 기존 temporal model로 처리.
4. 두 사람의 동시 활동을 실제 접촉/영향/동맹 관계로 해석하지 않는다. 역사적 우열·등급을 비교 결론으로 자동 생성하지 않는다.
5. 닫기·대상 교체·원래 목록/시공간 돌아가기를 제공한다. 원본에 없는 관계·Source·영토정보는 만들지 않는다.

**인수:** 일부 중복, 미중복, BCE/CE, 복수 Activity, 미상/근사 경계, 모바일 비교에서 기간·정치체·불확실성 오인 없이 탐색 가능.

## 9. 구현 단위/테스트/Release 체크포인트

| 산출 단위 | 최소 변경 후보 | 핵심 회귀 |
| --- | --- | --- |
| UI-01A/B | atlas-person-main.js, atlas-person-table-view.js/css, atlas-person-monumental-register.css, atlas-person-era-navigation.js | 동일 인물·Activity 수, 검색/정렬/필터, 시대 스크롤, 접근성 |
| UI-02A | atlas-person-main.js, atlas-person-chronicle-detail.css, atlas-polity-dossier-view.js | 정확한 근거, Activity 기간, 초상 provenance |
| UI-03A/B | atlas-person-spacetime-view.js, atlas-person-spacetime-monumental-canvas.css, atlas-person-spacetime-instrument-tools.css, atlas-person-spacetime-lod.js, 필요시 label engine | 카메라·시공간 좌표·레이블 collision, 대량 성능 |
| UI-04/05 | index.html, atlas-main-authority-nav.js, atlas-ui-mobile-v8.css, UI_INFORMATION_COVERAGE.md | 경로·실화면·모바일·admin 기능 회귀 |
| UI-06A/B | atlas-person-spacetime-meanwhile.js, atlas-person-spacetime-view.js, atlas-entity-route.js, atlas-main-authority-nav.js | 동시대 전체 접근, 집계, 뒤로/앞으로 상태 |
| UI-07 | Person reader + 필요시 소규모 comparison view/css | 겹치는 기간, 불확실성, 2인 선택, 모바일 |

- 실행: 현재 #1896 / GitHub open PR 확인 → 기존 원본 변경 → 관련 집중 tests → CI → 충돌 확인 및 main 통합 → Production 자산·버전 확인 → 실제 PC·모바일 화면에서 동작·가독성 수용 → #1896에 정확한 checkpoint.
- 단계별 상태는 PLANNED / CODE CHANGED / CI PASS / MERGED / PRODUCTION LIVE / VISUALLY ACCEPTED로 구분. **계획·CI·PR만으로 사용자 기능 완료라 부르지 않는다.**
- 기존 ATLAS 총괄(8회/일)은 #1896과 본 파일을 UI 트랙의 실행 원장으로 사용한다. 업무마다 고유한 시작 시점과 변경 파일/진행 PR을 확인하며 동일 UI 코드를 다른 worker가 이미 만지는 경우 충돌 리소스만 조정한다.
- Vercel Hobby 안전: Sandbox 금지, 402 재시도 금지, 불필요한 repeated Production read 금지, 신규 유료 도구 금지. 실제 접근이 막히면 코드/테스트/문서는 이어서 진행하되 PRODUCTION LIVE/수용 상태를 허위 기록하지 않는다.
- 사용자 승인 범위는 본 UI 제품화 계획이다. **영토/지도 P14, canonical DB 및 데이터 변경, 삭제·권한 변경·결제는 새 승인이 필요**하다.

**전체 표 중심 탐험 완료 조건:** UI-01~05의 인물명부/상세/시공간 가독성과 정보완전성, UI-06/07의 동시대·연속 탐험·2인 비교가 실제 데이터로 작동하고, PC/모바일·검색·줌·라우팅·연대/공간/출처 무결성이 Production에서 검증될 것.

**현행 실행 첫 번째 대상(2026-11-20 갱신):** #2756 UI-01 모바일 2단 사실표는 이미 MERGED이므로 재개발 금지. #2760 UI-07 완성 비교 결과 초점과 #2762 UI-02 모바일 무초상 정보 우선 수정은 CI·MERGE·Vercel READY까지 끝났으며 **실제 PC/390px 브라우저 수용이 미완료**다. 그 수용과 #2761 native History deep 여정 실제 실행을 우선하고, 새로운 결함만 소스에서 수정할 것. #1896 최신 상태가 이 기록보다 새로우면 우선 적용한다.
