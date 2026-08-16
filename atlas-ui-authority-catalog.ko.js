(() => {
  "use strict";

  const entry = (value) => Object.freeze(value);

  window.ATLAS_UI_AUTHORITY_CATALOG_KO = Object.freeze({
    dashboard: entry({
      label: "대시보드",
      eyebrow: "ATLAS 정보 제공 범위",
      status_code: "partial",
      status_label: "부분 제공",
      summary: "현재 메인 화면이 공개할 수 있는 기준 도메인과 아직 백엔드 읽기 기능이 필요한 영역을 한눈에 보여줍니다.",
      available: "인물 중심 공개 조회와 인물 활동의 정치체·관계·역할·기간 기준 필터가 현재 제공됩니다.",
      missing: "전 도메인을 합산하는 별도 기준 대시보드 조회 모델은 아직 없습니다.",
      principle: "없는 지표를 계산해 정상처럼 보이지 않고, 준비 여부 자체를 정보로 표시합니다."
    }),
    persons: entry({
      label: "인물",
      eyebrow: "인물 중심 데이터셋",
      status_code: "ready",
      status_label: "사용 가능",
      summary: "인물 식별자, 역사성, 이름, 설명, 활동 관계와 사람이 읽을 수 있는 출처 정보를 제공합니다."
    }),
    polities: entry({
      label: "정치체",
      eyebrow: "정치체 기준 정보",
      status_code: "partial",
      status_label: "부분 조회",
      summary: "정치체 식별자는 이미 인물 활동과 의미 필터를 통해 보이지만, 독립적인 공개 정치체 탐색 화면은 아직 기준 기능으로 완성되지 않았습니다.",
      available: "인물 활동에서 정치체 UUID와 읽을 수 있는 이름을 확인할 수 있고 메인 필터에도 정치체 항목이 제공됩니다.",
      missing: "독립 정치체 목록·상세·설명·출처를 제공하는 공개 조회 계약이 아직 없습니다.",
      principle: "인물이 영토를 소유하지 않으며 인물 → 활동 → 정치체 관계를 유지합니다."
    }),
    places: entry({
      label: "장소",
      eyebrow: "장소 기준 정보",
      status_code: "backend-needed",
      status_label: "백엔드 조회 필요",
      summary: "장소는 장기적으로 독립 기준 객체이지만 현재 메인 화면용 기준 조회 기능이 준비되지 않았습니다.",
      available: "현재 인물 활동의 정치체 맥락과 출처 추적 정보는 볼 수 있습니다.",
      missing: "출생지·사망지·수도·활동 장소 등을 UUID 기반 장소 객체로 읽는 공개 계약이 필요합니다.",
      principle: "장소 이름을 임의 문자열로 추정하지 않고 향후 독립 식별자와 출처 추적 정보를 사용합니다."
    }),
    events: entry({
      label: "사건",
      eyebrow: "역사 사건 기준 정보",
      status_code: "backend-needed",
      status_label: "백엔드 조회 필요",
      summary: "역사 사건은 정치체·정부·민족집단과 분리된 별도 기준 도메인으로 계획되어 있습니다.",
      available: "현재 사건 정보가 활동 비고나 출처 문맥에 포함될 수는 있지만 독립 사건 객체로 공개되지는 않습니다.",
      missing: "사건 식별자·기간·참여 객체·출처를 위한 기준 조회 모델이 필요합니다.",
      principle: "사건을 정치체나 인물 활동과 혼동하지 않고 별도 객체로 유지합니다."
    }),
    sources: entry({
      label: "출처",
      eyebrow: "출처 / 추적 정보",
      status_code: "partial",
      status_label: "부분 조회",
      summary: "인물과 활동의 읽을 수 있는 출처 정보는 이미 메인 화면에 공개되지만 독립 출처 탐색 화면은 아직 없습니다.",
      available: "제목·출처 유형·기준 URL·인용문과 활동 위치자를 인물 상세에서 확인할 수 있습니다.",
      missing: "메인 화면용 독립 출처 목록·상세 조회는 아직 없으며 출처 UUID·키·해시·바이트는 관리자 객체 검사 영역입니다.",
      principle: "메인 화면은 사람이 읽을 수 있는 출처를, 관리자는 안전한 출처 식별자와 진단 메타데이터를 담당합니다."
    }),
    geometry: entry({
      label: "지리 형상",
      eyebrow: "지도 / 지리 형상 기준 정보",
      status_code: "future",
      status_label: "향후 단계 · P14",
      summary: "지리 형상은 역사 지도 통합 단계에서 정치체 영토를 통해 연결될 미래 기준 도메인입니다.",
      available: "현재 인물과 정치체의 역사 의미를 지도 연동에 사용할 수 있도록 활동 의미 구조를 정규화하고 있습니다.",
      missing: "영토·지리 형상 공개 조회와 시계열 지도 연결은 아직 메인 런타임 기준 기능이 아닙니다.",
      principle: "인물 → 활동 → 정치체 → 영토 → 지리 형상 체인을 유지하며 인물에 영토를 직접 귀속하지 않습니다."
    })
  });
})();
