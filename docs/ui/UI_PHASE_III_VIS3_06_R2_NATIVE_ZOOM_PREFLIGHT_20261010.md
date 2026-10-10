# VIS3-06-R2 — Chrome 실제 브라우저 배율 125/150% A/B2 비배포 진단 (2026-10-10)

> **상태: 읽기 전용 독립 진단 (NOT DEPLOYED, NOT USER APPROVED).** 실제 Chrome 실행 전 최종 숫자·합격 여부는 미확정.

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
