# VIS3-06-R3 — 실제 운영 A안: 브라우저 확대와 ‘표시 기준’ 패널 상태·본문 겹침 감사 (2026-10-10)

> **R3 실제 브라우저 감사 완료: 기존 A안 표시 기준 패널 DOM 교체·상태 초기화 재현. 사용자 디자인/운영 변경 미승인.** [Chrome #38061966227](https://github.com/JezCH/atlas-person-db/actions/runs/38061966227) SUCCESS, [Integrity #38061966236](https://github.com/JezCH/atlas-person-db/actions/runs/38061966236) SUCCESS.

## 전체 역사 아틀라스 목표와 작업 경계

[Phase III v2.0 실행계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)은 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex** — 실제 인물·지역·연대 정보를 정확하고 읽기 쉽게 노출하되 조형적 역사성을 절제하여 보조하는 것을 최우선으로 한다. 정보의 판독성과 탐색 정확성이 장식보다 앞선다. 기존 **VIS3-05R mixed-D Dashboard 사용자 최종 미감 승인 및 VIS3-06-R1 A/B2 선택은 미완료**다. ‘이어서 해’라는 요청을 운영 B2 채택이나 배포 승인으로 간주하지 않는다.

현재 시공간표 운영안은 A이며, B2(184×32px 황동 세공 원본 SVG)는 오직 브라우저에서만 시험했다. [R2 native Chrome zoom](UI_PHASE_III_VIS3_06_R2_NATIVE_ZOOM_PREFLIGHT_20261010.md)에서 진짜 Chrome 100/125/150% A/B2 UI 기하 변화 0을 확인했지만, **실제 페이지 확대 후 기존 `details.spacetime-precision-legend` 패널이 닫히는 현상**과 150% 레이어 혼잡이 보조 발견으로 남았다.

## 이번 하나의 작업단위

실제 운영 A에서 원인 단서를 확보하는 **R3 읽기 전용 현상 감사**만 수행한다. 다른 화면 구현을 시작하거나 CSS를 적용하지 않는다.

- 브라우저: 실제 GUI Chrome + Xvfb/Openbox + `xdotool Ctrl+=`, 고정 물리 창. CDP viewport/DPR 강제 변경, CSS zoom 또는 가짜 데이터 사용 금지.
- Production `/#atlas-spacetime` 실인물 검색·활동 구간·실제 Person 선택/Inspector 후, 운영 **A 그대로** 열기.
- `<details>` 현재 노드 참조·열림 상태·토글 이벤트·DOM 교체 이력·window resize 이벤트를 read-only observer로 기록.
- 100% 패널 펼침 → 125% 확대 직후 실제 열림 상태/노드 동일 여부 → 실제 summary 클릭 후 재개방 → 150% 확대 직후 동일 점검 → 재개방. **5개 장면의 원본 PNG 및 기하/이력 JSON**.
- 확대 화면의 열린 패널 자체와 화면 상단 표시 문구를 별도 추적. 패널 내 **실제 표시 텍스트 리프**와 패널 밖 텍스트의 rect 및 `elementFromPoint` 수치 겹침을 기록한다. 실제 겹침이 확인되지 않은 내용을 사실처럼 단정하지 않는다.
- 9개 지역·실제 Person 이름표와 Inspector Activity 유지, 운영 데이터 읽기만; DB/Person/Polity/Activity, 카메라 규칙 500~1500% X/Y unified, 공통 압축 0.748, 140px 축, 8개 Person 의미색, P14 PARKED_BY_USER, watermark REJECT/OFF는 변경 금지.

## 산출물 및 결정 게이트

새 runner `scripts/verify-vis3-06-r3-legend-resize-baseline.mjs`와 전용 workflow `.github/workflows/atlas-vis3-06-r3-legend-baseline.yml`, 실측 보고서, Phase III 재개점만 보존. 현재 운영 CSS/HTML/JS/asset-loader/Vercel/backend는 변경하지 않는다.

비배포 진단 이후, 기존 A의 UX 문제가 실제로 확인되면 이를 **B2 미학 문제와 분리해 별도 P1 baseline UX 수정 후보**로 분류한다. 시각 사용자 승인을 우회해 운영 코드를 수정하거나, 새로운 역사적 장식을 추가하지 않는다.

**전체 후속 순서 유지:** R1 A/B2 시각 선택(승인 대기), Dashboard D 최종 미감(별도 대기) → 승인된 VIS3-06 한정 UI 적용과 수락 → VIS3-07 연대·지역 → VIS3-08/09 인물 도록·출처 → VIS3-10/11 정치체 → VIS3-12/13 등록/상호작용 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 Production 인수.

## 실제 결과

Chrome CI 관찰 후 100/125/150% 배율별 패널 열림·노드 교체/기록·상단 텍스트 간섭과 가능한 원인 범위를 엄격하게 구분하여 기입한다.

## 실제 Production A안 감사 결과 — 완료 범위

**실제 Chrome [#38061966227](https://github.com/JezCH/atlas-person-db/actions/runs/38061966227), Integrity [#38061966236](https://github.com/JezCH/atlas-person-db/actions/runs/38061966236) 모두 SUCCESS**. 실제 headful Chromium/X11의 `Ctrl+=` 이벤트로 100% → 110% → 125% → 150% **브라우저 자체**를 확대했다. `Emulation.setDeviceMetricsOverride`나 CSS zoom으로 고유 브라우저 확대를 가장하지 않았다. 스크린샷 **5장 + 구조화 JSON 1개**: [원본 Chrome artifact #11672883577](https://github.com/JezCH/atlas-person-db/actions/runs/38061966227/artifacts/11672883577).

| 장면 | native DPR | 실제 CSS viewport 폭 | 패널 열림 | 최초 details 노드와 동일? | 실인물 보이는 라벨 | Inspector Activity |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| 100% 시작 | 1.0 | 1440px | **열림** | 동일 | 149 | 2 |
| 125% 확대한 직후 | 1.25 | 1152px | **닫힘** | **다름** | 124 | 2 |
| 125% 실제 summary 재클릭 | 1.25 | 1152px | 열림 | 다름 | 124 | 2 |
| 150% 확대한 직후 | 1.5 | 960px | **닫힘** | **다름** | 75 | 2 |
| 150% 실제 summary 재클릭 | 1.5 | 960px | 열림 | 다름 | 75 | 2 |

**원인 판별(관측과 추론 구분):** 브라우저 실측 `resize`와 실제 `<details>` DOM 교체를 추적했다. 100→110% 전환에서는 당시 열려 있던 `details` 노드가 **실제 교체**되었고 새 노드는 `open=false`. 110→125%에서도 교체. 125%에서 실제 `summary`를 클릭해 `open=true`로 복원했으나, 125→150%에서도 세 번째 교체가 발생해 다시 `open=false`. 최초 노드는 `isConnected=false`. 이 사실은 **'확대 직후 패널 접힘'의 직접적인 DOM 기전**을 증명한다. 정확히 어느 프런트엔드 렌더 함수가 노드를 교체하는지는 이번 browser-only 감사에서 **특정하지 않았다**.

**데이터 안전성:** Inspector 실제 선택 인물·활동 2건, 9 macroregion, 진짜 연대·카메라 데이터를 건드리지 않았다. 150% 전환 직후 virtualized label이 일시적으로 0개였던 장면이 있어 첫 Chrome #38061796757은 FAIL로 기록했고, 보완 후 실데이터가 표시되는 밀집 구간을 실제 scroll로 다시 찾아 **75개 실제 인물 라벨**을 확인했다. 이것은 Person 레코드가 지워졌다는 뜻이 아니며, 초기 150% 순간의 일시적인 비가시 상태와 재탐색 후 상태를 구분한다. 실패 결과를 숨기거나 성공으로 소급하지 않았다.

**설명문 겹침에 대한 정확한 판정:** 테스트가 대상으로 정한 상단 `p/strong/span/small/label/output` 등의 **직접 텍스트 리프 요소**와 열린 패널 내 가시 텍스트 rect 사이에서 5개 장면에 **측정된 교차 0건**. 그러나 150% 화면 원본에는 설명판이 상단 상태행 바로 앞에 펼쳐지는 **시각적 밀집/레이어 경쟁**이 보이며, 이 한정 텍스트리프 계측은 전체 `div`/합성 계층의 가려짐이나 가독성까지 배제하지 않는다. 따라서 '모든 상태 텍스트 겹침 문제가 없다'고 결론 내리지 않는다. 반대로 자동으로 글자 수평 충돌이 검출되었다고도 주장하지 않는다.

**제품 영향/우선순위:** 복잡한 장식을 더해 발생한 결함이 아니라 **Production A에서 기존부터 나타나는 P1 사용자 펼침 상태 유지 실패**다. 향후 접근성/브라우저 크기 변경 시 `details.open` 보존(또는 비파괴 렌더링) 검토 후보. 사전 설계 조건은 사용자 조작 펼침/닫힘을 구별하고 요약 버튼 초점/텍스트·실데이터를 보존하며, 최소 UI 변경·실제 native Chrome 회귀 검증을 통과하는 것. **수정안 적용이나 CSS 배포는 이번 단위에서 수행하지 않는다**.

**R3 작업 종결:** 운영 API/DB/Person/Polity/Activity/시공간 로직/CSS/JS/HTML/Vercel 변경 **없음**. 새로운 R1 디자인 결정도 발생하지 않았다. **정확한 다음 재개점은 VIS3-06-R1의 A 유지/B2 채택/재설계 사용자 선택 확인**이다. 별도로 기존 A의 `details` 열림 상태 유지 문제는 승인 가능한 **독립 최소 UX 수정 단위**로 대기할 수 있고, Dashboard VIS3-05R mixed-D 최종 사용자 시각 승인 및 VIS3-07~17 로드맵은 그대로 유지한다.
