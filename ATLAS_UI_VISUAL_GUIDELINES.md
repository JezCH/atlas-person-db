# ATLAS UI Visual Guidelines

> **Status:** Canonical  
> **Version:** 1.0  
> **Scope:** ATLAS UI visual design only  
> **Design thesis:** **Monumental Chronographic Modernism**  
> **Korean working name:** **기념비적 역사 연대 모더니즘**

---

## 0. Purpose

ATLAS UI의 목적은 단순히 역사 데이터를 보기 좋게 정리하는 것이 아니다.

사용자가 화면을 처음 보았을 때:

> **“인류의 역사가 하나의 거대한 구조로 눈앞에 놓여 있다.”**

라는 감각을 받아야 한다.

그러나 장엄함 때문에 탐색성과 사용성이 희생되어서는 안 된다.

10분 이상 사용했을 때에는:

> **“정보를 찾고 비교하는 데도 빠르고 정확하다.”**

라는 인상을 동시에 주어야 한다.

따라서 ATLAS는 다음 세 가지를 동시에 만족해야 한다.

1. **Monumental** — 인류사라는 대상의 위대함·숭고함·무게
2. **Chronographic** — 장엄함을 장식이 아니라 시간·연대·이름·관계 구조로 표현
3. **Modern** — 고전 양식을 직접 복제하지 않고 현대적 추상·기하학·타이포그래피로 재해석

---

# 1. Scope Lock

이 가이드라인은 **시각 디자인만** 다룬다.

다음은 변경 대상이다.

- layout
- spacing
- typography
- surface
- border
- hierarchy
- contrast
- visual rhythm
- icons
- decorative line
- hover / selected / focus state
- motion
- visual density
- color application
- era/domain visual treatment

다음은 이 가이드라인의 변경 대상이 아니다.

- DB
- API
- 역사 데이터
- Person / Activity / Polity identity
- chronology
- spatial placement
- search logic
- filter logic
- runtime/compile logic
- representative_domain 판정
- era 판정
- 데이터 field 추가·삭제

**기능과 데이터는 유지하고, 보이는 방식만 개선한다.**

---

# 2. Fundamental Product Narrative

ATLAS는 메인과 상세에서 서로 다른 감정을 만들어야 한다.

## Main

> **인류 전체를 기념비화한다.**

메인에서 중요한 것은 개별 얼굴이 아니라:

- 이름
- 연대
- 위치
- 시대
- 분야
- 역사적 관계
- 시간의 흐름

이다.

메인에는 **인물 초상을 사용하지 않는다.**

초상 없이도 이름과 시간 자체가 기념비처럼 느껴져야 한다.

## Selection

> **수천 명 중 한 이름이 역사에서 튀어나온다.**

평상시에는 전체 구조가 주연이고,
선택 순간에 특정 인물의 시각적 존재감이 강화된다.

## Detail

> **그 이름이 비로소 한 인간이 된다.**

인물 상세페이지에 들어갔을 때 처음으로 초상이 등장한다.

따라서 초상은 메인 장식이 아니라 **상세 진입의 보상과 전환 장치**다.

---

# 3. Reference Philosophy

ATLAS는 하나의 사이트를 복제하지 않는다.

각 레퍼런스 계열에서 서로 다른 장점을 가져온다.

## Institutional / Museum Systems

Met, MoMA, Rijksmuseum, Nobel, Royal Society 등에서 가져올 것:

- 대규모 정보 구조
- 검색성
- 연대·분류 체계
- 반복 가능한 정보 밀도
- 수천 개 항목에서도 무너지지 않는 hierarchy

가져오지 않을 것:

- 백색 문서 사이트 느낌
- 단순 링크/표 중심의 밋밋함
- 시각적 감정이 제거된 archive UI

## Games / Hall of Fame / Premium Digital Identity

Hall of Legends, The Game Awards, Destiny, Age of Empires IV, Civilization VII 등에서 가져올 것:

- monumental scale
- 강한 hierarchy
- ceremonial selection
- 얇은 metallic accent
- 어두운 field
- restrained glow
- expressive typography
- 긴장감 있는 negative space
- 선택된 항목의 명확한 존재감

가져오지 않을 것:

- particle 남발
- loot / rarity UI
- collectible card aesthetic
- giant promotional hero image
- 과도한 bevel
- 판타지 ornament
- 이벤트 랜딩페이지 같은 일회성 연출

## Core Synthesis

> **기관은 뼈대, 게임·Hall of Fame은 영혼이다.**

정보 구조는 기관 수준으로 엄격하게,
시각 정체성은 AAA game / Hall of Fame 수준으로 강하게,
인터랙션은 현대 productivity/data tool 수준으로 빠르게 만든다.

---

# 4. The Hall Is Not a 3D Hall

