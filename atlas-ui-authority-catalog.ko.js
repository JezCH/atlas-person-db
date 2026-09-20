(() => {
  "use strict";

  const entry = (value) => Object.freeze(value);

  window.ATLAS_UI_AUTHORITY_CATALOG_KO = Object.freeze({
    dashboard: entry({
      label: "대시보드",
      eyebrow: "ATLAS CONTROL CENTER",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "Person·Domain·Spatial·Non-timeline 기준 원본에서 데이터·작업·품질 상태를 실시간으로 파생해 보여줍니다.",
      available: "인물·Runtime Activity·사용 중 정치체·대표 분야·나무위키·Spatial·Non-timeline 현황을 동일한 기준 원본에서 집계합니다.",
      missing: "별도 대시보드 저장 테이블은 두지 않습니다. Place·Event·Source 등 독립 기준 조회가 완성되면 같은 projection에 추가합니다.",
      principle: "대시보드 숫자는 복제 저장하거나 하드코딩하지 않고 각 canonical read snapshot에서만 파생합니다."
    }),
    persons: entry({
      label: "인물",
      eyebrow: "인물 중심 데이터셋",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "인물 식별자, 역사성, 이름, 설명, 활동 관계와 사람이 읽을 수 있는 출처 정보를 제공합니다."
    }),
    spacetime: entry({
      label: "시공간 인물도",
      eyebrow: "인물 시공간 분포",
      status_code: "ready",
      status_label: "사용 가능 · 검토 공간 기준",
      summary: "BC 수천 년부터 현재까지의 세로 시간축과 아메리카에서 동아시아로 이어지는 가로 공간축 위에 인물 활동을 배치합니다.",
      available: "명확한 정치체는 검토된 광역 권역을 사용하고, 다지역 정치체는 수도·왕정 중심·정치 중심 등 검토된 동시기 정치체 장소 기능을 사용합니다.",
      missing: "검토된 공간 기준이 없거나 장소 기능 기간에 공백·권역 충돌이 있는 활동은 위치 미확정으로 보존합니다.",
      principle: "이름·현대국가·민족으로 위치를 추정하지 않으며 장소 기능의 변화는 기준 Activity를 수정하지 않고 시각 배치 구간만 분할합니다."
    }),
    polities: entry({
      label: "정치체",
      eyebrow: "정치체 기준 정보",
      status_code: "ready",
      status_label: "현재 데이터 + 검토",
      summary: "현재 canonical Polity 목록을 먼저 조회하고, 아래에서 identity 중복·통합·분리·표기 충돌 후보를 같은 live 데이터와 함께 검토합니다.",
      available: "상단에서 canonical 정치체 목록·통계·연결 Activity를 검색하고, 하단 검토 작업대에서 기존 reviewed candidate와 현재 live 연결 인물·연대를 비교할 수 있습니다.",
      missing: "검토 작업대의 선택은 Production을 직접 변경하지 않습니다. merge·retire·split은 검토된 canonical writer로 적용하고, 적용 후 상단 canonical 목록과 하단 live context가 함께 갱신됩니다.",
      principle: "정치체 사실의 원천은 canonical Polity read 하나로 유지합니다. 검토 candidate registry는 판단 대기열이며 사실 원천을 복제하지 않고, live read와 결합해 비교·판정만 제공합니다."
    }),
    places: entry({
      label: "장소",
      eyebrow: "장소 기준 정보",
      status_code: "backend-needed",
      status_label: "백엔드 조회 필요",
      summary: "장소는 장기적으로 독립 기준 객체이지만 현재 메인 화면용 기준 조회 기능이 준비되지 않았습니다.",
      available: "시공간 인물도는 검토된 정치체 장소 기능을 별도 읽기 계약으로 소비하고 있습니다.",
      missing: "출생지·사망지·수도·활동 장소 등을 UUID 기반 장소 객체로 읽고 편집하는 P13 기준 계약이 필요합니다.",
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
      missing: "독립 출처 목록·상세 조회와 first-class Source authoring은 P13에서 완성해야 합니다.",
      principle: "메인 화면은 사람이 읽을 수 있는 출처를 제공하고 관리 기능은 안전한 출처 식별자와 진단 메타데이터를 다룹니다."
    }),
    geometry: entry({
      label: "지리 형상",
      eyebrow: "지도·지리 형상 기준 정보",
      status_code: "future",
      status_label: "향후 단계 · P14",
      summary: "지리 형상은 역사 지도 통합 단계에서 정치체 영토를 통해 연결될 미래 기준 도메인입니다.",
      available: "현재 인물 DB는 지도 연동에 필요한 인물 → 활동 → 정치체 의미 구조를 보존합니다.",
      missing: "영토·지리 형상 공개 조회와 시계열 지도 통합은 별도 역사 지도 저장소와 P14에서 완성해야 합니다.",
      principle: "인물 → 활동 → 정치체 → 영토 → 지리 형상 체인을 유지하며 인물에 영토를 직접 귀속하지 않습니다."
    })
  });
})();