# 실제 실행 결과 — B024 기존 2,230,031개 영상 제목 재분석 (2026-10-20)

## 무엇을 실제로 했나

새 YouTube 접속/다운로드/크롤링 **0**. 기존 GitHub Actions 보존 artifact **#11613130249** `youtube-cumulative-batch024-validated` (SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`)에서 원본 채널 `.ndjson.gz`를 복원했다. API, Supabase, Vercel 사용 없이 원본 10,127개 채널의 2,230,031개 영상 제목을 **실제 모두 한 번 재스캔**하고, 이미 원본에서 독립 추출했던 이름 표기 5,965개(운영 제목 후보와 정확 표기 일치 5,217 + 원본에만 있던 748)를 영상 ID·채널 ID·원본 제목에 직접 재대조했다.

**실제 GitHub Actions 재분석:** [run #39363669516](https://github.com/JezCH/atlas-person-db/actions/runs/39363669516) — `reprocess_existing_original_archive` **SUCCESS**. 전체 실제 결과 원본: [artifact #12238850322](https://github.com/JezCH/atlas-person-db/actions/runs/39363669516/artifacts/12238850322), 보존 ZIP SHA256 `b068306a9d89b332020d72117d144b48f4255c890f75511855be45529c60529b`. 액션 산출물 보존기한 30일; 아래 숫자와 원본 영상 예시는 만료 후에도 남기는 검증용 기록이다. 검증기 코드가 남아 동일 B024 artifact에서 재생성 가능하다.

## 실제 계산된 숫자

| 실제 결과 | 수량 |
|---|---:|
| 입력 원본 채널 파일 | **10,127** |
| 전체 원본 영상 제목 스캔 | **2,230,031** |
| 소스 독립 추출 이름 표기 사전 | **5,965** |
| 소스 이름이 발견된 고유 영상 제목 | **330,327** |
| 명시적인 전기형 제목이 검출된 고유 원본 Video ID | **10,706** |
| 위 전기형 제목이 1개 이상 있는 원본 이름 표기 | **2,766** |
| 이름 언급만 있고 전기형 문법에 미달한 연결 횟수 | **287,751** |
| 여러 이름이 같은 제목에 등장해 보류한 연결 횟수 | **51,925** |
| 원본 이름 위치가 불명확하거나 반복돼 보류한 연결 횟수 | **5,513** |
| 죽음·살인·사건 중심 제목 보류 연결 횟수 | **1,086** |
| 기검토 비인물 표기 보류 연결 횟수 | **35** |
| 영상 실제 시청/자막 내용으로 확정한 Video ID | **0** |
| 신규 확정 미등록 실존 역사인물 / Production 게시 | **0 / 0** |

**주의:** 보류 연결 횟수는 이름별 제목 언급쌍 수이며, 고유 영상 수가 아니다. 10,706개도 인물 중심 *영상 내용*이 아니라 `Biography of X`, `Life of X`, `Who was X` 같은 **명시적인 인물 주제 *제목*에 연결된 고유 원본 Video ID**다. 역사인물 실존 여부·현재 기등록 여부·동명이인·실제 영상 콘텐츠 중심성은 아직 확정되지 않았다. 품질을 위해 223만 원본 전체를 곧장 전기 영상으로 승인하거나 그 수치를 운영 순위에 반영하지 않았다.

### 전기형 제목 검출 상위 원본 이름 표기 (2026-10-20 재분석 실제 로그)

| 원본 이름 표기 | 독립 원본 Channel ID | 전기형 제목 Video ID | 실제 원본 Video ID 샘플 |
|---|---:|---:|---|
| Albert Einstein | 64 | 68 | `gj4nSYaukKg` |
| Abraham Lincoln | 60 | 164 | `EpDvxAgyirQ` |
| William Shakespeare | 53 | 54 | `abBAwRhPKcs` |
| Leonardo da Vinci | 52 | 55 | `X5yZ7Jmm_MA` |
| Elon Musk | 50 | 62 | `wNXtoNZmJqo` |
| Nikola Tesla | 49 | 61 | `I6Al33wO-1M` |
| Nelson Mandela | 47 | 47 | `qrYdzCq_hYo` |
| Genghis Khan | 42 | 46 | `0yJfovXTRE0` |
| George Washington | 41 | 43 | `yqGajF2RCHI` |
| Benjamin Franklin | 40 | 64 | `uesBNv3VBEg` |
| Marie Curie | 40 | 41 | `4kKY0kvzTJM` |
| Julius Caesar | 38 | 39 | `5p5t_V5ANSU` |
| Alexander the Great | 37 | 54 | `R6Gg1tFX4vE` |
| Thomas Edison | 36 | 86 | `WhzaloWKyMs` |
| Adolf Hitler | 36 | 39 | `u_0Nlvp1KlU` |

상위 명단에는 현재 ATLAS에 등록되어 있을 법한 인물과 생존자도 포함된다. **이 표는 운영 미등록 인물 순위가 아니다.** source-first 분석 사전에 기등록 DB를 사용하지 않았기 때문에 자연스러운 상태다. 결과 JSON에는 모든 해당 이름의 실제 원본 Video ID 목록·Channel ID 목록이 있으며 이름별 합산 숫자가 아니라 **집합의 크기**로 계산했다. 짧은 이름, 국외·비라틴 문자, 애매한 타이틀은 이 보수적인 영어 중심 문법에서 과소 포착될 수 있다.

## 구현·재사용

- `scripts/youtube-b024-existing-corpus-biography-title-reprocess.py`: 보존된 기존 원본만 사용, 이름 사전 독립성, 원본 Video/Channel ID 중복 방지, 제목의 실제 문법상 역할에 따른 분류, 전기형 제목의 원본 ID 집합·예시 출력.
- `tests/test_youtube_b024_existing_corpus_biography_title_reprocess.py` + CI용 Node wrapper: 단순 언급, 전기형 문법, 사건·다중인물 보류, 원본 ID 비변조, 등록·실제 콘텐츠 미인증 플래그 검증.
- `.github/workflows/youtube-b024-existing-corpus-biography-title-reprocess.yml`: **기존 보존 artifact ID·digest 확인 → 오프라인 전수 재생성 → 10,127/2,230,031/5,965 계약검증 → 전체 영상별 원본 ID 목록 artifact 영속 보존(30일)**. 원본 YouTube 추가 수집·HTTP 조회 없음.

## 다음 정확한 미완료 단계

이번 차수에서 **실제 데이터 재처리라는 하나의 완결된 작업단위를 종결**한다.

**다음 차수 첫 작업은 10,706개 원본 ID와 2,766개 이름 표기를 현재 `atlas_v2.persons/person_names` 및 기검토 이명·동명이인·생존 여부와 대조하는 것.** 이는 원본 영상에서 발굴한 이름 후보를 바꾸는 단계가 아니라 최종 미등록 대상 여부를 분류하는 단계다. 현재 DB를 읽을 수 없다면 오래된 2026-10-11 등록 스냅샷 기반 분류는 `AS_OF_2026_10_11_RECHECK_REQUIRED`로 남겨야 한다. 이후 검증된 동일인 원본 ID 집합을 합치고, 보류 영상의 실제 주제 판정을 검토한다. 최종 단일 운영 순위 게시와 Vercel 402 복구는 별도 완료 조건이다.
