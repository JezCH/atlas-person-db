# VIS3-06-R8 — native Chrome 400% 모바일 범례·키보드 접근성 감사

2026-10-11. **결론: 실제 브라우저 11개 조작 장면 PASS, 모바일 정보 접근성 및 400% 포커스 부분 가림 주의. 실제 앱/운영 배포 미변경.**

## 전체 목표·보호 계약

[Phase III 전체 계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md)의 **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**: 역사 인물/정치체/활동의 근거·정확성, 지도·연대표·검색·접근성을 우선하고 장식은 후순위. 기존 R3 DOM 교체 실증 → R4 펼침 상태 시험 → R5 키보드 포커스 시험 → R6 실제 소스 후보 → R7 175/200% breakpoint 분리 → **R8 400%와 정밀도 범례 대체 정보 감사**로 이어짐.

**실제 runtime PR [#2443](https://github.com/JezCH/atlas-person-db/pull/2443)은 DRAFT/미병합**, Vercel Production 배포 금지. 시공간표 VIS3-06-R1 A/B2/재설계 사용자 디자인 승인과 Dashboard VIS3-05R mixed-D 최종 미감 수락도 별도 대기. 역사 데이터 삭제·9 macroregion 균등 폭·140px desktop 연도축·0.748 압축·X/Y unified 500–1500% 앱 camera·8 Person 의미색·P14 PARKED·VIS2-05 watermark OFF 유지.

## 실행 환경

Headed Google Chrome/Xvfb/Openbox, native X11 Ctrl+= / Ctrl+- 실제 **100→200→250→300→400→300→250→200→150→100%**. CSS zoom/CDP 강제 device metrics/가짜 Person 사용 없음. 실제 운영 Person·Activity·CSS는 그대로 두고 Chrome에서 **R6 DRAFT 진짜 `atlas-person-spacetime-view.js` 요청을 Fetch.fulfillRequest로 정확히 1회 교체**. browser-only DOM setter shim 미사용.

동일 HEAD 검증:
- [R8 실제 Chrome #38068056604](https://github.com/JezCH/atlas-person-db/actions/runs/38068056604) **SUCCESS** / [원본 11장 PNG + JSON artifact #11675676824](https://github.com/JezCH/atlas-person-db/actions/runs/38068056604/artifacts/11675676824)
- [R6 키보드 #38068056630](https://github.com/JezCH/atlas-person-db/actions/runs/38068056630), [R7 반응형 #38068056620](https://github.com/JezCH/atlas-person-db/actions/runs/38068056620), [ATLAS Integrity #38068056702](https://github.com/JezCH/atlas-person-db/actions/runs/38068056702) **모두 SUCCESS**
- 실행 스크립트 `scripts/verify-vis3-06-r8-native-400-legend-accessibility.mjs`, Workflow `.github/workflows/atlas-vis3-06-r8-native-400-legend-accessibility.yml`: R6 **초안 브랜치의 시험·증거 전용**, 실제 runtime JS/CSS/DB/API/운영 배포 신규 변경 없음.

## 실제 Chrome 측정

| native zoom | viewport CSS 폭 | mount 폭 | 실제 보이는 Person | 연도 눈금 | 실제 Inspector Activity | 문서 전체 가로넘침 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100% | 1432px | 1149px | 149 | 209 | 2 | 0px |
| 200% | 716px | 697px | 132 | 105 | 2 | 0px |
| 250% | 573px | 555px | 85 | 105 | 2 | 0px |
| 300% | 477px | 460px | 70 | 105 | 2 | 0px |
| 400% | 358px | 344px | 42 | 105 | 2 | 0px |

**11장면 PASS**: 모든 배율에서 실제 Person 선택/Inspector Activity 2, 9개 지역, 앱 camera 500%, `상태 더보기` 키보드 초점·`:focus-visible` 유지. 400%에서도 실제 Enter로 접기/다시 열기 성공; 다시 100% 복귀해 기존 패널 상태 보존. 가시 인물 수는 해당 실제 렌더 구간의 값이지 역사 인물 총수나 동일 연대 표출 수를 의미하지 않는다.

## 별도 사용자 접근성·가시성 주의 사항

**1. 200`400% 범례는 숨겨지나 부분적 설명은 살아 있음.** CSS `@media(max-width:760px)`에서 `details.spacetime-precision-legend`가 `display:none`이 된다. 펼침 `open=true` 상태는 R6 후보 JS가 보존하나 화면/Tab에서는 제외된다. 실제 mount의 텍스트와 CSS 노출을 감사했을 때, 숨겨진 범례 밖에서 **`공간 배치 정밀도`, `Subregion 범위`, `Macroregion 범위`, `점선은 배치 정밀도 범위`의 정확한 구절은 모두 0회**. 일반 `Place` 텍스트는 6회 나왔지만 세 단계 의미 범례를 대체한다는 증거 아님.

**반면 정보가 완전히 전무한 것은 아님.** 실제 가시 DOM에서 개별 시공간 배치 범위 버튼의 유의미한 **`aria-label` 1건**과 Inspector의 별도 공간 정보 해석 주의문 1건을 확인했다. 이는 특정 데이터 점의 정밀도/주의를 설명하지만, **Place·Subregion·Macroregion 전체 분류 설명을 동등하게 제공한다고 증명되지 않는다**. 보조공학으로 해당 이름이 실제 발표되고 도달 가능한지, 전체 WCAG 1.4.10·2.4 계열 준수 여부는 이번 CSS/DOM 감사만으로 판정 불가.

**2. 400%에서 `상태 더보기` 포커스 표시·키보드 조작은 유지되지만 컨트롤 하단이 일부 잘림.** 400% 두 장면에서 `:focus-visible=true` / 실제 Enter 토글 성공이나, active summary 전체 bounding rectangle의 브라우저 viewport 내 포함 `focusInViewport=false`. 해당 Chrome PNG의 400% 화면 하단에 버튼 일부가 잘려 나타나며, 문서 전체 가로넘침 0과는 다른 문제다. 실제 스크롤로 언제나 완전한 초점 가시성을 확보하는지 추가 검증 필요; 이를 당장 확정된 WCAG 위반이라고 단정하지 않는다.

결과 표기: **기능 11/11 PASS, 범례 세 정의 노출 누락 WARN, 400% focused summary 부분 가림 WARN 2장면.** 시험에서 자동발견한 Warning은 엄격한 기능 결과와 분리. 스크린리더/VoiceOver/NVDA 전수 검사, 400% 모든 기종/화면비, 모든 인터랙션·WCAG AA 인수는 아직 완료 아님.

## 종결·정확한 재개점

R8의 **소스 근거 조사와 실제 Chrome 시험 완료**. R6 실제 코드 후보와 R7/R8 전용 regression은 [DRAFT #2443](https://github.com/JezCH/atlas-person-db/pull/2443)에만 유지, 출시/병합 불허 상태. 다음 작은 독립 작업 후보는 **400% 키보드 초점 컨트롤이 아래로 잘리는 실제 스크롤·클리핑 기제**의 원인 추적과, 세 단계 범례를 모바일에서도 동등하게 제공하는 접근성 설계 대안 비교. R7의 175% CSS/JS 경계 불일치 해결은 별도 UX 선택 과제.

VIS3-06-R1 A/B2/재설계·Dashboard mixed-D 최종 미학 **사용자 결정 대기**, 이후 **VIS3-07 지역·시대 → VIS3-08/09 인물 상세·출처 → VIS3-10/11 정치체 → VIS3-12/13 탐색·상호작용 → VIS3-14 문화 → VIS3-15 모바일 → VIS3-16 회귀/접근성 → VIS3-17 운영 인수** 전체 로드맵 불변.