ATLAS는 3D 공간이 아니다.

따라서 다음을 화면에 직접 모사하지 않는다.

- 기둥
- 대리석 홀
- 실제 액자
- 아치
- 천장
- 왕궁
- 복도
- 물리적 전시장
- 가짜 박물관 벽

이것들은 쉽게 skeuomorphism과 theme-park aesthetic으로 간다.

ATLAS에서 고전 건축의 역할은 **형태가 아니라 질서**로 번역한다.

예:

- 기둥 → 반복되는 vertical rhythm
- 긴 회랑 → chronology axis
- 명판 → name hierarchy
- 조명 → selection/focus contrast
- 전당의 여백 → negative space
- 금속 장식 → hairline metallic accent
- 시대 상징물 → small glyph / seal

---

# 5. Content Itself Must Become Design

일반적인 UI는 content 주변에 design을 추가한다.

ATLAS는 반대로 간다.

> **역사 데이터 자체를 시각적 재료로 승격한다.**

## Year = Structure

연도는 단순 숫자가 아니다.

큰 연도, 시대 경계, 연도 간격은 화면 구조물이 된다.

## Name = Monument

인물 이름은 메인의 가장 중요한 시각 오브젝트다.

액자보다 이름 자체가 강해야 한다.

## Line = Architecture

chronology line, divider, rail, region boundary가
고전 건축의 질서감을 대신한다.

## Domain Color = Heraldry

분야색은 장식이 아니라 의미를 전달하는 heraldic cue로 사용한다.

## Era Icon = Emblem

시대 아이콘은 큰 배지가 아니라 작은 상징 표식으로 사용한다.

## Selection = Spotlight

화면 전체가 항상 장엄하면 아무것도 장엄하지 않다.

선택 상태가 spotlight 역할을 한다.

---

# 6. Main UI — No Portrait Rule

메인 화면에서는 Person portrait를 사용하지 않는다.

금지:

- portrait card grid
- 얼굴 썸네일 반복
- 인물마다 액자 카드
- 인물마다 hero treatment

메인의 시각 단위는 다음이다.

- Person name
- chronology
- relation/role metadata
- domain accent
- era context
- historical position

즉 메인의 웅장함은 **인물 얼굴의 집합이 아니라 이름과 시간의 집합**에서 나와야 한다.

---

# 7. Avoid the Commodity Catalogue

인류사를 다음처럼 보이게 하면 안 된다.

```text
□ □ □ □
□ □ □ □
□ □ □ □
```

사람마다 강한 사각 card 하나를 주는 방식은
규모가 커질수록 상품 catalogue, collectible deck, e-commerce grid처럼 보인다.

따라서 기본적으로:

- card chrome 최소화
- 독립 box 남발 금지
- 큰 surface 안에서 이름과 metadata를 직접 배치
- divider / spacing / alignment로 그룹을 만든다

카드는 다음과 같은 **국소 UI**에서만 적극 사용한다.

- inspector
- search result
- focused selection
- detail subpanel
- compact mobile fallback

---

# 8. Monumental Register

단순 나열과 기념비적 register는 다르다.

나쁜 예:

```text
이순신
세종
정약용
장보고
```

좋은 방향:

```text
────────────── 1500

이순신
1545 — 1598
조선 · 군사

────────────── 1550

             도요토미 히데요시
             1537 — 1598
             일본 · 통치

────────────── 1600
```

차이는 장식이 아니라:

- chronology
- alignment
- spatial rhythm
- name hierarchy
- metadata suppression
- negative space

에서 나온다.

> **이름이 역사 속에서 차지하는 자리 자체가 composition이어야 한다.**

---

# 9. Visual Hierarchy

기본 우선순위:

1. **역사 전체 구조**
2. **시대 / chronology**
3. **Person name**
4. **selection/focus**
5. **primary historical metadata**
6. **secondary metadata**
7. **UI chrome**

UI chrome이 역사 데이터보다 강하면 실패다.

---

# 10. Typography

ATLAS의 가장 중요한 디자인 자산은 typography다.

## Display / Historical Layer

다음에 사용:

- Person name
- Era heading
- Major year
- Section title
- selected historical object

성격:

- 품위
- 높은 가독성
- 기념비성
- 과도한 고전풍 금지

serif 또는 serif 성격의 display typography를 사용할 수 있다.

## Interface Layer

다음에 사용:

- filters
- controls
- numbers
- metadata
- buttons
- admin information
- utility labels

성격:

- clean sans
- high legibility
- neutral
- compact

## Principle

> **기념비적 serif/display + 현대적 sans UI**

두 층이 명확하게 분리되어야 한다.

---

# 11. Scale Creates Grandeur

웅장함은 ornament보다 **scale contrast**에서 만든다.

