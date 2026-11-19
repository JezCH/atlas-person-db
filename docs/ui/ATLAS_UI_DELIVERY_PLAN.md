# ATLAS UI 실전 고급화·역사탐험 개발계획 v1.1

> 확정: 2026-11-19 · 사용자 승인 / 실행 대상 · 저장소 `JezCH/atlas-person-db`
>
> **11월 19일 보완 승인:** 표 중심 단계 가독성/시각화와 역사탐험 UX 개발을 이 기존 계획에 구체화. UI-01~05 기존 실행 순서는 보존하고 UI-06~07을 후속 기능으로 추가한다. 아래 추가 실행 계약 참조.
>
> 총괄: 기존 [ATLAS 프로젝트 총괄] 예약 · UI 실행원장: [#1896](https://github.com/JezCH/atlas-person-db/issues/1896)
>
> 본 문서는 **실제 화면을 배포·수용하기 위한 개발 순서**이다. `docs/ui/UI_INFORMATION_COVERAGE.md`, `ATLAS_REQUIREMENTS.md`, `DATA_MODEL.md`, `WORK_EXECUTION.md`의 데이터·권한·운영 규칙을 대체하지 않는다.

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

**가장 먼저 실행할 정확한 일:** 현재 #1896 및 UI-01 관련 PR을 확인한 다음, 인물 명부의 실제 DOM·computed style을 기준으로 UI-01A의 글자/열/대비/행 선택 구조를 실소스에서 개선하고 테스트·배포까지 독립 종결할 것. 이미 진행 중인 UI-01 작업이 있다면 이를 재사용하고 새로운 계획서만 반복 생산하지 않을 것.
