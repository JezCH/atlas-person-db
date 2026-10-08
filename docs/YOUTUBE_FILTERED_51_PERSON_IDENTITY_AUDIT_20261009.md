# YouTube 등록검토 ‘기등록 제외 + 생존 제외’ 51개 후보 감사 (2026-10-09)

## 범위 및 확인 수준

- 사용자 화면에서 복사한 51개 raw-name 순위 항목만 평가한다. **전부 UI에서는 ‘기등록 일치 없음’**으로 표시되었고, 아래 ‘대기열 등재’ 6건은 사용자가 제공한 당시 UI 상태다. 이는 실제 미등록 확정이 아니다.
- 인물·칭호·사건 등 **의미상 분류는 역사·인물 자료를 대조한 검토 결과**이며, 현재 Person DB의 해당 인물 존재 여부 또는 영상별 제목 맥락을 확인했다는 뜻이 아니다. Production `person_names` 세부 조회가 일부 차단되어 Person UUID별 등록/별칭 매칭은 미완료다.
- 사용자 정책: **동명이인은 대표 인물을 기본 간주**한다. 단, `Paris`처럼 비인물/신화/현대 실존인물이 교차하는 이름을 *무조건* 단일 Person으로 등록하거나 원본을 합치지 않는다.
- 원본 YouTube 채널/영상, canonical Person, 등록대기열 원본 레코드는 변경하거나 삭제하지 않는다.

## 항목별 1차 분류

| 순위 | raw-name | 사용자 화면 대기열 | 의미 판정 | 권장 이름/보류 사항 | 근거 및 처리 |
| ---: | --- | --- | --- | --- | --- |
| 32 | Princess Diana | 미등재 | 인물 | Diana, Princess of Wales | 칭호·통용명 |
| 41 | Muhammad Ali | 미등재 | 인물 | Muhammad Ali / Cassius Clay | 개명 전후 동일인 |
| 50 | Marilyn Monroe | 등재 | 인물 | Marilyn Monroe / Norma Jeane | 예명; 대기열에 존재 |
| 60 | Malcolm X | 미등재 | 인물 | Malcolm X / Malcolm Little | 개명·활동명 |
| 70 | Stephen Hawking | 등재 | 인물 | Stephen Hawking | 대기열에 존재 |
| 71 | Mother Teresa | 미등재 | 인물 | Mother Teresa / Teresa of Calcutta | 수도명·호칭 |
| 86 | Osama bin Laden | 미등재 | 인물 | Osama bin Laden | 실존 인물 |
| 87 | Bruce lee | 미등재 | 인물 | Bruce Lee | 대소문자 |
| 90 | Oscar Wilde | 미등재 | 인물 | Oscar Wilde | 실존 인물 |
| 103 | Edgar Allan Poe | 미등재 | 인물 | Edgar Allan Poe | 실존 인물 |
| 104 | Rembrandt | 미등재 | 인물 | Rembrandt van Rijn | 통용 단일명 |
| 106 | Pope Francis | 미등재 | 인물 | Pope Francis / Jorge Mario Bergoglio | 교황명; 2025-04-21 사망 |
| 108 | Al Capone | 미등재 | 인물 | Al Capone | 실존 인물 |
| 109 | Pablo Escobar | 미등재 | 인물 | Pablo Escobar | 실존 인물 |
| 111 | Rasputin | 미등재 | 인물 | Grigori Rasputin | 통용 성씨 |
| 115 | Anne Boleyn | 미등재 | 인물 | Anne Boleyn | 실존 인물 |
| 127 | Claude Monet | 미등재 | 인물 | Claude Monet | 실존 인물 |
| 134 | Pablo Picasso | 미등재 | 인물 | Pablo Picasso | 실존 인물 |
| 143 | Mark Twain | 미등재 | 인물 | Mark Twain / Samuel Clemens | 필명 |
| 144 | Alexander Hamilton | 미등재 | 인물 | Alexander Hamilton | 실존 인물 |
| 147 | Ernest Hemingway | 미등재 | 인물 | Ernest Hemingway | 실존 인물 |
| 168 | Buddha | 미등재 | 칭호 | Gautama Buddha / Siddhartha Gautama | 석가모니 대표 간주; 다른 붓다와 구분 |
| 173 | Rosa Parks | 미등재 | 인물 | Rosa Parks | 실존 인물 |
| 178 | Nostradamus | 미등재 | 인물 | Michel de Nostredame | 라틴화된 이름 |
| 179 | Ivan the Terrible | 미등재 | 인물 | Ivan IV | 군주 별칭 |
| 180 | Leo Tolstoy | 미등재 | 인물 | Leo / Lev Tolstoy | 번역 표기 |
| 186 | Maya Angelou | 등재 | 인물 | Maya Angelou | 예명; 대기열에 존재 |
| 188 | Voltaire | 미등재 | 인물 | Voltaire / François-Marie Arouet | 필명 |
| 190 | Georgia O'Keeffe | 미등재 | 인물 | Georgia O'Keeffe | 실존 인물 |
| 191 | Haile Selassie | 미등재 | 인물 | Haile Selassie I | 즉위명·서수 |
| 192 | Heinrich Himmler | 미등재 | 인물 | Heinrich Himmler | 실존 인물 |
| 193 | Helen Keller | 미등재 | 인물 | Helen Keller | 실존 인물 |
| 204 | Sun Tzu | 등재 | 실재성 검토 | Sunzi / Sun Wu | 전통적 실재 인물; 생애·저술 논쟁; 대기열 존재 |
| 205 | Whitney Houston | 미등재 | 인물 | Whitney Houston | 실존 인물 |
| 207 | Ashoka the Great | 미등재 | 인물 | Ashoka / Ashoka Maurya | 군주 별칭 |
| 208 | Bob Marley | 미등재 | 인물 | Bob Marley | 실존 인물 |
| 211 | Steve Biko | 미등재 | 인물 | Steve Biko | 실존 인물 |
| 213 | Anne Frank | 등재 | 인물 | Anne Frank | 대기열 존재 |
| 217 | Nietzsche | 미등재 | 인물 | Friedrich Nietzsche | 단독 성씨 |
| 220 | Andy Warhol | 미등재 | 인물 | Andy Warhol | 실존 인물 |
| 221 | William Blake | 미등재 | 인물 | William Blake | 동명이인 가능; 시인·화가 기본 |
| 226 | Jack the Ripper | 미등재 | 실명미상 | Jack the Ripper | 범인 신원 불명·가해자 수 불명; 별도 분류 |
| 230 | Hedy Lamarr | 미등재 | 인물 | Hedy Lamarr | 실존 인물 |
| 232 | Thales of Miletus | 미등재 | 인물 | Thales | 밀레토스의 탈레스 |
| 236 | Mata Hari | 등재 | 인물 | Mata Hari / Margaretha Zelle | 예명; 대기열 존재 |
| 237 | Jabir ibn Hayyan | 미등재 | 실재성 검토 | Jabir ibn Hayyan | 동일 저자·실재성 논쟁 |
| 238 | Cicero | 미등재 | 인물 | Marcus Tullius Cicero | 통용 단독명 |
| 239 | Carl Jung | 미등재 | 인물 | Carl Gustav Jung | 통용 축약 |
| 242 | Paris | 미등재 | 다의어 | Paris (city) / Paris (Trojan legend) / given name | 영상 맥락 없이는 인물 판정 금지 |
| 243 | Audrey Hepburn | 미등재 | 인물 | Audrey Hepburn | 실존 인물 |
| 245 | Jane Seymour | 미등재 | 동명이인 | Jane Seymour (Tudor queen) / Jane Seymour (living actor) | 왕비(1537 사망) vs 배우(2026 생존), 제목 확인 필수 |

