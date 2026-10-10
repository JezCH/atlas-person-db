# VIS3-06-P2 — 실제 인물이 표시되는 시공간표의 A/B/C 장식 검증 (2026-10-10)

> **상태: VIS3-06-P2 비배포 검증 완료.** [실제 Production Chrome #38030476127](https://github.com/JezCH/atlas-person-db/actions/runs/38030476127) **SUCCESS** (기존 P검사 18개 + P2 실제 인물 선택 비교 15개), [ATLAS Integrity #38030476121](https://github.com/JezCH/atlas-person-db/actions/runs/38030476121) **SUCCESS**. [실운영 PNG 33장+JSON 2개 / artifact #11661334379](https://github.com/JezCH/atlas-person-db/actions/runs/38030476127/artifacts/11661334379). 사용자 미학 승인·실제 CSS 배포는 별도 보류.
>
> 이 단위는 Phase III v2.0의 **비배포 비교/검증**이며 실제 CSS·운영 UI 수정, 사용자 미학 승인, VIS3-07 개발을 수행하지 않는다.

## 왜 이 단위가 필요한가

[VIS3-06-P](UI_PHASE_III_VIS3_06_P_REAL_DOM_PREFLIGHT_20261010.md)는 실제 Production DOM 18건에서 390/768/1000/1440/1600px, 기본 500% 및 최대 1500%, 9개 권역, 연대축, 모든 툴 버튼·가로 넘침의 동일성/간섭 0을 확인했다. 다만 최초 BC 3175 부근 카메라에는 `.spacetime-track-label` 0개가 표시되어 인물 라벨·인물 선택 시 도구판 간섭 여부까지 검증했다는 주장은 불가능했다.

Phase III 전체 목표는 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex** — 역사 기록의 사실성·읽기 쉬움·탐색 기능과 절제된 고지도·정밀 관측기구·도록 세공을 동시에 달성하는 것이다. 장식 후보 42개를 획일 적용하지 않으며, 8분야 의미색, 9지역, 140px 연도축, 500–1500% 통합 X/Y, 공통 압축 0.748, Person UUID/Polity·Activity 데이터, P14 PARKED_BY_USER, VIS2-05 watermark REJECT/OFF 모두 변경하지 않는다.

## 이번 작업의 코드·검증 경계

- 새 코드: `scripts/verify-vis3-06-dense-production-preview.mjs` — 기존 read-only Chrome CDP 및 실제 운영 DOM A/B/C 비교 함수를 재사용.
- 기존 비배포 전용 Actions workflow `.github/workflows/atlas-vis3-06-production-dom-preview.yml`에 P2 검사를 추가. **일반 Vercel 배포·운영 runtime CSS·JS·HTML/asset-loader·API/DB 파일은 건드리지 않는다.**
- 실제 Production에서 기존 운영 검증 방식대로 검색 `a`→ 첫 **실제 검색 결과 인물**을 클릭·카메라 초점→ 검색 필터 삭제→ 선택 해제.
- 실제 `.spacetime-scroll`을 횡·종 그리드로 탐색하여 **화면에 보이는** `.spacetime-track-label`이 있는 인물 밀집 구간을 찾고, 기준선을 390px/1440px 각각 고정. 390px에서는 인물 1명 이상, 1440px에서는 인물 3명 이상 없는 경우 **FAIL**로 처리.
- ① 비선택 인물 구간, ② 실제 인물 이름표 클릭 후 Inspector/선택 구간, ③ 데스크톱 실제 1500% 확대 및 선택 구간, 세 상태에서 A(현행)/B(소형 황동 이중 원호)/C(축소 원호) 비교.
- 각 A/B/C에 실제 표시 인물 수·선택 Inspector 활동 개수·현재 이름표 간 겹침(기존 값)을 기록. 기존 이름표끼리 겹침이 있을 경우 이를 장식 탓으로 돌리지 않고 **동일 DOM 전후의 신규 변화가 0인지** 비교.
- 툴바/검색/줌/표시 기준 바운딩박스, 스크롤과 화면 축, 연도 tick과 9지역, 가시 인물 이름표의 위치, 선택/Inspector 상태, 문서 폭, 가상화 라벨 수·겹침 수 모두 동일해야 하며, 그중 하나라도 달라지면 **FAIL**.
- Chrome 임시 `<style>` 가상요소는 `pointer-events:none`이며, 화면 폭 900px 이하에서는 원호 숨김. 사용자의 선택을 대신하지 않고 실제 앱 코드를 배포하지 않는다.

## 미학 판정 및 승인 유지

전 화면 1440px 기준으로 이전 B안 44×25px은 조작을 가리지 않지만 역사 관측기구의 시각적 정체성을 충분히 보여주지는 못한다고 보고되었다. 따라서 P2 측정이 성공해도 **원안 B/C를 그대로 구현하는 결정은 보류**한다. 최종 Dashboard mixed-D 사용자 미학 승인은 여전히 별도 대기이며, 이후 시공간표 디자인에 대해서도 사용자 선택/검증 후에만 Production 배포가 가능하다.

## 증거 및 종결

실제 CI/Chrome 결과·화면 폭별 인물 수·선택 상태·원호 겹침·실패 또는 성공 판정은 워크플로 실행 후 이 문서에 기록한다. 1개 독립 작업 단위를 마무리한 뒤 작업 위치를 고정하고, VIS3-07~17은 착수하지 않는다.

**다음 정확한 재개점:** P2 결과에서 필요한 보완만 수행하며, 실화면에서 실제로 보이는 B 개량안을 비배포로 A/B 비교. VIS3-06 본 구현 및 최종 미학 승인은 별도 사용자 선택을 조건으로 한다.

## 실제 운영 브라우저 검증 결과 — 폐쇄된 P2 범위

GitHub Actions에서 새 headless Chromium으로 Production alias를 실행해 실제 Person 자료를 검색/초점 이동/검색 해제한 뒤, 가상화된 밀집 인물 레이블을 가장 많이 볼 수 있는 위치를 탐색했다. 검색어는 실제 런타임의 `a`이며 첫 번째 **기존 실제 검색 결과**만 이용했다. 코드로 가짜 Person/Activity를 생성하지 않았다. A/B/C는 동일한 DOM/카메라 상태에서 CSS paint만 다르고 데이터 소스·역사 좌표·카메라는 변경하지 않았다.

| 실제 현재 화면 상태 | 가시 Person 이름표 | 가시 Person 레일 | 이름표 상호 겹침 | B/C에 의한 UI/라벨/Inspector 추가 변화 | 장식·컨트롤 겹침 |
| --- | ---: | ---: | ---: | --- | ---: |
| 390px · 500% · 비선택 | **69** | **542** | 0 | 없음; 모바일 장식 숨김 | 0px² |
| 390px · 500% · 실제 인물 이름 클릭/Inspector 선택 | **69** | **542** | 0 | 없음; 실시간 Inspector Activity 1 유지 | 0px² |
| 1440px · 500% · 비선택 | **195** | **472** | 0 | 없음 | 0px² |
| 1440px · 500% · 실제 인물 이름 클릭/Inspector 선택 | **195** | **472** | 0 | 없음; 실시간 Inspector Activity 1 유지 | 0px² |
| 1440px · **1500%** · 실제 인물 선택 유지 | **28** | **54** | 0 | 없음; 실시간 Inspector Activity 1 유지 | 0px² |

**15/15 P2 A/B/C measured cases PASS** = 5 different populated+selection+zoom scenes × A/B/C. 각 장면에서 baseline A의 실제 DOM 이름표 바운딩박스(최대 12 샘플)/개수/기존 겹침 결과/스크롤/Inspector 상태, 그 외 전체 year tick/9지역/툴바/초점 가능 요소 및 canvas 기하 값이 B/C 모두 정확히 같음을 테스트했다. test runner `VIS3_06_P2_REAL_POPULATED_CASES_PASS`은 `warnings:0`을 보고했다. 단어가 겹쳐 보이는 일부 시각적 혼잡/권역 경계와의 가독성은 별도 디자인·가독성 과제이며, 이 이름표 간 0건 판정은 **테스트한 그 5장면**에서의 실제 DOM 사각형 결과이지 전 연대의 전수검증은 아니다.

**시각적 평가:** 실제 1440px 밀집 Person 화면에서도 44×25px B 원호는 검색·줌과 겹치지 않았으나, 도구판에서 차지하는 조형적 존재감은 제한적이었다. C는 더욱 약하다. 따라서 **기능/지오메트리 GO, 현 B/C 디자인을 그대로 Production 적용하는 것은 NO-GO.** A 현행 유지. 다음 별도 작업 단위는 허구의 고지도 눈금이나 UI를 가리는 효과 없이 *뚜렷한 역사 관측기구 이미지와 절제 사이에서 균형을 잡는 B2 비배포 디자인 대안*을 만드는 것이다.

**검증의 남은 한계:** 390/1440 외 모든 width에서 밀집 인물을 별도로 재검증한 것은 아니다(기존 P에서는 다섯 폭의 빈 초기 viewport 검증). 125/150% 실제 브라우저 배율 확대, 키보드-only 순회, `details` 열린 상태, 장문 국제화 제목, WCAG AA 전체 범위 및 최종 사용자 미학 승인은 별도 게이트. 운영 DB·Person·Polity·Activity·시간/공간 축·프로덕션 UI 파일에 변경 없음.

**정확한 다음 단위:** `VIS3-06-P3` — 1440/390 실화면의 **B2 절제된 관측기구 외부 프레임 비배포 시안 비교·사용자 선택 준비**. 이 작업에서 실제 애플리케이션 UI를 수정하지 않으며, Dashboard VIS3-05R 혼합 D 미학 최종 승인 대기와 향후 VIS3-06-R 접근성·시각 선택 게이트를 유지한다. VIS3-07~17의 원 계획은 보존하며 자동 착수하지 않는다.
