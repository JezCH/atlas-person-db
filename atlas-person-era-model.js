(() => {
  "use strict";

  const ERAS = Object.freeze([
    Object.freeze({ code: "ancient", label: "고대", range: "BC 480 이전", start_year: null, end_year: -481 }),
    Object.freeze({ code: "classical", label: "고전", range: "BC 480 – AD 499", start_year: -480, end_year: 499 }),
    Object.freeze({ code: "medieval", label: "중세", range: "AD 500 – 1491", start_year: 500, end_year: 1491 }),
    Object.freeze({ code: "early-modern", label: "근세", range: "AD 1492 – 1749", start_year: 1492, end_year: 1749 }),
    Object.freeze({ code: "industrial-imperial", label: "산업·제국", range: "AD 1750 – 1913", start_year: 1750, end_year: 1913 }),
    Object.freeze({ code: "world-wars", label: "세계대전", range: "AD 1914 – 1944", start_year: 1914, end_year: 1944 }),
    Object.freeze({ code: "contemporary", label: "현대", range: "AD 1945 이후", start_year: 1945, end_year: null })
  ]);
  const UNKNOWN_ERA = Object.freeze({ code: "unknown", label: "연대 미상", range: "주요 활동연도 미상", start_year: null, end_year: null });

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
