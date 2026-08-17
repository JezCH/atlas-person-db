(() => {
  "use strict";

  const reader = window.ATLAS_PERSON_BROWSER_READER;
  const model = window.ATLAS_PERSON_SPACETIME_MODEL;
  const SPATIAL_INDEX_URL = "./atlas-polity-spatial-index.json";
  const MIN_CARD_HEIGHT = 48;
  const CARD_WIDTH = 164;
  const LANE_GAP = 10;
  const REGION_PADDING = 18;
  const MIN_REGION_WIDTH = 230;
  const DEFAULT_CENTURY_HEIGHT = 36;
  const ERA_DEFINITIONS = Object.freeze([
    Object.freeze({ code: "ancient", label: "고대", range: "BC 480 이전", start_year: null, end_year: -481 }),
    Object.freeze({ code: "classical", label: "고전", range: "BC 480 – AD 499", start_year: -480, end_year: 499 }),
    Object.freeze({ code: "medieval", label: "중세", range: "AD 500 – 1491", start_year: 500, end_year: 1491 }),
    Object.freeze({ code: "early-modern", label: "근세", range: "AD 1492 – 1749", start_year: 1492, end_year: 1749 }),
    Object.freeze({ code: "industrial-imperial", label: "산업·제국", range: "AD 1750 – 1913", start_year: 1750, end_year: 1913 }),
    Object.freeze({ code: "world-wars", label: "세계대전", range: "AD 1914 – 1944", start_year: 1914, end_year: 1944 }),
    Object.freeze({ code: "contemporary", label: "현대", range: "AD 1945 이후", start_year: 1945, end_year: null })
  ]);

  if (!reader || !model) {
    console.error("ATLAS spacetime view could not initialize required dependencies");
    return;
  }

  let loadPromise = null;
  let persons = [];
  let spatialIndex = null;
  let query = "";
  let centuryHeight = DEFAULT_CENTURY_HEIGHT;
  let selectedKey = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function personLabel(person) {
    return String(person?.display_name || person?.preferred_name_ko || person?.canonical_name_en || "이름 미상");
  }

  function polityLabel(activity) {
    return String(activity?.polity?.display_name || activity?.polity?.preferred_name_ko || activity?.polity?.canonical_name_en || "정치체 미상");
  }

  function periodLabel(activity) {
    const start = Number.isInteger(activity?.start?.year) && activity.start.year !== 0 ? model.yearLabel(activity.start.year) : "시작 미상";
    const end = Number.isInteger(activity?.end?.year) && activity.end.year !== 0 ? model.yearLabel(activity.end.year) : "종료 미상";
    return `${start} – ${end}`;
  }

  function placementBasisLabel(segment) {
    if (segment?.placement_basis === "capital") return `수도: ${segment.location_label || segment.capital_name || "미상"}`;
    if (segment?.placement_basis === "authority_center") return `왕정·정치 중심: ${segment.location_label || segment.authority_center_name || "미상"}`;
    return "검토된 정치체 권역";
  }

  function searchable(entry) {
    const values = [
      personLabel(entry.person),
      entry.person?.canonical_name_en,
      polityLabel(entry.activity),
      entry.activity?.relation?.display_name,
      entry.activity?.relation?.code,
      entry.activity?.role?.display_name,
      entry.activity?.role?.source_label,
      periodLabel(entry.activity)
    ];
    return values.filter(Boolean).join("\n").toLocaleLowerCase("ko");
  }

  function flattenActivities(list) {
    const entries = [];
    for (const person of list || []) {
      const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
      for (const activity of activities) entries.push(Object.freeze({ person, activity }));
    }
    return entries;
  }

  async function fetchSpatialIndex() {
    const response = await fetch(SPATIAL_INDEX_URL, { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`SPATIAL_INDEX_HTTP_${response.status}`);
    const payload = await response.json();
    const validation = model.validateSpatialIndex(payload);
    if (!validation.valid) {
      const error = new Error(`INVALID_SPATIAL_INDEX: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_SPATIAL_INDEX";
      throw error;
    }
    return payload;
  }

  async function ensureData() {
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([reader.listPersons(), fetchSpatialIndex()]).then(([personResult, placement]) => {
      persons = personResult.persons || [];
      spatialIndex = placement;
      return true;
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
    return loadPromise;
  }

  function ordinalDistance(startYear, endYear) {
    const start = model.historicalYearToOrdinal(startYear);
    const end = model.historicalYearToOrdinal(endYear);
    return start == null || end == null ? 0 : end - start;
  }

  function yForYear(year, startYear, pxPerYear) {
    return ordinalDistance(startYear, year) * pxPerYear;
  }

  function buildEraBands(range, pxPerYear) {
    const rangeStart = model.historicalYearToOrdinal(range.start_year);
    const rangeEnd = model.historicalYearToOrdinal(range.end_year);
    return ERA_DEFINITIONS.map((era) => {
      const eraStart = era.start_year == null ? rangeStart : model.historicalYearToOrdinal(era.start_year);
      const eraEnd = era.end_year == null ? rangeEnd : model.historicalYearToOrdinal(era.end_year);
      if (eraStart == null || eraEnd == null) return null;
      const start = Math.max(rangeStart, eraStart);
      const end = Math.min(rangeEnd, eraEnd);
      if (start > end) return null;
      return { ...era, top: (start - rangeStart) * pxPerYear, height: Math.max(1, (end - start + 1) * pxPerYear) };
    }).filter(Boolean);
  }

  function buildPlacement(entries, lookup, timeline, pxPerYear) {
    const placedByRegion = new Map(model.REGION_DEFINITIONS.map((region) => [region.code, []]));
    const unresolvedPosition = [];
    const unresolvedChronology = [];

    for (const entry of entries) {
      const placement = model.resolveActivityPlacement(entry.activity, lookup);
      if (placement.status === "chronology_unresolved") {
        unresolvedChronology.push({ ...entry, reason: placement.chronology_reason || placement.status });
        continue;
      }
      if (placement.status !== "placed") {
        unresolvedPosition.push({ ...entry, reason: placement.status });
        continue;
      }
      for (const [segmentIndex, segment] of placement.segments.entries()) {
        const top = yForYear(segment.start_year, timeline.start_year, pxPerYear);
        const bottom = yForYear(segment.end_year, timeline.start_year, pxPerYear);
        const trueTop = Math.min(top, bottom);
        const trueBottom = Math.max(top, bottom);
        const visualBottom = Math.max(trueBottom, trueTop + MIN_CARD_HEIGHT);
        const stableId = `${entry.person.id}:${entry.activity.id}:${segmentIndex}`;
        const item = {
          ...entry,
          segment,
          stable_id: stableId,
          top: trueTop,
          bottom: trueBottom,
          visual_top: trueTop,
          visual_bottom: visualBottom
        };
        const bucket = placedByRegion.get(segment.region_code);
        if (bucket) bucket.push(item);
        else unresolvedPosition.push({ ...entry, reason: "invalid_region" });
      }
    }

    const regionLayouts = [];
    for (const region of model.REGION_DEFINITIONS) {
      const withLanes = model.assignLanes(placedByRegion.get(region.code) || [], LANE_GAP);
      const laneCount = withLanes.length ? Math.max(...withLanes.map((item) => item.lane)) + 1 : 1;
      const width = Math.max(MIN_REGION_WIDTH, REGION_PADDING * 2 + laneCount * (CARD_WIDTH + LANE_GAP));
      regionLayouts.push({ ...region, items: withLanes, lane_count: laneCount, width });
    }
    return { regionLayouts, unresolvedPosition, unresolvedChronology };
  }

  function reasonLabel(reason) {
    return ({
      spatial_unresolved: "검토된 정치체 권역·수도·왕정 중심 기준 없음",
      capital_period_no_overlap: "활동기간과 검토된 수도 기간이 겹치지 않음",
      authority_center_period_no_overlap: "활동기간과 검토된 왕정·정치 중심 기간이 겹치지 않음",
      polity_unresolved: "정치체 identity 미확정",
      invalid_region: "공간 권역 코드 오류",
      missing_boundaries: "활동 시작·종료 연도 모두 미확정",
      incomplete_boundary: "활동 시작·종료 중 한쪽 연도 미확정",
      reversed_boundaries: "활동 시작·종료 연도 순서 검토 필요",
      chronology_unresolved: "활동연대 미확정"
    })[reason] || String(reason || "미확정");
  }

  function unresolvedRows(rows, max = 40) {
    if (!rows.length) return '<p class="spacetime-empty-inline">없음</p>';
    const visible = rows.slice(0, max);
    return `<div class="spacetime-unresolved-list">${visible.map((entry) => `<div class="spacetime-unresolved-row">
      <strong>${escapeHtml(personLabel(entry.person))}</strong>
      <span>${escapeHtml(polityLabel(entry.activity))}</span>
      <span>${escapeHtml(periodLabel(entry.activity))}</span>
      <small>${escapeHtml(reasonLabel(entry.reason))}</small>
    </div>`).join("")}${rows.length > max ? `<p class="spacetime-more">외 ${rows.length - max}건</p>` : ""}</div>`;
  }

  function renderCard(item, left) {
    const selected = selectedKey === item.stable_id ? " is-selected" : "";
    const trueHeight = Math.max(2, item.bottom - item.top);
    const laneLeft = left + REGION_PADDING + item.lane * (CARD_WIDTH + LANE_GAP);
    const basis = placementBasisLabel(item.segment);
    const title = `${personLabel(item.person)} · ${polityLabel(item.activity)} · ${periodLabel(item.activity)} · 가로 기준: ${basis}`;
    return `<div class="spacetime-person-anchor" style="left:${laneLeft}px;top:${item.top}px;height:${trueHeight}px"><span class="spacetime-duration-rail" aria-hidden="true"></span></div>
    <button type="button" class="spacetime-person-card${selected}" data-spacetime-key="${escapeHtml(item.stable_id)}" style="left:${laneLeft + 8}px;top:${item.visual_top}px;width:${CARD_WIDTH}px" title="${escapeHtml(title)}">
      <strong>${escapeHtml(personLabel(item.person))}</strong>
      <span>${escapeHtml(polityLabel(item.activity))}</span>
      <small>${escapeHtml(periodLabel(item.activity))}</small>
      <i>${escapeHtml(basis)}</i>
    </button>`;
  }

  function renderSelection(item) {
    if (!item) return "";
    const relation = item.activity?.relation?.display_name || item.activity?.relation?.code || "관계 미확정";
    const role = item.activity?.role?.display_name || item.activity?.role?.source_label || "역할 미지정";
    return `<div class="spacetime-selection" id="spacetimeSelection">
      <div><small>SELECTED ACTIVITY</small><strong>${escapeHtml(personLabel(item.person))}</strong><span>${escapeHtml(polityLabel(item.activity))} · ${escapeHtml(relation)} · ${escapeHtml(role)}</span></div>
      <div><span>${escapeHtml(periodLabel(item.activity))}</span><span>가로 위치 기준: ${escapeHtml(placementBasisLabel(item.segment))}</span></div>
    </div>`;
  }

  function renderInto(mount) {
    const allEntries = flattenActivities(persons);
    const needle = query.trim().toLocaleLowerCase("ko");
    const entries = needle ? allEntries.filter((entry) => searchable(entry).includes(needle)) : allEntries;
    const timeline = model.deriveTimelineRange(allEntries.map((entry) => entry.activity), new Date().getFullYear());
    const pxPerYear = centuryHeight / 100;
    const timelineHeight = Math.max(800, yForYear(timeline.end_year, timeline.start_year, pxPerYear) + 2);
    const lookup = model.createSpatialLookup(spatialIndex);
    const placement = buildPlacement(entries, lookup, timeline, pxPerYear);
    const ticks = model.buildCenturyTicks(timeline.start_year, timeline.end_year);
    const eras = buildEraBands(timeline, pxPerYear);

    let x = 0;
    const regionMeta = placement.regionLayouts.map((region) => {
      const current = { ...region, left: x };
      x += region.width;
      return current;
    });
    const contentWidth = Math.max(x, 1000);
    const selectedItem = regionMeta.flatMap((region) => region.items).find((item) => item.stable_id === selectedKey) || null;

    const directCount = spatialIndex?.polity_geography && typeof spatialIndex.polity_geography === "object" ? Object.keys(spatialIndex.polity_geography).length : 0;
    const capitalCount = Array.isArray(spatialIndex?.capital_records) ? spatialIndex.capital_records.length : 0;
    const authorityCount = Array.isArray(spatialIndex?.authority_center_records) ? spatialIndex.authority_center_records.length : 0;
    const reviewCount = Array.isArray(spatialIndex?.review_queue) ? spatialIndex.review_queue.length : 0;
    const placedCount = regionMeta.reduce((sum, region) => sum + region.items.length, 0);

    mount.innerHTML = `<section class="spacetime-toolbar card">
      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>세로는 역사 시간, 가로는 검토된 정치체 권역입니다. 광역 위치가 애매하면 당시 수도를 사용하고, 고정 수도가 성립하지 않는 유목·순회 왕정에 한해서만 검토된 왕정·정치 중심을 보조 기준으로 사용합니다.</p></div>
      <div class="spacetime-controls">
        <label>검색<input id="spacetimeSearch" type="search" value="${escapeHtml(query)}" placeholder="인물·정치체·역할 검색" /></label>
        <label>100년 높이<select id="spacetimeScale"><option value="28"${centuryHeight === 28 ? " selected" : ""}>28px · 압축</option><option value="36"${centuryHeight === 36 ? " selected" : ""}>36px · 기본</option><option value="52"${centuryHeight === 52 ? " selected" : ""}>52px · 확대</option></select></label>
      </div>
    </section>
    <section class="spacetime-status-row">
      <span><b>${entries.length}</b> Activity</span><span><b>${placedCount}</b> 배치 구간</span><span><b>${placement.unresolvedPosition.length}</b> 위치 미확정</span><span><b>${placement.unresolvedChronology.length}</b> 연대 미확정</span><span><b>${directCount}</b> 정치체 권역</span><span><b>${capitalCount}</b> 수도 판정 Polity</span><span><b>${authorityCount}</b> 왕정 중심 Polity</span><span><b>${reviewCount}</b> 기준 검토 대기</span>
    </section>
    ${(reviewCount || placement.unresolvedPosition.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>명확한 정치체는 검토된 광역 권역, 다지역 정치체는 검토된 당시 수도를 사용합니다. 고정 수도가 없다고 확인된 경우에만 사료로 검토된 왕정·정치 중심을 사용하며, 그마저 특정할 수 없으면 ‘위치 미확정’으로 보존합니다.</p></section>` : ""}
    ${renderSelection(selectedItem)}
    <section class="spacetime-frame card">
      <div class="spacetime-scroll" tabindex="0" aria-label="역사 시간과 검토된 정치체 권역에 따른 인물 활동 분포">
        <div class="spacetime-sticky-corner"><span>시대</span><span>연도</span></div>
        <div class="spacetime-region-head" style="width:${contentWidth}px">${regionMeta.map((region) => `<div style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${region.items.length}구간</small></div>`).join("")}</div>
        <div class="spacetime-era-axis" style="height:${timelineHeight}px">${eras.map((era) => `<div class="person-era-${escapeHtml(era.code)}" style="top:${era.top}px;height:${era.height}px"><span>${escapeHtml(era.label)}</span></div>`).join("")}</div>
        <div class="spacetime-year-axis" style="height:${timelineHeight}px">${ticks.map((tick) => `<span style="top:${yForYear(tick.year, timeline.start_year, pxPerYear)}px">${escapeHtml(tick.label)}</span>`).join("")}</div>
        <div class="spacetime-canvas" style="width:${contentWidth}px;height:${timelineHeight}px">
          ${ticks.map((tick) => `<i class="spacetime-century-line" style="top:${yForYear(tick.year, timeline.start_year, pxPerYear)}px"></i>`).join("")}
          ${regionMeta.map((region) => `<i class="spacetime-region-line" style="left:${region.left}px;height:${timelineHeight}px"></i>`).join("")}
          ${regionMeta.map((region) => region.items.map((item) => renderCard(item, region.left)).join("")).join("")}
        </div>
      </div>
    </section>
    <section class="spacetime-unresolved-grid">
      <article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${placement.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역·당시 수도·필요한 왕정 중심 중 어느 기준도 확정할 수 없어 가로 위치를 만들지 않은 Activity입니다.</p>${unresolvedRows(placement.unresolvedPosition)}</article>
      <article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">CHRONOLOGY REVIEW</p><h3>연대 미확정</h3></div><strong>${placement.unresolvedChronology.length}</strong></div><p>Activity 시작·종료 연도를 둘 다 확정할 수 없는 경우 세로축에 임의 기간을 만들지 않습니다.</p>${unresolvedRows(placement.unresolvedChronology)}</article>
    </section>`;

    mount.querySelector("#spacetimeSearch")?.addEventListener("input", (event) => {
      query = event.target.value || "";
      renderInto(mount);
      requestAnimationFrame(() => {
        const input = mount.querySelector("#spacetimeSearch");
        input?.focus();
        input?.setSelectionRange(query.length, query.length);
      });
    });
    mount.querySelector("#spacetimeScale")?.addEventListener("change", (event) => {
      centuryHeight = Number(event.target.value) || DEFAULT_CENTURY_HEIGHT;
      renderInto(mount);
    });
    mount.querySelectorAll("[data-spacetime-key]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKey = button.dataset.spacetimeKey || null;
        renderInto(mount);
      });
    });
  }

  async function activate() {
    const mount = document.getElementById("personSpacetimeMount");
    if (!mount) return;
    mount.innerHTML = '<section class="card spacetime-loading"><strong>시공간 인물도 준비 중</strong><p>Person Activity와 검토된 공간 배치 자료를 읽고 있습니다.</p></section>';
    try {
      await ensureData();
      if (document.getElementById("personSpacetimeMount") !== mount) return;
      renderInto(mount);
    } catch (error) {
      console.error(error);
      mount.innerHTML = `<section class="card spacetime-error"><strong>시공간 인물도를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.code || error?.message || "UNKNOWN_ERROR")}</p><button id="spacetimeRetry" type="button" class="btn">다시 시도</button></section>`;
      mount.querySelector("#spacetimeRetry")?.addEventListener("click", () => { loadPromise = null; activate(); });
    }
  }

  window.ATLAS_PERSON_SPACETIME_VIEW = Object.freeze({ activate });
})();
