# YouTube 필터 적용 후 51명 — Production Person UUID 대조 및 조치 (2026-10-09)

## 출처와 판정 범위

사용자가 2026-10-09 제출한 **기등록 제외 + 생존 제외** 결과 51개를 기준으로, 운영 `atlas_v2.persons` (2,120명)와 `atlas_v2.person_names` (4,267개)의 **등록 인물명, 통용명 후보 78개**를 실시간 read-only로 비교했다. 비교 기준은 영문 이름/검증 후보 표제어의 정확 일치 및 문장부호·띄어쓰기 정규화 일치. 어떤 외부 영상, Person 본체 또는 후보 기록도 변경하지 않았다.

- 사용자 화면에서 51개 모두 `기등록 일치 없음`; 대기열 등재로 보인 항목 6개, 미등재 45개.
- **Production Person UUID로 확정한 기존 등록 인물 9개**: 아래 UUID 표. 이 9개는 기존 유튜브 이름과 등록 인물 이름이 달라 UI의 정확 일치가 실패한 사례.
- 나머지 **42개는 이번에 대조한 78개 직접 표기·통용명 후보로 일치하지 않았음**. 이는 DB 전체에서 42명 모두 실제로 미등록됐다는 최종 확정이 아니다. 다른 미조사 표기/사용검토 후보가 가능하다.
- 이름 부분 유사성만으로 임의 연결하지 않았다. 특히 `Muhammad Ali`(복서) ≠ `Muhammad Ali of Egypt`(이집트 총독) ≠ `Muhammad Ali Jinnah`(정치인), `Pope Francis` ≠ 프랑스 왕 `Francis I`.

## 항목별 처리 상태

| 유튜브 순위 | 원본 표시명 | 화면 대기열(당시) | 최신 대조 결과 | 실제 등록된 canonical_key | 실제 Person UUID | 명칭 구분 |
| ---: | --- | --- | --- | --- | --- | --- |
| 32 | Princess Diana | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 41 | Muhammad Ali | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 50 | Marilyn Monroe | 등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 60 | Malcolm X | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 70 | Stephen Hawking | 등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 71 | Mother Teresa | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 86 | Osama bin Laden | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 87 | Bruce lee | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 90 | Oscar Wilde | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 103 | Edgar Allan Poe | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 104 | Rembrandt | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 106 | Pope Francis | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 108 | Al Capone | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 109 | Pablo Escobar | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 111 | Rasputin | 미등재 | 기등록 확정·별칭 누락 | Grigori Rasputin | `1cdc23c0-22f5-42f6-99d4-2a0ece00ffa4` | 인물 |
| 115 | Anne Boleyn | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 127 | Claude Monet | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 134 | Pablo Picasso | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 143 | Mark Twain | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 144 | Alexander Hamilton | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 147 | Ernest Hemingway | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 168 | Buddha | 미등재 | 기등록 확정·별칭 누락 | Gautama Buddha | `8e006020-b055-5d7c-8d18-2bf962a15396` | 칭호 |
| 173 | Rosa Parks | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 178 | Nostradamus | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 179 | Ivan the Terrible | 미등재 | 기등록 확정·별칭 누락 | Ivan IV | `57b00bae-2420-4ddd-b374-f70c81479bff` | 인물 |
| 180 | Leo Tolstoy | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 186 | Maya Angelou | 등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 188 | Voltaire | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 190 | Georgia O'Keeffe | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 191 | Haile Selassie | 미등재 | 기등록 확정·별칭 누락 | Haile Selassie I | `98142a9e-e43b-5fab-be58-8004cfd1aca6` | 인물 |
| 192 | Heinrich Himmler | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 193 | Helen Keller | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 204 | Sun Tzu | 등재 | 기등록 확정·별칭 누락 | Sun Wu | `d5c962df-ae2c-4e82-bafb-550989ed44b2` | 실재성 검토 |
| 205 | Whitney Houston | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 207 | Ashoka the Great | 미등재 | 기등록 확정·별칭 누락 | Ashoka | `66d20a4e-3847-5b2c-8543-0c6796fb465c` | 인물 |
| 208 | Bob Marley | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 211 | Steve Biko | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 213 | Anne Frank | 등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 217 | Nietzsche | 미등재 | 기등록 확정·별칭 누락 | Friedrich Nietzsche | `c5676a6d-891b-4d08-8738-d26226e78ae0` | 인물 |
| 220 | Andy Warhol | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 221 | William Blake | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 226 | Jack the Ripper | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 실명미상 |
| 230 | Hedy Lamarr | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 232 | Thales of Miletus | 미등재 | 기등록 확정·별칭 누락 | Thales | `7442f8fa-7a9b-4717-9b3e-9f6cb32b7a66` | 인물 |
| 236 | Mata Hari | 등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 237 | Jabir ibn Hayyan | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 실재성 검토 |
| 238 | Cicero | 미등재 | 기등록 확정·별칭 누락 | Marcus Tullius Cicero | `958b4f03-215e-401e-9b65-d21a63b22d80` | 인물 |
| 239 | Carl Jung | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 242 | Paris | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 다의어 |
| 243 | Audrey Hepburn | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 인물 |
| 245 | Jane Seymour | 미등재 | 미확정(대조 이름에서 일치 없음) | — | — | 동명이인 |

