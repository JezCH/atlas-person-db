# VIS3-06-R5 — native Chrome 키보드 요약 패널 포커스 보존 비배포 검증

> 범위: 2026-10-11, 운영 **A** 기준 P1 키보드 포커스/상태 UX 조사. **사용자 디자인 승인도 아니며 실제 프런트엔드 소스/배포 변경 없음.**

## 전체 프로젝트 목표와 작업 지시의 보호 경계

ATLAS Phase III v2.0 [전체 계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 목표는 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**. 고지도·정밀 연대계·역사 도록의 디자인 정체성을 가지되, 실존 인물·정치체·연대·지리의 신뢰성과 실제 검색/축/조작 가독성이 우선이다. 42 장식 후보 전부 구현 금지, 9 macroregion 같은 폭, 140px 년축, global extent 압축 0.748, X/Y unified camera 500–1500%, 8개 Person 분야 의미색, 역사 데이터 삭제 승인 원칙, P14 PARKED_BY_USER, VIS2-05 watermark OFF를 유지한다.

VIS3-06-R1의 **A 현행/B2 디자인 방향/재설계 사용자 선택**, Dashboard VIS3-05R mixed-D 최종 사용자 미학 승인은 별개로 여전히 대기. 이번 "이어서 해"를 B2 채택/운영 UI CSS·JS 변경/배포 승인으로 변환하지 않는다. VIS3-07~17은 전체 계획대로 보존한다.

## 이전 R3/R4에서 확정된 내용과 R5의 독립 목적

[R3](UI_PHASE_III_VIS3_06_R3_NATIVE_LEGEND_BASELINE_AUDIT_20261010.md)는 headful Chrome native 100→125→150% 변경 시 실제 `<details>` DOM 교체와 패널 `open=false`를 증명했다. [R4](UI_PHASE_III_VIS3_06_R4_OPEN_STATE_PATCH_PREFLIGHT_20261011.md)는 기존 `atlas-person-spacetime-view.js`의 `bindResize` → `renderInto(mount)` → `mount.innerHTML` 경로와 두 패널의 사용자 열림/닫힘 상태 보존을 실제 브라우저에서 시험했다.

**아직 독립 검증하지 않은 점:** `renderInto`가 호출하는 `captureRenderFocus`/ `restoreRenderFocus`는 `active.id` 또는 `.spacetime-scroll`에 한정되며, `summary` 요소들은 고유 id가 없다. 즉 열린 상태만 보존해도 키보드 사용자가 확대 직후 현재 요약 버튼 포커스를 잃는지, `:focus-visible` 표시와 Enter/닫힘/Tab 탐색이 유지되는지는 검증할 필요가 있다.

## 이번 R5의 비배포 검증 계약

- `scripts/verify-vis3-06-r5-native-summary-focus.mjs` — 실제 운영 Production A, 실제 데이터·실존 Person 선택·Inspector Activity를 읽기 전용으로 로딩.
- 데스크톱 headful Chrome/X11 `xdotool Ctrl+= / Ctrl+-`로 **Chrome 자체** 100→125→150→125→100% 확대/축소 (CDP 강제 viewport/DPR, CSS zoom 미사용).
- 실제 CDP `Input.dispatchKeyEvent` **Tab/Enter**로 검색 입력에서 `표시 기준`/ `상태 더보기` 요약버튼까지 키보드 순회, 실제 `:focus-visible` + 펼침/닫힘 검증.
- 먼저 **원본 Production A, 시험 보정 없는 상태**에서 열린 표시 기준/포커스가 native 확대 직후 어떻게 되는지 기록. 실패가 실재하지 않는다면 의도적으로 가짜 고장 주장을 하지 않는다.
- 비교 시험은 기존 R4 접근의 확장: **오직 현재 브라우저 `#personSpacetimeMount` 개별 `innerHTML` setter**로 전체 renderer DOM 교체 전 두 패널 `open` 상태와 현재 focused summary 선택자를 기억했다가 새 DOM에 복구하고 `focus({preventScroll:true})` 수행. `Element.prototype` 수정, 실제 제품 JS/CSS/HTML 수정, DB·API 쓰기·운영 Vercel 배포 전부 금지.
- 실제 **8개 단계 PNG + 상세 JSON**: 100% 표시기준 포커스·열림, 125% 열림/포커스, 125% 상태더보기 포커스·열림, 150% 상태더보기 포커스, 150% 상태더보기 Enter 닫힘, 125% 닫힘·포커스, 125% 표시기준 Enter 닫힘, 100% 표시기준 닫힘·포커스.
- 모든 단계에서 actual Person Inspector/Activity, 9 macroregion/연도 tick, 앱 줌 500%를 보존. 실제 인물 가상화는 visible label 수를 시점별로 보고하며 0개일 때 실데이터 시점만 재탐색; 가짜 인물·연대 추가 금지.

## 결과·한계·재개점

실제 CI 이후 결과·원본 실행 run/artifact 및 본 실험이 증명하지 못한 접근성 항목을 구분해 기록한다. 비배포 시안 시험이 통과해도 실제 `atlas-person-spacetime-view.js` 코드 패치/Production 적용 완료 또는 WCAG 전수 감사로 해석하지 않는다.

R5 이후 재개점: 별도 승인된 P1 최소 소스 변경과 실운영 회귀 확인 여부 검토. 스타일은 **A/B2/재설계 사용자 선택 대기**, Dashboard 최종 사용자 수락 대기. 후속 **VIS3-07 연대·지역 → VIS3-08/09 인물 → VIS3-10/11 정치체 → VIS3-12/13 탐색 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 운영 인수** 순서 유지.

## 실제 테스트 결과

실제 CI 종료 후 기록.
