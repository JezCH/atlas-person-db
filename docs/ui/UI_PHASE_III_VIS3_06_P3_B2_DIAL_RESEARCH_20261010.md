# VIS3-06-P3 — B2 Precision Chronometer 비배포 실화면 디자인 비교 (2026-10-10)

> 단계: **P3 연구/검증 단위. UI 배포·사용자 미학 채택 아님.** 실제 GitHub Actions 검증 18/18 PASS(기하·조작 간섭), 최종 디자인/배포 승인은 사용자 검토 대기.

## 1. 프로젝트 전체 목표와 범위

Phase III의 핵심은 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**: 과장된 장식이나 일반 SaaS UI가 아니라, 사실에 근거한 역사 자료가 읽히고 탐색되면서 도록·고지도·관측기구의 조형적 완성도를 갖추도록 하는 것이다. 비주얼 아이디어 42종을 모두 적용하지 않으며, 한 화면의 대표 장식 0~1 + 보조 0~1, 역사적 상징 위조 0, 선택/기록 데이터보다 장식이 앞서지 않도록 한다.

[VIS3-06-P2 실인물 밀집 검증](UI_PHASE_III_VIS3_06_P2_POPULATED_ERA_20261010.md)에서 현재 Toolbar 상단의 44×25px 소형 황동 원호(B)는 실제 운영 1440px 전체 화면에서 조형적 존재감이 약했다. C는 더욱 약하다. 하지만 9지역·이름표·Inspector·카메라를 건드리지 않는 **외부 관측기구 도구판 프레임**이 실제로 배치 가능한지는 검증됐다.

이번 P3에서는 미학 보완이 필요한 부분 **한 곳만** 개발 이전 원본 SVG와 실제 Production DOM에서 비교한다. 9개 macroregion, 140px 축, 500~1500% X/Y 카메라·공통 압축 0.748, 8개 Person 의미색, 각 실제 연대/Activity, Person/Polity DB, P14 PARKED_BY_USER, VIS2-05 watermark REJECT/OFF는 모두 수정 금지.

## 2. 세 가지 대안 및 설계 이유

| 안 | 소재·위치 | 판단 목표 |
| --- | --- | --- |
| A / 현재 | 실제 Production 도구판의 기존 잉크색 2선과 줌 값 | 기준선 |
| B / 기존 | 폭 44px의 희미한 두 겹 반원호와 극소 세공선 | 기능상 안전하나 식별성이 약한 P2 결과의 비교용 |
| **B2 / 개선** | **가로 184px × 높이 32px의 관측기구 외부 도구판**. 이중 정밀 반원, 축척과 무관한 중앙 리벳, 좌우 양끝의 매우 가는 황동 2선, 작은 무의미 장식 마감. **SVG 원본으로 제작.** | 원본에 비해 디자인 존재감 확보하되, 세계·연도·인물 자료와 완전 분리하고 실제 버튼 겹침 0 확보 |

**의도적으로 배제한 것:** 허구의 국장/문장·컴퍼스 방위(N/E/S/W)·가짜 경위도·시간 측정 눈금·실제 연도처럼 보이는 수치·별자리 역사적 주장·인물표 내부 워터마크·전체 화면 대형 테두리. 중앙 리벳과 반원은 정보가 아니라 물리적 장비에 새겨진 장식 언어만 표현한다.

SVG 원본: [B2 장식 도면](../../experiments/vis3-06/b2-observatory-toolrail-plate.svg). 운영 배포 asset list/index.html/실제 CSS 어디에도 참조를 추가하지 않는다.

## 3. 실제 Production A/B/B2 비교 계약

검증기는 [실인물 검색/가시 연대 탐색 P2 검증](../../scripts/verify-vis3-06-dense-production-preview.mjs)을 재사용한 독립 [P3 검증기](../../scripts/verify-vis3-06-p3-b2-production-preview.mjs)다. GitHub Actions의 **실제 https://atlas-person-db.vercel.app/#atlas-spacetime** Chrome DOM에서 `a` 검색/인물 이동/필터 해제, 가장 많은 인물 이름표가 보이는 시공간 구간 이동, 클릭 Inspector 선택, 1440px의 실제 최대 1500% 카메라 검증을 수행한다.

테스트 상태: 390px 비선택·선택; 1000px 비선택; 1440px 비선택·선택·선택 후 1500% 확대 = **6개 장면 × A/B/B2 3개 = 18개 이미지/비교**가 목표.

각 장면의 동일 *Production DOM/데이터*에 브라우저 내 `style`을 일시적으로 추가하고 root `data-vis3-06-preview`만 변경한다. B2는 **실제 검색·줌·표시 기준 사이의 가용 공백** 중앙에 배치하며 900px 이하 또는 공백 부족 시 숨김, pointer-events:none. 버튼 위치/글자, real Person track 이름표 수·위치·기존 겹침·Inspector 선택/활동 정보, 9개 지역/연도 tick/Zoom 수치, 스크롤/카메라 좌표, 탭 가능 요소 수, 원본 문서 폭이 모두 A와 같아야 한다. 어떠한 실제 UI 파일·DB·API 데이터·인물 초상도 수정하지 않는다.

## 4. 검증 후 기록할 항목

- 실제 18케이스 PASS/FAIL 및 390/1000/1440 가시 Person 인원, Inspector activity, 1500% 탐색 결과
- B2가 실 1440px 전체 화면에서 조형적으로 B보다 얼마나 구별되는지 질적 비교(별도 사용자 디자인 승인 필요)
- 실제 overlay/button 간섭 면적 0, 이름표/권역/연도축 동일성 여부
- 원본 PNG+JSON 아티팩트 링크, 정확한 Git SHA, CI
- 실패하면 최소 변경 후 재검증 또는 NO-GO로 닫고 배포하지 않음

