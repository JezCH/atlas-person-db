# VIS3-06-R9 — 실제 Chrome 400% 포커스 부분 가림 원인과 스크롤 복구 검증

**2026-10-11 · 실제 GUI Chrome 조사 종결 · 운영 UI/역사 데이터 미수정.**

## 전체 Phase III 목적과 보호 경계

[전체 실행계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 Restrained Grand Atlas × Precision Chronometer × Editorial Codex는 역사 Person/Polity/Activity/Place 데이터의 정확성, 시공간 연대·지역 탐색 및 조작의 가독성을 최우선으로 삼고 역사적 장식은 그 다음이다. R3 DOM 교체 → R4 상태 복원 → R5 키보드 포커스 → R6 실제 앱 JS 후보 → R7 175/200% 반응형 전환 → R8 400% 가시성 감사에 이어 R9는 **400% 초점 가림의 스크롤 원인과 복구**를 조사했다.

9 macroregion 동등 폭, 140px desktop 연도축, 압축 0.748, X/Y unified 500–1500% 카메라, 8가지 Person 의미색, P14 PARKED, VIS2-05 watermark OFF, 역사 데이터 무단 삭제 금지. 사용자 VIS3-06-R1 A/B2/재설계 미학 결정과 Dashboard VIS3-05R mixed-D 최종 시각 수락은 여전히 대기. [R6 runtime DRAFT PR #2443](https://github.com/JezCH/atlas-person-db/pull/2443)은 **미병합·운영 미배포**.

## 실제 시험

- Headful Chrome/X11 native 키보드 확대 **100→200→300→400→200→100%**. CSS zoom/CDP 강제 DPR 없음.
- Production의 실제 인물·Activity·지리/연대·CSS를 유지하면서 R6 DRAFT의 실제 JS만 CDP Fetch로 **정확히 1회** 대체. 실제 운영 소스/DB/Vercel 수정 없음.
- 초점 SUMMARY의 bounding rectangle, CSS viewport 높이, HTML/조상 overflow/scrollTop·scrollHeight, document hit-test, 실제 keyboard Enter, Person Inspector Activity·9권역·앱 500% 카메라 검사.
- 두 가지 **시험 브라우저 내부 진단 명령**만 사용: summary.scrollIntoView(block nearest) / 문서 scrollBy(top 12). 운영 코드에 두 명령을 추가하지 않음.

## 실측 핵심 수치

| 상황 | CSS viewport 높이 | summary top / bottom | 문서 scrollY | viewport 아래 가림 |
| --- | ---: | --- | ---: | ---: |
| native 400% 확대 직후 | 188px | 169.25 / 191.25px | 0 | **3.25px** |
| native scrollIntoView(nearest) | 188px | 166.25 / 188.25px | 3 | **0.25px** |
| 추가 12px 문서 스크롤 | 188px | 154.25 / 176.25px | 15 | **0px** |
| 진짜 Enter로 상태 더보기 닫음 | 188px | 132.25 / 154.25px | 15 | 0px |
| 진짜 Enter로 다시 열음 | 188px | 154.25 / 176.25px | 15 | 0px |

100% viewport 높이 753px, 200%는 376px, 300%는 251px, 400%는 188px. 400%에서 document scrollHeight **3280px / clientHeight 188px**이므로 문서는 수직 스크롤 가능했지만 실제 focused summary는 하단으로 약 3.25px 내려가 있었다. HTML scrolling element를 native scrollIntoView가 3px 이동시켰으며 단지 0.25px(반올림/소수점 좌표 경계 추정)만 남았다. 12px 추가 스크롤로 완전히 가시화되었고 실제 focus-visible, Enter 닫기·재열기 및 100% 복귀 시에도 유지됐다. 실제 Inspector Activity **2건**, **9 macroregion**, 앱 500% 카메라 보존.

## 소스 수준 원인 및 수정 후보의 판정 범위

현재 R6 후보의 restoreRenderFocus는 재렌더 후 summary에 focus({preventScroll:true})를 사용한다. Native page zoom에서 viewport가 작아졌을 때 포커스는 복원해도 문서 세로 스크롤을 동기화하지 않으므로 요소 하단이 가릴 수 있다는 설명이 **코드와 실제 DOM 계측에 부합**한다. 모든 브라우저·화면 크기에서 반드시 동일한 인과라고 단정하지 않는다.

**후속 최소 코드 제안(운영 미적용):** 실제 focused summary의 bounding box가 viewport 경계를 넘어설 경우에만 8–12px 여유를 포함한 *문서 세로* scroll adjustment. 이미 보이는 요소, 사용자의 다른 스크롤 위치, 시공간표 내부의 통합 카메라 X/Y 스크롤을 침범하면 안 된다. 별도 비배포 시험에서 browser resize 반복·focus-visible·키보드 Enter·스크린리더·가상화·실인물 Inspector를 검증한 후에만 승인된 앱 수정 PR로 진행. 이번 R9에서는 수정하지 않았다.

## QA 완료/실패 및 재개점

[최종 R9 GUI Chrome #38069371060](https://github.com/JezCH/atlas-person-db/actions/runs/38069371060) **SUCCESS**, [R6 Keyboard #38069371151](https://github.com/JezCH/atlas-person-db/actions/runs/38069371151), [R7 responsive #38069371411](https://github.com/JezCH/atlas-person-db/actions/runs/38069371411), [R8 native400 #38069371065](https://github.com/JezCH/atlas-person-db/actions/runs/38069371065), [ATLAS Integrity #38069371028](https://github.com/JezCH/atlas-person-db/actions/runs/38069371028) **동일 HEAD 전부 SUCCESS**. [R9 PNG 10장·JSON artifact #11676053805](https://github.com/JezCH/atlas-person-db/actions/runs/38069371060/artifacts/11676053805). WARNING: 원래 400% 3.25px 가림 및 기본 nearest scroll 후 0.25px 잔여; 추가 12px 문서 스크롤로 해소.

[첫 R9 #38069231999](https://github.com/JezCH/atlas-person-db/actions/runs/38069231999) **FAIL**: 400% 좌표와 3px 스크롤 측정은 유효했으나 400→100%를 7회 이내에 직접 되돌리는 테스트 helper가 실제 Chrome 단계 수를 초과해 실패. 400→200→100% 두 단계로 수정하고 추가 12px 스크롤 확인 후 최종 통과. 선행 FAIL을 제품 결함이나 성공으로 재분류하지 않았다.

R9 **실제 원인 조사/복구 가능성 입증 종결**. 다음 독립 작은 단위는 조건부 포커스 세로 스크롤 보정의 **비배포 R10 회귀 시안**, 추가로 R8 모바일 장소·하위 권역·광역 권역 범례 정보 접근성, R7 JS/CSS breakpoint 미일치 분리 처리. **A/B2 미학 선택·Dashboard D 최종 수락 대기**, VIS3-07 지역·시대 → VIS3-08/09 인물·출처 → VIS3-10/11 정치체 → VIS3-12/13 탐색·상호작용 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 통합감사 → VIS3-17 Production 인수 전체 로드맵 유지.
