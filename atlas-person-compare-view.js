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


  // UI-07B: compare registered Activity ranges, never inferred lifetimes.
  // Use the same BCE/CE ordinal semantics as ATLAS_PERSON_SPACETIME_MODEL.
  function yearOrdinal(year) {
    const shared = typeof globalThis !== "undefined" ? globalThis.ATLAS_PERSON_SPACETIME_MODEL : null;
    if (typeof shared?.historicalYearToOrdinal === "function") return shared.historicalYearToOrdinal(year);
    return Number.isSafeInteger(year) && year !== 0 ? (year < 0 ? year : year - 1) : null;
  }

  function ordinalYear(ordinal) {
    const shared = typeof globalThis !== "undefined" ? globalThis.ATLAS_PERSON_SPACETIME_MODEL : null;
    if (typeof shared?.ordinalToHistoricalYear === "function") return shared.ordinalToHistoricalYear(ordinal);
    return Number.isSafeInteger(ordinal) ? (ordinal < 0 ? ordinal : ordinal + 1) : null;
  }

  function activityPeriod(activity) {
    const start = activity?.start, end = activity?.end;
    const first = yearOrdinal(start?.year), last = yearOrdinal(end?.year);
    // An ongoing/as-of Activity has no documented closing boundary. Do not
    // substitute today's date, or present a provisional endpoint as a fact.
    if (first == null || last == null || first > last || end?.status === "ongoing"
      || start?.status === "ongoing") return Object.freeze({ usable:false });
    const boundaries = [start,end];
    const calendars = boundaries.map((value) => text(value?.calendar).toLowerCase());
    const knownCalendar = (code) => code === "gregorian" || code === "julian";
    const documented = boundaries.every((value) =>
      value?.certainty === "exact" && value?.granularity === "year")
      && knownCalendar(calendars[0]) && calendars[0] === calendars[1]
      && !/conflict|disput|unreview|unresolved|approx|uncertain/i.test(text(activity?.chronology_status));
    return Object.freeze({
      usable:true, first, last, documented, calendar:calendars[0] || null,
      activityId:text(activity?.id),
      polity:text(activity?.polity?.display_name || activity?.polity?.canonical_name_en) || "정치체 미상"
    });
  }

  function compareIntervals(persons) {
    if (!Array.isArray(persons) || persons.length !== 2) throw new Error("ATLAS_COMPARE_REQUIRES_TWO_PERSONS");
    const left = Array.isArray(persons[0]?.activities) ? persons[0].activities : [];
    const right = Array.isArray(persons[1]?.activities) ? persons[1].activities : [];
    const lhs = left.map(activityPeriod), rhs = right.map(activityPeriod);
    const confirmed = [], candidates = [];
    let inconclusive = 0, separate = 0;
    for (let i=0;i<lhs.length;i++) for (let j=0;j<rhs.length;j++) {
      const a = lhs[i], b = rhs[j];
      if (!a.usable || !b.usable) { inconclusive++; continue; }
      const sameCalendar = Boolean(a.calendar) && a.calendar === b.calendar;
      const definitive = a.documented && b.documented && sameCalendar;
      const first = Math.max(a.first,b.first);
      const last = Math.min(a.last,b.last);
      if (first > last) {
        if (definitive) separate++;
        else inconclusive++;
        continue;
      }
      const match = Object.freeze({
        leftIndex:i, rightIndex:j,
        left:a, right:b, first, last,
        status:definitive ? "confirmed" : "candidate"
      });
      if (definitive) confirmed.push(match);
      else candidates.push(match);
    }
    return Object.freeze({
      confirmed:Object.freeze(confirmed), candidates:Object.freeze(candidates),
      inconclusive, separate, total:left.length*right.length
    });
  }

  function intervalYearRange(first,last) {
    const start = yearLabel(ordinalYear(first)), end = yearLabel(ordinalYear(last));
    return start === end ? start : start + " – " + end;
  }

  function intervalBar(start,end,base,extent) {
    const left = Math.max(0,Math.min(100,100*(start-base)/extent));
    const width = Math.max(0,Math.min(100-left,100*(end-start+1)/extent));
    return 'style="left:' + left.toFixed(3) + '%;width:' + width.toFixed(3) + '%"';
  }

  function renderOverlapEntry(match,persons) {
    const nameA = text(persons[0]?.display_name || persons[0]?.canonical_name_en) || "인물 1";
    const nameB = text(persons[1]?.display_name || persons[1]?.canonical_name_en) || "인물 2";
    const aLabel = "활동 " + (match.leftIndex+1) + " · " + match.left.polity;
    const bLabel = "활동 " + (match.rightIndex+1) + " · " + match.right.polity;
    const base = Math.min(match.left.first,match.right.first);
    const end = Math.max(match.left.last,match.right.last);
    const extent = end-base+1;
    const definite = match.status === "confirmed";
    const status = definite ? "기록 경계상 교차" : "교차 가능 구간 · 검토 필요";
    return '<li class="atlas-compare-overlap atlas-compare-overlap--' + match.status + '">' +
      '<div class="atlas-compare-overlap-head"><strong>' + status + '</strong><span>' +
      escapeHtml(intervalYearRange(match.first,match.last)) + '</span></div>' +
      '<p class="atlas-compare-overlap-pair"><b>' + escapeHtml(nameA) + '</b> ' + escapeHtml(aLabel) +
      ' / <b>' + escapeHtml(nameB) + '</b> ' + escapeHtml(bLabel) + '</p>' +
      '<div class="atlas-compare-interval-graphic" role="img" aria-label="' +
      escapeHtml(nameA + "의 등록 기간 " + intervalYearRange(match.left.first,match.left.last)
        + ", " + nameB + "의 등록 기간 " + intervalYearRange(match.right.first,match.right.last)
        + ", " + (definite?"등록 경계상 교차":"수치상 교차 후보") + " " +
        intervalYearRange(match.first,match.last)) + '">' +
      '<div class="atlas-compare-interval-row"><span>인물 1</span><div class="atlas-compare-interval-rail">' +
      '<i class="atlas-compare-interval-bar is-first" ' +
      intervalBar(match.left.first,match.left.last,base,extent) + '></i></div></div>' +
      '<div class="atlas-compare-interval-row"><span>인물 2</span><div class="atlas-compare-interval-rail">' +
      '<i class="atlas-compare-interval-bar is-second" ' +
      intervalBar(match.right.first,match.right.last,base,extent) + '></i></div></div>' +
      '<div class="atlas-compare-interval-row"><span>교차</span><div class="atlas-compare-interval-rail">' +
      '<i class="atlas-compare-interval-bar is-intersection" ' +
      intervalBar(match.first,match.last,base,extent) + '></i></div></div></div>' +
      (definite ? '<small>두 Activity의 명시적 연도 경계·정밀도·역법이 일치하는 범위만 계산했습니다.</small>' :
        '<small>연도 수치상 겹치지만 경계 확실성·정밀도 또는 역법이 충분히 확인되지 않았습니다. 정확한 교집합으로 확정하지 않습니다.</small>') +
      '</li>';
  }

  function renderOverlapList(matches,persons) {
    if (!matches.length) return "";
    const renderRows=(items)=>'<ol class="atlas-compare-overlap-list">' +
      items.map((row)=>renderOverlapEntry(row,persons)).join("")+'</ol>';
    const head=matches.slice(0,8),tail=matches.slice(8);
    return renderRows(head) + (tail.length ?
      '<details class="atlas-compare-overlap-more"><summary>교차 후보 및 기록 ' +
      tail.length + '건 더 보기</summary>' + renderRows(tail) + '</details>' : "");
  }

  function renderOverlapSummary(persons) {
    const result = compareIntervals(persons);
    const labels = '<div class="atlas-compare-overlap-counts">' +
      '<span><strong>' + result.confirmed.length + '</strong> 기록 경계상 교차</span>' +
      '<span><strong>' + result.candidates.length + '</strong> 추가 검토 후보</span>' +
      '<span><strong>' + result.inconclusive + '</strong> 판별 불가</span>' +
      '<span><strong>' + result.separate + '</strong> 경계상 미교차</span></div>';
    return '<section class="atlas-compare-period-analysis" aria-labelledby="atlasComparePeriodsTitle">' +
      '<header><div><small>ACTIVITY · TIME</small><h4 id="atlasComparePeriodsTitle">활동기간 교차 검토</h4></div>' +
      '<span>등록 Activity 조합 ' + result.total + '쌍</span></header>' + labels +
      '<p class="atlas-compare-overlap-note">등록된 활동 연도 범위만 비교합니다. 같은 연도에 활동한 것이 같은 날 활동했거나 실제로 접촉·협력·영향을 주었다는 증거는 아닙니다. ' +
      '근사·불확실·미상·진행 중인 경계나 서로 다른 역법은 정확한 교차로 처리하지 않습니다.</p>' +
      (result.confirmed.length||result.candidates.length
        ? renderOverlapList([...result.confirmed,...result.candidates],persons)
        : '<p class="atlas-compare-overlap-empty">' +
          (result.inconclusive ? '확인 가능한 교차가 없습니다. 일부 기간은 근거 부족으로 판별할 수 없습니다.' :
            '확인된 활동기간 교차가 없습니다.') + '</p>') +
      '</section>';
  }

  function render(persons) {
    if (!Array.isArray(persons) || persons.length !== 2 || !persons[0]?.id || !persons[1]?.id ||
      persons[0].id === persons[1].id) throw new Error("ATLAS_COMPARE_REQUIRES_TWO_DISTINCT_PERSONS");
    return '<header class="atlas-compare-head"><div><p>ATLAS · 인물 연구</p>' +
      '<h3 id="atlasCompareTitle">두 인물의 활동 기록 비교</h3></div>' +
      '<button type="button" data-compare-close aria-label="인물 비교 닫기">닫기</button></header>' +
      '<p class="atlas-compare-disclaimer">아래 기간은 출생·사망 연도가 아니라 각 인물의 등록된 Activity 기간입니다. ' +
      '연도·역법·확실성이 미상인 경계는 추정하지 않으며, 동시대 활동이 실제 접촉·영향·관계를 뜻하지 않습니다.</p>' +
      renderOverlapSummary(persons) +
      '<div class="atlas-compare-columns">' + renderPerson(persons[0], 1) +
      renderPerson(persons[1], 2) + '</div>';
  }

  return Object.freeze({ render, renderPerson, boundaryLabel, safeSourceUrl, yearOrdinal, activityPeriod, compareIntervals, renderOverlapSummary });
});
