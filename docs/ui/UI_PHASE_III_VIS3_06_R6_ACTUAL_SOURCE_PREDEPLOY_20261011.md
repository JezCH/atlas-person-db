# VIS3-06-R6 — 실제 Spacetime 소스 최소 수정안과 비배포 실통합 검증

> **2026-10-11 · DRAFT / 미병합 / Production 미배포.** 기존 A의 독립 P1 UX 문제를 수정하기 위한 후보이며, 사용자 A/B2/재설계 디자인 최종 승인과 Dashboard mixed-D 미학 승인을 대체하지 않는다.

## 전체 Phase III 목표와 보존 원칙

**Restrained Grand Atlas × Precision Chronometer × Editorial Codex**를 따라 역사 아틀라스의 근거 정확성·가독성·실조작 품질을 먼저 확보하고, 역사적 장식은 절제한다. 본 R6는 이미 확정된 [Phase III 전체 계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)을 이어가는 독립 기능 회귀 해소 준비 작업이다. **9 macroregion 동일 폭·140px 시간축·전역 압축 0.748·unified X/Y 카메라 500~1500%·8 Person 의미색·P14 PARKED_BY_USER·VIS2-05 watermark OFF 및 Person/Polity/Activity/Place 데이터**는 손대지 않는다.

[R3](UI_PHASE_III_VIS3_06_R3_NATIVE_LEGEND_BASELINE_AUDIT_20261010.md)에서 실제 browser page zoom 재렌더마다 `<details>` 새 노드가 닫히는 현상을 확인했고, [R4](UI_PHASE_III_VIS3_06_R4_OPEN_STATE_PATCH_PREFLIGHT_20261011.md)에서 browser-only 열림 상태 보존 6/6, [R5](UI_PHASE_III_VIS3_06_R5_NATIVE_KEYBOARD_FOCUS_PREFLIGHT_20261011.md)에서 실제 Tab/Enter·포커스/ `:focus-visible` 복원 8/8을 보였다. **R5는 Production 앱 소스가 아닌 테스트 전용 mount setter였다.**

## 실제 앱 수정 후보 — DRAFT 브랜치에만 존재

수정 파일: `atlas-person-spacetime-view.js` 단 하나(다른 변경은 tests/workflow/docs).
- `renderInto(mount)` 진입에서 현재 `details.spacetime-precision-legend`와 `details.spacetime-status-more`의 각각 `open` 값을 저장. DOM 전체 재생성 뒤 사용자 열림/닫힘 값을 복원.
- 기존 `captureRenderFocus`/ `restoreRenderFocus`의 포커스 스냅샷에 **두 SUMMARY 노드만** 안정적 의미 식별자(`summary:"precision" | "status"`)로 허용. 고유 `id`·scroller에 대한 기존 포커스 우선순위와 흐름은 보존.
- 렌더링/가상화/역사 데이터/장식 CSS/카메라 수학/요청 API/기타 입력 상태 변경 없음.

## R6의 실제 통합 검증 방법

전용 테스트 `scripts/verify-vis3-06-r6-real-source-native-focus.mjs`는 Github Actions가 checkout한 **변경된 브랜치 실제 JS 텍스트**를 Chromium 네트워크 CDP `Fetch.fulfillRequest`에서 정확히 **`atlas-person-spacetime-view.js` 요청에 한해 응답**한다. 이 방식은 페이지가 운영 Production의 역사 데이터와 기타 static CSS/JS를 그대로 읽게 하면서 테스트 브라우저 안에만 새로운 후보 코드를 적용한다. 브랜치 JS 요청이 정확히 한 번 intercept/fulfill되지 않으면 FAIL; 시험 중 mount setter shim을 설치하지 않는다. 따라서 R4/R5의 임시 shim보다 **실제 소스 코드 적용의 효과를 직접 검사**한다.

실제 GUI Chrome X11 Ctrl+Plus/Minus **100→125→150→125→100%**. 검색 입력부터 실제 Tab/Enter로 `표시 기준` 및 `상태 더보기` SUMMARY를 각각 열고 닫으며, **8개 실제 장면**에서 사용자 두 상태·`:focus-visible`·활성 SUMMARY·인물 Inspector/Activity·9 macroregion·연도축·앱 카메라 500%를 검증. PNG 8장+JSON 원본과 CDP network override 증거가 필요하다.

**판정 경계:** 이 검증이 성공하더라도 배포된 Production이 수정되었다거나 사용자 디자인 방향이 승인되었다는 뜻이 아니다. 운영 CSS/HTML/배포와 역사 DB 변경은 금지. 이 브랜치 PR은 **DRAFT 유지**, 사용자 확인 없는 main 병합/실서비스 출시 불가. 별도 키보드 기기·VoiceOver/NVDA·WCAG AA 전체 수락은 남는다.

## 전체 재개점

