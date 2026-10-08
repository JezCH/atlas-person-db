# YouTube Person 전역 전수 스크리닝 — 2026-10-09

## 작업 대상과 원본 보존

- 기준 스냅샷: `yt-20261008T143154Z-6011ch-rebuild-v4` (`atlas_v2.youtube_person_signals`, 순위별 6,358개 신호; 보존 성공 채널 6,011, 영상 1,536,512개).
- 검증 데이터: Production `atlas_v2.persons` 2,120명, `atlas_v2.person_names` 4,267개, 기준 확정 동일인 별칭 45개, 2026-10-09 기준 현재 생존 공개인물 이름 59개(실제 신호 일치 56개).
- 전역 이름 **6,358개를 9개 데이터 페이지로 읽고** 고유 rank 1~6,358을 검증했다. Person 2,120건·명칭 4,267건 역시 실제 DB에서 조회하여 Unicode/문장부호 정규화 정확 일치와 검토된 동일인 별칭을 교차 분석했다.
- **검증된 새 조치**: 별칭 38개를 실제 canonical Person UUID에 연결해 `server/atlas-reviewed-person-registration-aliases.js`에 반영; 추가로 생존 근거가 있는 Warren Buffett, King Charles III, Pope Leo XIV 3명을 `atlas-youtube-reviewed-living-people.js`에 등재.
- 원본 수집물, 역사 Person 본체, 등록대기열 후보 및 누적 영상·채널 건수는 전혀 변경하지 않는다. 이 변경은 등록표시/기등록 제외 및 생존 제외 판단에만 적용된다.

## 최신 이름 단위 결과

| 항목 | 스크리닝 전 | 변경 후 |
| --- | ---: | ---: |
| 전체 raw-name 신호 | 6,358 | 6,358 |
| 등록 인물 이름·검증 별칭과 일치 | 604 | **642** |
| 확인된 생존 명단과 일치(중복 없음) | 56 | **59** |
| 두 명단 제외 후 추가 조사 | 5,698 | **5657** |
| 10개 이상 채널에서 나타난 추가 조사 이름 | 175 | **165** |
| 추가 조사 이름 중 한 단어 표기 | — | 1339 |

**중요한 판정 경계**: `NEEDS_REVIEW`란 ‘미등록+사망 확인’을 뜻하지 않는다. 현재 확정된 Person 이름/별칭과 한시적 생존 명단에는 일치하지 않지만, (1) Wikidata 추가 생존 조회, (2) 다른 언어 별칭, (3) 원본 영상 문맥은 모두 미확인이다. 따라서 남은 5657개를 검증된 독립 역사인물로 간주하지 않는다.

## 저장된 전수 산출물

- `audits/youtube-full-6358-raw-signals-20261009.csv` — 6,358개 raw-name 원본, 순위, 채널 수, 영상 수.
- `audits/youtube-6358-registration-living-screen-20261009.csv` — **6,358개 전 행의** `REGISTERED` / `REVIEWED_LIVING` / `NEEDS_REVIEW`, 기존 Person UUID, 검토용 의심 패턴. 해당 파일의 `REVIEWED_LIVING`은 Wikidata 실시간 전체 조회 결과가 아니라 날짜가 기록된 제한적인 근거 명단이다.
- 플래그(`AMBIGUOUS_SINGLE_WORD`, `TOPIC_OR_EVENT_SUSPECT`, `TITLE_METADATA_SUSPECT`, `PARSER_NONPERSON_RULE_COLLISION`)는 **자동 검토 신호일 뿐 오류 확정이 아니다.** 예를 들어 Rembrandt, Voltaire, Picasso는 한 단어더라도 실제 인물이다.

## 추가 발견 — 유튜브 이름으로서 개인이 아닌 표현

아래 항목은 *검토용 위험 후보*이며 원본 영상 제목 확인 없이 일괄 삭제하지 않는다.