## 집계

- 총 51개: 45개는 역사상 실재 인물을 명확히 가리키는 통용 표기, 나머지 6개는 분류상 각별한 조건을 가진다(`Buddha`, `Sun Tzu`, `Jabir ibn Hayyan`, `Jack the Ripper`, `Paris`, `Jane Seymour`). 단, `Buddha`도 석가모니를 대표로 해석할 때 역사인물을 의미한다.
- 이 화면에서 대기열 **등재 6**: Marilyn Monroe, Stephen Hawking, Maya Angelou, Sun Tzu, Anne Frank, Mata Hari. **미등재 45**. 이는 사용자가 제공한 UI 관측값이며 DB 재검증 완료 수치가 아니다.
- **인물이 아닌 단어라고 확정해 제거할 수 있는 raw-name은 없음**. `Paris`는 도시/신화적 왕자/현대 실존인명 등 다의어이므로 제목 원본의 의미 판정 필요. `Jack the Ripper`는 알려진 단독 실명 Person으로 취급할 수 없다.

## 근거

- 석가모니(`Buddha`) 칭호: https://www.rep.routledge.com/articles/biographical/buddha-6th-5th-century-bc/v-1
- 트로이 왕자 `Paris`: https://www.britishmuseum.org/blog/myth-trojan-war
- `Jack the Ripper` 실명 미확정: https://www.biography.com/crime/jack-the-ripper
- `Jabir ibn Hayyan` 실재성 및 저작 귀속 논쟁: https://www.nlm.nih.gov/hmd/arabic/bioJ.html
- `Jane Seymour` 왕비와 배우: https://en.wikipedia.org/wiki/Jane_Seymour ; https://www.newbeauty.com/view/jane-seymour-interview-2026
- `Pope Francis` 2025-04-21 사망 (2026년 생존 필터에서 제외할 대상 아님): https://www.vaticannews.va/en/pope/news/2025-04/pope-francis-dies-on-easter-monday-aged-88.html

## 후속 처리 게이트

1. 모든 51개 raw-name의 **원본 영상 제목·채널 ID 샘플**을 추출해 `Paris`, `Jane Seymour`, `Jack the Ripper`의 의미를 확인한다. 단순히 유튜브 이름만으로 신화/인물을 삭제 또는 병합하지 않는다.
2. canonical Person UUID/`person_names` 별칭을 확인해 `현재 등록됨 → alias 누락`, `실제 미등록`, `현재 대기열과 후보 매칭 누락`을 분리한다. 현재 **51개 전체를 미등록으로 단정하지 않는다**.
3. 등록된 경우에만 리뷰된 별칭 판정 목록에 **실제 Person UUID로 유일하게 확인되는** 별칭을 추가한다. `Rembrandt`, `Nietzsche`, `Rasputin`, `Buddha`, `Voltaire`, `Cicero` 등은 우선 확인 대상.
4. 신원 미상 범인 호칭과 전설·실재성 불확실 대상은 프로젝트 비연대표/보류 정책을 따르고, 신규 Person 발행 전 근거와 사용자 승인을 구한다.
5. 생존 제외는 날짜 근거로 처리한다. 동명이인 `Jane Seymour`는 왕비 vs 배우를 분해한 후 각기 다른 생존 판정이 가능하다.
6. 이 문서는 **감사·검토 기록이며 데이터/필터 수정 결과가 아니다**. 영상 본문과 Person DB 조회 검증 전에는 51개를 자동 등록하지 않는다.
