# ATLAS UI workstream — current execution routing

> 2026-11-19 현재 계획: [ATLAS_UI_DELIVERY_PLAN.md](ATLAS_UI_DELIVERY_PLAN.md) v1.1 · 작업 원장 [#1896](https://github.com/JezCH/atlas-person-db/issues/1896)

## Active plan (user-approved)

현재 표 중심 단계에서 **역사 인물/시대/권역의 가독성 + 연속 탐험 경험**을 구현한다. 옛 디자인 연구 문서를 다시 실행하지 않고, 정확한 최신 main/기존 PR에 실제 코드를 통합한다.

1. UI-01A/B: 인물 명부의 인명·연대·열·복수 Activity 가독성 (최우선)
2. UI-02A: Person/Polity 상세의 역사 기록·근거 정보 위계
3. UI-03A/B: 시공간표의 시간·권역·레이블 위계, 줌별 정보량 개선
4. UI-04: 탐험 중심 공통 쉘, 모바일, 접근성
5. UI-05: 기존 화면의 정보완전성/Production 1차 수용
6. UI-06A/B: 동시대 결과 전체 접근과 Person↔Spacetime 맥락 복원 (후속 신규 기능)
7. UI-07: 두 인물의 Activity 기간·정치체 비교 (후속 신규 기능)

각 단위의 정확한 소스 접점·테스트·비범위·완료 기준은 [실제 개발계획](ATLAS_UI_DELIVERY_PLAN.md) 하단의 「표 중심 단계 보완」을 따른다. 기존 UI-01~05 실행 순서는 그대로 유지하며 UI-06/07을 건너뛰고 전체 UX 완료라고 보고하지 않는다.

## Canonical boundaries

- 정보노출 계약: [UI_INFORMATION_COVERAGE.md](UI_INFORMATION_COVERAGE.md). 이 문서의 과거 결함 서술을 최신 main 결함으로 단정하지 말고 재검증.
- 시각원칙: [ATLAS_UI_VISUAL_GUIDELINES.md](../../ATLAS_UI_VISUAL_GUIDELINES.md), [UI_PREMIUM_VISUAL_EXECUTION_PLAN.md](UI_PREMIUM_VISUAL_EXECUTION_PLAN.md)는 시각 참고와 과거 결정 근거. **실행순서는 현행 ATLAS_UI_DELIVERY_PLAN.md가 우선**한다.
- 표형 Person 명부 유지. 메인 초상 카드 그리드 금지. 기존 연도·공간 좌표·Source/Uncertainty·8 분야 의미색/권력 분류 보존.
- P14 영토지도/Geometry는 사용자 재개 전 PARKED. Canonical DB/API/권한/비용에 대한 무단 변경 없음.
- [WORK_EXECUTION.md](../../WORK_EXECUTION.md) 준수: 범위가 좁은 코드 변경→집중 회귀→PR/CI/merge→실제 Production 브라우저 수용. CI나 문서만으로 UI 완료 처리하지 않는다.

## Historical material

UI_CHECKPOINTS.md, UI_WORK_LOG.md, Phase II/III 연구·시안·장식 문서 등은 역사적 근거와 디자인 레퍼런스이며 현재 활성 실행 큐가 아니다.