| 순위 | 이름 | 채널 | 왜 문제인가 |
| ---: | --- | ---: | --- |
| 426 | the Habsburgs | 10 | 개인이 아닌 가문·왕조 전체 |
| 456 | Bonnie and Clyde | 10 | 서로 다른 두 사람의 묶음 |
| 451 | Alexandria | 10 | 지명으로서의 사용 가능성, 여성 인명과 구별 필요 |
| 477 | Metamorphosis | 10 | 일반 명사 또는 작품명 |
| 494 | Minecraft | 9 | 게임 제목 |
| 534 | Penguins | 9 | 동물 집합 표현 |
| 599 | Transnistria | 9 | 지명 |
| 601 | Full | 8 | 영상 메타데이터 표현 |
| 615 | Yoga | 8 | 활동·개념 |
| 699 | Cancer | 8 | 질병·일반 표현 |
| 1287 | Gobekli Tepe | 6 | 괴베클리 테페 지명·유적; 기존 파서 차단표기의 변형 |
| 1836 | Göbeklitepe | 5 | 같은 유적의 다른 표기 |
| 1404 | The Forbidden City | 6 | 자금성(지명·시설) |
| 2086 | Vatican City | 5 | 바티칸 시국 |
| 2370 | LEGO City | 4 | 상품·게임 계열 이름 |
| 2387 | New York City | 4 | 지명 |
| 5575 | Ratan Tata Biography in Hindi | 3 | 인물명 뒤 영상 제목 잡음 |

**정제 파서의 재발 방지 과제**: 의미 없는 메타데이터의 다국어 확장, `Göbekli Tepe / Gobekli Tepe / Göbeklitepe` 표기 변형, 개인이 아닌 단체·쌍을 별도 `NON_PERSON` 검토 lane으로 관리. 현행 단일 단어 포착만으로 자동 삭제 금지.

## 동일인 이름 중복 — 새 Person으로 등록하지 말 것

