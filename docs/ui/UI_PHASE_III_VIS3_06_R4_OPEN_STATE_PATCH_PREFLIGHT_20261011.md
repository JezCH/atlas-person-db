# VIS3-06-R4 — 표시 기준·상태 더보기 열림 상태: 실제 렌더 함수 원인과 비배포 사전검증

> 2026-10-11. 소스 수준 원인 파악·브라우저 전용 검증. **운영 UI·배포·사용자 디자인 승인은 아님.**

## 전체 Phase III 목표·승인 게이트

[전체 계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md): **Restrained Grand Atlas × Precision Chronometer × Editorial Codex** — 역사 인물·정치체·연대의 신뢰성 및 읽기·탐색의 정확성을 우선하면서 절제된 역사 도록/고지도 디자인 구현. 장식을 무조건 추가하지 않으며 9 macroregion 균등 폭, 140px 연도축, X/Y unified 500–1500% camera, 압축 0.748, 8 Person 의미색, P14 PARKED_BY_USER, VIS2-05 watermark REJECT/OFF, Person/Polity/Activity/Place 원본 데이터 불변.

VIS3-06-R1에서 사용자 A 유지/B2 채택/재설계 선택은 **대기**. B2를 운영에 추가하는 권한으로 이번 “이어서”를 오해하지 않는다. Dashboard mixed-D 최종 사용자 미감 승인은 별도. VIS3-07`17 계획도 대기 상태로 보존.

## R3 현상 재현과 R4 소스 원인

[R3 실제 브라우저 증거](UI_PHASE_III_VIS3_06_R3_NATIVE_LEGEND_BASELINE_AUDIT_20261010.md)에서 Chrome 100→110→125→150% 확대 시 운영 A의 `details.spacetime-precision-legend` DOM 노드가 세 번 교체되고, 신규 `details.open=false`로 초기화됐다.

R4는 `atlas-person-spacetime-view.js`의 **`renderInto(mount)`**까지 소스 원인을 추적했다. 이 함수에서 `captureRenderFocus(mount)` 후 **`mount.innerHTML`로 도구판과 status row 전체를 재생성**한다. HTML 안의 `<details class="spacetime-precision-legend">`와 `<details class="spacetime-status-more">`는 모두 단순 신규 태그로 생성되며, 기존 `open` 값을 복원하지 않는다. 같은 파일의 `bindResize()`는 브라우저 resize 때 `requestAnimationFrame(() => renderInto(mount))`를 실행한다. 따라서 native browser zoom → resize → full DOM render → 사용자 펼침 상태 소실의 호출·DOM 경로가 코드와 실측 모두로 확인된다.

`captureRenderFocus`는 id나 scroller focus만 보존하므로 summary 키보드 포커스는 **별도 검증 필요**. 이것을 상태 복원만으로 고쳐진다고 주장하지 않는다.

## 최소 운영 수정 *제안* — 이 PR에는 미적용

실제 `renderInto`가 DOM을 교체하기 직전 현재 펼침 상태를 읽고, 재생성 후 해당 details에 복원한다. 노드가 없을 때는 false로 초기화하며 사용자의 닫힘 선택도 존중해야 한다.

```js
const precisionWasOpen = mount.querySelector(".spacetime-precision-legend")?.open ?? false;
const statusMoreWasOpen = mount.querySelector(".spacetime-status-more")?.open ?? false;
// original mount.innerHTML = full Spacetime markup
const precisionLegend = mount.querySelector(".spacetime-precision-legend");
const statusMore = mount.querySelector(".spacetime-status-more");
if (precisionLegend) precisionLegend.open = precisionWasOpen;
if (statusMore) statusMore.open = statusMoreWasOpen;
```

이 코드는 **설계 참고용**으로 제시한 것이며, 실제 적용 시에는 mount 교체 전 상태 스냅샷/재생성 이후 복원 순서, 카메라·scroll·Inspector·초점 및 resize 이중 이벤트를 모두 확인해야 한다.

## 한정 사전검증

`scripts/verify-vis3-06-r4-open-state-browser-only.mjs`와 독립 workflow에서 실제 Production A를 열고, **DOM의 mount 개별 innerHTML setter만 브라우저 시험 중 임시 가로채기**하여 렌더 교체 전/후 `details.open`을 옮긴다. 실제 운영 js/HTML/CSS, window prototype, 역사 DB, Vercel 배포 변경은 없음.

실제 headful Chromium/X11에서 Ctrl+=과 Ctrl+-로 native 100→125→150→125→100%를 진행. 실제 두 summary 모두 열기 → 확대 후 둘 다 열림 유지, 실제 클릭으로 둘 다 닫기 → 축소 후 닫힘 유지. 실제 전체 렌더 호출 회수의 증가를 확인. 선택 Person Inspector/Activity·9지역·연도축/카메라·실제 보이는 이름표가 유효해야 함. 원본 Chrome PNG + JSON 보존, 실패를 숨기지 않음.

## 재개점

이번 비배포 R4를 종결한 이후 운영 UX 수정은 별도의 안전한 최소 PR/인수 절차로 진행한다. **B2 미학 선택/배포는 절대 자동 승인 아님**. 추후 VIS3-07 연대·지역 헤더 → VIS3-08/09 인물 → VIS3-10/11 정치체 → VIS3-12/13 목록·상호작용 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 실운영 인수 순서 보존.

## 실제 실행 결과

## 2026-10-11 실제 native GUI Chrome 검증 결과

[GitHub Chrome workflow #38062851525](https://github.com/JezCH/atlas-person-db/actions/runs/38062851525) **SUCCESS**. [ATLAS Integrity #38062851579](https://github.com/JezCH/atlas-person-db/actions/runs/38062851579) **SUCCESS**. 테스트 전용 mount 개별 innerHTML setter의 실제 full-render **6회 호출**을 관측했으며, 단순히 리렌더가 발생하지 않은 상태에서 성공 처리하지 않았다. [PNG 6장과 JSON 원본 artifact #11673478264](https://github.com/JezCH/atlas-person-db/actions/runs/38062851525/artifacts/11673478264).

| 실제 Chrome 배율과 테스트 순간 | 사용자 표시 기준 | 사용자 상태 더보기 | 가시 실제 Person label | 실제 Inspector Activity | 리렌더 누적 |
| --- | --- | --- | ---: | ---: | ---: |
| 100%, 둘 다 펼친 직후 | 열림 | 열림 | 149 | 2 | 0 |
| 125%, native 확대 후 | **열림 보존** | **열림 보존** | 121 | 2 | 2 |
| 150%, native 확대 후 | **열림 보존** | **열림 보존** | 74 | 2 | 3 |
| 150%, 사용자가 둘 다 닫음 | **닫힘 존중** | **닫힘 존중** | 74 | 2 | 3 |
| 125%, native 축소 후 | **닫힘 보존** | **닫힘 보존** | 103 | 2 | 4 |
| 100%, native 축소 후 | **닫힘 보존** | **닫힘 보존** | 125 | 2 | 6 |

모든 테스트에 **9개 macroregion, 실제 year-axis tick 209, 실제 Person Inspector/Activity 2, 앱 자체 500% 카메라**가 유지됐다. Chrome GUI의 실제 DPR은 1.0/1.25/1.5이고, 앱 CSS의 축소/렌더링 방식이나 데이터 행을 수정하지 않았다. 인물 가시 개수는 각 시점의 사용자 시점/가상화 상태에 의존하므로 일치해야 하는 동일 인원 수가 아니라 양의 값과 데이터 선택 불변을 확인했다.

**소스 지점(기존 `main`):** [`atlas-person-spacetime-view.js` L1622](https://github.com/JezCH/atlas-person-db/blob/main/atlas-person-spacetime-view.js#L1622) `renderInto`, [L1678](https://github.com/JezCH/atlas-person-db/blob/main/atlas-person-spacetime-view.js#L1678) full `mount.innerHTML`, [L1683/L1693](https://github.com/JezCH/atlas-person-db/blob/main/atlas-person-spacetime-view.js#L1683-L1693) 두 `details`, [L1809–1818](https://github.com/JezCH/atlas-person-db/blob/main/atlas-person-spacetime-view.js#L1809-L1818) resize 재렌더. 다음 실제 구현 시 DOM 교체 직전의 open 상태를 스냅샷하고 교체 직후 되돌리되, 두 `summary`의 키보드 포커스 보존·읽기 순서·open 상태 변경 시 프레임 재배치를 별도 검사해야 한다.

**판정:** R4 **비배포 원인·원리 검증 종료, 안전한 최소 UX 패치가 유효한 후보임을 확인**. 다만 이는 브라우저 실행 중 개별 root의 native `innerHTML` setter만 테스트에서 감싼 것이며 **실제 제품 source patch/Production 검증은 아니다**. 첫 R3 검사에서 발견된 150% 화면의 설명 본문/상태행 시각적 밀집, summary 포커스 이탈, WCAG AA 전수 검증은 여전히 별개다.

**정확한 재개점:** R1 사용자 A 유지/B2 채택/재설계 디자인 결정 및 Dashboard mixed-D 사용자 미감 승인 대기 유지. 디자인과 독립적인 기존 A P1 open-state UX 실구현은 사용자 승인/범위를 별도로 검토한 뒤 최소 UI 파일 변경 PR + native Chrome regressions + Production acceptance로만 처리한다. Phase III VIS3-07–17 계획 불변.

