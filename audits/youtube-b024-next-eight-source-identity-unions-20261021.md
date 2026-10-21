# B024 오프라인 역사인물 동일인 검토 2차 — 새 8그룹 / 누적 15그룹 (2026-10-21)

**목표 유지:** YouTube에 등장한 역사적 개인의 원본 ID를 기반으로 정확한 동일인 판정 → 실제 영상의 인물 주제성 인증 → **완전한 현재 Production Person 및 모든 이명 확인은 마지막** → 기존 한 개의 **미등록 역사인물 순위**에만 반영. 이번 단위는 *인물 신원·이명* 확인이며 마지막 2개 관문은 수행하지 않았다.

**연속 작업:** [Draft PR #2583](https://github.com/JezCH/atlas-person-db/pull/2583)의 기존 [7그룹 검토](./youtube-b024-seven-reviewed-source-identity-unions-20261021.md) 위에 8그룹을 추가했다. 기존 B024 원본 압축파일 SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`은 불변이다. 2,230,031개 제목 재수집/전수 재크롤링 0; Production DB/API 변경 0.

## 이번에 외부 인물 식별을 확인한 8개 그룹

| 인물 | Wikidata Person | 실제 원본 표기 수 | 고유 Channel ID(인물별) | 원본 Video ID | 중복 채널 차감 |
|---|---|---:|---:|---:|---:|
| Carl Jung | [Q41532](https://www.wikidata.org/wiki/Q41532) | 2 | 10 | 10 | 0 |
| Muhammad Iqbal | [Q484141](https://www.wikidata.org/wiki/Q484141) | 2 | 12 | 13 | 0 |
| Francis of Assisi | [Q676555](https://www.wikidata.org/wiki/Q676555) | 2 | 7 | 7 | 0 |
| Khaleda Zia | [Q234814](https://www.wikidata.org/wiki/Q234814) | 2 | 6 | 8 | 1 |
| Saladin | [Q8581](https://www.wikidata.org/wiki/Q8581) | 2 | 5 | 5 | 0 |
| Anthony of Padua | [Q167477](https://www.wikidata.org/wiki/Q167477) | 2 | 5 | 5 | 0 |
| Harland Sanders | [Q120450](https://www.wikidata.org/wiki/Q120450) | 2 | 4 | 4 | 0 |
| Khalid ibn al-Walid | [Q26918](https://www.wikidata.org/wiki/Q26918) | 3 | 8 | 8 | 0 |
| **합계(인물별 합산)** | | **17** | **57** | **60** | **1** |

독립 채널은 *동일인 내부에서* 원본 Channel ID로 합집합 계산한다. 위 57은 **각 인물 채널 수를 더한 숫자**일 뿐 모든 인물 사이에서 중복을 제거한 글로벌 채널 수가 아니다. Video ID 60개는 기존 7그룹 84개와도 중복되지 않는다. 제목만 보고 영상을 실제로 시청했다고 주장하지 않는다.

## 판정 근거와 예외

- **Carl Jung** — `Carl Jung / Carl Gustav Jung`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q41532>
- **Muhammad Iqbal** — `Allama Muhammad Iqbal / Allama Iqbal`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q484141>
- **Francis of Assisi** — `Saint Francis of Assisi / Francis of Assisi`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q676555>
- **Khaleda Zia** — `Begum Khaleda Zia / Khaleda Zia`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q234814> ; <https://www.reuters.com/world/asia-pacific/obituary-khaleda-zia-bangladeshs-first-female-prime-minister-dies-80-2025-12-30/> 사망 2025-12-30 (Reuters 2025-12-30).
- **Saladin** — `Salahuddin Ayyubi / Sultan Salahuddin Ayyubi`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q8581>
- **Anthony of Padua** — `St Anthony of Padua / Saint Anthony of Padua`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q167477>
- **Harland Sanders** — `Colonel Harland Sanders / Colonel Sanders`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q120450>
- **Khalid ibn al-Walid** — `Khalid bin Walid / Khalid Bin Waleed / Hazrat Khalid Bin Waleed`를 동일 인물 이명으로 판정. <https://www.wikidata.org/wiki/Q26918> **과거 등록 UUID 확인:** `54583770-280a-4ec1-81db-24729ed842ab` (`Khalid Ibn Al Walid`, 2026-10-10 당시). **현재 등록 UUID 재확인 필요.**

- `Saint Francis`만으로 **Francis of Assisi / Francis Xavier**를 합치지 않는다.
- `Muhammad Ali`라는 복서와 `Muhammad Ali Jinnah`는 별개다.
- `Saint Dominic` / `Saint Dominic Savio`, `Saint Paul` / `Saint Paul of the Cross` 역시 명칭 토큰이 겹쳐도 별개다.
- `Abdul Hamid`, `Sultan Abdul Hamid`, `Saint Benedict`, `Queen Elizabeth`는 맥락 없이 합치지 않는다.
- *칼레다 지아*는 2025-12-30 사망이 2026-10-21 현재 확인되므로, 부적격 생존 후보로 처리하지 않는다. 하지만 **현재 ATLAS 미등록 사실까지 확인한 것은 아니다.**

## 누적 전수대조 진도와 정확한 분모

| 기준 | 기존 PR #2583 | 1차 7그룹 | 이번 8그룹 누적 |
|---|---:|---:|---:|
| 실제 동일인 정리 그룹 | 0 | 7 | **15** |
| 식별된 원본 이름 표기 | 0 | 15 | **32** |
| 그룹에 해당하는 고유 원본 Video ID | 0 | 84 | **144** |
| 이름 표기를 묶은 후 남는 내부 검토 단위 | 2,168 | 2,160 | **2,151** |
| 3개 이상 독립 채널의 내부 검토 단위 | 852 | 846 | **846** |

**주의:** 2,151과 846은 현재 DB에 없는 역사인물 수가 아니라 **아직 최종 Production 등록 여부와 영상 내용이 확인되지 않은 이름/인물 연구 단위**다. 이번 8그룹에서는 3채널 이상인 소스 표기 8개가 각각 3채널 이상 8그룹이 되어 해당 하위 수량은 변하지 않았다. 칼리드 이븐 알왈리드의 과거 기등록 이력도 분리 표시하고, 실제 현재 등록 대조가 끝나기 전에는 최종 미등록자를 선언하지 않는다.

## 출력 및 회귀검증

- [원본 ID 포함 8그룹 JSON](./youtube-b024-next-eight-source-identity-unions-20261021.json)
- `tests/atlas-youtube-b024-next-eight-source-identity-unions.test.mjs` : 원본 ZIP 연결, 기존 7그룹 중복 금지, 이름/채널/영상 합집합, UUID 이력, 칼레다 지아 사망일, 위험한 토큰 병합 보호, 누적 집계 증명.
- 기존 2,241행 사전검토 CSV, 정규화 HOLD 기록 및 이전 7그룹 JSON은 수정하지 않았다. 이번 8그룹 JSON과 이전 7그룹 JSON은 **한 작업의 순차적 판정 기록**이며 새로운 Production 순위가 아니다.

**다음 시작점:** 아직 미해결인 인물 2,151개 연구 단위를 대상으로, 근거 있는 동일인 이명만 소규모 배치로 계속 확인한다. 그와 병렬로 실제 B024 원본 Video ID의 공식 Channel ID·원본 캡션/재생·인물 중심 내용을 검증하는 기존 #2522/#2513 경로를 이어야 한다. 실제 현행 Production **전체 인물 UUID·이명** 대조는 마지막에 1회 범위 제한 검증으로 수행하고, 단일 기존 API/UI에만 공개한다.
