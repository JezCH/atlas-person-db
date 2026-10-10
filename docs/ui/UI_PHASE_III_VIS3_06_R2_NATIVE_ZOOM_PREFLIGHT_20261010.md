# VIS3-06-R2 — Chrome 실제 브라우저 배율 125/150% A/B2 비배포 진단 (2026-10-10)

> **R2 한정 완료: 실제 Native Browser Zoom 안전성 6/6 PASS — 비배포·비승인**. 사용자 A/B2 미학 선택/운영 CSS·Vercel 승인 대기 상태 불변. [Chrome #38060796832](https://github.com/JezCH/atlas-person-db/actions/runs/38060796832) SUCCESS, [Integrity #38060796813](https://github.com/JezCH/atlas-person-db/actions/runs/38060796813) SUCCESS.

## 전체 Phase III를 유지한 이유

[원 계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 목표는 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**다. 데이터/가독성/작동 정확성이 역사풍 장식보다 우선이다. VIS3-05R Dashboard mixed-D의 최종 사용자 시각 승인과 VIS3-06-R1의 Spacetime A/B2 사용자 **디자인 선택은 미완료**. 단순 “이어서 해”는 특정 안의 채택 또는 운영 CSS·Vercel 배포 승인으로 변환되지 않는다.

이번 작업은 선택 후 실제 구현 여부 판단에 필요한 **브라우저 고유 125/150% 확대 시 표시 위험**만 미리 제거하기 위한 읽기 전용 기술 진단이다. R1의 승인 조건과 순서를 우회하는 출시 준비나 VIS3-07 신규 코드 착수가 아니다.

## 이번 작업의 단일 범위

이전 [P3 검증](UI_PHASE_III_VIS3_06_P3_B2_DIAL_RESEARCH_20261010.md)은 CDN이 제공하는 실제 Production DOM의 동일 상태에서 A/B2 CSS 미리보기·장식 충돌을 비교했으나 CDP viewport/앱 줌 기준이었다. [R0 검증](UI_PHASE_III_VIS3_06_R0_INTERACTION_PREFLIGHT_20261010.md)은 실제 Browser Tab·legend 조작까지 검증했다. 아직 **Chrome 자체의 Ctrl+Plus 확대 125/150%**의 실측 증거는 없었다.

- 별도 실험 검증기: `scripts/verify-vis3-06-r2-native-browser-zoom.mjs`
- GitHub Actions: `.github/workflows/atlas-vis3-06-r2-native-browser-zoom.yml`
- Browser 방식: **headful Chromium + Xvfb + openbox + xdotool**, 실제 X11 window에 `Ctrl+=` 이벤트 전송. **CDP DeviceMetricsOverride(deviceScaleFactor/DPR·viewport), pageScaleFactor, CSS zoom, OS 스케일 값을 native browser zoom 증거로 대체하지 않음**.
- `window.devicePixelRatio`의 1→1.25→1.5 변화를 실제 X11 키 입력 후 확인하고, 동일 물리 브라우저 화면 안에서 CSS viewport 감소를 함께 기록. 목표값이 확인되지 않으면 FAIL로 닫는다.
- 실제 Production `/#atlas-spacetime`에서 기존 Person 실제 검색 → 밀집 연대 선택 → 실제 인물 label 클릭 → Inspector/표시 기준 panel 열린 상태. 100/125/150% 각각 **A(현 운영)/B2(임시 비배포 SVG)**로 비교, 3 × 2 = 6 real Person 사례·PNG 6장·JSON 원본.
- 보호 조건: Person 이름/가시 라벨/레일·Inspector 실데이터, 9 macroregion, 연대 tick, 앱 자체 500~1500% unified camera, 0.748 압축, 140px 년축, 모든 툴바/실제 전시 텍스트/포커스 대상, 문서 scroll/canvas 변형 0. 겹침 면적 0, pointer-events none, mobile 900px 이하 비표시 정책 유지.

**절대로 하지 않는 것:** 운영 앱 CSS/JS/HTML, 데이터·등록/정치체, Vercel production 배포 변경, B2 실제 채택, Phase III VIS3-07~17 착수. 사용자 A/B2 선택도 임의 추론하지 않는다.

## 남은 승인·실행 로드맵

이번 단위가 기술적으로 통과하더라도 **VIS3-06-R1 = WAITING_USER_AESTHETIC_DECISION**. 사용자는 A 유지 / B2 디자인 방향 채택 / 재설계를 명시할 수 있다. *B2 선택* 이후에도 실제 CSS 구현과 Production 배포는 별도 승인 조건으로 진행한다. Dashboard mixed-D 미학 최종 승인도 별도 유지한다.

기능/안전성이 확보된 이후에만 전체 Phase III 계획의 **VIS3-07 지역·시대 헤더 → VIS3-08/09 인물 상세/사료 → VIS3-10/11 정치체 → VIS3-12/13 등록·조작 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합 회귀 → VIS3-17 Production 최종 인수**를 승인된 작업 단위별로 이어간다.

## 실제 실행 결과

GitHub Actions 완료 후 Chrome 원본 측정치, 실패·성공 범위, PNG+JSON 증거, SHA, 정확한 다음 재개점과 승인 상태를 추가한다.

## 실제 브라우저 실측·종결 판정

**측정/시험:** GitHub Actions [#38060796832](https://github.com/JezCH/atlas-person-db/actions/runs/38060796832) SUCCESS (Chrome headful + 실제 X11 키 입력, `Ctrl+=`), [ATLAS Integrity #38060796813](https://github.com/JezCH/atlas-person-db/actions/runs/38060796813) SUCCESS. 첫 실행 #38060573132는 Linux `xdpyinfo` 누락으로 FAIL, #38060656103은 125% 확대 시 실제 `표시 기준` 패널 접힘을 감지해 시험 조건 미일치 FAIL. **두 실패 실행을 시험 통과로 재해석하지 않는다**. 환경 설치와 사용자 환경 상태 변화를 분리 기록한 뒤 최종 #38060796832에서 정확히 native 확대 실증.

| 실제 Chrome 브라우저 확대 | window.devicePixelRatio | 실제 `innerWidth` CSS px | 가시 실제 Person 이름표 | 실제 레일 | Person Inspector 활동 | B2/도구·글 겹침 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100% | 1.00 | 1432 | **149** | 390 | 2 | 0px² |
| 125% | 1.25 | 1146 | **123** | 401 | 2 | 0px² |
| 150% | 1.50 | 955 | **74** | 184 | 2 | 0px² |

고정 물리 X11 스크린 `1600×1024`, GUI Chrome 창, **실제 `Ctrl+=` 100→110→125→150%** 경로. Chrome 자체 `devicePixelRatio`이 위 값으로 변했고 `innerWidth`가 1432→1146→955로 줄어들었다. `visualViewport.scale`은 모두 1.0이었으며 CDP의 `Emulation.setDeviceMetricsOverride`, `Emulation.setPageScaleFactor`나 CSS `zoom`을 사용하지 않았다. 따라서 이전 P/R0의 CSS-viewport proxy와 달리 **진짜 Chrome 브라우저 자체의 페이지 확대**라고 명확히 기록할 수 있다.

각 배율의 동일한 실제 Production DOM/시대/인물 선택/열린 표시 기준 패널에서 A와 B2를 비교한 **총 6케이스·실제 PNG 6장·JSON 1개**. [원본 artifact #11672449578](https://github.com/JezCH/atlas-person-db/actions/runs/38060796832/artifacts/11672449578). 별도 B2 SVG를 테스트 브라우저 배경에만 주입했다. 실제 인물 label/rail 개수·기존 겹침 0·Inspector(실 Activity 2)·9 macroregion·209 year tick·툴/상단·데이터/캔버스·카메라·scroll·HTML focusable count가 동일하다. B2 표시 시 조작부/펼친 패널 문구와 **신규 충돌 0px²**.

**시각적·상호작용 추가 관찰 (출시 승인과 구분):** Chrome native 확대 직후 `details.spacetime-precision-legend`이 125%와 150%에서 **닫혀 있었다**(`wasOpenImmediatelyAfterNativeZoom=false`). 이를 보조 기록으로 남기고, 실제 `summary` 클릭을 통해 패널을 다시 열어 **동일한 펼침 상태**로 A/B2를 비교했다. 따라서 “브라우저 확대 중 표시 기준 패널이 열린 채 유지된다”는 주장은 할 수 없다. 또한 150% 전체 화면에서는 펼친 설명 패널이 하단 상태 텍스트 일부를 시각적으로 덮는 모양이 관측되지만 **A와 B2에 동일한 기준선 UI 현상**이며 B2 장식에 의해 새로 생긴 겹침이 아니다. 향후 독립 baseline 표시 패널 가독성 UX 검토 후보로만 기록하고, 사용자 허가 없이 UI CSS를 변경하지 않는다.

**최종 판정:** 실제 native browser 100/125/150%에서 B2 장식의 **기능·지오메트리 추가 회귀 0**, 비배포 기술 진단 **PASS**. 전체 WCAG·스크린리더·모든 화면 폭·장문 동작과 사용자의 미감 채택은 아직 증명되지 않았다. 확대에 따른 기존 패널 자동 접힘/본문 앞 레이어링 역시 제품 UX 최종 승인이 아님을 구분한다.

**최신 정확한 재개점:** 원본 [VIS3-06-R1 A/B2 결정 패킷](UI_PHASE_III_VIS3_06_R1_USER_DESIGN_DECISION_20261010.md)에 따라 **A 현행 유지 / B2 디자인 방향 선택 / 재설계**에 대한 사용자 명시적 의사결정. Dashboard VIS3-05R mixed-D 최종 사용자 미감 승인도 별도 대기. B2가 선택되어도 실제 구현/배포는 추가 승인과 검증이 필요하며, A 현행 Production 유지. VIS3-07~17 작업목록은 변경 없이 대기.