- `Chopin` (#288) 및 `Frédéric Chopin` (#438).
- `Dostoevsky` (#327) 및 `Fyodor Dostoevsky` (#346).
- `Schopenhauer` (#420) 및 `Arthur Schopenhauer` (#330).
- `Picasso` (#445) 및 `Pablo Picasso` (#134).
- `Rembrandt` (#104) 및 `Rembrandt van Rijn` (#1542).

위 조합은 동일인 검토 후보로 확실성이 높더라도 **기존 Person ID가 없는 경우** 인물 등록 심사를 거쳐 단일 후보로 귀속시켜야 하며, 서로 다른 raw-name에 있는 채널 수를 더하면 안 된다. `count(distinct channel_id)` 재계산이 필요하다.

## 2026년 생존 검증 누락 사례 수정

- `Warren Buffett` (#166): 2026-10-07 월스트리트저널의 최근 근황 보도, 2026-09-18 Reuters의 이사회 보도 — https://www.wsj.com/lifestyle/warren-buffett-youtube-watching-cb6bd1d4
- `King Charles III` (#364): 2026-10-07 영국 왕실 Court Circular 공식 행사 기록 — https://www.royal.uk/media-centre/court-circulars
- `Pope Leo XIV` (#446): 2026-10-07 바티칸 공식 교황 연설 기록 — https://www.vatican.va/content/leo-xiv/en/speeches/2026/october.html

추가 생존 재조회 후보에는 동시대 배우·가수·정치인 이름들이 남는다. **Wikidata 제공자 응답이나 명확한 근거 없이 사망·생존을 자동 확정하지 말 것.** Dolly Parton과 Jane Goodall 등 사망한 인물을 관습적인 ‘현대 유명인’이라는 이유만으로 생존 처리하면 안 된다.

## 전수 우선 검토군 — 10채널 이상 165개

아래는 `NEEDS_REVIEW` 중 발견 채널 수 10개 이상인 **전체 165개**이다. 순서는 원본 ranking, ‘검토 유형’은 처리 지시가 아닌 1차 분류다.

| 순위 | raw-name | 채널 | 검토 유형 |
| ---: | --- | ---: | --- |
| 32 | Princess Diana | 47 | 인물/기등록/생존 추가 확인 |
| 41 | Muhammad Ali | 44 | 동명이인·다의어 확인 |
| 50 | Marilyn Monroe | 41 | 인물/기등록/생존 추가 확인 |
| 60 | Malcolm X | 38 | 인물/기등록/생존 추가 확인 |
| 70 | Stephen Hawking | 35 | 인물/기등록/생존 추가 확인 |
| 71 | Mother Teresa | 35 | 인물/기등록/생존 추가 확인 |
| 86 | Osama bin Laden | 31 | 인물/기등록/생존 추가 확인 |
| 87 | Bruce lee | 31 | 인물/기등록/생존 추가 확인 |
| 90 | Oscar Wilde | 30 | 인물/기등록/생존 추가 확인 |
| 103 | Edgar Allan Poe | 27 | 인물/기등록/생존 추가 확인 |
| 104 | Rembrandt | 27 | 동일인 표기군 검토 |
| 106 | Pope Francis | 27 | 인물/기등록/생존 추가 확인 |
| 108 | Al Capone | 27 | 인물/기등록/생존 추가 확인 |
| 109 | Pablo Escobar | 27 | 인물/기등록/생존 추가 확인 |
| 115 | Anne Boleyn | 26 | 인물/기등록/생존 추가 확인 |
| 127 | Claude Monet | 24 | 인물/기등록/생존 추가 확인 |
| 134 | Pablo Picasso | 23 | 동일인 표기군 검토 |
| 143 | Mark Twain | 22 | 인물/기등록/생존 추가 확인 |
| 144 | Alexander Hamilton | 22 | 인물/기등록/생존 추가 확인 |
| 147 | Ernest Hemingway | 22 | 인물/기등록/생존 추가 확인 |
| 173 | Rosa Parks | 20 | 인물/기등록/생존 추가 확인 |
| 178 | Nostradamus | 19 | 인물/기등록/생존 추가 확인 |
| 180 | Leo Tolstoy | 19 | 인물/기등록/생존 추가 확인 |
| 186 | Maya Angelou | 18 | 인물/기등록/생존 추가 확인 |
| 188 | Voltaire | 18 | 인물/기등록/생존 추가 확인 |
| 190 | Georgia O'Keeffe | 18 | 인물/기등록/생존 추가 확인 |
| 192 | Heinrich Himmler | 18 | 인물/기등록/생존 추가 확인 |
| 193 | Helen Keller | 18 | 인물/기등록/생존 추가 확인 |
| 205 | Whitney Houston | 17 | 인물/기등록/생존 추가 확인 |
| 208 | Bob Marley | 17 | 인물/기등록/생존 추가 확인 |
| 211 | Steve Biko | 17 | 인물/기등록/생존 추가 확인 |
| 213 | Anne Frank | 17 | 인물/기등록/생존 추가 확인 |
| 220 | Andy Warhol | 16 | 인물/기등록/생존 추가 확인 |
| 221 | William Blake | 16 | 인물/기등록/생존 추가 확인 |
| 226 | Jack the Ripper | 16 | 동명이인·다의어 확인 |
| 230 | Hedy Lamarr | 16 | 인물/기등록/생존 추가 확인 |
| 236 | Mata Hari | 16 | 인물/기등록/생존 추가 확인 |
| 237 | Jabir ibn Hayyan | 15 | 인물/기등록/생존 추가 확인 |
| 239 | Carl Jung | 15 | 인물/기등록/생존 추가 확인 |
| 242 | Paris | 15 | 동명이인·다의어 확인 |
| 243 | Audrey Hepburn | 15 | 인물/기등록/생존 추가 확인 |
| 245 | Jane Seymour | 15 | 동명이인·다의어 확인 |
| 254 | Kobe Bryant | 15 | 인물/기등록/생존 추가 확인 |
| 265 | Jack London | 14 | 인물/기등록/생존 추가 확인 |
| 266 | Agatha Christie | 14 | 인물/기등록/생존 추가 확인 |
| 273 | Darius the Great | 14 | 인물/기등록/생존 추가 확인 |
| 275 | George Washington Carver | 14 | 인물/기등록/생존 추가 확인 |
| 278 | Pelé | 14 | 인물/기등록/생존 추가 확인 |
| 281 | Tupac Shakur | 14 | 인물/기등록/생존 추가 확인 |
| 285 | Jackie Robinson | 14 | 인물/기등록/생존 추가 확인 |
| 288 | Chopin | 13 | 동일인 표기군 검토 |
| 290 | John Singer Sargent | 13 | 인물/기등록/생존 추가 확인 |
| 291 | Prince Philip | 13 | 인물/기등록/생존 추가 확인 |
| 297 | Peter the Great | 13 | 인물/기등록/생존 추가 확인 |
| 298 | Albrecht Dürer | 13 | 인물/기등록/생존 추가 확인 |
| 301 | Mary Cassatt | 13 | 인물/기등록/생존 추가 확인 |
| 304 | Yayoi Kusama | 13 | 인물/기등록/생존 추가 확인 |
| 306 | Diego Maradona | 13 | 인물/기등록/생존 추가 확인 |
| 307 | James Monroe | 13 | 인물/기등록/생존 추가 확인 |
| 312 | Dolly Parton | 13 | 인물/기등록/생존 추가 확인 |
| 317 | John Quincy Adams | 13 | 인물/기등록/생존 추가 확인 |
| 322 | Hypatia of Alexandria | 12 | 인물/기등록/생존 추가 확인 |
| 325 | Gustav Klimt | 12 | 인물/기등록/생존 추가 확인 |
| 327 | Dostoevsky | 12 | 동일인 표기군 검토 |
| 328 | Henry Kissinger | 12 | 인물/기등록/생존 추가 확인 |
| 329 | Anne of Cleves | 12 | 인물/기등록/생존 추가 확인 |
| 330 | Arthur Schopenhauer | 12 | 동일인 표기군 검토 |
| 332 | Paul Gauguin | 12 | 인물/기등록/생존 추가 확인 |
| 334 | Lawrence of Arabia | 12 | 인물/기등록/생존 추가 확인 |
| 335 | Lise Meitner | 12 | 인물/기등록/생존 추가 확인 |
| 339 | Themistocles | 12 | 인물/기등록/생존 추가 확인 |
| 342 | Benazir Bhutto | 12 | 인물/기등록/생존 추가 확인 |
| 346 | Fyodor Dostoevsky | 12 | 동일인 표기군 검토 |
| 348 | Harrison Ford | 12 | 2026년 생존 근거 추가 확인 |
| 349 | Heraclitus | 12 | 인물/기등록/생존 추가 확인 |
| 350 | Hürrem Sultan | 12 | 인물/기등록/생존 추가 확인 |
| 351 | Jane Goodall | 12 | 인물/기등록/생존 추가 확인 |
| 359 | Jean-Michel Basquiat | 11 | 인물/기등록/생존 추가 확인 |
| 360 | Amy Carmichael | 11 | 인물/기등록/생존 추가 확인 |
| 367 | Grace Kelly | 11 | 인물/기등록/생존 추가 확인 |
| 369 | Charles Spurgeon | 11 | 인물/기등록/생존 추가 확인 |
| 372 | William Tyndale | 11 | 인물/기등록/생존 추가 확인 |
| 373 | Alfred Hitchcock | 11 | 인물/기등록/생존 추가 확인 |
| 375 | Catherine Howard | 11 | 인물/기등록/생존 추가 확인 |
| 376 | Diogenes | 11 | 인물/기등록/생존 추가 확인 |
| 377 | Hudson Taylor | 11 | 인물/기등록/생존 추가 확인 |
| 378 | Josephine Baker | 11 | 인물/기등록/생존 추가 확인 |
| 379 | Mike Tyson | 11 | 2026년 생존 근거 추가 확인 |
| 380 | Al Pacino | 11 | 2026년 생존 근거 추가 확인 |
| 381 | Britney Spears | 11 | 2026년 생존 근거 추가 확인 |
| 382 | Desmond Tutu | 11 | 인물/기등록/생존 추가 확인 |
| 384 | Georges Seurat | 11 | 인물/기등록/생존 추가 확인 |
| 386 | Jim Carrey | 11 | 2026년 생존 근거 추가 확인 |
| 388 | Shirley Chisholm | 11 | 인물/기등록/생존 추가 확인 |
| 389 | Ariana Grande | 11 | 2026년 생존 근거 추가 확인 |
| 390 | Bass Reeves | 11 | 인물/기등록/생존 추가 확인 |
| 391 | Benjamin Banneker | 11 | 인물/기등록/생존 추가 확인 |
| 392 | Dietrich Bonhoeffer | 11 | 인물/기등록/생존 추가 확인 |
| 393 | Dwayne Johnson | 11 | 인물/기등록/생존 추가 확인 |
| 394 | Edward III | 11 | 인물/기등록/생존 추가 확인 |
| 395 | Emmanuel Macron | 11 | 2026년 생존 근거 추가 확인 |
| 400 | Kim Kardashian | 11 | 2026년 생존 근거 추가 확인 |
| 401 | Rihanna | 11 | 2026년 생존 근거 추가 확인 |
| 404 | Swami Vivekananda | 11 | 인물/기등록/생존 추가 확인 |
| 405 | Ted Bundy | 11 | 인물/기등록/생존 추가 확인 |
| 407 | Tom Hanks | 11 | 2026년 생존 근거 추가 확인 |
| 408 | Johann Wolfgang von Goethe | 10 | 인물/기등록/생존 추가 확인 |
| 409 | Princess Margaret | 10 | 인물/기등록/생존 추가 확인 |
| 410 | Sylvia Plath | 10 | 인물/기등록/생존 추가 확인 |
| 411 | Raila Odinga | 10 | 인물/기등록/생존 추가 확인 |
| 412 | David Livingstone | 10 | 인물/기등록/생존 추가 확인 |
| 413 | Wallis Simpson | 10 | 인물/기등록/생존 추가 확인 |
| 414 | George Whitefield | 10 | 인물/기등록/생존 추가 확인 |
| 415 | Saint Patrick | 10 | 인물/기등록/생존 추가 확인 |
| 416 | Tom Holland | 10 | 2026년 생존 근거 추가 확인 |
| 417 | David Brainerd | 10 | 인물/기등록/생존 추가 확인 |
| 418 | Franz Liszt | 10 | 인물/기등록/생존 추가 확인 |
| 419 | James Baldwin | 10 | 인물/기등록/생존 추가 확인 |
| 420 | Schopenhauer | 10 | 동일인 표기군 검토 |
| 421 | Amy Winehouse | 10 | 인물/기등록/생존 추가 확인 |
| 422 | El Greco | 10 | 인물/기등록/생존 추가 확인 |
| 423 | Hermann Göring | 10 | 인물/기등록/생존 추가 확인 |
| 424 | John Bunyan | 10 | 인물/기등록/생존 추가 확인 |
| 425 | Mary Slessor | 10 | 인물/기등록/생존 추가 확인 |
| 426 | the Habsburgs | 10 | 비개별 인물·지명 의심 |
| 429 | Yasuke | 10 | 인물/기등록/생존 추가 확인 |
| 430 | Ali Khamenei | 10 | 인물/기등록/생존 추가 확인 |
| 432 | Benedict Arnold | 10 | 인물/기등록/생존 추가 확인 |
| 433 | Bob Dylan | 10 | 2026년 생존 근거 추가 확인 |
| 434 | Boris Johnson | 10 | 2026년 생존 근거 추가 확인 |
| 436 | Drake | 10 | 동명이인·다의어 확인 |
| 437 | Emily Dickinson | 10 | 인물/기등록/생존 추가 확인 |
| 438 | Frédéric Chopin | 10 | 동일인 표기군 검토 |
| 439 | Hjalmar Schacht | 10 | 인물/기등록/생존 추가 확인 |
| 440 | Jackie Chan | 10 | 2026년 생존 근거 추가 확인 |
| 442 | Kylie Jenner | 10 | 2026년 생존 근거 추가 확인 |
| 443 | Miley Cyrus | 10 | 2026년 생존 근거 추가 확인 |
| 444 | Miriam Makeba | 10 | 2026년 생존 근거 추가 확인 |
| 445 | Picasso | 10 | 동일인 표기군 검토 |
| 448 | Stephen king | 10 | 2026년 생존 근거 추가 확인 |
| 450 | Adoniram Judson | 10 | 인물/기등록/생존 추가 확인 |
| 451 | Alexandria | 10 | 비개별 인물·지명 의심 |
| 452 | Atal Bihari Vajpayee | 10 | 인물/기등록/생존 추가 확인 |
| 453 | Baldwin IV | 10 | 인물/기등록/생존 추가 확인 |
| 454 | Barbarossa | 10 | 동명이인·다의어 확인 |
| 455 | Bloody Mary | 10 | 동명이인·다의어 확인 |
| 456 | Bonnie and Clyde | 10 | 비개별 인물·지명 의심 |
| 458 | Catherine of Aragon | 10 | 인물/기등록/생존 추가 확인 |
| 461 | Freddie Mercury | 10 | 인물/기등록/생존 추가 확인 |
| 464 | George Soros | 10 | 2026년 생존 근거 추가 확인 |
| 467 | Ivar the Boneless | 10 | 인물/기등록/생존 추가 확인 |
| 468 | Jennifer Lawrence | 10 | 2026년 생존 근거 추가 확인 |
| 469 | Julius Malema | 10 | 인물/기등록/생존 추가 확인 |
| 470 | Kanye West | 10 | 2026년 생존 근거 추가 확인 |
| 471 | King John | 10 | 인물/기등록/생존 추가 확인 |
| 472 | Kösem Sultan | 10 | 2026년 생존 근거 추가 확인 |
| 474 | Leonidas | 10 | 인물/기등록/생존 추가 확인 |
| 477 | Metamorphosis | 10 | 비개별 인물·지명 의심 |
| 479 | Richard III | 10 | 인물/기등록/생존 추가 확인 |
| 480 | Robin Williams | 10 | 인물/기등록/생존 추가 확인 |
| 481 | Roger Federer | 10 | 2026년 생존 근거 추가 확인 |
| 482 | Serena Williams | 10 | 2026년 생존 근거 추가 확인 |
| 483 | Stan Lee | 10 | 인물/기등록/생존 추가 확인 |
| 485 | Thutmose III | 10 | 인물/기등록/생존 추가 확인 |
| 487 | Wangari Maathai | 10 | 인물/기등록/생존 추가 확인 |

## 후속 검증 게이트

1. **개인 여부**: 현재 유튜브 영상 제목의 채널 ID·원문을 재확인해 개인/집단/지명/사건/작품/제목 잡음을 구별. 오인물은 실제 이름 출처 및 거부 사유를 기록하고 원본은 보존한다.
2. **기등록 여부**: 공식 Person ID, 활동/시공간 정보, 다른 언어 이름·필명·왕호를 재대조한다. ‘미등록’은 확정 일치 부재와 다르다.
3. **생존 여부**: 현행 고정 생존 명단뿐 아니라 Wikidata/최근 사건 근거를 정기 갱신한다. 문서화된 근거·검증 시각 없는 결론은 `unknown` 유지.
4. **동명이인**: 사용자의 ‘가장 대표적인 인물 간주’ 지침을 적용하되 선택된 canonical Person ID와 선택 근거를 반드시 남긴다. 명시적 다른 개인은 억지로 병합하지 않는다.
5. **대기열**: 현재 `registration-queue` API에 근거한 유일 인물 일치·대기열 여부를 최종 대조한다. 현재 CSV에는 API 기준 전체 대기열 대조나 Wikidata 5천여 명 일괄 조회가 포함되지 않는다.
6. 미검증 5천여 명의 자동 신규 등록/삭제 금지. 먼저 상위 165개에 원본 영상 맥락 및 Wikidata 증거를 붙이고, 이어 5–9채널, 3–4채널로 확대한다.

## 검증 상태

이 작업은 **6,358개 이름을 모두 계산에 포함한 전수 스크리닝 및 위험 항목 검토**이지, 5,657명 개별의 실존·사망·성취를 최종 인가한 전수 역사학 감정이 아니다. 별칭 38건 및 생존 3건은 범위 내에서 별도 검증 후 수정했고, 모든 나머지 이름은 누락 없이 manifest에 남긴다.
