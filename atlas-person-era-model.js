(() => {
  "use strict";

  const ERAS = Object.freeze([
    Object.freeze({ code: "early-civilization", label: "초기문명", range: "BC 1000 이전", start_year: null, end_year: -1001 }),
    Object.freeze({ code: "ancient", label: "고대", range: "BC 1000 – 601", start_year: -1000, end_year: -601 }),
    Object.freeze({ code: "classical", label: "고전", range: "BC 600 – AD 599", start_year: -600, end_year: 599 }),
    Object.freeze({ code: "early-medieval", label: "전기중세", range: "AD 600 – 999", start_year: 600, end_year: 999 }),
    Object.freeze({ code: "late-medieval", label: "후기중세", range: "AD 1000 – 1491", start_year: 1000, end_year: 1491 }),
    Object.freeze({ code: "early-modern", label: "근세", range: "AD 1492 – 1749", start_year: 1492, end_year: 1749 }),
    Object.freeze({ code: "industrial-imperial", label: "산업·제국", range: "AD 1750 – 1913", start_year: 1750, end_year: 1913 }),
    Object.freeze({ code: "world-wars", label: "세계대전", range: "AD 1914 – 1944", start_year: 1914, end_year: 1944 }),
    Object.freeze({ code: "cold-war", label: "냉전", range: "AD 1945 – 1990", start_year: 1945, end_year: 1990 }),
    Object.freeze({ code: "information", label: "정보화", range: "AD 1991 이후", start_year: 1991, end_year: null })
  ]);
  const UNKNOWN_ERA = Object.freeze({ code: "unknown", label: "전설, 신화, 연대미상", range: "연표 외 · 주요 활동연도 미상", start_year: null, end_year: null });

  function containsYear(era, year) {
    if (!Number.isInteger(year) || year === 0) return false;
    if (Number.isInteger(era.start_year) && year < era.start_year) return false;
    if (Number.isInteger(era.end_year) && year > era.end_year) return false;
    return true;
  }

  function eraForYear(year) {
    if (!Number.isInteger(year) || year === 0) return UNKNOWN_ERA;
    return ERAS.find((era) => containsYear(era, year)) || UNKNOWN_ERA;
  }

  window.ATLAS_PERSON_ERA_MODEL = Object.freeze({ ERAS, UNKNOWN_ERA, containsYear, eraForYear });
})();