## 확정 9건 조치

`server/atlas-reviewed-person-registration-aliases.js`에 아래 별칭만 추가하고, 두 API/화면이 기존에 공유하는 이름-UUID 조회 로직을 그대로 사용한다.

- `Rasputin` → `Grigori Rasputin`
- `Buddha` → `Gautama Buddha` (대표 인물 **간주**; 석가모니 이외의 붓다 호칭과 혼동하지 않도록 표시)
- `Ivan the Terrible` → `Ivan IV`
- `Haile Selassie` → `Haile Selassie I`
- `Sun Tzu` → `Sun Wu` (전통적 동일인 대표 간주; 역사성/귀속 문제는 별도)
- `Ashoka the Great` → `Ashoka`
- `Nietzsche` → `Friedrich Nietzsche`
- `Thales of Miletus` → `Thales`
- `Cicero` → `Marcus Tullius Cicero`

9개 이름은 `person_names`의 같은 이름 다른 Person 매칭 **0건**을 확인했고, canonical_key는 각 1개 Person UUID에 연결됐다. `Sun Tzu` 등록대기열 원본 `gp-20260921-004`는 현재 `person_id=null`인 기록 **1건**이 확인됐으며, 별칭 추가 후 현재 대기열 읽기에서 제외되는 것이 옳다. 원본 후보는 삭제하지 않는다.

## 보류 및 비인물 검토 대상

- `Paris`: 프랑스 수도, 트로이 신화 인물, 실존인물의 이름 등 의미 충돌. 원본 영상 제목·채널 근거 없이 임의 삭제·통합 금지.
- `Jack the Ripper`: 실명이 특정되지 않은 범인 별칭; 단일 인물의 실제 신원이 확정됐다고 표시 금지.
- `Jane Seymour`: 1537년 사망한 튜더 왕비와 현대의 생존 배우. 영상 맥락 없는 기등록/생존 강제 판정 금지.
- `Sun Tzu`, `Jabir ibn Hayyan`: 전통적 실재 인물과 저술 귀속·역사성 문제는 Person 기록과 별개 검토.
- `Buddha`: 사람을 뜻하는 대중적 통용명으로는 고타마 붓다를 기본 간주하지만, 다른 시대·종교적 칭호는 확정하지 않는다.

## 검사 및 향후 대기열

1. 등록검토 UI: 9개 모두 기존 실재 Person ID로 `기등록` 표시, `기등록 제외` 활성화 시 순위에서 제거. `Buddha`, `Sun Tzu`는 대표 간주 표시.
2. 등록대기열 SQL: 같은 별칭을 참조해 `Sun Tzu` 등 기존 후보의 중복 미등록 대기표시만 제외. 출처 레저 원본은 보존.
3. 기존 미검증 42개는 별도 등록·이명·예술문화 후보 검토. 해당 42개가 현재 `기등록 일치 없음`으로 남는 것은 확인 부족을 표시한 것.
4. 사람이 아닌 항목의 일괄 삭제, 역사 Person 신규 등록, 미검증 별칭 일괄 병합은 수행하지 않는다.

## 감사지표

- Full 51 user-label direct canonical/name normalized exact join: **0/51**. 이 화면 표시와 맞다.
- 51개에 대해 78개 유력 인명/통용표기 후보 검증: **9개 원래 등록 Person UUID 확정**, 42개 아직 미확정.
- 운영 DB `persons` 2,120 · `person_names` 4,267. 수정은 **리뷰 별칭 읽기 판정**에만 적용하며 DB raw data는 그대로 둔다.
