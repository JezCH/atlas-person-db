# VIS3-06-R0 — 실제 키보드·표시 기준 패널 A/B2 비배포 확인 (2026-10-10)

> **단위 완료 — 비배포 기술 검증 PASS; 최종 사용자 미학 승인 미완료.** [Chrome #38035327074](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074) SUCCESS, [Integrity #38035326991](https://github.com/JezCH/atlas-person-db/actions/runs/38035326991) SUCCESS, [스크린샷 8장+JSON / GitHub artifact #11663435707](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074/artifacts/11663435707). 실제 app data/API/CSS/JS/DB는 수정하지 않음.

## 전체 목적과 재개 위치

ATLAS Phase III v2.0의 목표는 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**다. 역사 자료의 실제 읽기·탐색과 시각적 독창성을 함께 높이되, 장식 때문에 시간축·정치체·활동 인물 데이터의 신뢰도나 조작 성능이 떨어지면 안 된다. VIS3-06-P/P2/P3는 각각 개념 검토 → 실제 비어 있지 않은 시공간표 라벨/선택 → **가로 184px×32px B2 관측기구 명판**의 동일 실제 Production DOM 기하 비교를 마쳤다. B2 원본 [원본 SVG](../../experiments/vis3-06/b2-observatory-toolrail-plate.svg)만 있고 현재 운영 CSS에는 적용하지 않았다.

## 이번 단위와 보호 조건

이번 R0는 실제 브라우저의 **Tab 3회 이동과 포커스 표시, 기존 '표시 기준' summary 클릭으로 패널 열기/닫기, 실제 Person 이름표 클릭 후 Inspector 선택**을 A(현행)/B2(Chrome만 임시 CSS 장식) 상태에서 측정한다.

- Chrome 테스트 파일: `scripts/verify-vis3-06-r0-interaction-preview.mjs` — 기존 P3 검증에서 source-level 브라우저 제어를 재사용. 실제 `#atlas-spacetime` Production 데이터를 불러오고 검색→Person 이동→밀집 실제 가상화 레이블 확보→선택/패널 펼침 수행. **운영 API/DB 쓰기 없음**.
- 전용 GitHub Actions: `.github/workflows/atlas-vis3-06-r0-interaction-preview.yml`. 운영 파일, index/JS/CSS, asset-loader, 브라우저 저장소, 데이터 엔터티, Vercel 배포 모두 수정하지 않음.
- 실제 화면 390/1440 CSS px에서 펼친 표시 기준+Person 선택, 접힌 표시 기준+실제 Tab 포커스 후 Person 선택을 동일 DOM에서 A/B2 비교. 목표 **2폭×2상태×2안=8 사례 + 실화면 PNG 8장**.
- **Fail-closed**: 실제 이름표 0개, 검색 결과 미확정, 실제 `details.open` 불일치, Tab이 조작 버튼을 방문하지 못함 또는 `:focus-visible`을 하나도 확보하지 못함, A/B2 사이 제목/포커스/설명문/버튼/활동 Inspector/지역/연대/카메라/스크롤 기하 차이, B2가 검색·버튼·펼친 패널의 실제 텍스트 위로 나타남, focusable element 증가, `pointer-events:none` 위반 시 시험 실패.
- 실현 불가능한 브라우저 고유 125/150% native page zoom을 흉내낸 값은 실측 증거로 인정하지 않는다. 이번 R0의 브라우저 명령은 **CDP Input.dispatchKeyEvent(Tab)**로 브라우저에 실제 키 이벤트를 전달하여 포커스 이동 여부를 검사하는 것에 한정한다.

불변 계약: Spacetime 500~1500% X/Y 동일 카메라, 공통 compression 0.748, 9 macroregion 균등 폭, 140px 좌측 axis, 8개 의미색, 전체 Person/Polity/Activity/Place 사실값, P14 PARKED_BY_USER, VIS2-05 watermark REJECT/OFF.

## 정식 승인 게이트

B2가 모든 R0 체크를 통과하더라도 **기술상 비배포 승인**이지 사용자의 디자인 선택이나 운영 배포 지시가 아니다. VIS3-05R mixed-D Dashboard 최종 사용자 시각 승인도 별도로 대기한다.

다음 정확한 재개점은 승인받을 준비가 된 A/B2 시각 비교를 사용자에게 제시하고 독립적인 디자인 선택/배포 승인을 확인하는 `VIS3-06-R1`; 별도 선택/승인 이전에는 UI CSS·Vercel 배포나 VIS3-07~17 기능 구현을 시작하지 않는다. 실제 브라우저 확대율과 WCAG 접근성 전체 검증은 그 이후에 진행한다.

## 실행 결과

자동 Chrome 및 Integrity CI 실행 이후 실제 측정값·경고·아티팩트와 PR 병합 증거를 기록한다.

## 2026-10-10 실제 Production Chrome 실측 결과

[실제 Chrome 실행 #38035327074](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074)에서 정상적인 Production 실제 인물 데이터로 **390px 및 1440px, 펼친 '표시 기준'+Person 선택 / 닫힌 '표시 기준'+Tab 키 포커스+Person 선택, A 및 B2의 2×2×2=8개 사례 전부 PASS**. 스크린샷 8장 및 JSON 원본은 [artifact #11663435707](https://github.com/JezCH/atlas-person-db/actions/runs/38035327074/artifacts/11663435707).

| 운영 실화면 상태 | 실제 가시 Person 이름표 | Inspector | 패널 및 Tab | B2/실제 텍스트·컨트롤 간섭 |
| --- | ---: | --- | --- | ---: |
| 390px 열린 패널 | 69 | selected / Activity 1 | summary `open=true`, 설명문 85자 | 0px² (장식 숨김) |
| 390px Tab 포커스 | 69 | selected / Activity 1 | 줌 축소 → 줌 확대 → summary; 모두 `:focus-visible=true` | 0px² |
| 1440px 열린 패널 | 195 | selected / Activity 1 | summary `open=true`, 설명문 81자 | 0px² |
| 1440px Tab 포커스 | 195 | selected / Activity 1 | 줌 축소 → 줌 확대 → summary; 모두 `:focus-visible=true` | 0px² |

A/B2 장식 차이를 제외하면 실제 입력·버튼·요약 포커스·설명문 문자열/실측 rect·활동 Inspector/인물 레이블·9 macroregion·연도축·카메라/스크롤·문서 전체 폭 및 focusable 수가 **완전히 동일**했다. 1440px B2 원호/세공의 실제 decorative bounding box는 `[904,139,184,32]`; 그 영역과 기능 요소/펼친 패널의 가시 문구의 충돌 면적은 **0px²**이다. 390px 장식은 숨김 정책대로 발생하지 않음. 인물/권역/연대 자체의 전체 WCAG AA 적합성까지 의미하는 결과는 아니다.

시험 러너 최종 `VIS3_06_R0_INTERACTION_PASS`는 `cases:8, images:8`을 출력했고, Tab 순회는 실제 CDP `Input.dispatchKeyEvent`로 키를 전송하여 조작 버튼 포커스가 나타난 것을 증명했다. 이 장식은 구동되는 게이지나 역사 시대 지시자가 아닌 순수 보조 장식이다.

**잔여:** native Chrome page zoom 125/150%는 이 단위에서 **시험하지 않음**. 소수의 Tab 키 순회가 전체 키보드/스크린리더 접근성 감사를 대신하지 않으며 장문 정보·국제화·성능도 후속 승인 단계 과제다. Dashboard VIS3-05R mixed-D의 사용자 최종 시각 수락과 시공간표 A/B2 스타일 선택은 별개의 **인간 승인 조건**이다.

**정확한 다음 단위 `VIS3-06-R1`:** 사용자에게 이미 확보한 실제 1440px A/B2 비교와 모바일 숨김 정책, 펼친 표시 기준·선택 인물 화면을 제시하여 시각 디자인을 확정할지 확인한다. 사용자 별도 승인 전에는 **운영 Spacetime CSS/JS/Vercel 미변경**, P14 PARKED_BY_USER 및 워터마크 OFF 유지. 승인 후 한정 스코프 실구현→native 125/150% browser zoom/전량 keyboard·WCAG→Production acceptance를 별도 독립 단위로 진행하고, Phase III VIS3-07~17 순서를 이어간다.
