# Production 직전 등록 준비 최종 통합 — 2026-10-19

현재 유효 작업물은 **Draft PR #2549**이다. Production/DB 조회·변경·배포·Apply·merge는 수행하지 않는다. research JSON과 withdrawn archive는 실행 입력이 아니다.

## 최종 구분

| 대상 | 준비 상태 |
|---|---|
| 신규 Person 후보94명 | 소스 초안 NEEDS_PREFLIGHT. 칼리다사 비연대표1 포함 |
| 기존 울루그 베그 | 같은 Person UUID 재사용, 활동2개 보완 초안 |
| 기존 칼뱅 | 1536–1538 첫 제네바 활동 보완만 별도 보정 검토. 신규 생성 제외 |
| 남았던 user98의31명 | 소스/신원/연대/나무위키 검토:18명 초안,13명 근거 명시 HOLD |
| 소포클레스·하비 | 이전 독립 표제어 HOLD 유지 |
| 대기14명 | 자동 등록 제외; 실제 DB 후보 대기열 편입 미완료 |

활성125요청 = Timeline124 + 칼리다사 Person-only1. 원래 user98 명단의 상태는 저장된 기존61명 + source draft24명 + HOLD13명이다. 이번 신규 후보94명과 원래 user98명은 서로 다른 모수다. 전체205개 검토 이름/표지는 대기·신화·신원미상도 포함하며 등록 승인 인원수가 아니다.

## 원본과 중복 정리

기존8개 Draft #2512/#2517/#2526/#2528/#2543/#2544/#2546/#2548을 **동일 경로·동일 request_id·동일 역사 필드**로 #2549에 통합한다. 원본 대조와 통합 CI 성공 후 이전 PR은 SUPERSEDED로 종료한다. 다른 UI·Polity·YouTube 작업은 그대로 보존한다.

- 마티스는 #2544에서 실제 제거하여19명으로 수정했고 CI가 통과했다. 원본은 Git 이력과 withdrawn archive에 보존한다.
- #2500의 레오노르/렘피라/프락시네툼 나스르는 저장된 Person·Activity UUID와 충돌하는 생성 요청3개를 authoring 밖으로 바이트 그대로 이동했다. #2500 제목·설명도 NO REPLAY로 정정했다. 날짜/정치체 차이는 기존 UUID 보정으로만 다룬다.
- 사용자가 제공한 2026-10-18 엑셀에서 **다르마팔라(Dharmapala of Bengal), 칼뱅, 티글라트-필레세르3세, 피게레스 페레르**가 이미 표시되어 있는 것을 새로 확인했다. 이름·정치체·역할·기간을 대조하여 관련7개 요청을 생성 경로 밖으로 보존했다. 칼뱅의1541–1564는 기존 활동이며 첫1536–1538만 활동 보완 후보다. 피게레스의 세 임기 역시 이미 표시되어 있고 정확한 일 단위 차이는 보정 검토이지 새 인물/활동 추가의 근거가 아니다.
- 조이스는 한 초안만 재사용한다. CORE40 후보 ID와 윌리엄 애덤스/Miura Anjin 동일인은 보존한다. 바이바르스/Baibars 두 UUID는 correction HOLD이며 이번에 DB 병합/삭제하지 않았다.
- 오일러3/카를 아우구스트4/지로8/패튼4/페탱13 등 유효한 별도 활동은 유지한다. 폐기된 패튼9개 활동은 되살리지 않는다.

#2549가 Draft이므로 main의 #2500 옛3경로는 아직 남아 있다. 병합 전에도 절대 재적용하지 않는다. archive JSON에 원본 review_status가 남아 있어도 실행 승인으로 해석하지 않는다.

## 추가 검토31명

초안18명: 위그 드 파앵, 주키에프스키, 로렌스, 운게른슈테른베르크, 빌리 미첼, 안드레아 도리아, 보방, 산토스뒤몽, 니키틴, 해밀턴, 시부사와, 파베르제, 에라스뮈스, 사하로프, 러브크래프트, 로버트 E. 하워드, 로베르 슈만, 알 하캄2세.

HOLD13명: 로저 드 로리아, 다마스쿠스의 아폴로도로스, 얀 리흐워터, 필리베르 드 로르메, 우르반, 알프레드 크루프, 라스트렐리, 본 다 말라모코, 장 노이하우스2세, 클라비우스, 마붑 울 하크, 르 노트르, 랜슬롯 브라운. 개인 표제어/작품 귀속/개인 연대/실존 근거의 해제 조건은 review JSON에 명시한다. 본 다 말라모코의828 유해 이송 전승을 확정된 역사적 개인의 정확한 활동으로 만들지 않는다. 미러 접근 오류나 검색 실패는 문서 없음 증거가 아니므로 speculative not_found를 만들지 않았다. HOLD는 검증 통과가 아니다.

## 재현 가능한 증거

- registration-reconciliation-20261019.json: 전체205 이름/표지, 코호트/기존 근거/유효 PR/제외 사유.
- preproduction-remaining31-review-20261019.json:31명 각각 기관·학술 출처, 동명이인/연대 구분과 상태.
- preproduction-export-screen-20261019.json: 엑셀 실제 바이트SHA와2,646 표시행/2,145 정규화 영문명 대조. UUID/전체 별칭 없는 날짜 특정 추출본이므로 미일치는 현재 DB 부재 증명이 아니다. 원본 엑셀을 GitHub에 복제하지 않았다.
- preproduction-request-inventory-20261019.json:125개 활성 경로/불변 요청ID/파일SHA256, 비실행 목록과 current-state gate.

기존 validator/실제 strict parser125/125, 관련 기존 service/v6.1/person-only 회귀26개 통과. 통합 전후 역사 필드·요청 ID 불변, 후보/대기/기존/HOLD 격리, archive 손실 없음 대조. Howard/Goddard, Brahms/Brand, Goya/Francis Ona, Milton/Dalton은 비슷한 이름이어도 다른 인물이라 자동 결합하지 않았다. PHFC /36 전수 사실 완성도는 주장하지 않는다.

## 남은 Production 경계

94명은 실제 신규 생성 수가 아니다. 현재 Person/다국어 별칭/semantic Activity/정확한 정치체/기존 NamuWiki를 preflight하여 기존 UUID·후보 ID를 재사용한다. READY만 원래 Manifest로 canonical Apply→Compile→readback한다. 소스 HOLD13 + 기존 표제어 HOLD2 + 대기14는 자동 적용하지 않는다. 소스 HOLD 해소에는 추가 근거가 필요하며 이 문서는 전체 후보가 Apply READY라고 주장하지 않는다.

기존 Apply 실패 기록: #2497 run38229950973/#2500 run38241811143/#2501 run38423738649는402 readiness; #2511 run38899601104/#2514 run38911717114는 runtime code drift로 쓰기 전 중단했다. 과거 run33648098873의 Muhammad V·레오노르 개별 commit/readback 성공을 전체 workflow FAILURE와 혼동해 재등록하지 않는다.
