# B024 실제 기존 데이터로 역사인물 15명 재확인 · 2026-10-20

**대상:** 추가 유튜브 수집·조회가 아니라 이전에 확보한 원본 10,127개 Channel ID와 2,230,031개 영상 제목의 **실제 ID 기반 후보 추출**. 이미 별도 분석한 10,706개 전기형 제목 영상과 2,766개 이름 표기를 재사용했다.

## 실행 및 출처

- **[실제 실행 #39382613884](https://github.com/JezCH/atlas-person-db/actions/runs/39382613884)**: 기존 재판정 아카이브 #12245075061을 **다시 전수 크롤링하지 않고** 다운로드. 기존 원본 ID에 실제로 15개 역사의 실존 인물 검토 그룹을 대응시킴. 성공.
- **[실제 결과 #12245757048](https://github.com/JezCH/atlas-person-db/actions/runs/39382613884/artifacts/12245757048)**: 각 인물의 원본 Video ID·Channel ID 전체 집합, 제목 예시 및 과거 기등록 대조상태 JSON. Artifact ZIP SHA256 `324f4e2863d78c3a353956cb51012066fa2a3b64a64c75e6f59157d82b59bc13`.
- 원본 동결 ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`; 2026-10-10 당시 실제 Production Person **2,145명** 이름·이명과 대조했을 때 직접 확인되지 않아 별도 역사인물 검토로 분리한 15개 그룹은 `audits/youtube-b024-source-first-36-final-registered-identity-review.json`.
- 후속 2026-10-20 실측 등록 UUID·생존 검토까지 수행된 #2554 산출 결과를 사용. **2026-10-18 전체 Production 엑셀은 현재 접근할 수 없어 오늘의 완전한 등록 여부는 검증되지 않았음.**

## 실제 원본에 존재하는 전기형 제목의 개별 인물별 독립 ID 집계

**아래 채널/영상 수는 `Life of X`·`Biography of X`처럼 인물을 중심 주제로 명시한 제목의 원본 ID 개수다. 실제 영상 재생·자막으로 검증한 수가 아니다. 15개는 역사인물 정체성에 관해 사전 검토된 그룹이지만 아직 현재 ATLAS에 미등록된 역사인물이라고 확정된 것은 아니다.**

| 역사인물 후보 | 명시적 전기형 제목 원본 채널 | 원본 영상 | 실제 원본 Video ID 예시 | 처리 우선도 |
| --- | ---: | ---: | --- | --- |
| C. S. Lewis | 9 | 9 | `V3Tg_yTNcpc` | 3채널 이상 |
| Khudiram Bose | 5 | 5 | `2EZjg8Ie47U` | 3채널 이상 |
| A. P. J. Abdul Kalam | 4 | 4 | `mEVKdwzVCs0` | 3채널 이상 |
| Booker T. Washington | 4 | 4 | `zztQe1izKvs` | 3채널 이상 |
| Hürrem Sultan | 4 | 4 | `9Mzu_nwv-_0` | 3채널 이상 |
| Lal Bahadur Shastri | 4 | 4 | `p3izrT-Okbw` | 3채널 이상 |
| Carter G. Woodson | 3 | 3 | `4WUTHbcFTEQ` | 3채널 이상 |
| Kazi Nazrul Islam | 3 | 3 | `oNBBVc2S21U` | 3채널 이상 |
| Mahendra of Nepal | 2 | 2 | `67yxOla8LRE` | 추가 증거 |
| Meriwether Lewis | 2 | 2 | `bILfEx8u2dU` | 추가 증거 |
| Simon Kimbangu | 2 | 2 | `gOVQSMlnZUk` | 추가 증거 |
| Emmett Till | 1 | 1 | `tyKay0WPjz0` | 추가 증거 |
| Herbert Chitepo | 1 | 1 | `Jx2Z4RPKNYs` | 추가 증거 |
| Shivaji | 1 | 1 | `80xUtUKseAE` | 추가 증거 |
| Hiroo Onoda | 0 | 0 | 없음 | 보수적 전기 제목 문법에서 검출 0 |

**실측 결과:** 사전 정체성 검토된 역사인물 15개, 그중 명시적인 전기형 제목 원본 영상 ID가 존재하는 그룹 **14개**, 3개 이상의 독립 채널에 존재하는 그룹 **8개**. 원본 콘텐츠 신규 수집 **0**, 실제 재생·검증 영상 **0**, 현재 등록 DB 전체 재확인 **미완료**, 공식 순위 Production 게재 **0**.

## 실제 목표를 위한 다음 조치

**중요도 순**: 우선 위 8개 실질 후보를 최신 `atlas_v2.persons`와 `person_names`(모든 이명 포함) 또는 사용자의 2026-10-18 전체 Person XLSX **원본 실제 내용**에 대조할 것. 이전 2,145명과 비교한 결과를 최신 등록 상태로 오인하지 말 것. 그 뒤 실제 영상 내용의 인물 주제성·동명이인 판정을 위해 **저장된 원본 Video ID만** 사용하고, 합당한 대상만 기존 **한 개**의 미등록 역사인물 순위에 반영할 것. Vercel Hobby HTTP402 정지 해제 전에는 새 배포 성공을 주장하지 말 것. 추가 동영상 수집·223만 건 재분석·중복 순위 생성 금지.

정확한 재실행 가능 코드: `scripts/youtube-b024-prior-reviewed-historical-candidates.py`; 검증 테스트: `tests/test_youtube_b024_reviewed_historical_15_original_ids.py`. 전체 원본 Video ID·Channel ID는 위 JSON artifact에 포함되며, 이 MD 파일은 artifact 보존기간 이후에도 핵심 실측 결과를 재확인하도록 남긴다.
