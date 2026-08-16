(() => {
  "use strict";

  function polityCountFromFacetSelect() {
    const select = document.getElementById("personMainPolityFilter");
    if (!select) return 0;
    return new Set(
      Array.from(select.options || [])
        .map((option) => String(option.value || "").trim())
        .filter(Boolean)
    ).size;
  }

  function visiblePersonCount(detail = null) {
    if (Number.isInteger(detail?.visibleCount)) return detail.visibleCount;
    const strong = document.querySelector("#personMainSummary strong");
    const match = String(strong?.textContent || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function renderSummaryCounts(detail = null) {
    const summary = document.getElementById("personMainSummary");
    const strong = summary?.querySelector("strong");
    if (!summary || !strong) return;
    const persons = visiblePersonCount(detail);
    const polities = polityCountFromFacetSelect();
    strong.textContent = `인물 ${persons}명 표시 · 정치체 ${polities}개`;
  }

  window.addEventListener("atlas-person-main-rendered", (event) => {
    queueMicrotask(() => renderSummaryCounts(event.detail || null));
  });

  const start = () => renderSummaryCounts();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.ATLAS_PERSON_SUMMARY_COUNTS = Object.freeze({ renderSummaryCounts, polityCountFromFacetSelect });
})();
