# YouTube Person 상시 증분 감사 운영 — 2026-10-09

## 해결할 문제

기존 6,358개에 대해 기등록/생존/비인물 검토를 완료하더라도 새 배치가 들어올 때 새 인물명과 변형 표기가 계속 증가한다. **5,657개를 수동으로 처음부터 재검토하는 방식**은 불가능하다.

## 발행마다 자동 수행되는 절차

1. 새 누적 아티팩트를 명시적으로 전달해 `.github/workflows/youtube-person-signal-publish.yml` 실행. **코드 push로 구형 batch017을 재발행하지 않는다.**
2. 검증된 배치008부터 최신까지 원본 영상/고유 채널 ID를 누적 재구축. 기존 성공 채널 6,011·영상 1,536,512개·선정 채널 6,770개는 **최소 기준**으로만 검사하고 다음 배치 번호는 동적 검사한다.
3. **발행 전** 현재 Production 신호를 `youtube-person-signals` 읽기 API에서 페이지별로 전부 가져온다. API가 실패하거나 페이지/스냅샷이 일관되지 않으면 발행을 중단한다.
4. 현재 Production **Person 읽기 API**를 호출한다. canonical name, 한글명, 기존 `names[]` 별칭과 UUID를 키별로 정규화한다. 이미 검토한 대표/이명 83개 등은 버전 관리되는 공유 기준을 이용한다. Person read model이 유효하지 않으면 발행을 중단한다.
5. `scripts/youtube-incremental-review.mjs`가 새 스냅샷과 직전 Production 스냅샷을 **전체 비교**하고 이름별 차이를 분류한다.
   - `NEW` — 신규 raw-name 정규화 키. 검토할 미등록/비인물/생존 여부가 아직 확인되지 않았다면 신규 검토 대상으로 올린다.
   - `PRIORITY_UP` — 고유 채널 수 증가로 P2→P1, P1→P0 등의 검토 우선순위 경계를 넘은 기존 이름.
   - `CHANNEL_GAIN`/`CHANNEL_LOSS` — 기존 이름 출현 수 변동. **이미 검토된 인물을 무조건 다시 검토하지 않는다.**
   - `UNCHANGED` — 기존 판정을 재사용한다.
   - `disappeared` — 기존 신호가 집계 최소 3채널 기준 아래로 떨어졌거나 명칭이 변경된 경우. **원본 삭제 지시가 아니다.**
6. `audits/youtube-reviewed-dispositions.json`의 사람이 확인한 `NON_INDIVIDUAL`, `AMBIGUOUS`, `UNIDENTIFIED`, `MYTH_FICTION` 판정을 정규화된 이름 키로 재사용한다. 역사 인물임을 확증하지 못하는 문자열은 언제나 `UNRESOLVED` 유지.
7. 등록 확인된 UUID, 만료되지 않은 생존 명단, 기존 심사 판정에 해당하지 않는 **신규 이름/우선순위 상승만** `attention.csv`에 올린다. 동일 키 충돌이나 다른 표기 변경은 재검토 대상으로 간주한다.
8. 증분 보고서를 `/tmp/atlas-youtube-publication/audit/audit.json`·`attention.csv`로 보존하고, 발행 결과 아티팩트에 포함한다. Actions 요약 화면에 신규 이름·P0/P1/P2 수를 표시한다.
9. 정상 검증 시에만 Production에 기존 보존 규칙대로 새 스냅샷을 append-only 발행한다.

## P0/P1/P2

| 우선순위 | 고유 채널 | 정책 |
| --- | --- | --- |
| P0 | 10개 이상 | 신규·대폭 성장 항목부터 개별 근거 검증 |
| P1 | 5–9개 | 자동 등록/인명/비인명 2차 스크리닝 |
| P2 | 3–4개 | 전체 목록 추적, 무조건 저품질로 폐기하지 않음 |

지난 2026-10-09 전수 감사에서 남은 5,657개는 Issue #2216에 **기존 백로그**로 유지한다. 이 증분 파이프라인은 새 이름만 매번 추가해 중복 작업을 막는 역할이지, 기존 백로그 5,657개가 자동으로 전기·실존 여부 검증을 통과했다는 뜻이 아니다.

## 안전·운영 불변 조건

- 생존인물은 최신 시점 기준 **검증된 생존자료만** 자동 제외. 한시적 Reviewed Living 목록은 만료 후에는 자동확정에 사용하지 않는다.
- 정규화 문자열은 **동일인 확증이 아니다.** 동명이인·의미가 갈리는 이름은 대표 인물 가정과 원본 검증을 구별한다.
- `Sparta`를 `Gorgo of Sparta`로, `Drake`를 `Francis Drake`로 성씨 일치만으로 자동 통합하지 않는다.
- `NON_INDIVIDUAL` 검토 결론은 이름 검토 레저에만 반영한다. 사람·영상·정치체 원본을 삭제하거나 유튜브 채널 수를 단순 합산하지 않는다.
- 이 워크플로는 **새 누적 아티팩트가 발행 요청을 통해 제공되면** 자동 실행된다. 유튜브 새 채널 탐색 자체를 자동 개시하는 스케줄러는 이 변경 범위에 포함되지 않는다.
- 현재 게시 API에는 채널과 인물 신호 각각 20,000행의 상한이 존재한다. 지속적인 성장을 위해 장기적으로는 청크 업로드/백엔드 배치 방식이 필요하다. 단순히 상한 숫자만 키우면 Vercel request 크기 제한에 걸릴 수 있다.

## 파일

- `scripts/youtube-fetch-previous-signals.py` — 이전 Production 스냅샷의 검증된 페이지별 일괄 수집
- `scripts/youtube-incremental-review.mjs` — 전체 동적 차이 집계, Person UUID/생존/기존 검토 상태 재사용, 검토 우선순위 생성
- `audits/youtube-reviewed-dispositions.json` — 판정 기록으로 사용되는 안전한 1차 영구 레저
- `.github/workflows/youtube-person-signal-publish.yml` — 안전한 발행 게이트+증분 감사 자동 연결
- `tests/atlas-youtube-incremental-review.test.mjs` — 변경 비교·오매칭 방지·판정 재사용·동시 필터 검증

검토 레저는 특정 입력 항목이 논쟁적일 경우 `AMBIGUOUS` 또는 `UNIDENTIFIED`로 남긴다. 임의의 확정 판단은 코드 변경/테스트/배포 증거를 요구한다.
