# VIS3-06-R1 — 시공간표 최종 A/B2 디자인 선택 자료 (2026-10-10)

> **상태: 사용자 시각 선택 대기 / NOT APPROVED / NOT DEPLOYED.** 이 문서는 디자인 결정에 필요한 사실·불확실성을 정리한 **비배포 결정 패킷**이다. 사용자의 단순한 "이어서 해"는 A/B2 선택이나 CSS 배포 동의로 해석하지 않는다.

## 전체 Phase III 목표와 소유권

[Phase III 전체 v2.0 실행계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 비전은 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**: 사실에 근거한 역사 자료를 읽고 탐색하는 데 최적화된 고급 역사 아틀라스다. 장식 과밀도와 SaaS 일반형 양쪽을 피한다. 기준 우선순위는 **시대·지역·인물의 신뢰성과 가독성 → 조작 정확성 → 소수의 역사적 세공**이다.

현재 VIS3-06은 **시공간표의 외부 관측기구 도구판 세공 한 곳**만 대상으로 한다. 9개 macroregion 동일 폭, 좌측 140px 연도축, X/Y 공통 카메라 500–1500%, 압축 0.748, 8개 Person 의미색, 모든 Person/Polity/Activity/Place 사실값, P14 PARKED_BY_USER, watermark REJECT/OFF는 불변이다. VIS3-07~17을 자동으로 착수하거나 완료 처리하지 않는다.

## 사용자가 실제 선택할 두 안

| 항목 | **A — 현재 운영안** | **B2 — 비배포 정밀 관측기구 도구판** |
| --- | --- | --- |
| 디자인 | 기존 도구판·줌 조작부의 얇은 선과 타이포그래피만 유지 | 기존 사이즈·배치·검색/줌 조작부는 그대로, 사이 빈 공간에 184×32px 무의미한 대칭 반원/중앙 리벳/이중 황동 세공선 하나 |
| 시각 인상 | 가장 담백하고 단정하며, 정보 내용 자체에 집중 | 역사 장비의 얇은 판각 디테일이 보이고 아틀라스 정체성이 상대적으로 뚜렷함 |
| 리스크 | 시공간 화면의 조형적 차별성은 낮음 | 무의미한 장식이므로 모든 데이터보다 시각적 우선순위가 낮아야 함; 900px 이하에서 숨김 |
| 현재 상태 | **Production 적용 중** | 실운영 Chrome 안에서만 임시 스타일 주입하여 검증, **실제 앱 CSS에는 미적용** |
| 데이터 축·카메라 변경 | 없음 | 없음 |
| 결정 요구 | 현행 유지 선택 가능 | 디자인 후보 채택 여부 + 운영 반영 별도 승인 필요 |

[원본 B2 SVG](../../experiments/vis3-06/b2-observatory-toolrail-plate.svg)는 실제 별자리·방위·시계 눈금이 아닌 **순수한 장식적 장비 명판**이다. 허구 국장·사실인 것처럼 보이는 역사 수치나 지리 좌표는 사용하지 않는다.

## 실제 브라우저 증거 (과장 없이)

1. [P3 실제 Production A/B/B2 Chrome](https://github.com/JezCH/atlas-person-db/actions/runs/38032224738) — **6상태×3안=18건 PASS**, [실제 PNG 18개와 구조화 JSON](https://github.com/JezCH/atlas-person-db/actions/runs/38032224738/artifacts/11663090784). 실제 390px 69명, 1000px 117명, 1440px 195명 이름표, 1440px 1500% 28명. 테스트 화면에서 이름표·9지역·연대축·Inspector·카메라 동일, 장식·컨트롤 겹침 0px². 390px에서는 B2 숨김.
2. [R0 실제 keyboard/legend Chrome](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074) — **4상태×A/B2=8건 PASS**, [원본 PNG 8개와 JSON](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074/artifacts/11663435707). 실제 인물 선택 상태에서 ‘표시 기준’ 패널 열기/닫기, Chrome Tab→줌 축소/확대/summary `:focus-visible` 확인, 문자·조작 hitbox 충돌 0.
3. [P2 인물 밀집 A/B/C Chrome](https://github.com/JezCH/atlas-person-db/actions/runs/38030476127)에서 **B 44×25px**은 기능적 안전성이 있지만 작은 시각적 존재감 때문에 미학적 NO-GO. B2는 B의 식별성 한계를 해소하기 위한 후보이지 사용자가 확정한 디자인이 아니다.

정확한 한계: 위 결과는 390/1000/1440px 중심의 실제 Chrome **CSS-viewport 및 앱 자체 Zoom** 측정이다. **Chrome native browser page zoom 125/150%**, 전량 키보드/스크린리더, WCAG AA, 장문 언어/다양한 상태, 실제 Production 적용 후 검증 결과를 대신하지 않는다. CI PASS도 사용자 미학 승인으로 전환되지 않는다.

## 결정 문구 및 분리된 승인 게이트

다음 중 하나를 사용자가 명시적으로 선택해야 한다.

- **A 유지**: 시공간표 관측기구 장식 추가 불필요. 기존 Production A 유지; VIS3-06의 신규 장식 구현은 NO-GO로 종결한다. 다른 화면의 장식도 무조건 금지하는 결정은 아니다.
- **B2 디자인 선택**: 원본 184×32px B2를 시공간표 도구판의 *디자인 방향*으로 승인. 그 자체로 Production 배포 승인은 아니다. 이후 한정 UI 구현안/동일 실제 Browser native zoom 125/150%, 키보드·접근성·디자인 회귀 검증, **별도 운영 반영 승인**을 거친다.
- **보류/재설계**: A를 그대로 배포 상태로 두고 과잉/미약/기계적인 인상 등 구체적 피드백을 받아 **별도 한정 연구 단위**를 연다.

별도로 **Dashboard VIS3-05R mixed-D의 최종 Production 시각 승인**이 아직 필요하다. Spacetime B2의 채택이 Dashboard 승인까지 대신하지 않는다.

## 이번 R1 패킷의 종결 조건

이 문서를 `main`에 기록하고 CI를 확인하면 **‘R1 선택 자료 준비’ 단위만 완료**한다. 사용자 답변 전까지 **VIS3-06-R1 자체는 WAITING_USER_AESTHETIC_DECISION**으로 유지한다. 브라우저 UI/서비스/데이터 수정·실제 배포·VIS3-07 실행을 해서는 안 된다.

**정확한 재개점:** 사용자에게 A/B2 실제 비교 그림 및 모바일 비표시 정책을 제시해 **“시공간표는 A 유지, B2 방향 선택, 아니면 재설계?”**를 확인한다. 선택 뒤 별도 승인된 최소 단위만 시작하며, 장기 경로 **VIS3-07 지역/시대 헤더 → VIS3-08/09 인물 상세/출처 → VIS3-10/11 정치체 → VIS3-12/13 등록/조작 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 실운영 인수**는 보존한다.
