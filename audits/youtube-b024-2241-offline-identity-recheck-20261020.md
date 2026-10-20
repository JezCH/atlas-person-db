# B024 2,241개 원본 후보 — 전체 오프라인 기등록 이력·동일인 사전대조 (2026-10-20)

> **최종 미등록 역사인물 명단이 아닙니다.** 실제 Production 전체 UUID/이명 대조, Wikidata 인물 식별, 영상 내용 인증은 완료되지 않았습니다. 본 자료의 신뢰 범위는 기존 동결 원본과 2026-10-10 당시 독립 검토된 등록 UUID의 정확한 대응입니다.

## 실행한 단위

- 실제 GitHub main의 기존 `2,241`개 원본 이름 표기 전체를 읽고, 기존 `6,162`개 strict biography-title Video ID와 추가 `536`개 profile-title Video ID를 *원본 ID 합집합*으로 결합함 (총 **6,698 고유 Video ID**, 중복 0).
- 이미 검토된 62개 원본 이름 라벨 보류(비인물 52, 신원 모호 10)를 exact label로 재적용함. 실제 Video ID나 원본 이름 삭제/병합 없음.
- 2026-10-10의 독립 `36`개 Person 이력 검토 파일에서 **이번 2,241개와 정확히 일치하는 11개 과거 등록 UUID를 새로 표면화**함. 모두 `PRIOR_REGISTERED_UUID_RECHECK`: 2026-10-20 live/current 등록 판정 아님.
- 현재 원본 2,241개 전부에 대해 `SOURCE_LABEL_HOLD / PRIOR_REGISTERED_UUID_RECHECK / UNRESOLVED_NOT_CONFIRMED_UNREGISTERED` 판정을 **전 행 하나씩** 부착하여 `youtube-b024-2241-offline-identity-recheck-20261020.csv`에 보존함. 원본 채널·영상 ID 모두 포함.
- NFKD+구두점 접기만 적용해 검출된 **5개 철자 충돌 그룹**을 별도 사전 검토 대상으로 분리함. **동일인이라고 최종 확정하거나 집합을 자동 합치지 않음.**
- 사용자 요청 전체 목표: 세계 역사 채널에서 **등록 누락된 역사인물** 발굴 → 근거 있는 *하나의* 실제 Production ranking. 이번 단위는 이 목표를 향한 오프라인 prefilter이며 공개 순위 아님.

## 현재 원본 기준 분모 대조

| 구분 | 이름 표기 수 | 3개 이상 독립 Channel ID |
|---|---:|---:|
| 전체 출발점 | 2,241 | 895 |
| 기존 명확한 비인물/신원보류 `SOURCE_LABEL_HOLD` | 62 | 34 |
| 2026-10-10 과거 등록 UUID 매칭 `PRIOR_REGISTERED_UUID_RECHECK` | 11 | 9 |
| **미해결 인물 식별/현행 등록 조회 대상** | **2,168** | **852** |

`852`는 중복 정리·생존자 확인·현재 Production 전수 대조 전의 **원본 이름 표기**입니다. 실제 미등록 역사인물 수가 아닙니다. 2026-10-20 직전 보고의 854(7명 생존자 제외)와 본 852(과거 등록 UUID 9개 우선 분리)는 서로 **다른 제외 기준**의 수치이므로 단순 가감하지 마십시오. 두 원장은 최종 통합에서 함께 확인해야 합니다.

## 이번 파일에 매칭된 11개 과거 등록 인물

| 원본 이름 | 과거 인물명 | 당시 UUID | 이번 독립 채널 |
|---|---|---|---:|
| J.R.R Tolkien | J. R. R. Tolkien | `b9bf1082-34e6-4337-bd35-0ec5778123a0` | 12 |
| Dwight D Eisenhower | Dwight D. Eisenhower | `6bea25be-e49e-4324-b5d9-f2906ced049e` | 9 |
| J Robert Oppenheimer | J. Robert Oppenheimer | `605d4e27-e933-4429-bb51-c023d4a20905` | 8 |
| Queen Elizabeth I | Elizabeth I | `7397a89f-a911-5e8c-a2cb-a297b64771e6` | 8 |
| W.E.B Du Bois | W. E. B. Du Bois | `3acb5664-2924-413e-955c-d12cd60e1ae8` | 7 |
| Imam Malik | Malik ibn Anas | `5bbd6c53-dbdd-436a-b306-15ac077caf31` | 6 |
| Imam Bukhari | Al-Bukhari | `8de13ce6-1d9d-4627-9c15-bc4fbd7d533c` | 5 |
| Madam C.J Walker | Madam C. J. Walker | `e386d5db-ce6f-4084-bf55-0d4ba90c95e5` | 4 |
| Ramesses II | Ramses II | `554a98f3-c9d1-5314-a59d-6281a8f6524b` | 4 |
| King Leonidas | Leonidas I | `2dc2d224-5ee3-5583-a3af-75d928fb240f` | 2 |
| Abu Hanifa | Abu Hanifa | `5c25f87b-9bda-4d30-a819-37a0c5aef8c0` | 1 |

## 자동으로 통합하지 않은 철자·구두점 충돌 5개

| 동일 키 후보 | 원본 표기 | 검토 전 채널 합집합(참고) |
|---|---|---:|
| `apjabdulkalam` | APJ Abdul Kalam / A. P. J. Abdul Kalam | 10 |
| `fredericchopin` | Frederic Chopin / Frédéric Chopin | 9 |
| `kosemsultan` | Kosem Sultan / Kösem Sultan | 6 |
| `elizabethbathory` | Elizabeth Báthory / Elizabeth Bathory | 5 |
| `kylianmbappe` | Kylian Mbappé / Kylian Mbappe | 3 |

이들은 단순 orthographic collision이고, 과거 별도 작업의 '16그룹 32표기'와 같은 모집단·방법론이라고 단정하지 않습니다. 동일인 여부가 확정되기 전에는 영상/채널 집합의 합집합 숫자도 공개 순위에 사용하지 않습니다.

## 정확한 입력 및 재개점

- 동결 전체 원본 ZIP SHA256: `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`
- strict 입력: `audits/youtube-b024-original-id-runtime-source-20261020.json` (2241/6162)
- 추가 입력: `audits/youtube-b024-added-profile-title-runtime-source-20261020.json` (400 이름 그룹/536)
- 기존 hold: `audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json` (62)
- 독립 과거 Person UUID 검토: `audits/youtube-b024-source-first-36-final-registered-identity-review.json` (2026-10-10, 2145 Person snapshot)
- **출력 CSV:** `audits/youtube-b024-2241-offline-identity-recheck-20261020.csv`

**다음 실제 작업(가장 중요한 잔여 병목):** 2,168개 미해결 원본 표기를 실제 역사적 개별 인물 식별자와 연결하되, 852개 다채널 후보 우선으로 처리한다. 확인된 동일인만 원본 채널·영상 집합을 재합산한다. 이후 *최신 Production 전체 등록 UUID/이명* 조회에 대해 마지막으로 필터링해야 하며, 그 전까지 `unregistered=true`를 기록하거나 새 후보가 확정됐다고 주장하면 안 된다.

**수정 범위:** 기존 원본, canonical Person/Activity, Vercel/Supabase Production, 공개 ranking/UI에는 변경 0. 이번 파일은 read-only audited derivative.
