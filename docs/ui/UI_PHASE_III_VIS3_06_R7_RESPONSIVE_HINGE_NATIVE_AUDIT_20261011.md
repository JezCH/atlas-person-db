# VIS3-06-R7 — 실제 Chrome 175/200/250% 반응형 경계 감사

**2026-10-11 · 실제 GUI browser test 완료 / 비배포·비디자인승인.** 전체 목표는 [Phase III 실행계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**. 정보 정확성·시공간 읽기/검색/접근성을 역사적 장식보다 우선한다.

[R3](UI_PHASE_III_VIS3_06_R3_NATIVE_LEGEND_BASELINE_AUDIT_20261010.md)의 기존 A 패널 DOM 재생성 원인 → [R4](UI_PHASE_III_VIS3_06_R4_OPEN_STATE_PATCH_PREFLIGHT_20261011.md) 열림 상태 비배포 검증 → [R5](UI_PHASE_III_VIS3_06_R5_NATIVE_KEYBOARD_FOCUS_PREFLIGHT_20261011.md) Tab/Enter 포커스 비배포 검증 → [R6](UI_PHASE_III_VIS3_06_R6_ACTUAL_SOURCE_PREDEPLOY_20261011.md) 실제 JS 초안 8/8 통과 → **R7은 175`250% 반응형 전환 신규 검증**이다. 실제 후보 코드는 [DRAFT PR #2443](https://github.com/JezCH/atlas-person-db/pull/2443)에서만 유지, 운영 배포 금지.

## 검증 환경

Xvfb+Openbox+Google Chrome headed GUI, `xdotool Ctrl+=` / `Ctrl+-`로 실제 Chrome 확대 **100→150→175→200→250→200→175→150→100%**. Chrome CDP `Fetch.fulfillRequest`로 해당 DRAFT의 실제 `atlas-person-spacetime-view.js` 한 요청을 **정확히 1회** 대체했으며 운영 Person/Polity/Activity/지리 데이터 및 나머지 CSS/JS는 실제 Production 자산이다. CSS zoom, device-metrics 강제 DPR, 테스트용 DOM 상태 setter, 가짜 Person 사용 없음.

## 핵심 발견: 서로 다른 760px 기준

- 실제 소스 `responsivePresentationMetrics(mount.clientWidth)`는 **시공간표 컨테이너 폭**이 760px 이하일 때 내부 camera/presentation 모바일(축 80px, header 34px)로 전환.
- 실제 `atlas-person-spacetime-mobile-v8.css`의 `@media(max-width:760px)`는 **브라우저 전체 CSS 폭** 기준. 이때 `.spacetime-precision-legend`는 `display:none`으로 숨겨짐.
- Chrome **175%에서 viewport 823px / mount 706px**: **내부 모바일 축 80px, CSS는 데스크톱**, 따라서 `표시 기준`은 여전히 보임. 200% 이상 viewport 720/576px에선 CSS도 모바일이며 해당 범례는 실제로 숨겨짐. 그 상태에서 Tab으로 숨겨진 SUMMARY를 강제로 찾는 시험은 실행 불가능하고 정상적으로 제외함.
- 이는 **기준 불일치라는 측정 사실**이지 즉각적인 역사 데이터 결함 또는 확정된 WCAG 위반을 의미하지 않는다. 다만 축/헤더·주변 도구 전환 시점이 다른 접근성·가독성 검토 후보이다. 모바일에서 공간 배치 정밀도 설명의 대체 접근 경로는 추가 조사 필요.

## 최종 11/11 실제 브라우저 시험 PASS

[Chrome #38066726783](https://github.com/JezCH/atlas-person-db/actions/runs/38066726783) SUCCESS, [Integrity #38066726874](https://github.com/JezCH/atlas-person-db/actions/runs/38066726874) SUCCESS, 기존 [R6 회귀 #38066726809](https://github.com/JezCH/atlas-person-db/actions/runs/38066726809) SUCCESS. [PNG 11장 + JSON artifact #11674164227](https://github.com/JezCH/atlas-person-db/actions/runs/38066726783/artifacts/11674164227).

| 실제 native 확대 | viewport | mount | 내부 / CSS presentation | 축 / 연도 눈금 | 실제 인물 이름표 | 문서 전체 가로 넘침 |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| 100% | 1440px | 1157px | desktop / desktop | 140px / 209 | 149 | 0px |
| 150% | 960px | 842px | desktop / desktop | 140px / 209 | 75 | 0px |
| 175% | 823px | 706px | **mobile / desktop** | 80px / 105 | 129 | 0px |
| 200% | 720px | 701px | mobile / mobile | 80px / 105 | 113 | 0px |
| 250% | 576px | 558px | mobile / mobile | 80px / 105 | 86 | 0px |

실제 사용자 Tab/Enter로 두 패널을 펼친 뒤 native 확대; 250%에서 **보이는 `상태 더보기`를 Enter로 닫고** 200/175/150%까지 축소해 닫힘과 키보드 포커스 유지 확인; 150%에서 다시 보이는 `표시 기준`을 Tab/Enter로 닫고 100% 복귀. **11개 장면 모두 9 macroregion, 선택된 실제 Inspector Activity 2, 앱 카메라 500%, 실제 summary focus와 `:focus-visible` 유지**. 가시 컨트롤 화면 밖 0, 문서 가로 넘침 0. 연도 눈금 209→105는 모바일 LOD 표출 변화이며 데이터 삭제가 아님. **경고 2건은 모두 175% 내부 JS / CSS breakpoint mismatch**로, 기능 PASS와 구분했다.

## 선행 실패를 성공으로 소급하지 않음

- [#38066255724](https://github.com/JezCH/atlas-person-db/actions/runs/38066255724): 내부 모바일이 200%부터라고 잘못 가정 → FAIL, 실제 mount 폭 기준으로 수정.
- [#38066405905](https://github.com/JezCH/atlas-person-db/actions/runs/38066405905): CSS가 감추는 250% `표시 기준`을 키보드 Tab 대상으로 요구 → FAIL, 보이는 status와 데스크톱 복귀 후 precision을 각각 검증하도록 변경.
- [#38066575709](https://github.com/JezCH/atlas-person-db/actions/runs/38066575709): JS mobile과 CSS mobile이 반드시 같은 상태라는 부정확한 단언 → FAIL, 두 조건을 독립 측정하고 WARN으로 기록.
- 최종 #38066726783: **11/11 PASS**, WARN 2. 이 결과는 기재한 실제 Chrome 조작 범위의 증거이지, 모든 기기·400% 확대·스크린리더/NVDA/VoiceOver·WCAG 전체 수락이 아니다.

## 승인·재개점

**기존 A 런타임 패치 PR #2443은 DRAFT/미병합, 운영 UI·데이터·Vercel 무변경**. R7은 별도 시험 runner/workflow만 draft에 추가하고 운영 JS/CSS 수정을 추가하지 않았다. JS/CSS breakpoint 정합성, 모바일 범례 접근성은 후속 UX 후보로 보존.

시공간표 **A/B2/재설계 사용자 미학 선택**, Dashboard **VIS3-05R mixed-D 최종 미감 수락** 모두 대기. Person/Polity/Activity 삭제는 사용자 승인 필수, 9지역 균등 폭/140px desktop 축/압축 0.748/X·Y 통합 카메라 500–1500%/Person 8 의미색/P14 PARKED_BY_USER/watermark OFF 유지. 후속 **VIS3-07 지역·시대 → VIS3-08/09 인물 → VIS3-10/11 정치체 → VIS3-12/13 검색·조작 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 운영 인수**는 변경하지 않는다.