## 5. 승인 게이트와 다음 단위

이미 사용자에게 제공한 Dashboard 혼합 D의 **최종 Production 미학 승인 미완료**는 별도로 유지한다. 설계 연구의 진행은 최종 미학 승인이 아니며, 실화면에서 사용자가 B2를 보더라도 자동으로 실제 CSS 배포에 동의한 것은 아니다.

P3을 닫은 뒤 다음은 사용자 시각 검토용 **실화면 A/B2 시안 전달 및 구체적 미감 선택 확인**(B2가 합격한다는 보장 없음), 선택 전까지 실제 Phase III Spacetime UI 코드를 변경하지 않는다. 전체 VIS3-07~17 후속 순서는 수정하지 않는다.

## 6. 실제 Production Chrome 결과 · P3 최종 판정

- P3 독립 [Chrome 실행 #38032224738](https://github.com/JezCH/atlas-person-db/actions/runs/38032224738): **SUCCESS**. 6 장면 × 3안 A/B/B2 = **18개의 동일 실제 Production DOM 비교 및 원본 PNG 18장**. [원본 아티팩트 #11663090784](https://github.com/JezCH/atlas-person-db/actions/runs/38032224738/artifacts/11663090784). Branch head 최초 시험 `2d708b0e99ee23f68024edd62f033e10b5a802ad`. 전체 [ATLAS Integrity #38032224650](https://github.com/JezCH/atlas-person-db/actions/runs/38032224650) **SUCCESS**.
- 엄격한 수치: 모든 장면에서 **장식·조작부 겹침 0px², 역사축/9개 지역/인물 라벨·레일·Inspector/스크롤/카메라 변형 0, 신규 이름표 간 겹침 0, warning 0**. 실제 API Person 또는 Activity는 조작/변경하지 않았으며, 브라우저 내 비상호작용 CSS 배경만 추가했다.

| 실제 화면 | 가시 Person 이름표 | 가시 Person 레일 | 유효 Zoom | B2 표시 | 인물 선택 상태 |
| --- | ---: | ---: | --- | --- | --- |
| 390px 밀집, 비선택 | **69** | 542 | 500% | 숨김 | 미선택 |
| 390px 밀집, 선택 | **69** | 542 | 500% | 숨김 | 실제 선택/Inspector Activity 1 |
| 1000px 밀집, 비선택 | **117** | 운영 DOM 기준 수치 저장 | 500% | 표시 | 미선택 |
| 1440px 밀집, 비선택 | **195** | 472 | 500% | 표시 | 미선택 |
| 1440px 밀집, 선택 | **195** | 472 | 500% | 표시 | 실제 선택/Inspector Activity 1 |
| 1440px 선택, 최대 확대 | **28** | 54 | **1500%** | 표시 | 실제 선택/Inspector Activity 1 |

- 1440px B2 장식 실제 CSS bbox **[x=904, y=139, w=184, h=32]**. 구형 B 장식 bbox [974,135,44,25]. B2는 좌우 긴 이중 세공선과 중앙 반원·리벳이 하나의 얇은 *장치 명판*으로 읽히며, 기존 단독 반원보다 A/B/B2 구분이 확실하다. 독립 명판으로 읽히지 않는 매우 작은 C안은 이번 선택지에서 제외했다.
- **사람의 시각 판정(테스트 PASS와 구분):** 전체 1440px 스크린샷에서도 B2의 중앙 대칭 구조는 인식할 수 있고 지나치게 큰 헤더 장식과 달리 여백/정보 위계를 해치지 않는다. 다만 여전히 독립적인 비기능 장식이며 실제 역사 관측 값/방위처럼 읽혀서는 안 된다. 더 커지거나 실제 시공간표/연대축에 침범하면 탈락. **최종 미학 승인 전 운영 반영 NO-GO**.
- 390px에서는 장식을 숨겨 기존 탐색성을 보존한다. 768px은 P 단계에서 이미 초기 화면 장식 미표시/기하 동일성 검증 완료. 이번 P3의 실인물 밀집 비교는 390/1000/1440에 한정된다.
- 기술 미검증/남은 승인: 실제 브라우저 native zoom 125/150%, 키보드 Tab/focus-visible 일주, `표시 기준` 펼친 패널의 전체 상태, 국제화 장문 문자열, 전체 WCAG AA/성능, 최종 사용자 미감 선택 및 Dashboard VIS3-05R-E 미학 최종 승인. **기능·배치 적합성 PASS는 출시 동의가 아니다.**

**P3 결정:** A 현행은 그대로 Production 유지, B2는 사용자가 **별도 시각적으로 고를 수 있는 보존 가능한 비배포 후보 1종**으로 승격한다. 원본 [B2 editable vector](../../experiments/vis3-06/b2-observatory-toolrail-plate.svg)와 actual Production screenshot/JSON을 증거로 보존한다. B를 자동 폐기하거나 B2를 곧바로 운영 CSS에 붙이지 않는다.

**다음 정확한 재개점 `VIS3-06-R` (승인/사용자 검토 의존):** A 대비 B2 실제 운영 화면 비교 및 사용자의 최종 시각적 선택, 사용자 승인 시 별도 한정 UI 구현과 125/150% Native zoom/키보드/Inspector 열린 상태/성능 측정, 실제 Production 검증. Dashboard mixed-D 최종 미감 승인도 별도로 받는다. 승인 없이 VIS3-07~17 코드 변경을 개시하지 않는다.
