# B024 — 최초 실제 공개 게시자 설명 확보 및 원본 영상 ID 대조 (2026-10-11)

## 전체 목표와 수용 기준 (변경 없음)

독립적인 세계사 YouTube 원본 채널·영상 모집단 확대 → ATLAS 기등록 인물 이름을 **추출 사전으로 사용하지 않고** 실존 역사인물 후보 발굴 → 실제 영상/시간대별 자막으로 **단일 인물 중심성 판정** → 동명이인과 다국어·이명 검증 후 **원본 Channel ID / Video ID 집합 합집합** → **마지막 단계**에서 ATLAS 기등록 인물 제외 → 정확한 **하나의 미등록 역사인물 순위**를 권한 통제된 발행 경로를 통해 운영 화면에 반영. 별도 기등록 순위·자동 인물 등록·원본 영상 삭제 금지.

## 이번 차수에 새로 확보한 *실제* 외부 근거

현재 Source B024 고정 원본: 10,127개 채널·2,230,031개 영상 (ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`). 245개 새 표기에 연결된 10,126개 영상 중 #2437에서 전기 문맥을 기준으로 15명·82채널·**90개 영상**을 우선 조회 대상으로 선정. 실제 검증할 원본 90개 요청 JSON SHA256 `39cfb7f36867599f815f237d44726c691b6788f48a0a0e3347ef5715858d4734`.

**이번에 공개된 YouTube 게시자 설명을 실제 확인한 영상은 4개, 원본 독립 채널 2개**이다. 이는 URL과 원본 영상 ID가 일치한 실제 *공개 게시자 설명*이지, YouTube Data API의 `videos.list` 호출 결과가 아니다.

| 역사인물 검토 대상 | 원본 Video ID | 원본 Channel ID | 실제 게시자 설명 확인 | 보강 근거 |
|---|---|---|---|---|
| Emmett Till | `4-zeKH2GZ28` | `UC5zrlRzhT_cFI9zT6uQSijg` | https://www.youtube.com/watch?v=4-zeKH2GZ28 (PBS, 2020-08-28) | https://www.pbs.org/video/american-experience-kidnapping-emmett-till/ |
| Emmett Till | `a-1mBClopWg` | 같은 PBS 채널 | https://www.youtube.com/watch?v=a-1mBClopWg (PBS, 2020-09-25) | https://www.pbs.org/video/american-experience-no-justice-emmett-till/ |
| Emmett Till | `lkvtpeKrG4I` | 같은 PBS 채널 | https://www.youtube.com/watch?v=lkvtpeKrG4I (PBS, 2020-08-27) | https://www.pbs.org/video/chapter-1-murder-emmett-till/ |
| A. P. J. Abdul Kalam | `1vbMVOA8U0o` | `UCR-foyF-C6VuAlwy3KZMkgA` | https://www.youtube.com/watch?v=1vbMVOA8U0o (Dr. Vivek Bindra, 2021-01-09) | https://economictimes.indiatimes.com/magazines/panache/youtubes-digi-dads-are-managing-work-home-and-play/articleshow/69809342.cms |

원본 PBS 채널 ID는 https://www.wikidata.org/wiki/Q2842919 에서, Bindra 채널 ID는 위 Economic Times 기사 및 https://www.wikidata.org/wiki/Q101210327 에서 **YouTube 채널명과 독립 대조**했다. 원본 아카이브의 ID·제목과 정확히 일치하지만 **현재 YouTube API `snippet.channelId` 응답을 확보한 것은 아니다**.

PBS의 공식 전체 다큐멘터리에는 서술 대본이 있다(https://www.pbs.org/wgbh/americanexperience/films/till/). 다만 **전체 작품의 대본이며, 위 3개 정확한 YouTube 클립에 연결된 시간대별 영상/자막 근거가 아니다.** 그러므로 각 클립을 ‘인물 중심 영상 확정’으로 자동 승인하지 않는다. 특히 재판·사건을 중심으로 구성한 클립은 에밋 틸 개인의 전기 영상과 구분해 검토해야 한다.

**구분해야 하는 수치:**
- 공개 게시자 설명 확인: **4개 원본 Video ID**.
- 위 영상을 게시한 독립 원본 Channel ID 합집합: **2개** (PBS 3편은 동일한 채널 1개).
- 실제 영상 시청/정확한 클립 구간의 타임스탬프 자막 검증: **0개**.
- 이번 차수에 새로 확정한 *인물 중심* 영상: **0개**.
- YouTube Data API `videos.list` 인증 호출: **0회**.
- 등록 제외를 마친 최종 미등록 역사인물 수·운영 DB 신규 발행: **없음**.

## 구현

- `audits/youtube-b024-first-real-public-publisher-description-evidence.json`: 네 영상 각각 원본 영상 ID·채널 ID·제목·명칭 단서, 실제 공개 설명의 짧은 요약, 게시자 링크·독립 채널 ID 근거를 고정. 원문 설명의 대량 복제 없음.
- `scripts/youtube-b024-reconcile-public-publisher-descriptions.py`: 이전 90개 요청의 전체 파일 SHA256, 원본 ZIP SHA, 스냅샷·모집단, 원본 명칭·문맥 버킷·정확한 URL·채널 ID를 대조하고 별도 `atlas-youtube-b024-verified-public-publisher-descriptions/v1` 증거를 생성. **공식 Data API `videos.list` 결과 형식에 섞지 않으며, `production_publication_allowed=false` 유지.**
- `tests/test_youtube_b024_public_publisher_evidence.py` 및 Node CI wrapper: 4개 설명→2개 독립 채널 재집계, 가짜 영상 ID·채널·제목·이명·수집 방식 차단, 86개 미조회 영상 승인 방지.

재현(기존 90개 실제 요청 파일이 필요):

```sh
python3 scripts/youtube-b024-reconcile-public-publisher-descriptions.py \
  --request youtube-b024-first-biography-metadata-tranche.json \
  --publisher-review audits/youtube-b024-first-real-public-publisher-description-evidence.json \
  --output /tmp/youtube-b024-actual-public-publisher-evidence.json
```

## 전체 프로젝트 다음 수용 순서

1. 공개 자료로 확인 가능한 나머지 86개 영상의 게시자 설명·채널 ID를 추가 확보하고, 인증이 있는 실행 환경에서는 공식 YouTube API의 50개씩 체크포인트 수집을 우선 활용.
2. 정확한 영상별 시청 구간 또는 타임스탬프 자막으로 단일 역사인물 중심성을 심사. 다큐멘터리 속 여러 사건/인물, 창작물·연주·역사극은 구분할 것.
3. 독립 원본 Channel/Video ID 집합으로 검증된 여러 이름 표기를 같은 인물로 통합. 4개 영상이라고 4개의 독립 채널로 오산하지 않는다.
4. **마지막에** 최신 atlas_v2 기등록 인물과 모든 검증된 별칭을 다시 대조하고, 미등록 역사인물의 **단일** 순위를 공식 수동 발행·운영 API/UI로 확인.
5. Batch025 및 누락된 Batch001–007은 실제 원본 파일/해시를 확보한 다음에만 모집단 확장으로 인정.

**이번 PR은 실제 새 외부 설명 4건을 연결하는 증거 단계이지, 인물 순위나 DB 스냅샷 업데이트가 아니다.**