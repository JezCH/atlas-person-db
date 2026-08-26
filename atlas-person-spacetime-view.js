(() => {
  "use strict";

  const reader = window.ATLAS_PERSON_BROWSER_READER;
  const model = window.ATLAS_PERSON_SPACETIME_MODEL;
  const eraModel = window.ATLAS_PERSON_ERA_MODEL;
  const SPATIAL_INDEX_URL = "./atlas-polity-spatial-index.json";
  const AXIS_WIDTH = 168;
  const DEFAULT_TIMELINE_HEIGHT = 4200;
  const LOG_SOFTENING_YEARS = 420;
  const TIME_CAMERA_HEADER_HEIGHT = 44;
  const TIME_CAMERA_MIN_ZOOM = 0.75;
  const TIME_CAMERA_MAX_ZOOM = 8;
  const TIME_CAMERA_ZOOM_STEP = 1.35;
  const DETAIL_SPACE_ZOOM = 3;
  const MIN_WORLD_WIDTH = 900;
  const RUNTIME_ASSETS = Object.freeze([
    ["./atlas-person-spacetime-time-projection.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_TIME_PROJECTION"],
    ["./atlas-person-spacetime-space-axis.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_SPACE_AXIS"],
    ["./atlas-person-spacetime-spatial-compile.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE"],
    ["./atlas-person-spacetime-person-tracks.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_PERSON_TRACKS"],
    ["./atlas-person-spacetime-political-placement.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT"],
    ["./atlas-person-spacetime-lod.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_LOD"],
    ["./atlas-person-spacetime-label-engine.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_LABEL_ENGINE"]
  ]);

  if (!reader || !model || !eraModel) {
    console.error("ATLAS spacetime view could not initialize required dependencies");
    return;
  }

  let runtimePromise = null;
  let loadPromise = null;
  let persons = [];
  let spatialIndex = null;
  let query = "";
  let horizontalViewMode = "overview";
  let selectedPersonId = null;
  let resizeBound = false;
  let resizeFrame = 0;
  let timeCameraZoom = 1;
  let cameraScrollTop = 0;
  let cameraScrollLeft = 0;
  let cameraCenterOrdinal = null;
  let currentTimelineProjection = null;
  let pendingCameraAnchor = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function personLabel(person) {
    return text(person?.display_name) || text(person?.preferred_name_ko) || text(person?.canonical_name_en) || "이름 미상";
  }

  function polityLabel(activity) {
    return text(activity?.polity?.display_name) || text(activity?.polity?.preferred_name_ko) || text(activity?.polity?.canonical_name_en) || "정치체 미상";
  }

  function periodLabel(activity) {
    const start = Number.isInteger(activity?.start?.year) && activity.start.year !== 0 ? model.yearLabel(activity.start.year) : "시작 미상";
    const end = Number.isInteger(activity?.end?.year) && activity.end.year !== 0 ? model.yearLabel(activity.end.year) : "종료 미상";
    return `${start} – ${end}`;
  }

  function placementBasisLabel(segment) {
    if (segment?.historical_placement_basis !== "polity_place_function") return "검토된 정치체 권역";
    const typeLabel = ({ capital: "수도", royal_court: "왕정 중심", royal_residence: "왕실 거점", imperial_court_core: "제국 궁정 중심", political_center: "정치 중심", administrative_center: "행정 중심" })[segment?.place_function_type] || "정치체 장소 기능";
    return `${typeLabel}: ${segment.location_label || segment.place_name || "미상"}`;
  }

  function loadScriptOnce(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const existing = document.querySelector(`script[data-atlas-spacetime-runtime="${src}"]`);
    if (existing) return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window[globalName]), { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.atlasSpacetimeRuntime = src;
      script.addEventListener("load", () => window[globalName] ? resolve(window[globalName]) : reject(new Error(`ATLAS_SPACETIME_RUNTIME_MISSING: ${globalName}`)), { once: true });
      script.addEventListener("error", () => reject(new Error(`ATLAS_SPACETIME_RUNTIME_LOAD_FAILED: ${src}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  function ensureRuntimeModules() {
    if (runtimePromise) return runtimePromise;
    runtimePromise = RUNTIME_ASSETS.reduce((promise, [src, globalName]) => promise.then(() => loadScriptOnce(src, globalName)), Promise.resolve())
      .catch((error) => {
        runtimePromise = null;
        throw error;
      });
    return runtimePromise;
  }

  function runtime() {
    const api = {
      timeProjection: window.ATLAS_PERSON_SPACETIME_TIME_PROJECTION,
      spaceAxis: window.ATLAS_PERSON_SPACETIME_SPACE_AXIS,
      spatialCompile: window.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE,
      personTracks: window.ATLAS_PERSON_SPACETIME_PERSON_TRACKS,
      politicalPlacement: window.ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT,
      lod: window.ATLAS_PERSON_SPACETIME_LOD,
      labelEngine: window.ATLAS_PERSON_SPACETIME_LABEL_ENGINE
    };
    if (Object.values(api).some((value) => !value)) throw new Error("ATLAS_SPACETIME_RUNTIME_INCOMPLETE");
    return api;
  }

  function clampTimeCameraZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.min(TIME_CAMERA_MAX_ZOOM, Math.max(TIME_CAMERA_MIN_ZOOM, numeric));
  }

  function timeCameraZoomLabel() {
    return `${Math.round(timeCameraZoom * 100)}%`;
  }

  function cameraViewportCenterY(scroll) {
    const usableHeight = Math.max(1, scroll.clientHeight - TIME_CAMERA_HEADER_HEIGHT);
    return TIME_CAMERA_HEADER_HEIGHT + usableHeight / 2;
  }

  function updateCameraPosition(scroll, projection) {
    cameraScrollTop = scroll.scrollTop;
    cameraScrollLeft = scroll.scrollLeft;
    if (!projection?.screenToWorldOrdinal) return;
    const canvasY = Math.max(0, scroll.scrollTop + cameraViewportCenterY(scroll) - TIME_CAMERA_HEADER_HEIGHT);
    cameraCenterOrdinal = projection.screenToWorldOrdinal(canvasY);
  }

  function requestTimeCameraZoom(mount, nextZoom, viewportY = null) {
    const scroll = mount.querySelector(".spacetime-scroll");
    if (!scroll || !currentTimelineProjection?.screenToWorldOrdinal) return;
    const clampedZoom = clampTimeCameraZoom(nextZoom);
    if (Math.abs(clampedZoom - timeCameraZoom) < 1e-9) return;
    const rawViewportY = Number.isFinite(Number(viewportY)) ? Number(viewportY) : cameraViewportCenterY(scroll);
    const safeViewportY = Math.min(scroll.clientHeight, Math.max(TIME_CAMERA_HEADER_HEIGHT, rawViewportY));
    const currentCanvasY = Math.max(0, scroll.scrollTop + safeViewportY - TIME_CAMERA_HEADER_HEIGHT);
    pendingCameraAnchor = {
      ordinal: currentTimelineProjection.screenToWorldOrdinal(currentCanvasY),
      viewport_y: safeViewportY,
      scroll_left: scroll.scrollLeft
    };
    timeCameraZoom = clampedZoom;
    renderInto(mount);
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

  function flattenActivities(list) {
    const entries = [];
    for (const person of list || []) {
      for (const activity of Array.isArray(person?.activity_summaries) ? person.activity_summaries : []) entries.push({ person, activity });
    }
    return entries;
  }

  function buildEraBands(range, scale) {
    const rangeStart = model.historicalYearToOrdinal(range.start_year);
    const rangeEnd = model.historicalYearToOrdinal(range.end_year);
    return eraModel.ERAS.map((era) => {
      const eraStart = era.start_year == null ? rangeStart : model.historicalYearToOrdinal(era.start_year);
      const eraEnd = era.end_year == null ? rangeEnd : model.historicalYearToOrdinal(era.end_year);
      if (eraStart == null || eraEnd == null) return null;
      const start = Math.max(rangeStart, eraStart);
      const end = Math.min(rangeEnd, eraEnd);
      if (start > end) return null;
      const top = scale.yForOrdinal(start);
      const bottom = end >= rangeEnd ? scale.height : scale.yForOrdinal(end + 1);
      return { ...era, top, height: Math.max(1, bottom - top) };
    }).filter(Boolean);
  }

  function compileAtlas() {
    const { spaceAxis, spatialCompile, personTracks, politicalPlacement } = runtime();
    const continuum = spaceAxis.createSpatialContinuum();
    const lookup = model.createSpatialLookup(spatialIndex);
    const placements = [];
    const unresolvedPosition = [];
    const unresolvedChronology = [];
    for (const entry of flattenActivities(persons)) {
      const raw = model.resolveActivityPlacement(entry.activity, lookup);
      if (raw.status === "chronology_unresolved") unresolvedChronology.push({ ...entry, reason: raw.chronology_reason || raw.status });
      else if (raw.status !== "placed") unresolvedPosition.push({ ...entry, reason: raw.status });
      const compiled = spatialCompile.compileActivityPlacement(raw, continuum);
      placements.push(compiled);
      if (raw.status === "placed" && compiled.status !== "placed") unresolvedPosition.push({ ...entry, reason: compiled.reason || compiled.status });
    }
    const compiledTracks = personTracks.compilePersonTracks(persons, placements);
    const partitioned = politicalPlacement.partitionTracks(compiledTracks);
    return { continuum, partitioned, unresolvedPosition, unresolvedChronology };
  }

  function trackSearchable(track) {
    const values = [track.display_name, track.canonical_name_en, track.preferred_name_ko];
    for (const segment of [...(track.primary_segments || []), ...(track.counterparty_segments || []), ...(track.unclassified_segments || [])]) {
      const activity = segment.activity;
      values.push(polityLabel(activity), activity?.relation?.display_name, activity?.relation?.code, activity?.role?.display_name, activity?.role?.source_label, periodLabel(activity));
    }
    return values.filter(Boolean).join("\n").toLocaleLowerCase("ko");
  }

  function stableRepresentativeSegment(track) {
    const segments = Array.isArray(track?.primary_segments) ? track.primary_segments.slice() : [];
    if (!segments.length) return null;
    segments.sort((a, b) => (b.end_ordinal - b.start_ordinal) - (a.end_ordinal - a.start_ordinal) || a.start_ordinal - b.start_ordinal || String(a.stable_id).localeCompare(String(b.stable_id)));
    return segments[0];
  }

  function projectTrack(track, projection, contentWidth) {
    const representative = stableRepresentativeSegment(track);
    if (!representative || !Number.isFinite(representative.x_anchor)) return null;
    const yStart = projection.yForOrdinal(representative.start_ordinal);
    const yEnd = projection.yForOrdinal(representative.end_ordinal);
    return { track, representative, x: representative.x_anchor * contentWidth, y: (yStart + yEnd) / 2, macroregion_code: representative.macroregion_code };
  }

  function packTrackLabels(projectedTracks, regions, timelineHeight, forceAll) {
    const { labelEngine } = runtime();
    const placed = [];
    const deferred = [];
    for (const region of regions) {
      const labels = projectedTracks.filter((item) => item.macroregion_code === region.code).map((item) => ({
        person_id: item.track.person_id,
        track_id: item.track.track_id,
        text: item.track.display_name,
        anchor_x: item.x - region.left,
        anchor_y: item.y,
        forced: forceAll || selectedPersonId === item.track.person_id
      }));
      if (!labels.length) continue;
      const result = labelEngine.packLabels(labels, { width: Math.max(48, region.width), height: timelineHeight }, { maxLabelWidth: Math.max(42, Math.min(164, region.width - 8)), maxHorizontalShift: region.width });
      placed.push(...result.placed.map((label) => ({ ...label, label_x: region.left + label.label_x, region_code: region.code, region_left: region.left })));
      deferred.push(...result.deferred);
    }
    return { placed, deferred };
  }

  function reasonLabel(reason) {
    return ({
      spatial_unresolved: "검토된 정치체 권역·장소 기능 기준 없음",
      spatial_compile_unresolved: "안정 공간축으로 Compile 불가",
      invalid_macroregion: "공간 권역 코드 오류",
      place_function_period_gap: "활동기간 전체를 덮는 검토된 정치체 장소 기능이 없음",
      place_function_region_conflict: "동시기 검토된 정치체 장소 기능이 여러 권역으로 갈림",
      polity_unresolved: "정치체 identity 미확정",
      missing_boundaries: "활동 시작·종료 연도 모두 미확정",
      incomplete_boundary: "활동 시작·종료 중 한쪽 연도 미확정",
      reversed_boundaries: "활동 시작·종료 연도 순서 검토 필요",
      chronology_unresolved: "활동연대 미확정"
    })[reason] || String(reason || "미확정");
  }

  function unresolvedRows(rows, max = 40) {
    if (!rows.length) return '<p class="spacetime-empty-inline">없음</p>';
    const visible = rows.slice(0, max);
    return `<div class="spacetime-unresolved-list">${visible.map((entry) => `<div class="spacetime-unresolved-row"><strong>${escapeHtml(personLabel(entry.person))}</strong><span>${escapeHtml(polityLabel(entry.activity))}</span><span>${escapeHtml(periodLabel(entry.activity))}</span><small>${escapeHtml(reasonLabel(entry.reason))}</small></div>`).join("")}${rows.length > max ? `<p class="spacetime-more">외 ${rows.length - max}건</p>` : ""}</div>`;
  }

  function renderSelection(track) {
    if (!track) return "";
    const primary = track.primary_segments || [];
    const counterparties = track.counterparty_segments || [];
    const activities = primary.slice(0, 5).map((segment) => `${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`).join(" / ");
    return `<div class="spacetime-selection" id="spacetimeSelection"><div><small>SELECTED PERSON TRACK</small><strong>${escapeHtml(track.display_name)}</strong><span>${escapeHtml(activities || "주 위치 Activity 없음")}</span></div><div><span>${primary.length}개 주 위치 구간</span><span>${counterparties.length}개 counterparty 관계는 자기 위치에서 제외</span></div></div>`;
  }

  function renderRails(tracks, projection, contentWidth, opacity) {
    if (opacity <= 0.01) return "";
    return tracks.flatMap((track) => (track.primary_segments || []).map((segment) => {
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const top = Math.min(y1, y2);
      const height = Math.max(2, Math.abs(y2 - y1));
      const x = segment.x_anchor * contentWidth;
      return `<button type="button" class="spacetime-track-rail${selectedPersonId === track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" style="left:${x}px;top:${top}px;height:${height}px;opacity:${opacity}" title="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}" aria-label="${escapeHtml(track.display_name)}"></button>`;
    })).join("");
  }

  function renderActivityGlyphs(tracks, projection, contentWidth, opacity) {
    if (opacity <= 0.01) return "";
    return tracks.flatMap((track) => (track.primary_segments || []).map((segment) => {
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const y = (y1 + y2) / 2;
      const x = segment.x_anchor * contentWidth;
      return `<button type="button" class="spacetime-activity-glyph" data-spacetime-person="${escapeHtml(track.person_id)}" style="left:${x + 6}px;top:${y}px;opacity:${opacity}" title="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`)}"><span>${escapeHtml(polityLabel(segment.activity))}</span></button>`;
    })).join("");
  }

  function restoreCameraViewport(scroll, projection) {
    if (pendingCameraAnchor?.ordinal != null && projection?.worldToScreenY) {
      const anchorY = projection.worldToScreenY(pendingCameraAnchor.ordinal);
      scroll.scrollLeft = pendingCameraAnchor.scroll_left;
      scroll.scrollTop = Math.max(0, TIME_CAMERA_HEADER_HEIGHT + anchorY - pendingCameraAnchor.viewport_y);
      pendingCameraAnchor = null;
    } else {
      scroll.scrollLeft = cameraScrollLeft;
      scroll.scrollTop = cameraScrollTop;
    }
    updateCameraPosition(scroll, projection);
  }

  function bindCameraViewport(mount, projection) {
    const scroll = mount.querySelector(".spacetime-scroll");
    if (!scroll) return;
    restoreCameraViewport(scroll, projection);
    scroll.addEventListener("scroll", () => updateCameraPosition(scroll, projection), { passive: true });
    scroll.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = scroll.getBoundingClientRect();
      const factor = event.deltaY < 0 ? TIME_CAMERA_ZOOM_STEP : 1 / TIME_CAMERA_ZOOM_STEP;
      requestTimeCameraZoom(mount, timeCameraZoom * factor, event.clientY - rect.top);
    }, { passive: false });
  }

  function renderInto(mount) {
    const { timeProjection, spaceAxis, lod } = runtime();
    const allEntries = flattenActivities(persons);
    const timeline = model.deriveTimelineRange(allEntries.map((entry) => entry.activity), new Date().getFullYear());
    const projection = timeProjection.createSemanticTimeProjection(timeline.start_year, timeline.end_year, DEFAULT_TIMELINE_HEIGHT * timeCameraZoom, LOG_SOFTENING_YEARS, timeCameraZoom);
    currentTimelineProjection = projection;
    const timelineHeight = projection.height;
    const compiled = compileAtlas();
    const needle = query.trim().toLocaleLowerCase("ko");
    const visibleTracks = needle ? compiled.partitioned.tracks.filter((track) => trackSearchable(track).includes(needle)) : compiled.partitioned.tracks;
    const baseWorldWidth = Math.max(MIN_WORLD_WIDTH, Math.floor((Number(mount.clientWidth) || window.innerWidth || 1280) - AXIS_WIDTH - 2));
    const spaceZoom = horizontalViewMode === "detail" ? DETAIL_SPACE_ZOOM : 1;
    const contentWidth = baseWorldWidth * spaceZoom;
    const regions = spaceAxis.stableRegionLayout(compiled.continuum, contentWidth);
    const projectedTracks = visibleTracks.map((track) => projectTrack(track, projection, contentWidth)).filter(Boolean);
    const lodWeights = lod.lodWeights({ timeZoom: timeCameraZoom, spaceZoom });
    const labelPack = packTrackLabels(projectedTracks, regions, timelineHeight, Boolean(needle));
    const labelsByPerson = new Map(labelPack.placed.map((label) => [label.person_id, label]));
    const ticks = model.buildAdaptiveTimeTicks(timeline.start_year, timeline.end_year, projection);
    const eras = buildEraBands(timeline, projection);
    const selectedTrack = compiled.partitioned.tracks.find((track) => track.person_id === selectedPersonId) || null;
    const counterpartyCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0) + compiled.partitioned.primary_unresolved.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0);
    const primarySegmentCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.primary_segments?.length || 0), 0);
    const frameModeClass = horizontalViewMode === "overview" ? " is-overview" : " is-detail";

    const pointsHtml = lodWeights.points > 0.01 ? projectedTracks.map((item) => `<button type="button" class="spacetime-person-point${selectedPersonId === item.track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(item.track.person_id)}" style="left:${item.x}px;top:${item.y}px;opacity:${lodWeights.points}" title="${escapeHtml(item.track.display_name)}" aria-label="${escapeHtml(item.track.display_name)}"></button>`).join("") : "";
    const labelsHtml = (lodWeights.labels > 0.01 || needle || selectedPersonId) ? projectedTracks.map((item) => {
      const label = labelsByPerson.get(item.track.person_id);
      if (!label) return "";
      const forced = Boolean(needle) || selectedPersonId === item.track.person_id;
      const opacity = forced ? 1 : lodWeights.labels;
      const connector = label.connector ? `<i class="spacetime-label-connector" style="left:${label.region_left + Math.min(label.connector.x1, label.connector.x2)}px;top:${label.connector.y1}px;width:${label.connector.length}px"></i>` : "";
      return `${connector}<button type="button" class="spacetime-track-label${selectedPersonId === item.track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(item.track.person_id)}" style="left:${label.label_x}px;top:${label.label_y}px;width:${label.width}px;opacity:${opacity}" title="${escapeHtml(item.track.display_name)}">${escapeHtml(item.track.display_name)}</button>`;
    }).join("") : "";

    mount.innerHTML = `<section class="spacetime-toolbar card">
      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>하나의 연속된 역사 공간에서 Person track을 탐색합니다. 100%에서는 기존 로그 시간 좌표를 그대로 유지하고 확대할수록 선형 시간 간격으로 부드럽게 전환됩니다. 가로축은 검색 결과나 밀도에 따라 움직이지 않는 9개 macroregion 연속 좌표이며, opposes는 상대 정치체 관계로만 보존되고 인물의 자기 위치를 결정하지 않습니다.</p></div>
      <div class="spacetime-controls">
        <label>검색<input id="spacetimeSearch" type="search" value="${escapeHtml(query)}" placeholder="인물·정치체·역할 검색" /></label>
        <label>공간 보기<select id="spacetimeHorizontalMode"><option value="overview"${horizontalViewMode === "overview" ? " selected" : ""}>전체 보기</option><option value="detail"${horizontalViewMode === "detail" ? " selected" : ""}>공간 확대</option></select></label>
        <div class="spacetime-time-camera" role="group" aria-label="시간축 확대"><span>시간 확대</span><button id="spacetimeTimeZoomOut" type="button" aria-label="시간축 축소">−</button><output id="spacetimeTimeZoomValue">${escapeHtml(timeCameraZoomLabel())}</output><button id="spacetimeTimeZoomIn" type="button" aria-label="시간축 확대">+</button><button id="spacetimeTimeZoomReset" type="button">100%</button></div>
      </div>
    </section>
    <section class="spacetime-status-row"><span><b>${visibleTracks.length}</b> Person track</span><span><b>${primarySegmentCount}</b> 주 위치 구간</span><span><b>${counterpartyCount}</b> counterparty 제외</span><span><b>${compiled.unresolvedPosition.length}</b> 위치 미확정</span><span><b>${compiled.unresolvedChronology.length}</b> 연대 미확정</span><span><b>${labelPack.deferred.length}</b> label defer</span><span><b>${escapeHtml(lod.representationStage(lodWeights))}</b> LOD</span><span><b>${escapeHtml(timeCameraZoomLabel())}</b> 시간 줌</span></section>
    ${(compiled.unresolvedPosition.length || compiled.partitioned.relation_review.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>현재 canonical spatial index가 제공하는 검토된 macroregion만 좌표로 사용합니다. 세부 Place/subregion 근거가 없으면 macroregion보다 정밀한 좌표를 만들지 않으며, counterparty인 opposes는 자기 위치 계산에서 제외합니다.</p></section>` : ""}
    ${renderSelection(selectedTrack)}
    <section class="spacetime-frame card${frameModeClass}"><div class="spacetime-scroll${frameModeClass}" tabindex="0" aria-label="역사 시간과 검토된 정치체 권역에 따른 Person track 분포">
      <div class="spacetime-sticky-corner"><span>시대</span><span>연도</span></div>
      <div class="spacetime-region-head" style="width:${contentWidth}px">${regions.map((region) => `<div style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(region.code)}</small></div>`).join("")}</div>
      <div class="spacetime-era-axis" style="height:${timelineHeight}px">${eras.map((era) => `<div class="person-era-${escapeHtml(era.code)}" style="top:${era.top}px;height:${era.height}px"><span>${escapeHtml(era.label)}</span></div>`).join("")}</div>
      <div class="spacetime-year-axis" style="height:${timelineHeight}px">${ticks.map((tick) => `<span style="top:${tick.y}px">${escapeHtml(tick.label)}</span>`).join("")}</div>
      <div class="spacetime-canvas" style="width:${contentWidth}px;height:${timelineHeight}px">
        ${ticks.map((tick) => `<i class="spacetime-century-line" style="top:${tick.y}px"></i>`).join("")}
        ${regions.map((region) => `<i class="spacetime-region-line" style="left:${region.left}px;height:${timelineHeight}px"></i>`).join("")}
        ${horizontalViewMode === "detail" ? compiled.continuum.subregions.map((subregion) => `<i class="spacetime-subregion-line" style="left:${subregion.min_space * contentWidth}px;height:${timelineHeight}px" title="${escapeHtml(subregion.label)}"></i>`).join("") : ""}
        ${renderRails(visibleTracks, projection, contentWidth, lodWeights.rails)}
        ${pointsHtml}${labelsHtml}
        ${horizontalViewMode === "detail" ? renderActivityGlyphs(visibleTracks, projection, contentWidth, lodWeights.activities) : ""}
      </div>
    </div></section>
    <section class="spacetime-unresolved-grid"><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${compiled.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역·장소 기능으로 가로 위치를 확정할 수 없어 좌표를 만들지 않은 Activity입니다.</p>${unresolvedRows(compiled.unresolvedPosition)}</article><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">CHRONOLOGY REVIEW</p><h3>연대 미확정</h3></div><strong>${compiled.unresolvedChronology.length}</strong></div><p>Activity 시작·종료 연도를 둘 다 확정할 수 없는 경우 세로축에 임의 기간을 만들지 않습니다.</p>${unresolvedRows(compiled.unresolvedChronology)}</article></section>`;

    bindCameraViewport(mount, projection);
    mount.querySelector("#spacetimeSearch")?.addEventListener("input", (event) => {
      query = event.target.value || "";
      renderInto(mount);
      requestAnimationFrame(() => { const input = mount.querySelector("#spacetimeSearch"); input?.focus(); input?.setSelectionRange(query.length, query.length); });
    });
    mount.querySelector("#spacetimeHorizontalMode")?.addEventListener("change", (event) => { horizontalViewMode = event.target.value === "detail" ? "detail" : "overview"; renderInto(mount); });
    mount.querySelector("#spacetimeTimeZoomOut")?.addEventListener("click", () => requestTimeCameraZoom(mount, timeCameraZoom / TIME_CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeTimeZoomIn")?.addEventListener("click", () => requestTimeCameraZoom(mount, timeCameraZoom * TIME_CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeTimeZoomReset")?.addEventListener("click", () => requestTimeCameraZoom(mount, 1));
    mount.querySelectorAll("[data-spacetime-person]").forEach((button) => button.addEventListener("click", () => { selectedPersonId = button.dataset.spacetimePerson || null; renderInto(mount); }));
  }

  function bindResize() {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { const mount = document.getElementById("personSpacetimeMount"); if (mount && !mount.hidden) renderInto(mount); });
    });
  }

  async function activate() {
    const mount = document.getElementById("personSpacetimeMount");
    if (!mount) return;
    bindResize();
    mount.innerHTML = '<section class="card spacetime-loading"><strong>시공간 인물도 준비 중</strong><p>Person track과 검토된 공간 배치 자료를 읽고 있습니다.</p></section>';
    try {
      await ensureRuntimeModules();
      await ensureData();
      if (document.getElementById("personSpacetimeMount") !== mount) return;
      renderInto(mount);
    } catch (error) {
      console.error(error);
      mount.innerHTML = `<section class="card spacetime-error"><strong>시공간 인물도를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.code || error?.message || "UNKNOWN_ERROR")}</p><button id="spacetimeRetry" type="button" class="btn">다시 시도</button></section>`;
      mount.querySelector("#spacetimeRetry")?.addEventListener("click", () => { loadPromise = null; runtimePromise = null; activate(); });
    }
  }

  window.ATLAS_PERSON_SPACETIME_VIEW = Object.freeze({ activate });
})();