(() => {
  "use strict";

  const entry = (value) => Object.freeze(value);

  window.ATLAS_UI_AUTHORITY_CATALOG_KO = Object.freeze({
    dashboard: entry({
      label: "대시보드",
      eyebrow: "ATLAS 운영 현황",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "인물·대표 분야·공간 배치·비연대표 기준 원본에서 데이터·작업·품질 상태를 실시간으로 파생해 보여줍니다.",
      available: "인물·런타임 활동·사용 중 정치체·대표 분야·나무위키·공간 배치·비연대표 현황을 동일한 기준 원본에서 집계합니다.",
      missing: "별도 대시보드 저장 테이블은 두지 않습니다. Place·Event·Source 등 독립 기준 조회가 완성되면 같은 집계에 추가합니다.",
      principle: "대시보드 숫자는 복제 저장하거나 하드코딩하지 않고 각 기준 원본 조회 결과에서만 파생합니다."
    }),
    persons: entry({
      label: "인물",
      eyebrow: "인물 중심 데이터셋",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "인물 식별자, 역사성, 이름, 설명, 활동 관계와 사람이 읽을 수 있는 출처 정보를 제공합니다."
    }),
    registration: entry({
      label: "등록검토",
      eyebrow: "등록 현황 검토",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "기등록 인물 통계, 기준 등록대기열 통계·목록, YouTube 반복 인물 발굴 신호를 최신 조회 모델에서 함께 확인합니다.",
      available: "기등록 인물·활동 현황과 현재 인물 등록대기열, 최신 YouTube 채널 모집단에서 파생한 반복 raw 인물명 순위를 조회합니다.",
      missing: "유튜브에서 수집된 이름은 별칭 통합·실존 인물 확인 이전의 발굴 단서입니다. 이 값만으로 인물 등록·등급·역사적 사실을 확정하지 않습니다.",
      principle: "등록 사실은 atlas_v2 인물·대기열 기준 원본가 담당하고, YouTube 반복도는 별도 파생 조회 모델로만 유지하여 발굴 단서와 검증된 기준 사실를 섞지 않습니다."
    }),
    spacetime: entry({
      label: "시공간 인물도",
      eyebrow: "인물 시공간 분포",
      status_code: "ready",
      status_label: "사용 가능 · 검토 공간 기준",
      summary: "BC 수천 년부터 현재까지의 세로 시간축과 아메리카에서 동아시아로 이어지는 가로 공간축 위에 인물 활동을 배치합니다.",
      available: "명확한 정치체는 검토된 광역 권역을 사용하고, 다지역 정치체는 수도·왕정 중심·정치 중심 등 검토된 동시기 정치체 장소 기능을 사용합니다.",
      missing: "검토된 공간 기준이 없거나 장소 기능 기간에 공백·권역 충돌이 있는 활동은 위치 미확정으로 보존합니다.",
      principle: "이름·현대국가·민족으로 위치를 추정하지 않으며 장소 기능의 변화는 기준 활동을 수정하지 않고 시각 배치 구간만 분할합니다."
    }),
    polities: entry({
      label: "정치체",
      eyebrow: "정치체 기준 정보",
      status_code: "ready",
      status_label: "현재 데이터와 검토",
      summary: "현재 기준 정치체 목록을 먼저 조회하고, 아래에서 identity 중복·통합·분리·표기 충돌 후보를 같은 실시간 데이터와 함께 검토합니다.",
      available: "상단에서 기준 정치체 목록·통계·연결 활동을 검색하고, 하단 검토 작업대에서 기존 검토된 후보와 현재 연결된 인물·연대를 비교할 수 있습니다.",
      missing: "검토 작업대의 선택은 운영 환경을 직접 변경하지 않습니다. 통합·폐기·분리은 검토된 검증된 기준 쓰기 절차로 적용하고, 적용 후 상단 기준 목록과 하단 live context가 함께 갱신됩니다.",
      principle: "정치체 사실의 원천은 기준 정치체 조회 하나로 유지합니다. 검토 후보 목록은 판단 대기열이며 사실 원천을 복제하지 않고, 실시간 조회와 결합해 비교·판정만 제공합니다."
    }),
    places: entry({
      label: "장소",
      eyebrow: "장소 기준 정보",
      status_code: "backend-needed",
      status_label: "백엔드 조회 필요",
      summary: "장소는 장기적으로 독립 기준 객체이지만 현재 메인 화면용 기준 조회 기능이 준비되지 않았습니다.",
      available: "시공간 인물도는 검토된 정치체 장소 기능을 별도 읽기 계약으로 소비하고 있습니다.",
      missing: "기준 장소·정치체 장소 기능 등록 체계는 구현되어 있습니다. 독립 장소 목록·상세 조회와 일반 사용자용 탐색 화면은 아직 없습니다.",
      principle: "장소 이름을 임의 문자열로 추정하지 않고 독립 식별자와 출처 추적 정보를 사용합니다."
    }),
    events: entry({
      label: "사건",
      eyebrow: "역사 사건 기준 정보",
      status_code: "backend-needed",
      status_label: "백엔드 조회 필요",
      summary: "역사 사건은 정치체·정부·민족집단과 분리된 별도 기준 도메인입니다.",
      available: "현재 사건 정보가 활동 비고나 출처 문맥에 포함될 수는 있지만 독립 사건 객체로 공개되지는 않습니다.",
      missing: "사건 식별자·기간·참여 객체·출처를 위한 기준 조회 모델이 필요합니다.",
      principle: "사건을 정치체나 인물 활동과 혼동하지 않고 별도 객체로 유지합니다."
    }),
    sources: entry({
      label: "출처",
      eyebrow: "출처·근거 정보",
      status_code: "partial",
      status_label: "부분 조회",
      summary: "인물과 활동의 읽을 수 있는 출처 정보는 이미 메인 화면에 공개되지만 독립 출처 탐색 화면은 아직 없습니다.",
      available: "제목·출처 유형·기준 URL·인용문과 활동 위치자를 인물 상세에서 확인할 수 있습니다.",
      missing: "독립 기준 출처 등록은 이미 구현되어 있습니다. 아직 없는 것은 독립 출처 목록·상세 브라우저와 전체 서지 정보의 공개 조회입니다.",
      principle: "출처 식별정보는 기준 출처 객체가 담당하고 위치정보·인용은 주장의 출처 근거를 설명합니다. 메인 화면은 사람이 읽을 수 있는 출처를 제공하고 관리 기능은 안전한 출처 식별자와 진단 메타데이터를 다룹니다."
    }),
    geometry: entry({
      label: "지리 형상",
      eyebrow: "지도·지리 형상 기준 정보",
      status_code: "parked",
      status_label: "중단됨 · 사용자 재개 필요",
      summary: "역사 지도 P14의 영토·지리 형상 작업은 현재 진행 중이 아니며 자동 재개하지 않습니다.",
      available: "현재 인물 DB와 시공간 인물도는 인물 → 활동 → 정치체 의미 구조와 검토된 공간 배치를 계속 사용합니다.",
      missing: "역사 경계·Territory·Geometry 통합은 보류 상태입니다. 사용자가 명시적으로 재개하기 전에는 다음 단계나 자동 로드맵으로 취급하지 않습니다.",
      principle: "인물 → 활동 → 정치체 → 영토 → 지리 형상 체인을 유지하며 인물에 영토를 직접 귀속하지 않습니다."
    })
  });
})();