기술적으로 R6가 통과하면 가능한 후속 조치는 미학과 독립인 기존 A P1 기능 수정 후보의 **사용자 승인 후 main 병합과 Production 회귀 검증**이다. 별도로 VIS3-06-R1 **A 유지 / B2 디자인 방향 / 재설계** 사용자 선택, VIS3-05R Dashboard 혼합 D 최종 미학 승인 대기. 그 이후 승인 범위만 따라 **VIS3-07 시대·권역 헤더 → VIS3-08/09 인물 도록·출처 → VIS3-10/11 정치체 → VIS3-12/13 목록·상호작용 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합 회귀 → VIS3-17 운영 인수** 계획을 보존한다.

## 실제 CI 결과 — 수정된 원본 브랜치 JS 검증 성공

[실제 GUI Chrome #38065016569](https://github.com/JezCH/atlas-person-db/actions/runs/38065016569) **SUCCESS**; [ATLAS Integrity #38065016504](https://github.com/JezCH/atlas-person-db/actions/runs/38065016504) **SUCCESS**. 실제 증거: [Chrome 원본 PNG 8장·JSON artifact #11674672042](https://github.com/JezCH/atlas-person-db/actions/runs/38065016569/artifacts/11674672042).

**시험 강도 및 실제 소스 로딩 입증:** GitHub Actions checkout한 `atlas-person-spacetime-view.js` **99,159 bytes**를 Chrome CDP `Fetch.fulfillRequest`로 실제 Production 요청 `https://atlas-person-db.vercel.app/atlas-person-spacetime-view.js?v=20261003-ui-v7-tools-v1`에 **정확히 1회 가로채기·1회 교체 응답**했다. 다른 static JS/CSS/Person/Activity/정치체 API/카메라는 운영 리소스 사용, Production write 없음. 이 검증 과정에 R4/R5의 별도 DOM setter shim은 설치하지 않음. 응답하지 못하면 테스트가 실패하도록 계약이 작성됨.

| GUI Chrome 확대·사용자 행동 | 표시 기준 | 상태 더보기 | 실제 키보드 포커스 | `:focus-visible` | 실인물 화면 라벨 |
| --- | --- | --- | --- | --- | ---: |
| 100% 키보드 Tab·Enter | 열림 | 닫힘 | 표시 기준 | TRUE | 149 |
| 125% 실제 native 확대 | **열림 유지** | 닫힘 | **표시 기준 유지** | TRUE | 123 |
| 125% 키보드 Tab·Enter | 열림 | 열림 | 상태 더보기 | TRUE | 123 |
| 150% 실제 native 확대 | 열림 | **열림 유지** | **상태 더보기 유지** | TRUE | 74 |
| 150% Enter 직접 닫기 | 열림 | **닫힘** | 상태 더보기 | TRUE | 74 |
| 125% 실제 native 축소 | 열림 | **닫힘 유지** | **상태 더보기 유지** | TRUE | 103 |
| 125% Enter 직접 닫기 | **닫힘** | 닫힘 | 표시 기준 | TRUE | 103 |
| 100% 실제 native 축소 | **닫힘 유지** | 닫힘 | **표시 기준 유지** | TRUE | 125 |

**판정: 8/8 PASS.** Chrome native DPR 1.0 / 1.25 / 1.5, CSS viewport 1432 / 1146 / 955px. 모든 장면 9 macroregion·209 year ticks·선택 실제 Person Inspector Activity **2건**, 앱 자체 카메라 500% 보존. 이는 실제 역사 자료를 유지한 상태에서의 기능 회귀 증거이지 전체 Person 인원·동일 연대 시점의 가시 이름 개수가 일정하다는 주장이 아니다.

**변경 범위:** runtime 수정은 `atlas-person-spacetime-view.js`의 `renderInto` 진입/종료 두 details.open 보존과 기존 `captureRenderFocus`·`restoreRenderFocus`에 summary 두 종류만 추가한 작은 변경. 디자인 B2/CSS, 9권역 모델/연대/정치체/색상/등록/해석 데이터 파일 변경 없음. 설명문 150% 중첩 가능성, 전체 Tab 시퀀스·NVDA/VoiceOver/forced-colors/WCAG는 아직 별도 검토 대상.

**중요:** 이 결과로 **수정 후보 브랜치의 기술 검증은 완료됐지만**, PR [#2443](https://github.com/JezCH/atlas-person-db/pull/2443)은 의도적으로 **DRAFT/미병합**. 실제 운영 파일은 바뀌지 않았고 Vercel Production 배포도 하지 않았다. 사용자 A/B2/재설계 미학 선택과 Dashboard 혼합 D 최종 수락은 여전히 대기. 사용자 승인 없이 런타임 PR 병합·배포를 진행하지 않는다.

**정확한 다음 재개점:** 독립 P1 기존 A 패널/포커스 보존 기능 패치를 승인할 경우, draft를 리뷰 가능한 PR로 전환하고 최신 main 충돌·CI·실제 출시 영향 확인→scope-limited 병합/Production 관찰. 디자인/후속 VIS3-07~17 로드맵은 원본 실행계획 그대로 보존.

