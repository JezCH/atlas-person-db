# VIS3-06-R3 — 실제 운영 A안: 브라우저 확대와 ‘표시 기준’ 패널 상태·본문 겹침 감사 (2026-10-10)

> **읽기 전용 한정 진단 / 사용자 디자인 승인·운영 배포 아님.** 실험 결과는 실제 CI 관찰 후 별도로 확정한다.

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
