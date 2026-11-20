((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_COMPARE_VIEW = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const escapeHtml = (value) => text(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function yearLabel(year) {
    if (!Number.isInteger(year) || year === 0) return "연도 미상";
    return year < 0 ? "BC " + Math.abs(year) : "AD " + year;
  }

  function boundaryLabel(boundary) {
    if (boundary?.status === "ongoing") return "현재 (" + text(boundary.as_of || "확인일 미상") + " 확인)";
    if (!Number.isInteger(boundary?.year) || boundary.year === 0) return "연도 미상";
    let label = yearLabel(boundary.year);
    if (Number.isInteger(boundary.month)) label += " " + boundary.month + "월";
    if (Number.isInteger(boundary.day)) label += " " + boundary.day + "일";
    if (boundary.certainty === "approximate") return "약 " + label;
    if (boundary.certainty === "uncertain") return label + "?";
    return label;
  }

  function boundaryFacts(boundary) {
    if (!boundary) return "경계 근거 미상";
    return [
      boundary.granularity ? "정밀도: " + text(boundary.granularity) : null,
      boundary.certainty ? "확실성: " + text(boundary.certainty) : null,
      boundary.calendar ? "역법: " + text(boundary.calendar) : null,
      boundary.status ? "상태: " + text(boundary.status) : null
    ].filter(Boolean).join(" · ") || "경계 근거 미상";
  }

  function safeSourceUrl(value) {
    try {
      const url = new URL(text(value));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch { return null; }
  }

  function renderSources(sources) {
    if (!Array.isArray(sources) || !sources.length) return '<p class="atlas-compare-empty">연결된 출처 없음</p>';
    return '<ul class="atlas-compare-sources">' + sources.map((source) => {
      const title = text(source?.display_reference || source?.citation_text || source?.title || source?.canonical_url) || "출처";
      const url = safeSourceUrl(source?.canonical_url);
      const bibliography = [
        source?.author_creator ? "저자: " + source.author_creator : null,
        source?.institution ? "기관: " + source.institution : null,
        source?.publisher ? "출판: " + source.publisher : null,
        source?.publication_date ? "발행: " + source.publication_date :
          source?.publication_year != null ? "발행: " + source.publication_year : null,
        source?.locator ? "위치: " + source.locator : null
      ].filter(Boolean).join(" · ");
      const link = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(title) + "</a>" : "<span>" + escapeHtml(title) + "</span>";
      return "<li>" + link + (bibliography ? "<small>" + escapeHtml(bibliography) + "</small>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  function renderActivity(activity, index) {
    const polity = text(activity?.polity?.display_name || activity?.polity?.canonical_name_en) || "정치체 미상";
    const relation = text(activity?.relation?.display_name || activity?.relation?.source_label || activity?.relation?.code) || "관계 미상";
    const role = text(activity?.role?.display_name || activity?.role?.source_label || activity?.role?.code) || "역할 미상";
    const basis = text(activity?.period_basis?.display_name || activity?.period_basis?.code) || "기간 기준 미상";
    const interval = boundaryLabel(activity?.start) + " — " + boundaryLabel(activity?.end);
    const context = [
      activity?.chronology_status ? "연대 상태: " + activity.chronology_status : null,
      activity?.confidence ? "근거 수준: " + activity.confidence : null
    ].filter(Boolean).join(" · ");
    return '<article class="atlas-compare-activity" data-compare-activity="' + escapeHtml(activity?.id || "") + '">' +
      '<header><small>활동 ' + String(index + 1).padStart(2, "0") + '</small><h5>' + escapeHtml(polity) + '</h5></header>' +
      '<p class="atlas-compare-period">' + escapeHtml(interval) + '</p>' +
      '<p class="atlas-compare-activity-role">' + escapeHtml(relation) + " · " + escapeHtml(role) + '</p>' +
      '<p class="atlas-compare-basis">기간 기준: ' + escapeHtml(basis) + '</p>' +
      '<dl><div><dt>시작 경계</dt><dd>' + escapeHtml(boundaryFacts(activity?.start)) +
      '</dd></div><div><dt>종료 경계</dt><dd>' + escapeHtml(boundaryFacts(activity?.end)) + '</dd></div></dl>' +
      (context ? '<p class="atlas-compare-certainty">' + escapeHtml(context) + '</p>' : "") +
      (activity?.notes ? '<p class="atlas-compare-notes">' + escapeHtml(activity.notes) + '</p>' : "") +
      '<details class="atlas-compare-source-details"><summary>이 활동의 출처 (' +
      (Array.isArray(activity?.sources) ? activity.sources.length : 0) + ')</summary>' +
      renderSources(activity?.sources) + '</details></article>';
  }

  function renderPerson(person, column) {
    const name = text(person?.display_name || person?.canonical_name_en) || "이름 미상";
    const englishName = text(person?.canonical_name_en);
    const activities = Array.isArray(person?.activities) ? person.activities : [];
    return '<section class="atlas-compare-person" aria-labelledby="atlasCompareName' + column + '">' +
      '<header class="atlas-compare-person-head"><small>인물 ' + column + '</small>' +
      '<h4 id="atlasCompareName' + column + '">' + escapeHtml(name) + '</h4>' +
      (englishName && englishName !== name ? '<p>' + escapeHtml(englishName) + '</p>' : "") +
      '<span>등록된 활동 ' + activities.length + '건</span>' +
      '<button type="button" data-compare-remove="' + escapeHtml(person?.id || "") +
      '" aria-label="' + escapeHtml(name) + ' 비교 대상에서 제외">비교에서 제외</button></header>' +
      '<div class="atlas-compare-person-body">' +
      (activities.length ? activities.map(renderActivity).join("") :
        '<p class="atlas-compare-empty">검토된 활동 기록이 없습니다. 활동 시점을 추정하지 않습니다.</p>') +
      '<details class="atlas-compare-person-sources"><summary>인물 출처 (' +
      (Array.isArray(person?.sources) ? person.sources.length : 0) + ')</summary>' +
      renderSources(person?.sources) + '</details></div></section>';
  }

  function render(persons, { returnToExploration = false } = {}) {
    if (!Array.isArray(persons) || persons.length !== 2 || !persons[0]?.id || !persons[1]?.id ||
      persons[0].id === persons[1].id) throw new Error("ATLAS_COMPARE_REQUIRES_TWO_DISTINCT_PERSONS");
    return '<header class="atlas-compare-head"><div><p>ATLAS · 인물 연구</p>' +
      '<h3 id="atlasCompareTitle">두 인물의 활동 기록 비교</h3></div>' +
      '<div class="atlas-compare-head-actions">' +
      (returnToExploration ? '<button type="button" data-compare-return-spacetime>↶ 이전 시공간 탐험으로</button>' : '') +
      '<button type="button" data-compare-close aria-label="인물 비교 닫기">닫기</button></div></header>' +
      '<p class="atlas-compare-disclaimer">아래 기간은 출생·사망 연도가 아니라 각 인물의 등록된 Activity 기간입니다. ' +
      '연도·역법·확실성이 미상인 경계는 추정하지 않으며, 동시대 활동이 실제 접촉·영향·관계를 뜻하지 않습니다.</p>' +
      '<div class="atlas-compare-columns">' + renderPerson(persons[0], 1) +
      renderPerson(persons[1], 2) + '</div>';
  }

  return Object.freeze({ render, renderPerson, boundaryLabel, safeSourceUrl });
});
