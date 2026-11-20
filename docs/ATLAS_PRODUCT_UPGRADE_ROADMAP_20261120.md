# ATLAS 전 프로젝트 차세대 업그레이드 개발 로드맵

> **기록일:** 2026-11-20 KST  
> **상태:** USER-REQUESTED ROADMAP RECORDED — 기획 저장 완료 / 신규 기능의 자동 실행 승인은 아님  
> **범위:** Person · Polity · Place · Source · 역사적 관계 · 시공간 · 지도 · UI · 역사 초상 · AI · 데이터 등록 · 자동개발 · 성능/운영  
> **총괄 진입점:** [ATLAS_CURRENT_WORKSTREAMS.md](ATLAS_CURRENT_WORKSTREAMS.md)  
> **현행 UI 실행계획:** [ATLAS_UI_DELIVERY_PLAN.md](ui/ATLAS_UI_DELIVERY_PLAN.md) · [ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md](ui/ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md) · [UI #1896](https://github.com/JezCH/atlas-person-db/issues/1896)

## 0. 목적과 문서의 권한

ATLAS를 단순 세계사 인물 DB가 아니라 **인류 문명의 시간·공간·인물·정치체·사건·문화의 검증된 관계를 탐험하는 역사 지식 아틀라스**로 발전시킨다. 새 기능의 수가 아니라 **실서비스에서 완결된 역사 탐험 경험, 기록의 정확성, 운영 지속성**으로 성과를 평가한다.

이 문서는 2026-11-20 사용자 요청으로 **기존 구상 전체를 프로젝트 개발계획에 영속적으로 저장**하는 계획 문서다. **기획 저장은 신규 기능 개발·데이터 변경·사용자 승인·Production 수용과 별개다.** 구현 허가는 기존 승인된 정확한 범위(UI-01~07, 사용자 선택 등록 등)에 한한다. 신규 제품 기능, Event/Work/Institution 스키마, 역사 지도 P14, 대량 초상, 공개 API, 외부 과금은 별도 범위 결정/승인이 필요하다.

**규범 우선순위:** 사용자 최신 명시 지시 및 WORK_EXECUTION.md / ATLAS_REQUIREMENTS.md / ARCHITECTURE_INVARIANTS.md / DATA_MODEL.md / 개별 정식 원장 > 현행 UI 실행계획·사용자 승인 > 이 로드맵의 후보 제안. 이미 종결한 기능을 옛 문서로 다시 활성화하지 않으며, GitHub Issue나 이 문서를 canonical 역사 데이터 원본으로 취급하지 않는다.

**불변조건:** Source-backed history; Person/Polity identity 분리; Authoring → Compile → Runtime; AI non-authoritative reviewed proposals only; time certainty/calendar·historicity 구분; 시공간 stable world X / historical Y 불변·연속 세계·세계 권역 비율 고정·semantic LOD·X/Y 통합 카메라 보존; 분야색 8개 전역 의미 보존; 메인 Person 표는 초상 카드로 대체하지 않음; 사용자 승인 없는 파괴적 데이터 변경·P14 재개·유료 API/계정 업그레이드·Vercel Sandbox 사용 금지.

## 1. 2026-11-20 출발점 — 실제 상태를 재확인할 것

- **코어 기반:** 정규화 Person·Activity·Polity·Source, Authoring/Compile/Runtime 및 canonical writer 재사용. CORE 재개발 금지.
- **UI 이미 개발/병합:** 인물·정치체 상세 가독성, Meanwhile 전체 전개·권역/정치체 필터·연도 이동, Person↔Spacetime 탐색, 2인 Activity 비교·탐색 상태 복원 등의 최근 병합이 있음([#2738](https://github.com/JezCH/atlas-person-db/pull/2738), [#2747](https://github.com/JezCH/atlas-person-db/pull/2747), [#2748](https://github.com/JezCH/atlas-person-db/pull/2748), [#2753](https://github.com/JezCH/atlas-person-db/pull/2753)). **MERGED와 Production/BROWSER/USER 수용은 구별**하고 #1896에서 최신 점검한다.
- **정치체/Place/Source 선행 이슈:** [Polity #1895](https://github.com/JezCH/atlas-person-db/issues/1895), [Place #2476](https://github.com/JezCH/atlas-person-db/issues/2476), [Source #2478](https://github.com/JezCH/atlas-person-db/issues/2478). 2026-10-11 보호된 DB 감사에서 PlaceFunction live 0건 vs 이전 backfill 23건 기록 충돌, URL 공유 Source 83군/197UUID, live/retired 충돌 등은 **당시 증거**다. 최신 Production에서 해결 여부와 승인 경계를 확인하기 전 미완료 수치를 확정하지 않는다.
- **데이터 등록:** 사용자 승인된 코호트만 정해진 canonical 경로로 처리. 기존 [#1375](https://github.com/JezCH/atlas-person-db/issues/1375), [#2545](https://github.com/JezCH/atlas-person-db/issues/2545), [#2619](https://github.com/JezCH/atlas-person-db/issues/2619)를 최신 상태로 참조. 후보 대기열을 임의 등록하지 않는다.
- **비용/자동개발:** [#2499](https://github.com/JezCH/atlas-person-db/issues/2499)의 FOT 근본 원인 미확정. 기존 하루 8회 총괄 예약 재활용; 예약 실행됨 ≠ 실개발 완료. Work/GitHub/CI의 실제 권한과 출력만 근거로 삼는다.
- **P14 Territory/Geometry:** PARKED. 대량 초상화 생성 역시 자동 실행 범위 아님.


### 2026-11-20 확정 구현 체크포인트 — 최신 개발 결과와 남은 인수

| 구분 | 실제 반영된 결과 | 확인된 증거 | 남은 작업 |
| --- | --- | --- | --- |
| UI-01 모바일 인물표 | 3열 압축 대신 2단 역사 정보 정렬 · [#2756](https://github.com/JezCH/atlas-person-db/pull/2756) | **MERGED** `819dac467e6ed7379203fdc9883cd68d469c3b91` | 최신 버전의 390/600px 이름·Activity·연대 정렬, 다중 활동, 사용자 판독 수용 |
| UI-06B 경로 | Person→Spacetime 기존 UUID 이동 · [#2725](https://github.com/JezCH/atlas-person-db/pull/2725), native History 검증 보정 · [#2761](https://github.com/JezCH/atlas-person-db/pull/2761) | **둘 다 MERGED**; #2761 `37728737448d3e71e07b0bcc7cbcac41096c41b5` (**테스트 코드**, 신규 UX 구현 아님) | **실제 브라우저**에서 다른 Person 방문 후 Back/Forward/새로고침·Activity 출발 연도·검색·카메라 복원, 원래와 다른 Person 진입 증거 확인 |
| UI-07 비교 결과 발견 | 두 번째 Person 선택 시 새 비교 결과로 자동 스크롤 + 키보드 초점; History restore 때 무단 초점 이동 금지 · [#2760](https://github.com/JezCH/atlas-person-db/pull/2760) | **CI PASS** [#44668346374](https://github.com/JezCH/atlas-person-db/actions/runs/44668346374), **MERGED** `c0c438be908390353cb47d7146e3c451466e9b22`, **Vercel READY** `dpl_8u4mUvzUwMkZEaoqnPjcuCNdkcJg` exact SHA/공식 alias | PC/390px 비교 완성 직후 실제 scroll/focus; Back/Forward는 focus steal 없는지 **브라우저 수용 미확인** |
| UI-02 모바일 Person 상세 | **초상 미등록** 때 약 230×288px의 장식성 4:5 빈 프레임을 간결한 상태문으로 대체, 이름·연대·역사 탐색 버튼을 먼저 보여줌; 실제 등록 초상 유지 · [#2762](https://github.com/JezCH/atlas-person-db/pull/2762) | **CI PASS** [#44683878773](https://github.com/JezCH/atlas-person-db/actions/runs/44683878773), **MERGED** `c28559726c13bb171647cdfccbd38ee726463e5d`, **Vercel READY** `dpl_Fnv2vdfd2aNgxArpcaHB9jjSpAGP` exact SHA/공식 alias | 390/600px **실브라우저**에서 무초상/유초상 인물 비교, 첫 화면 정보 노출·가로 넘침·Source/Activity 보존 수용 |

**상태 구분:** #2760/#2762의 SOURCE/CI/MERGED/PRODUCTION_READY_EXACT_SHA는 확인했다. Production READY·alias는 HTTP 200 실제 본문 검사나 실브라우저 PC/모바일 수용과 **다르며, 이번 확인 시점 두 PR의 BROWSER_ACCEPTED / USER_VISUAL_APPROVED는 아직 미확인**이다. 이전 [#2749/#2750](https://github.com/JezCH/atlas-person-db/pull/2750)의 390px 모바일 비교 Chrome PASS는 **그 당시 SHA**의 증거이므로 신규 #2760 초점 UX 수용으로 재사용하지 않는다.

**다음 실행 우선순위(기존 UI #1896 범위):** ① 기존 exact-SHA Chromium/브라우저 수단으로 위 2건의 실제 화면 수용을 먼저 종결한다. ② 이미 병합된 #2761 deep History 검사기는 수동 Production 여정 실행·실제 결과가 남아 있어 별도 확인한다. ③ UI-01~07의 현재 미수용 화면만 증상별 수정하되 정상 부분·완료 코드(#2725/#2756/#2760/#2762)를 다시 구현하지 않는다. ④ UI 정보 완전성·Dashboard/Admin·A11Y는 기존 [UI 실행계획](ui/ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md)과 [#1896](https://github.com/JezCH/atlas-person-db/issues/1896)의 승인 범위 내에서 진행한다. 새 UI 주제/P14/대량 초상·스키마·과금은 별도 승인 대상이다.


## 1A. Production 차단 이후 전체 통합 실행계획 — 2026-11-20

> **성격:** 10월 Vercel 402 이후 밀린 개발, 복구 후 실제 완료, 남은 작업, 장기 구상을 **현재 기존 owner와 실행 계약**에 연결한 포트폴리오. 별도의 DB 원장/신규 예약이나 자동 발주 목록이 아니다. 매 회차 owner Issue·현행 main·실제 Production을 우선하며, 계획 저장은 신규 기능·데이터·삭제·과금·PARKED 해제 승인과 다르다.

### 1A-1. 복구 결과와 완료·미완료 구분

| 단계 | 확인된 결과 | 실행상 의미 |
| --- | --- | --- |
| 2026-10 Hobby 정지 | 402 / Fast Origin Transfer 10.19GB/10GB. Sandbox CPU 초과는 별도 경위 | 당시 79커밋 및 복구 PR 장부를 현재 미배포로 재실행하지 않는다 |
| 2026-11-16 #2629/#2630 | ignored build 누락 수정, 기존 6개 기능 패치 실서비스 출고/READY | 이미 출고한 동일 파일을 재병합·재배포하지 않는다 |
| 2026-11-17~19 | 사용자 승인된 일부 Person의 canonical commit·Compile·readback, 인물 탐험 UI-01~07 진전, #2699 Person deep-link 전체 목록 다운로드 제거 | 완료된 request_id와 사용자 기능을 다시 만들지 않는다 |
| 2026-11-20 #2776/#2781 | 시공간표 개선 MERGED·Production READY, [#2781 실Chrome 인수 PASS](https://github.com/JezCH/atlas-person-db/issues/1896#issuecomment-7037151233) | 보이는 rail/label 43/43, Place 20원본→14그룹/글로벌 겹침 0. **이름표 37개 경계 초과** 및 사용자 시각 수용은 별도 |
| #2783 | 선택 인물 label-rail connector 변경 PR OPEN; latest head/CI는 시작 시 재조회 | 병합/배포/Chrome 미완료를 PASS로 올리지 않음 |

### 1A-2. 12개 영역 통합 포트폴리오

| 우선순위·분야 | 구체적 다음 작업 | 공식 owner / 실제 종결 조건 |
| --- | --- | --- |
| **P0 ① 시공간** | #2783 현행 head와 충돌 점검→승인된 병합·배포·실Chrome. 이어 500% 이름표 43개 중 37개의 하위권역 경계 초과/connector 해석을 실제 측정한 조건에서 개선. 확대·모바일과 Inspector 검증 | [UI #1896](https://github.com/JezCH/atlas-person-db/issues/1896) · UI-03/VIS-02. 역사적 X/Y·권역비·LOD·Activity/Source 불변; 사용자 시각 승인 별도 |
| **P0 ② 전체 UI** | 기병합 #2756/#2760/#2761/#2762/#2774/#2777/#2778의 미수용 PC·390/600px 실제 여정만 확인. 명부/Detail/Polity 검색/비교/Dashboard/모바일/키보드/전역 CSS 결함만 수리 | [UI #1896](https://github.com/JezCH/atlas-person-db/issues/1896) · [VIS-00~07](ui/ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md). 같은 현재 SHA의 브라우저 결과·최종 사용자 수용 |
| **P0 ③ UI 정보 완전성** | Main/Runtime/Admin의 Person–Activity Relation·Role·기간 근거·uncertainty·Source 서지·Polity lifecycle·초상 provenance/authoring history 대조 | [UI #1896](https://github.com/JezCH/atlas-person-db/issues/1896) · [정보 노출 계약](ui/UI_INFORMATION_COVERAGE.md). DONE/PARTIAL/MISSING/STALE/INTENTIONALLY_NOT_EXPOSED 분류, 관리자 비밀 보존 |
| **P0 ④ Place·Function** | 과거 13 Polities/20 Places/27 Sources/23 Functions의 승인·Source·현재 정확한 DB 재고 재검토. 기존 assert_place/Function writer 재사용 | [Place #2476](https://github.com/JezCH/atlas-person-db/issues/2476). 과거 0 live PPF와 이후 공개 Place 검색 0은 당시 증거. 승인된 Source→Place→Function에만 canonical commit/Compile/readback |
| **P0 ⑤ Source** | Edward VIII 바하마·Charles I 스코틀랜드/아일랜드 왕위·Richard III 호국경의 Source/claim 손상 정정, 그 외 URL 공유 83군/197 UUID는 주장별 검토 | [Source #2478](https://github.com/JezCH/atlas-person-db/issues/2478). #2705는 재발 방지지 기존 오류 복구가 아님. 같은 URL만으로 merge/삭제 금지 |
| **P0/P1 ⑥ Polity** | 75개 seed의 마지막 확인 67 종결/8 검토를 최신 Registry로 재확인. 역사적 family/rupture 8건을 각각 판정. 일본 live 3개/Activity12 vs tombstone3 해결은 분리 | [Polity #1895](https://github.com/JezCH/atlas-person-db/issues/1895)·[일본 #2479](https://github.com/JezCH/atlas-person-db/issues/2479). #2547 DO NOT MERGE, tombstone 삭제/retirement 별도 승인 |
| **P0/P1 ⑦ Person 등록** | 선택 62등록+14대기(#2545), 작가60등록+15대기(#2619), YouTube 48선택(#2589), #2549의 94후보/125요청 초안, 러시아 내전 초안(#2550), Roy Bates(#2626) 등을 현재 Production UUID·별칭 기준으로 중복 대조 | [Apply #1375](https://github.com/JezCH/atlas-person-db/issues/1375)·[후보 #1374](https://github.com/JezCH/atlas-person-db/issues/1374). **숫자 합산 금지**. 대기 전용은 Person 신규 생성 금지. Authoring/Compile/Runtime 확인, #2570 pre-Production HOLD |
| **P1 ⑧ 레거시 인물 품질** | 실존/전설·비연대표·연대 불확실성·기등록 중복/오래된 Domain·Spatial·NamuWiki와 실제 잔여 정합성. 과거 제거 판정 33명은 정확한 현재 영향/승인 분리 | Person 원본 감사 + #1375. 삭제·퇴역은 사용자 별도 명확한 승인 없이 금지 |
| **P1 ⑨ Spatial** | 신규 Polity·Place와 실제 잔여의 placement/Source 및 정밀도 검토, 고정 수도 근거 없으면 reviewed_hold | #1895/#2476. 표시용 Place header와 역사적 PlaceFunction 분리, 완료된 옛 Spatial residual 전수 재실행 금지 |
| **P1 ⑩ 자동개발 총괄** | 기존 예약·Codex/GitHub 도구로 승인된 독립 작업의 실개발·검증·종결을 연속 처리. 이미 병합된 #2780/#2782 결함 패치 재시도 금지 | [총괄 #2627](https://github.com/JezCH/atlas-person-db/issues/2627)·[#2603](https://github.com/JezCH/atlas-person-db/issues/2603). 예약 completed ≠ 개발 완료; 실제 자동 병렬 직원 존재를 허위 주장 금지 |
| **P1/P2 ⑪ Production 안전·YouTube 은퇴** | Production READY 유지·Hobby quota 가드, YouTube #2592 코드 폐기 후 live 화면/API 및 남은 DB 자산 read-only 검증/승인 분리 | [비용 #2499](https://github.com/JezCH/atlas-person-db/issues/2499)·[은퇴 #2594](https://github.com/JezCH/atlas-person-db/issues/2594). FOT 과금경로 미확정; 사용자 지시에 따라 능동 원인 재조사는 우선 작업에서 제외. Sandbox/DB DROP 미승인 |
| **PARKED/제안 ⑫ 지도·초상·AI·차세대** | 지도 G1~G8(검증된 Place→수도→사료 기반 영토/시점비교), 고증 초상 dossier/복원, Event/Work/Institution 관계, World Moment·시점 비교·큐레이션·출처 기반 AI·다국어 | 본 문서 §3~4. **P14/대량 초상/새 스키마/유료 AI는 별도 승인 전 구현·DB 작업 금지** |

### 1A-3. 병렬 실행 순서와 의존성

1. **즉시 독립 실행:** UI-03 선택 connector·밀집 이름표, UI-01~07 미수용 여정, Source 오류 3사례 exact-before 준비, 사용자 선택 인물의 최신 기등록 대조, Polity 개별 family 검토. 서로 다른 담당자는 연구·코드·테스트를 병렬화하고 실제 같은 파일·UUID/Runtime writer에서만 짧게 충돌 조정한다.
2. **Place는 증거와 승인부터:** 역사적 23개 계획 행을 무조건 삽입하지 않는다. Source/Place/Polity exact identity와 사료·시기·승인이 맞는 항목만 기존 writer로 적용한다.
3. **Person 등록은 신규/기존/대기/HOLD 분리:** 기존 canonical committed/readback 13명 등 이미 끝난 immutable 요청을 replay하지 않는다. 초안 PR의 CI 성공은 DB 등록이 아니다.
4. **브라우저 수용과 성능:** 인물표→상세→시공간→Meanwhile→비교→History 원위치 여정과 390px·키보드를 대표 실제 데이터로 확인한다. 역사 이름표/활동선/Source가 사라지면 실패다.
5. **추가 승인 단계:** P14 영역, 대량 초상, 새로운 historical entity schema, 유료 API, 승인되지 않은 파괴적 DB 작업은 기존 활성 포트폴리오에서 독립적으로 보류한다. 다른 합법적인 작업을 기다리게 하지 않는다.

### 1A-4. 개별 작업의 완료 계약

매 회차 **owner·task_key·정확한 before-state·변경 자원·실제 source/DB write·focused CI·main SHA·Production 배포 자산 또는 committed Runtime·브라우저/DB readback·독립 사용자 성과·남은 승인/HOLD·다음 재개점**으로 종결을 판단한다. 문서 갱신/PR 생성/CI 요청/자동화 예약 완료만으로 성과를 계수하지 않는다. 같은 리소스가 바뀌면 그 부분만 preflight하고 전체 backlog를 다시 접지 않는다.

## 2. 우선순위와 진행 범위

| 등급 | 작업군 | 재사용/선행조건 | 종결 기준 | 실행 상태 |
| --- | --- | --- | --- | --- |
| P0 | UI-01~07 Production 체감/접근성 수용 | #1896, 기존 코드·테스트·현행 UI 계획 | 실제 PC·모바일 탐색 흐름/가독성 검증, 문제가 있으면 실소스 수정→CI→병합→Production→브라우저 수용 | **기존 승인 실행** |
| P0 | Polity identity·Place·Source 의미 오류 | #1895/#2476/#2478 및 canonical 사료 | 최신 정확한 before-state 기준 수정·Compile·Runtime/DB readback, 파괴적 작업 별도 승인 | **기존 원장에 따른 검토/승인** |
| P0 | Vercel Hobby 사용량·배포 안전 | #2499, quota guard, 기존 캐시/정적 자산 | 과금/전송 원인 증거와 재발 방지, 신규 과금 없음 | **기존 미완료 검토** |
| P0 | 사용자 선택 Person 등록 잔여 | #1375/#2545/#2619와 현재 DB | identity·Source·Domain·NamuWiki·temporal·필요한 Place 확인→Authoring→Compile→Runtime readback | **선택된 범위만** |
| P1 | World Moment 동시대 탐험 동선 정리 | 현재 Meanwhile·인물/정치체 필터·route | 연도→권역→인물→Source/비교→원래 시점 정확히 복귀 | **기존 승인 범위 내 개선 후보** |
| P1 | 시간 2시점 비교(Chronological Split View) | 현재 연도 필터·world X/Y·Runtime | 동일 지리 비율의 두 시점 독립 표시, 부정확한 변화 수치 없음 | **신규 제안/범위 결정 필요** |
| P1 | Civilization Collection/Curated History | 기존 Person/Activity/Polity·공유 URL | 실제 등록 사실만으로 큐레이션 경로와 원래 화면 복귀 | **신규 제안/범위 결정 필요** |
| P1 | Source/certainty 사용자 설명 개선 | 기존 canonical read·UI-02·UI-05 | 근거 주장별 출처, uncertain/approximate/unknown/ongoing의 이해 가능한 표현 | **기존 UI 승인과 겹치는 범위 우선** |
| P2 | Historical Connection/읽기용 관계 탐험 | 검증된 Relation, Source, Place | 직접 근거가 있는 관계만 노출, 동시대=인과 오류 방지 | **신규 제안/범위 결정 필요** |
| P2 | Event/Institution/Work/Technology 등의 객체 확장 | 기존 canonical authority·실제 활용 사례 | 스키마·writer·review·runtime·UI 각각 종료, 자동 대규모 스키마 도입 금지 | **별도 설계·승인** |
| P2 | 무과금 역사 검색/선택형 AI 해설 | Runtime 정확성·Source 클레임 | 규칙·인덱스 기반 기본 경로, AI는 비권위형 해설/제안만 | **별도 범위·비용 승인** |
| P2 | 다국어·교육·공유/인쇄·연구 기능 | 기존 URL·명칭/출처, 사용자 실제 사용성 | 검증된 데이터·명칭 보존·권한 분리 | **후보** |
| PARKED | 역사 지리/영토 지도 P14 | 검증된 Place/시기별 Source/Geometry | 별도 승인 후 장소점→시대별 중심지→검증된 경계·분쟁·영향권 | **자동 착수 금지** |
| PARKED | AI 역사 초상화 대량화 | 이순신 파일럿 헌장·Provenance·권리 검토 | 개인별 사료 dossier→복원 결정→검토→자산, 메인 표 초상 금지 | **자동 착수 금지** |

P0/P1/P2는 **상대적 제품 가치 및 의존성**이며 신규 제안의 실행 허가가 아니다. 범위를 좁혀 현재 승인 아래 독립적으로 가능한 수정은 진행하되, 새 기능 자체는 사용자 승인 후 하위 실행계획으로 승격한다.

## 3. 영역별 업그레이드 구상 — 누락 없이 보존

### A. 역사 지식 데이터
1. Polity identity·국호·연속성·분열/승계·역사적 designation·retirement/redirect 정합성 마감.
2. Place first-class / PolityPlaceFunction 수도·왕궁·행정/권력 중심, 시기·출처·확실성 검증.
3. Source URL 일치 ≠ Source/claim 동일성. 주장별 근거·상충 사료·provenance·변경 이력 명시.
4. 역사성(실존 가능성)과 개인 Timeline 가능성·연대 확실성을 별도 관리.
5. Event, Institution, Work, Movement, Technology, Law/Treaty 등을 **실제로 필요한 사례부터** 검토; 읽기용 연결 그래프를 DB 재구축 없이 점진 투영.
6. 시대·지역·분야별 실제 데이터 공백과 미상/자료 부재를 구별하고, 등록가치 평가와 기록 완전성을 혼합하지 않음.

**2026-11-20 UI-03 시공간표 개선 우선 실행:** 시공간표 글자 크기·비율·배치 불만은 기존 승인된 UI-03A/B·VIS-02의 실제 제품 품질 미완료다. [공식 상세 실행계획 §「2026-11-20 UI-03 시공간표 전면 품질 개선」](ui/ATLAS_UI_DEVELOPMENT_EXECUTION_PLAN.md)에 P0 실제 배포 화면 기준선 → P1 캔버스/패널 → P2 시간·지역축 → P3 Person 표시 이름 충돌 엔진 → P4 탐색/상세 → P5 실Chrome/Production 사용자 수용과 정확한 종료조건을 기록했다. 이후 [#2776](https://github.com/JezCH/atlas-person-db/pull/2776)은 MERGED·Production READY, [#2781](https://github.com/JezCH/atlas-person-db/pull/2781)은 exact-SHA 실Chrome PASS. 이름표 경계 초과·사용자 심미 수용은 별도 미완료다. **45개 동일폭 leaf / 9개 동일폭 macro 문서 충돌**은 좌표 무단변경 대신 A안(기존 역사적 세계·비율 보존)부터 확인하고 B안은 별도 사용자 선택 전 실행하지 않는다.


### B. 시공간 인물도와 역사 탐험
1. 기존 500% 중심 canvas, long-name packing, collision, semantic LOD, mini-map, Inspector의 **실제 판독·사용성** 개선. 밀집 때문에 historical Y 또는 권역 X 비율 변형 금지.
2. World Moment: 연도 직접 진입→동시대 주요 인물/Activity/Polity별 권역·분야 필터→상세·근거→탐험 상태 복귀.
3. 기존 2인 비교를 충실히 마감하고, 이후 두 시점 비교·역사적 변화를 시각적으로 읽는 split view 제안.
4. 같은 연도·지역이라고 개인 교류/영향/전쟁을 추정하지 않음. source-backed relation과 contemporaneous overlap을 분리.
5. unknown/disputed/approximate/calendar와 실제 관측기간을 색·마커·텍스트로 구별하고, 이미 없는 연대의 가짜 좌표 생성 금지.
6. 인물 활동 장소 이동은 검증된 Place가 있는 경우에만 제안.

### C. 지도/GIS (P14 승인 전 기획만)
1. G1 검증된 역사 장소점·지명/alias, G2 시대별 수도/중심지 변화.
2. G3 사료가 충분한 대표 Polity의 시기별 영토, G4 definite/uncertain_boundary/influence/contested/unknown 구분.
3. G5 변화 애니메이션, G6 정치체/시점 비교, G7 Person/Event 연동, G8 소장 고지도·현대 지형·연구 재구성 overlay.
4. World Historical Gazetteer·OpenHistoricalMap·PeriodO·IIIF 등은 참고 규격/연구자료 후보; 출처·라이선스·해당 주장 검증 전 authoritative import 금지.
5. 사료 기반 공간 사실과 화면상 label 위치를 분리.

### D. UI/디자인·큐레이션
1. 공식 기조 **Monumental Chronographic Modernism**; Graphite/Champagne, 계측기급 눈금, 역사 도록/명예의 전당 수준 정보 위계.
2. 표형 Person register 유지; 인명·연대·다중 Activity 가독성, 분야 8색과 선택/hover/focus 분리, 불필요한 장식으로 정보 가리지 않음.
3. 상세 Person/Polity에는 생애·Activity·Relation·Role·Period basis·Source·certainty, 사료와 메타정보를 정확히 노출; Admin 원시/권한 정보는 분리.
4. Curated History/Civilization Collection: 기존 검증된 인물·정치체·활동을 문화권·시대·주제별 탐험 경로로 묶기(새 역사 사실 창작 없음).
5. 북마크·재진입·공유 가능한 탐험 상태, 인쇄용 도록·장문 읽기 등 후속 후보.
6. 모바일, keyboard, focus visibility, reduced-motion, 색각 접근성과 실제 브라우저 수용.

### E. 역사 초상 자산 (개별 승인 및 대량 생성 보류)
1. 파일럿으로 확정한 우선순위 **고증·사료 정확성 → 개인 식별성 → 인간의 실재감 → 위엄 → 미적 완성도** 유지.
2. 인물별 Research Dossier, 실제 시각 자료 계보, 시대 복식/복원 결정, 사진/동시대 초상/AI 재구성 구분, 저작권/이용조건 관리.
3. 시대 프레임·분야 배경 등 공통 자산 규격 후보 재사용, 무근거 얼굴 사실화 금지. 메인 인물표에 초상 배치하지 않음.
4. 상세 이미지의 썸네일·고해상도 별도 캐시/지연 로딩 등 성능·비용 고려.

### F. AI 역사 연구/검색
1. 기본은 추가 토큰 호출 없이 이름·별칭·연대·관계·지역의 구조화 검색.
2. Source claim이 있는 사실에 한정하여 자연어 질의를 검색 조건으로 변환하고 인용 가능한 결과 반환.
3. Source 충돌/중복/미등록 후보·연대·지명 연구를 AI가 **검토 제안**할 수 있으나 canonical writer 직접 권한 없음.
4. AI 해설·다국어 제안은 별도 호출비용·성능·검증 경로가 승인된 경우만 선택적 제공. ChatGPT Plus를 API key로 전용 금지.

### G. 인물 등록 및 역사 콘텐츠
1. 기존 canonical coordinator를 재활용, identity/historicity/timeline/Source/Domain/NamuWiki/Polity/Place(해당 시)를 한 번의 심사로 정합화.
2. 개인별/배치별 승인 범위, 보류 후보, 중복/기등록, 출처 검증, Activity 경계 등을 구분.
3. 등록 완료는 Production authoritative write + 필요한 compile + 정확한 Runtime readback; Draft/CI를 등록 완료로 오인 금지.
4. 인물의 역사적 영향/대표성과 Source·필드 coverage 품질은 별개 지표로 관리.

### H. 자율개발 총괄
1. 기존 ATLAS 프로젝트 총괄 예약과 GitHub 워크플로 사용. 예약 또는 Issue 자체를 '실제 수행'으로 간주하지 않음.
2. 동적 현재 상태를 보고 실제 미완료와 blocked/parked/approval-gated를 분리; 낡은 현황 문서·superceded PR 반복 금지.
3. 독립 리소스 병렬 준비, 정확한 before-state 자원 충돌 시만 단기 preflight/commit/검증.
4. 수행 단계는 CODE_CHANGED / FOCUSED_TEST / EXACT_HEAD_CI / MERGED / PRODUCTION / BROWSER / USER_ACCEPTANCE 구별.
5. 측정: 실제 Production 기능 완성, 검증된 역사 데이터 correction, 사용자 개입 없는 합법적 종결 수, 재작업·도구·비용 대비 완료.
6. 새 에이전트 프레임워크·예약 증설·문서 인프라보다 현재 실제 기능 종결 우선.

### I. 성능/운영·안전
1. 실제 측정 후에만 virtualization/culling, 권역·시점별 projection, incremental compile, 검색 인덱스 최적화.
2. 정적 자산·캐시/압축·bounded data transfer와 이미지 lazy loading으로 Origin 비용 관리.
3. Vercel Hobby 무료 한도·CI 사용량·Supabase Free 안전 준수, Sandbox/402 반복 시도 금지.
4. 검증된 read-only 역사 데이터 내보내기(CSV/JSON 등)와 backup/replay/rollback은 후속 필요성 평가.
5. 보안·역사 데이터 무결성은 단축을 위해 제거하지 않음.

### J. 장기 플랫폼 확장
- 다국어 인물/정치체 이름 및 UI, 시대·문명별 디지털 역사 도록, 교육·연구 모드, 자료 원문과 번역/해석 비교, 탐험 경로 저장·공유.
- 외부 연구자 오류 제안/검토, 공개 읽기 API/정적 export는 권한·남용·저작권·비용 위험에 비례한 별도 승인 뒤 검토.

## 4. 구체적 제품 성장 경로

**Phase 1 — 현재 제품 마감 (기존 승인만):** UI-01~07 실제 수용, Polity/Place/Source P0, 사용자 승인 등록잔여, Hobby 비용 안전. **실제 완료**와 건수는 당일 원장에서 검증한다.

**Phase 2 — 역사 탐험 통합 (신규 범위 별도 선정):** World Moment로 기존 기능 연결, 두 시점 비교, Curated History 소규모 수직 슬라이스. 가짜 관계나 숫자 없이 실제 Runtime 기반 사용자 동선 검증.

**Phase 3 — 역사적 관계망 완성 (새 모델 승인 필요):** 기존 Relations의 read projection→검증된 Place 연결→필요성 입증된 Event/Work/Institution/관계 확대. 새 DB 엔진·대규모 migration은 기본 전제가 아님.

**Phase 4 — 통합 역사 아틀라스 (승인 전 착수 금지):** P14 지도(장소→시대별 지리→영토·불확실성)와 개별 역사 초상의 승인된 제작, 연구/교육·다국어 확장.

이 단계들은 일정/완성 퍼센트 약속이 아니다. 각 단계에서 **최종 사용자가 실제로 무엇을 할 수 있는지**로 우선순위를 결정한다.

## 5. 다음 실행 연결과 종료 조건

1. 자동 총괄은 이 로드맵을 **제안 저장소/우선순위 참고**로만 사용하고, 실제 실행 대상은 최신 사용자 승인·owner Issue·Production/PR current state에서 선택한다.
2. 먼저 기존 UI-01~07과 Polity/Place/Source/선택 등록의 실제 작업을 종결한다. World Moment는 이미 구현된 부분을 재작성하지 않고 **현재 사용 중 결함·동선 단절만** 수정한다.
3. 새 제안(Chronological Split View, Curated History, Event/Knowledge Graph, 선택형 AI)은 추가 승인받으면 기존 owner의 개발 실행계획에 작은 기능 단위/파일 소유권/검증기준을 연결한다. 이 문서를 자동으로 새로운 Issue/PR 발행 목록으로 해석하지 않는다.
4. 새 기능 하나의 완료: 실제 소스/Authoring 수정(해당 시) → 필요한 검증 → PR/보호된 writer → Runtime·Production 반영 → 대표 사용자의 실화면/사료 일치 검증. 단계별 기록과 미확인을 그대로 남긴다.
5. 이 문서를 갱신할 때 이미 완료된 작업의 과거 서술을 활성 frontier로 유지하지 않는다. 최신 상태의 원장은 **기존 각 owner**가 유지한다.

**핵심 제품 가설:** ATLAS의 가장 큰 다음 성과는 새로운 도구/장식/초상 개수가 아니라, 이미 수집한 역사 기록을 **연도·장소·정치체·인물·출처에 기반해 끊김 없이 발견·비교·추적할 수 있는 하나의 탐험 경험**으로 통합하는 데서 나온다.
