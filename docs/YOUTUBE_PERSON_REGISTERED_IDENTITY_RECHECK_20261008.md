# ATLAS YouTube 기등록/대기열 재대조 — 2026-10-08

## 배경과 판정 경계

정제된 YouTube Person 신호(v4, 6,358개)는 원본 영상 제목에서 도출된 **인물 후보**다. 기등록 상태는 실제 `atlas_v2.persons`와 `atlas_v2.person_names`에 연결해야 하며, 유튜브의 고유 채널 수를 근거로 Person을 자동 등록하지 않는다.

Production 점검 기준: 등록 Person **2,120명**, Person 이름 **4,267개**(공식 영문명·한글명), 현행 YouTube 스냅샷 성공 채널 6,011개·영상 1,536,512개. 기본 문자열 일치 판정만으로는 기존 Person을 놓칠 수 있다.

## 검증된 이명/호칭 연결

다음 이름은 **정확하게 한 명의 기존 Person canonical_key**로 연결됨을 Production에서 확인했고, 동일 별칭으로 다른 등록 인물이 조회되지 않음을 확인했다.

| 유튜브/대기열 표현 | 기존 Person canonical_key | 검증 이유 |
| --- | --- | --- |
| Napoleon Bonaparte | Napoleon I | 보나파르트 나폴레옹은 나폴레옹 1세 |
| Avicenna | Ibn Sina | 이븐 시나의 라틴어권 명칭 |
| Queen Victoria | Victoria | 영국 여왕 빅토리아 |
| Queen Elizabeth II | Elizabeth II | 영국 여왕 엘리자베스 2세 |
| Shaka Zulu | Shaka kaSenzangakhona | 줄루의 샤카 |
| Attila the Hun | Attila | 훈족 아틸라 |
| Richard the Lionheart | Richard I | 사자심왕 리처드 1세 |
| Vlad the Impaler | Vlad III | 블라드 3세 체페슈 |

이 8건은 **Person UUID 조회 시점에서만** 활성화된다. 해당 Person이 존재하지 않으면 등록 판정에서 제외한다.

기등록 상태와 등록대기열은 동일한 읽기 전용 판정 규칙(`server/atlas-reviewed-person-registration-aliases.js`)을 사용한다. 등록대기열에 Avicenna·Napoleon Bonaparte 등 과거에 입력된 후보가 있어도 현재 Person ID에 단일 연결되면 **현재 대기열에서 제외**한다. 원래 후보 기록이나 Person 이름은 삭제·변경하지 않는다.

## 보류 대상

`Napoleon`, `Cleopatra`, `Alexander`, `Hannibal`, `Mozart`, `Beethoven`, `Shakespeare`, `Oppenheimer`, `Prince`, `Paris` 등 짧은 이름·단독 성씨·동명이인 가능 이름은 이명으로 확정하지 않는다. 기존 Person의 이름·별칭과 유일하게 일치하지 않으면 '기등록 일치 없음' 상태로 유지한다.

등록대기열 전체 후보의 자동 승인, 신규 Person 생성, 역사적 근거의 일괄 판정은 이 작업 범위가 아니다. 향후 검증되는 별칭은 동일한 판정 목록에 근거와 테스트를 추가한다.

## 검증

- API: 실제 Person에 존재하는 canonical_key에 대해서만 검증된 이명과 UUID를 발급한다.
- 등록대기열: 같은 이명을 `person_aliases` CTE에 포함해 정확히 한 Person과 일치한 후보를 미등록 대기열에서 제외한다.
- 등록검토 UI: Person UUID에 실제로 포함된 별칭만 기등록 배지와 '기등록 제외' 필터에 사용한다. 여러 Person과 이름이 충돌하면 '동명이인 확인'으로 보존한다.
- Canonical Person 데이터, 대기열 원본 기록, YouTube 스냅샷·영상·채널 ID는 변경하지 않는다.