작은 정보와 큰 정보의 차이를 충분히 둔다.

예:

- utility metadata → 작고 조용함
- Person name → 확실히 큼
- Era/year → 구조적 scale
- selected object → 주변보다 더 큰 breathing room

모든 정보가 같은 크기면 spreadsheet가 된다.

모든 정보가 크면 promotional page가 된다.

---

# 12. Negative Space Is Monumental Space

빈 공간은 낭비가 아니다.

ATLAS에서 negative space는 실제 전당의 빈 공간 역할을 한다.

사용 목적:

- 중요한 이름 분리
- 시대 전환 강조
- 선택된 Person의 존재감
- hierarchy 명확화
- 화면 피로 감소

단, spacetime/world coordinate를 왜곡하기 위한 여백으로 사용해서는 안 된다.

데이터 좌표는 유지하고 presentation layer에서 사용한다.

---

# 13. Dark Field, Not Pure Black

전체 미학의 기본 방향은 어두운 field다.

그러나:

- 완전 검정
- 과도한 고대 양피지
- heavy marble texture

는 피한다.

권장 감각:

- charcoal
- ink
- dark stone
- muted graphite
- warm-black undertone

목적은 darkness 자체가 아니라:

> **텍스트·chronology·selection·accent가 빛날 수 있는 조용한 field**

를 만드는 것이다.

---

# 14. Metallic Accent

명예와 숭고함은 metallic accent로 표현할 수 있다.

그러나 ATLAS의 `governance` 대표분야 색은 이미 Gold `#D4AF37`이다.

따라서 UI 전체의 honor accent를 동일한 gold로 사용하면 의미 충돌이 생긴다.

권장 방향:

- neutral bronze
- aged brass
- champagne brass
- desaturated warm metal

사용 위치:

- 1px / hairline divider
- selected edge
- era heading detail
- thin focus rule
- small emblem
- high-level separator

금지:

- 넓은 금색 panel
- 모든 border 금색
- golden gradient background
- gold glow 남발

> **금속은 색이 아니라 재질적 인상으로 사용한다.**

---

# 15. Representative Domain Colors

기존 8개 representative_domain semantic color는 유지한다.

- governance — Gold
- military — Crimson
- knowledge — Blue
- technology — Graphite
- commerce — Emerald
- culture — Purple
- religion — Ivory
- exploration — Orange

원칙:

> **색은 decoration이 아니라 classification이다.**

사용 예:

- thin vertical rule
- short underline
- small dot
- rail accent
- subtle selected border
- very restrained tint

금지:

- 전체 card 배경을 분야색으로 칠하기
- Person name 전체를 강한 분야색으로 칠하기
- 모든 UI control에 분야색 전파
- rainbow dashboard화

---

# 16. Era Visual System

기존 시대 아이콘 체계는 계속 사용할 수 있다.

1. 초기문명 — 토기
2. 고대 — 살바퀴
3. 고전 — 두루마리
4. 전기중세 — 안장 + 등자
5. 후기중세 — 대포
6. 근세 — 범선
7. 산업·제국 — 증기기관차
8. 세계대전 — 탱크
9. 냉전 — 로켓
10. 정보화 — CRT 컴퓨터

그러나 시대 아이콘이 typography보다 강하면 안 된다.

권장:

- tiny seal
- axis marker
- era heading glyph
- subtle watermark
- minimap/overview marker

금지:

- 대형 badge
- collectible emblem
- card rarity icon
- icon이 시대 제목보다 큰 구조

> **분야는 색으로 읽고, 시대는 형태로 읽는다.**

---

# 17. Chronology Is a Primary Visual Asset

ATLAS는 이미 역사적 시간축을 가진다.

따라서 역사적 분위기를 위해 새로운 장식을 억지로 추가하지 않는다.

chronology 자체를 visual ornament로 승격한다.

참고 문법:

- Age of Empires IV campaign chronology
- Met Heilbrunn Timeline
- Histography

활용:

- thin timeline
- precise year marker
- era boundary
- subtle node
- selected chronological highlight
- zoom-dependent hierarchy

> **선 자체가 장식이고, 연도가 장식이다.**

---

# 18. Selection as Ceremony

ATLAS의 기념비성은 항상 켜져 있는 효과가 아니라 **interaction state**로 사용한다.

## Resting State

- quiet
- restrained
- repeated
- ordered
- low chrome
- data-first

## Hover

- minimal
- fast
- slight contrast increase
- no theatrical effect

## Selected

- clear spatial breathing room
- stronger typographic emphasis
- stronger contrast
- restrained metallic/detail accent
- domain signal preserved
- optional slow reveal

## Detail Entry

- portrait appears for the first time
- Person becomes human rather than only historical name
- richer historical presentation allowed

