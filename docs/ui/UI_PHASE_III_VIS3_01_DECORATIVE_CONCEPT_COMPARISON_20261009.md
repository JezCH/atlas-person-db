# VIS3-01 — 고지도·천문기구·장식 필사본 시안 A/B/C 실증 비교 보고서

> **상태:** `CONCEPTS_RENDERED / USER_DIRECTION_SELECTION_PENDING` — 디자인 3안 제작 완료, 실제 제품 미구현
>
> **범위:** VIS3-01 단일 작업. A/B/C 화면 시안, 사용성/기능 보호 기준, 선택용 비교표. UI·CSS·데이터·DB·캐시·역사 인물 초상·카메라·화면 구조 실제 수정 0.
>
> **기초 자료:** [VIS3-00 검증된 캡처](UI_PHASE_III_VIS3_00_PRODUCTION_VISUAL_BASELINE_20261009.md), [42개 레퍼런스 보드](UI_PHASE_III_ORNAMENT_REFERENCE_BOARD_20261009.md), [실행계획](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md), [A/B/C 독립 SVG 장식 원화](VIS3_01_ORNAMENTAL_SIGNATURE_STUDIES.svg).

## 1. 실제 화면을 이용한 시안 제작 — 검증된 출처

- Chrome으로 수집된 구 Production: [VIS2-13 액션 #37899108152](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152), 화면 소스 SHA `6b16b894e427fab6b15e3a3d0b6c000f6cb9e365`, [실제 스크린샷 ZIP 아티팩트 #11602595861](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152/artifacts/11602595861).
- VIS3-00 전수검토 시점 최신 Production `9f20916756c7c6f638cc85d219eba4f3f2d2bb4d`는 시각 UI 관련 frontend 소스 변경 없이 READY였지만 당시 Chrome을 새로 호출한 것은 아니다. 따라서 **최신 데이터의 새로운 브라우저 캡처라는 뜻이 아니다**.
- VIS3-01 제작 결과: **3안 × 3영역 × 2화면크기 = 18개 SVG/PNG**, 데스크톱 통합 보드 1장, 모바일 통합 보드 1장, SHA256 provenance manifest 1개, 별도 미술적 무드보드 1장.
- 각 SVG에 `data:image/png;base64,...`로 들어간 **원본 스크린샷 이미지 바이트를 다시 디코드해 SHA-256으로 대조했다**. 동일한 화면/뷰포트 3안 모두 **같은 원본 스크린샷 SHA**를 사용한다. 모든 18 PNG가 디코드되고 결과 ZIP CRC도 통과했다.
- UI 배경의 실제 Person/Activity/Polity/통계/시공간 레코드는 **스크린샷 그대로**. SVG는 그 위에 **시각적 비상호작용 장식층**을 겹친 디자인 시안이다. 장식층이 있는 코너/가장자리에서는 원본 픽셀 일부를 덮을 수 있으나 **새로운 역사 데이터는 만들지 않는다**. 추가 콘셉트 표제 밴드는 비교판의 외부 캔버스에만 추가되며 **현재 앱 DOM에 존재하는 UI를 연기하지 않는다**.
- 별도의 스타일 탐색 무드보드는 창작 이미지다. 디자인 참고용이며 **숫자/인물/지도/초상·운영 상태 등이 실제 Production의 레코드가 아님**. 이 무드보드는 Source 정확성 평가 대상이 아니다.
- 대화 전달물: `VIS3-01-ornamental-concepts.zip`에 PNG 18, 벡터 원본 SVG 18, 데스크톱/모바일 A/B/C 보드, SHA-256 manifest, 무드보드, README 포함. 위 GitHub 아티팩트는 **기존 Production 원본**이고 이번 VIS3 ZIP은 대화 전달물로 구분한다.

## 2. 콘셉트 A / B / C — 디자인 성격 비교

| 관찰 요소 | A Grand Atlas | B Chronometer | C Illuminated Codex |
| --- | --- | --- | --- |
| 조형 문법 | 세공된 지도 제목 카르투슈, 바람장미, 고지도 조각형 모서리, 쌍선 | 아스트롤라베 다중 눈금, 중심축, 링, 장치 외곽 엔그레이빙 | 장식 머리글자, 식물문, 섬세한 여백 채색, folio border |
| 색채 자산 | 샴페인/고색 황동과 검정 먹색, 제한된 따뜻한 색 | 청록빛 산화금속·은회색·브라스, 기존 dark field | 금색 장식의 중성화 + 조절된 청색/적색 포인트, 어두운 도록 용지 |
| 최적 화면 | 전체 입구·대시보드·정치체 | 시공간표·기준 눈금·미니맵 도구 테두리 | 인물 상세·전기 연대기·출처 |
| 위험 | 큰 카르투슈가 대량 인명록을 침범/국가 서열로 오인 | 별자리/천문 시계처럼 잘못된 역사 좌표를 암시 | 다른 문화권에 유럽 필사본 문법 강요·경전 문양 오용 |
| A/B 장식 가시성 | 큰 표제 장식·코너 형상으로 분명한 도판 진입부 | 원형 기구 및 외곽 캘리브레이션으로 특별한 시간 도구 인상 | 화려한 컬러 여백장식, 이야기형 상세 |
| 사용자 선택 시 권장 역할 | 모든 화면에 적용하는 배경이 아니라 **atlas masthead/flagship** | **Spacetime 전용 visual signature** | **Person Detail 전용 visual signature** |

**추천 혼합안:** A를 글로벌/대시보드/Polity 표제에, B를 Spacetime 외부 도구 크롬에, C를 인물 상세의 전기적 전환부에 배치. 고밀도 인물 메인은 각 시대 구분 헤더에서만 중립적인 A의 장식을 사용한다. 이는 사용자 승인 **후보**이며 아직 확정된 지침이 아니다.

## 3. 동일 Production 데이터를 사용한 화면별 관찰

### 대시보드 (1440×1100, 390×844 원본)
- 원본은 **6개 현재 KPI**와 대시보드 도구를 유지한다. 시안 A는 지도의 제목 명판/나침반식 장식, B는 눈금과 원반, C는 채색된 도록 장식이 같은 배경에 올라간다.
- 시안 단계에서는 원래 카드/값을 조작하지 않았다. 충분한 차별화를 구현하려면 후속 VIS3-04/05에서 권두와 정보 장부를 구조적으로 다시 편집해야 한다. **이번 오버레이만으로 고급화 목표를 전부 달성했다고 판정하지 않는다.**

### 시공간표 (1440×1000, 390×844 원본)
- 동일한 **500% 화면**의 원래 연대축·지역 분할·인물 트랙·미니맵을 보존한다. 이 시안에서 장식은 차트 외곽/헤더의 관측기구 언어로 제시한다.
- 확장 개념은 기존 정확한 500/1000/1500% 및 East Asia/Europe 픽셀 회귀를 해치지 않는 범위. 내부 인물 라벨·X/Y·지역 폭 변경 금지.
- 제안 B가 화면의 정체성과 기능 해석을 가장 잘 연결한다. **기구형 원형 장식은 실제 사용자에게 천문학 데이터나 좌표를 뜻한다고 오해되지 않도록 설계**한다.

### 인물 상세 (1440×1000 진짜 이미지 있음 / 390×844 실제 미보유 초상 상태)
- 데스크톱 원본은 **이순신이라는 실제 Production 표제/연대와 등록된 초상 이미지**를 사용하고, 모바일 원본은 다른 **실제 Person no-portrait** 데이터를 사용한다. 모바일 캡처를 데스크톱과 똑같은 인물이라고 주장하지 않는다.
- C는 실제 이미지가 있는 경우에만 도록형 외곽 세공과 필사본 테두리, 이름/활동 전환부를 장식하는 방향. 무초상 모바일 장면에 가짜 얼굴/가짜 인물 초상 삽입 금지.
- 정보·활동·출처를 도록식 편집으로 확장하는 실제 UI 변경은 사용자 방향 채택 뒤 VIS3-08/09로 진행한다.

## 4. 원본 정확성을 유지하는 실제 구현 전제

1. 비교를 위한 **콘셉트 외부 헤더는 실제 앱 DOM이 아님**; Phase III 구현 시 기존 viewport 안에서 header/shell과 합쳐야 한다. 현재 화면을 세로로 밀어내거나 고밀도 인물표의 가시 레코드 수를 줄여서는 안 된다.
2. 스크린샷 충실도의 일부 효과는 미리보기 성격; 후속 화면별 작업에서 모든 필터/버튼/스크린리더 semantics/hit targets를 CSS/DOM 재구현할 때 검증한다.
3. 메인 인물표 **고밀도 행/열/정렬/검색/선택/8색 분야** 불변. 주로 시대 헤더 #15 #16에만 장식.
4. 시공간표 **500–1500% 줌, 통합 X/Y 카메라, 공통 0.748 압축, 9 거시지역, axes/LOD** 불변.
5. 인물 초상은 정확한 등록된 실제 자산만 사용. 새 이미지/문장/왕관·국장·정치체 연속성 가공 금지.
6. 장식은 `aria-hidden`, `pointer-events:none` 순수 장식으로 분리. 기존 `:focus-visible`, reduced-motion, WCAG 대비 목표, 390/768/1440/1600 화면 폭 유지.
7. 기존 `ATLAS_UI_VISUAL_GUIDELINES.md`의 과도한 장식 억제 규칙은 **사용자가 시안을 선택한 다음 VIS3-02에서 별도 합의에 따라 개정**한다. 현재 가이드는 변경하지 않는다.
8. 종교적·문화권 특유 실재 신성 문양을 일반 장식으로 복제하지 않는다. 이번 독립 시그니처 SVG는 직접 그린 **세속적 추상 기하/식물문**만 포함한다.

## 5. 출처 / 아이디어와 구현의 분리

- [David Rumsey Map Collection](https://www.davidrumsey.com/view): 역사 지도 프레임·도판·카르투슈의 연구 출발점.
- [Met Heilbrunn Timeline](https://www.metmuseum.org/ko/toah/about): 연대·지역·주제 통합 기록 구조.
- [The Met historical astrolabe](https://www.metmuseum.org/art/collection/search/451699): 천문 계측기구의 실제 황동 눈금/장식 참조.
- [Rijksmuseum Collection Online](https://www.rijksmuseum.nl/en/about-collection-online): 미술관 도록·자료 표시.
- [British Museum collections](https://www.britishmuseum.org/collection): 유물의 기록·전시 맥락.
- [National Museum of Korea](https://www.museum.go.kr/ENG/contents/E0402000000.do?relicId=1340&schM=view&searchId=search): 동아시아 문화권 별도 장식 참고.

이 출처들은 **시각 조형 아이디어의 레퍼런스**일 뿐, 이번 스크린샷의 개별 역사 정보 내용이나 사용자의 데이터가 맞는지 검증하는 출처가 아니다.

## 6. 고급화 관점에서의 미완료 및 사용자 의사결정

- 현재 **A/B/C 세 방향의 원본 유지 스크린샷 비교 시안 제작**은 완료됐다.
- 장식이 있는 부분을 의도적으로 크게 만든 **상징 원화 SVG**도 제작했으나, 이 SVG는 제품을 배포한 상태가 아니다.
- 만약 가로·세로로 빽빽한 원래 Production 화면에서는 장식 효과가 작게 느껴진다면, 그 자체가 중요한 피드백이다. VIS3-03~05에서 단순 프레임 증설 대신 **공간 사용/권두 구조/타이포 비례**를 실제로 재설계해야 한다.
- 세 가지 시안 중 하나를 고르거나 화면별 혼합안(A 공통, B 시공간, C 상세)을 승인받으면 다음 `VIS3-02`에서 **canonical ornament-budget 개정**. **승인 전에는 디자인 가이드 변경이나 UI 구현으로 넘어가지 않는다.**

**VIS3-01 정리:** CONCEPT WORK COMPLETE, **STYLE SELECTION PENDING USER**. 이것은 Phase III 최종 미학 합격이나 실제 Production 업데이트를 뜻하지 않는다.
