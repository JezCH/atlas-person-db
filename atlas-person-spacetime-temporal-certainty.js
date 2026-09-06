(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_TEMPORAL_CERTAINTY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function boundaryLabel(boundary, yearLabel) {
    const year = boundary?.year;
    if (!Number.isInteger(year) || year === 0 || typeof yearLabel !== "function") return "";
    const label = String(yearLabel(year) || "").trim();
    if (!label) return "";
    const certainty = String(boundary?.certainty || "").trim();
    if (certainty === "approximate") return `약 ${label}`;
    if (certainty === "uncertain") return `${label}?`;
    return label;
  }

  function periodLabel(activity, yearLabel) {
    const start = boundaryLabel(activity?.start, yearLabel) || "시작 미상";
    const end = activity?.end?.status === "ongoing"
      ? `현재 (${activity.end.as_of} 확인)`
      : boundaryLabel(activity?.end, yearLabel) || "종료 미상";
    return `${start} – ${end}`;
  }

  return Object.freeze({ boundaryLabel, periodLabel });
});