이 4단계를 통해:

> **메인은 인류 전체의 전당, 상세는 한 인간의 전당**

이라는 제품 서사를 만든다.

---

# 19. Motion

motion은 느리고 무거운 것이 아니라 **절제된 ceremonial quality**를 가져야 한다.

권장:

- fast ordinary UI transition
- slightly slower selected reveal
- subtle line expansion
- controlled fade
- restrained focus movement

금지:

- particles
- sparkle
- constant glow pulse
- exaggerated parallax
- cinematic loading every interaction
- loot-box animation
- floating decorative objects

motion은 사용 속도를 방해해서는 안 된다.

---

# 20. Information Density and Prestige Must Coexist

ATLAS는 고밀도 정보 시스템이다.

따라서:

> **조밀한 정보 = spreadsheet**

라는 가정을 버린다.

Destiny의 Triumphs/Collections처럼,
많은 정보를 hierarchy, line, symbol, spacing으로 정돈하면
dense UI도 품위 있게 만들 수 있다.

핵심:

- chrome 감소
- hierarchy 강화
- repeated rhythm
- exact alignment
- selective emphasis
- visual noise 억제

---

# 21. LOD — Whole History First, Individual Second

멀리서 볼 때:

> 역사 전체의 구조가 보여야 한다.

가까이 갈 때:

> 사람과 세부 정보가 드러나야 한다.

따라서 semantic LOD는 시각 미학의 일부다.

전체 화면에서 모든 Person이 같은 강도로 주장하면 실패다.

zoom / focus가 깊어질수록:

- names
- metadata
- relation
- detail

이 단계적으로 강해져야 한다.

---

# 22. Ornament Budget

장식에는 예산이 있다.

강도 기준:

| Visual element | Strength |
|---|---:|
| Typography | ★★★★★ |
| Chronology line | ★★★★★ |
| Negative space | ★★★★★ |
| Person name | ★★★★★ |
| Domain color | ★★★ |
| Era icon | ★★ |
| Metallic accent | ★★ |
| Texture | ★ |
| Glow | ★ |
| Frame ornament | ★ |
| Portrait on Main | **0** |
| Illustration on Main | **0** |

장식보다 구조를 우선한다.

---

# 23. Anti-Patterns

다음은 ATLAS의 목표 미학과 충돌한다.

## Institutional Blandness

- white page
- plain table
- blue link list
- utility-only hierarchy
- visual emotion 0

정확하지만 ATLAS가 원하는 문명적 감정이 없다.

## Fantasy Hall

- Roman column
- crown
- laurel
- marble
- parchment
- gold
- giant serif

를 동시에 사용하는 방식.

역사성이 아니라 역사 테마파크가 된다.

## Collectible Card UI

- 모든 Person을 독립 액자 카드로 표현
- badge/ribbon/star/rank 남발
- rarity glow
- framed portrait
- heavy bevel

인류사가 상품 catalogue처럼 보인다.

## Game Event Landing Page

- giant hero image
- particle
- promo banner
- animated gold
- large CTA

상시 탐색 시스템에 부적합하다.

## Data Dashboard Rainbow

- category마다 full-surface color
- colored pills everywhere
- chart dashboard aesthetic

ATLAS의 숭고함을 파괴한다.

---

# 24. Design Decision Test

새 시각 요소를 추가할 때 다음 세 질문을 모두 통과해야 한다.

### Monumental

이 요소가 역사 전체의 무게와 품위를 높이는가?

### Chronographic

역사적 시간·관계·위치와 연결되어 있는가,
아니면 단순 장식인가?

### Modern

2020년대 이후의 디지털 제품에서도 세련되어 보일 수 있는가?
고전 양식을 직접 복제하거나 nostalgic skeuomorphism에 기대지 않는가?

세 질문 중 하나라도 실패하면 기본적으로 제거하거나 약화한다.

---

# 25. Core Emotional Target

ATLAS의 첫 인상:

> **“인류의 역사가 하나의 거대한 구조로 눈앞에 놓여 있다.”**

탐색 중:

> **“정보가 많지만 질서가 있고 빠르다.”**

Person 선택:

> **“수천 명 중 한 이름이 역사에서 튀어나왔다.”**

상세 진입:

> **“이제 그 이름이 실제 한 인간이 된다.”**

이 네 문장이 전체 UI 디자인의 최종 acceptance criterion이다.

---

# 26. Final Design Maxim

> **초상이나 건축물을 그리지 않고, 인류사의 이름과 시간 자체를 기념비처럼 배치한다.**

그리고:

> **정보 구조는 기관처럼 엄격하게, 시각 정체성은 Hall of Fame과 AAA game처럼 강하게, 사용성은 현대 데이터 도구처럼 빠르게 만든다.**
