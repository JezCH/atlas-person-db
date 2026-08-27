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
  const TIME_CAMERA_MIN_ZOOM = 1;
  const TIME_CAMERA_MAX_ZOOM = 8;
  const TIME_CAMERA_ZOOM_STEP = 1.35;
  const DETAIL_SPACE_ZOOM = 3;
  const FOCUS_DETAIL_TIME_ZOOM = 2.2;
  const MIN_WORLD_WIDTH = 900;
  const RUNTIME_ASSETS = Object.freeze([
    ["./atlas-person-spacetime-time-projection.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_TIME_PROJECTION"],
    ["./atlas-person-spacetime-space-axis.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_SPACE_AXIS"],
    ["./atlas-person-spacetime-semantic-axis.js?v=20260826-p10", "ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS"],
    ["./atlas-person-spacetime-exploration.js?v=20260826-p11", "ATLAS_PERSON_SPACETIME_EXPLORATION"],
    ["./atlas-person-spacetime-minimap.js?v=20260826-p12", "ATLAS_PERSON_SPACETIME_MINIMAP"],
    ["./atlas-person-spacetime-performance.js?v=20260826-p13", "ATLAS_PERSON_SPACETIME_PERFORMANCE"],
    ["./atlas-person-spacetime-spatial-compile.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE"],
    ["./atlas-person-spacetime-person-tracks.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_PERSON_TRACKS"],
    ["./atlas-person-spacetime-political-placement.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT"],
    ["./atlas-person-spacetime-lod.js?v=20260826-readable-minimum-zoom", "ATLAS_PERSON_SPACETIME_LOD"],
    ["./atlas-person-spacetime-density.js?v=20260826-p9", "ATLAS_PERSON_SPACETIME_DENSITY"],
    ["./atlas-person-spacetime-label-engine.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_LABEL_ENGINE"]
  ]);

  if (!reader || !model || !eraModel) {
    console.error("ATLAS spacetime view could not initialize required dependencies");
    return;
  }

  let runtimePromise = null;
  let loadPromise = null;
  let dataLoadGeneration = 0;
  let persons = [];
  let spatialIndex = null;
  let compiledAtlasCache = null;
  let timelineCache = null;
  let searchTextCache = new Map();
  let query = "";
  let horizontalViewMode = "overview";
  let selectedPersonId = null;
  let pendingFocusPersonId = null;
  let resizeBound = false;
  let resizeFrame = 0;
  let timeCameraZoom = TIME_CAMERA_MIN_ZOOM;
  let cameraScrollTop = 0;
  let cameraScrollLeft = 0;
  let cameraHorizontalGeometry = null;
  let pendingViewportHorizontalRatio = null;
  let pendingViewportCameraOrdinal = null;
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
      semanticAxis: window.ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS,
      exploration: window.ATLAS_PERSON_SPACETIME_EXPLORATION,
      minimap: window.ATLAS_PERSON_SPACETIME_MINIMAP,
      performance: window.ATLAS_PERSON_SPACETIME_PERFORMANCE,
      spatialCompile: window.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE,
      personTracks: window.ATLAS_PERSON_SPACETIME_PERSON_TRACKS,
      politicalPlacement: window.ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT,
      lod: window.ATLAS_PERSON_SPACETIME_LOD,
      density: window.ATLAS_PERSON_SPACETIME_DENSITY,
      labelEngine: window.ATLAS_PERSON_SPACETIME_LABEL_ENGINE
    };
    if (Object.values(api).some((value) => !value)) throw new Error("ATLAS_SPACETIME_RUNTIME_INCOMPLETE");
    return api;
  }

  function clampTimeCameraZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return TIME_CAMERA_MIN_ZOOM;
    return Math.min(TIME_CAMERA_MAX_ZOOM, Math.max(TIME_CAMERA_MIN_ZOOM, numeric));
  }

  function timeCameraZoomLabel() {
    return `${Math.round(timeCameraZoom * 100)}%`;
  }

  function cameraViewportCenterY(scroll) {
    const usableHeight = Math.max(1, scroll.clientHeight - TIME_CAMERA_HEADER_HEIGHT);
    return TIME_CAMERA_HEADER_HEIGHT + usableHeight / 2;
  }

  function captureRenderFocus(mount) {
    const active = document.activeElement;
    if (!active || !mount?.contains?.(active)) return null;
    if (active.id) return Object.freeze({ id: active.id, viewport: false });
    if (active.classList?.contains?.("spacetime-scroll")) return Object.freeze({ id: null, viewport: true });
    return null;
  }

  function restoreRenderFocus(mount, snapshot) {
    if (!snapshot) return false;
    const target = snapshot.id
      ? document.getElementById(snapshot.id)
      : snapshot.viewport ? mount?.querySelector?.(".spacetime-scroll") : null;
    if (!target || !mount?.contains?.(target) || typeof target.focus !== "function") return false;
    try { target.focus({ preventScroll: true }); }
    catch { target.focus(); }
    return true;
  }

  function horizontalCameraGeometry(scroll) {
    const canvas = scroll?.querySelector?.(".spacetime-canvas");
    if (!scroll || !canvas) return null;
    const offsetWidth = Number(canvas.offsetWidth);
    const styleWidth = Number.parseFloat(canvas.style?.width || "");
    const worldWidth = offsetWidth > 0 ? offsetWidth : styleWidth;
    if (!(worldWidth > 0)) return null;
    const offsetLeft = Number(canvas.offsetLeft);
    return {
      viewport_width: Math.max(1, Number(scroll.clientWidth) || 0),
      axis_width: offsetLeft > 0 ? offsetLeft : AXIS_WIDTH,
      world_width: worldWidth
    };
  }

  function rememberHorizontalCameraGeometry(scroll) {
    const geometry = horizontalCameraGeometry(scroll);
    if (geometry) cameraHorizontalGeometry = geometry;
  }

  function horizontalCameraRatioFromStoredGeometry() {
    const controlState = window.ATLAS_PERSON_SPACETIME_CONTROL_STATE;
    if (!cameraHorizontalGeometry || !controlState?.horizontalCenterRatio) return null;
    return controlState.horizontalCenterRatio(
      cameraScrollLeft,
      cameraHorizontalGeometry.viewport_width,
      cameraHorizontalGeometry.axis_width,
      cameraHorizontalGeometry.world_width
    );
  }

  function scrollLeftForHorizontalCameraRatio(scroll, ratio) {
    const controlState = window.ATLAS_PERSON_SPACETIME_CONTROL_STATE;
    const geometry = horizontalCameraGeometry(scroll);
    if (!geometry || ratio == null || !controlState?.scrollLeftForHorizontalCenter) return null;
    return controlState.scrollLeftForHorizontalCenter(
      ratio,
      geometry.viewport_width,
      geometry.axis_width,
      geometry.world_width
    );
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

  function selectPerson(mount, personId, options = {}) {
    selectedPersonId = personId || null;
    pendingFocusPersonId = options.focus === false ? null : selectedPersonId;
    if (selectedPersonId && options.detail) {
      horizontalViewMode = "detail";
      timeCameraZoom = Math.max(timeCameraZoom, FOCUS_DETAIL_TIME_ZOOM);
      pendingCameraAnchor = null;
    }
    renderInto(mount);
  }

  function clearSelection(mount) {
    selectedPersonId = null;
    pendingFocusPersonId = null;
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
    const generation = dataLoadGeneration;
    loadPromise = Promise.all([reader.listPersons(), fetchSpatialIndex()]).then(([personResult, placement]) => {
      if (generation !== dataLoadGeneration) return false;
      persons = personResult.persons || [];
      spatialIndex = placement;
      compiledAtlasCache = null;
      timelineCache = null;
      searchTextCache = new Map();
      return true;
    }).catch((error) => {
      if (generation === dataLoadGeneration) loadPromise = null;
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

  function timelineRange() {
    if (timelineCache) return timelineCache;
    const allEntries = flattenActivities(persons);
    timelineCache = model.deriveTimelineRange(allEntries.map((entry) => entry.activity), new Date().getFullYear());
    return timelineCache;
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
    if (compiledAtlasCache) return compiledAtlasCache;
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
    compiledAtlasCache = Object.freeze({ continuum, partitioned, unresolvedPosition, unresolvedChronology });
    return compiledAtlasCache;
  }

  function trackSearchable(track) {
    const key = track?.person_id || track?.track_id;
    if (key && searchTextCache.has(key)) return searchTextCache.get(key);
    const values = [track.display_name, track.canonical_name_en, track.preferred_name_ko];
    for (const segment of [...(track.primary_segments || []), ...(track.counterparty_segments || []), ...(track.unclassified_segments || [])]) {
      const activity = segment.activity;
      values.push(polityLabel(activity), activity?.relation?.display_name, activity?.relation?.code, activity?.role?.display_name, activity?.role?.source_label, periodLabel(activity));
    }
    const searchable = values.filter(Boolean).join("\n").toLocaleLowerCase("ko");
    if (key) searchTextCache.set(key, searchable);
    return searchable;
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

  function renderSearchResults(items, needle) {
    if (!needle) return "";
    const visible = items.slice(0, 8);
    return `<section class="spacetime-search-results card" aria-label="검색 결과"><div class="spacetime-search-results-head"><strong>검색 결과</strong><span>${items.length}명${items.length > visible.length ? ` · 상위 ${visible.length}명 표시` : ""}</span></div>${visible.length ? `<div class="spacetime-search-result-list">${visible.map((item) => `<button id="spacetimeSearchResult-${escapeHtml(item.person_id)}" type="button" data-spacetime-search-result="${escapeHtml(item.person_id)}"><strong>${escapeHtml(item.display_name)}</strong><span>${escapeHtml(polityLabel(item.representative?.activity))}</span><small>${escapeHtml(periodLabel(item.representative?.activity))}</small></button>`).join("")}</div>` : '<p class="spacetime-empty-inline">일치하는 위치 확정 Person track이 없습니다.</p>'}</section>`;
  }

  function renderSelection(track, navigationCount = 0) {
    if (!track) return "";
    const canCycle = Number(navigationCount) > 1;
    const cycleDisabled = canCycle ? "" : ' disabled aria-disabled="true"';
    const primary = track.primary_segments || [];
    const counterparties = track.counterparty_segments || [];
    const activities = primary.slice(0, 5).map((segment) => `${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`).join(" / ");
    return `<div class="spacetime-selection" id="spacetimeSelection"><div><small>SELECTED PERSON TRACK</small><strong>${escapeHtml(track.display_name)}</strong><span>${escapeHtml(activities || "주 위치 Activity 없음")}</span></div><div class="spacetime-selection-meta"><span>${primary.length}개 주 위치 구간</span><span>${counterparties.length}개 counterparty 관계는 자기 위치에서 제외</span></div><div class="spacetime-selection-actions" role="group" aria-label="선택 인물 탐색"><button id="spacetimePrevPerson" type="button"${cycleDisabled}>이전 인물</button><button id="spacetimeFocusPerson" type="button">위치로</button><button id="spacetimeDetailPerson" type="button">자세히 보기</button><button id="spacetimeNextPerson" type="button"${cycleDisabled}>다음 인물</button><button id="spacetimeClearPerson" type="button">선택 해제</button></div></div>`;
  }

  function renderDensityLegend(field, filtered) {
    if (!field) return "";
    return `<section class="spacetime-density-legend card"><div><strong>${escapeHtml(field.legend_label)}</strong><span>최대 셀 <b>${field.max_count}</b>명 · 표시 고유 인물 <b>${field.covered_person_count}</b>명${filtered ? " · 검색 필터 적용" : ""}</span></div><small>${escapeHtml(field.interpretation_note)}</small></section>`;
  }

  function renderMinimap() {
    return `<aside class="spacetime-minimap" aria-label="전체 시공간 미니맵"><div class="spacetime-minimap-head"><strong>전체 시공간</strong><span>클릭·드래그·방향키 이동</span></div><div id="spacetimeMinimapSurface" class="spacetime-minimap-surface" role="group" tabindex="0" aria-label="현재 전체 시공간과 카메라 범위. 방향키로 카메라 이동"><canvas id="spacetimeMinimapCanvas" class="spacetime-minimap-canvas" aria-hidden="true"></canvas><div id="spacetimeMinimapViewport" class="spacetime-minimap-viewport" aria-hidden="true"></div><i id="spacetimeMinimapSelected" class="spacetime-minimap-selected" aria-hidden="true"></i></div><output id="spacetimeMinimapStatus" class="spacetime-minimap-status">현재 화면</output></aside>`;
  }

  function renderRails(tracks, projection, contentWidth, opacity) {
    if (opacity <= 0.01) return "";
    return tracks.flatMap((track) => (track.primary_segments || []).map((segment) => {
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const top = Math.min(y1, y2);
      const height = Math.max(2, Math.abs(y2 - y1));
      const x = segment.x_anchor * contentWidth;
      return `<button type="button" class="spacetime-track-rail${selectedPersonId === track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" style="left:${x}px;top:${top}px;height:${height}px;opacity:${opacity}" title="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}" aria-label="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}"></button>`;
    })).join("");
  }

  function renderActivityGlyphs(tracks, projection, contentWidth, opacity) {
    if (opacity <= 0.01) return "";
    return tracks.flatMap((track) => (track.primary_segments || []).map((segment) => {
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const y = (y1 + y2) / 2;
      const x = segment.x_anchor * contentWidth;
      return `<button type="button" class="spacetime-activity-glyph${selectedPersonId === track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" style="left:${x + 6}px;top:${y}px;opacity:${opacity}" title="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`)}" aria-label="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`)}"><span>${escapeHtml(polityLabel(segment.activity))}</span></button>`;
    })).join("");
  }

  function renderPoints(projectedTracks, opacity) {
    if (opacity <= 0.01) return "";
    return projectedTracks.map((item) => `<button type="button" class="spacetime-person-point${selectedPersonId === item.track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(item.track.person_id)}" style="left:${item.x}px;top:${item.y}px;opacity:${opacity}" title="${escapeHtml(item.track.display_name)}" aria-label="${escapeHtml(item.track.display_name)}"></button>`).join("");
  }

  function renderLabels(projectedTracks, labelPack, lodWeights, needle) {
    const labelsByPerson = new Map(labelPack.placed.map((label) => [label.person_id, label]));
    return projectedTracks.map((item) => {
      const label = labelsByPerson.get(item.track.person_id);
      if (!label) return "";
      const forced = Boolean(needle) || selectedPersonId === item.track.person_id;
      const opacity = forced ? 1 : lodWeights.labels;
      const connector = label.connector ? `<i class="spacetime-label-connector" style="left:${label.region_left + Math.min(label.connector.x1, label.connector.x2)}px;top:${label.connector.y1}px;width:${label.connector.length}px"></i>` : "";
      return `${connector}<button type="button" class="spacetime-track-label${selectedPersonId === item.track.person_id ? " is-selected" : ""}" data-spacetime-person="${escapeHtml(item.track.person_id)}" style="left:${label.label_x}px;top:${label.label_y}px;width:${label.width}px;opacity:${opacity}" title="${escapeHtml(item.track.display_name)}">${escapeHtml(item.track.display_name)}</button>`;
    }).join("");
  }

  function restoreCameraViewport(scroll, projection) {
    if (pendingCameraAnchor?.ordinal != null && projection?.worldToScreenY) {
      const anchorY = projection.worldToScreenY(pendingCameraAnchor.ordinal);
      scroll.scrollLeft = pendingCameraAnchor.scroll_left;
      scroll.scrollTop = Math.max(0, TIME_CAMERA_HEADER_HEIGHT + anchorY - pendingCameraAnchor.viewport_y);
      pendingCameraAnchor = null;
    } else if (pendingViewportHorizontalRatio != null || pendingViewportCameraOrdinal != null) {
      const restoredScrollLeft = scrollLeftForHorizontalCameraRatio(scroll, pendingViewportHorizontalRatio);
      scroll.scrollLeft = restoredScrollLeft == null ? cameraScrollLeft : restoredScrollLeft;
      if (pendingViewportCameraOrdinal != null && projection?.worldToScreenY) {
        const centerY = projection.worldToScreenY(pendingViewportCameraOrdinal);
        scroll.scrollTop = Math.max(0, TIME_CAMERA_HEADER_HEIGHT + centerY - cameraViewportCenterY(scroll));
      } else {
        scroll.scrollTop = cameraScrollTop;
      }
      pendingViewportHorizontalRatio = null;
      pendingViewportCameraOrdinal = null;
    } else {
      scroll.scrollLeft = cameraScrollLeft;
      scroll.scrollTop = cameraScrollTop;
    }
    updateCameraPosition(scroll, projection);
    rememberHorizontalCameraGeometry(scroll);
  }

  function focusPersonInViewport(scroll, projection, navigationItems, personId) {
    if (!scroll || !personId) return false;
    const { exploration } = runtime();
    const item = navigationItems.find((candidate) => candidate.person_id === personId);
    if (!item) return false;
    const target = exploration.focusScrollTarget(item,
      { width: scroll.clientWidth, height: scroll.clientHeight },
      { scrollWidth: scroll.scrollWidth, scrollHeight: scroll.scrollHeight },
      { leftInset: AXIS_WIDTH, topInset: TIME_CAMERA_HEADER_HEIGHT }
    );
    if (!target) return false;
    scroll.scrollLeft = target.left;
    scroll.scrollTop = target.top;
    updateCameraPosition(scroll, projection);
    return true;
  }

  function updateMinimapViewport(mount, scroll, contentWidth, timelineHeight) {
    const surface = mount.querySelector("#spacetimeMinimapSurface");
    const viewport = mount.querySelector("#spacetimeMinimapViewport");
    if (!surface || !viewport || !scroll) return;
    const { minimap } = runtime();
    const size = { width: surface.clientWidth, height: surface.clientHeight };
    if (!(size.width > 0) || !(size.height > 0)) return;
    const rect = minimap.viewportRect(
      { left: scroll.scrollLeft, top: scroll.scrollTop },
      { width: scroll.clientWidth, height: scroll.clientHeight },
      { width: contentWidth, height: timelineHeight },
      size,
      { left: AXIS_WIDTH, top: TIME_CAMERA_HEADER_HEIGHT }
    );
    viewport.style.left = `${rect.left}px`;
    viewport.style.top = `${rect.top}px`;
    viewport.style.width = `${rect.width}px`;
    viewport.style.height = `${rect.height}px`;
    const status = mount.querySelector("#spacetimeMinimapStatus");
    if (status) status.textContent = `현재 화면 ${Math.round(rect.width / size.width * 100)}% × ${Math.round(rect.height / size.height * 100)}%`;
  }

  function drawMinimap(mount, allProjectedTracks, activePersonIds, regions, eras, contentWidth, timelineHeight) {
    const surface = mount.querySelector("#spacetimeMinimapSurface");
    const canvas = mount.querySelector("#spacetimeMinimapCanvas");
    const selectedMarker = mount.querySelector("#spacetimeMinimapSelected");
    if (!surface || !canvas) return;
    const { minimap } = runtime();
    const width = surface.clientWidth;
    const height = surface.clientHeight;
    if (!(width > 0) || !(height > 0)) return;
    const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio) || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#d8e1ec";
    context.lineWidth = 1;
    for (const region of regions.slice(1)) {
      const x = minimap.projectVerticalLine(region.left, { width: contentWidth, height: timelineHeight }, { width, height });
      context.beginPath();
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, height);
      context.stroke();
    }
    context.strokeStyle = "#e4e9f0";
    for (const era of eras.slice(1)) {
      const y = minimap.projectHorizontalLine(era.top, { width: contentWidth, height: timelineHeight }, { width, height });
      context.beginPath();
      context.moveTo(0, Math.round(y) + 0.5);
      context.lineTo(width, Math.round(y) + 0.5);
      context.stroke();
    }
    const points = minimap.projectItems(allProjectedTracks, { width: contentWidth, height: timelineHeight }, { width, height });
    const filtered = activePersonIds.size < allProjectedTracks.length;
    context.fillStyle = filtered ? "rgba(96,124,169,.18)" : "rgba(96,124,169,.52)";
    for (const point of points) {
      context.beginPath();
      context.arc(point.minimap_x, point.minimap_y, 1.25, 0, Math.PI * 2);
      context.fill();
    }
    if (filtered) {
      context.fillStyle = "rgba(67,91,132,.86)";
      for (const point of points) {
        if (!activePersonIds.has(point.person_id)) continue;
        context.beginPath();
        context.arc(point.minimap_x, point.minimap_y, 1.8, 0, Math.PI * 2);
        context.fill();
      }
    }
    const selected = points.find((point) => point.person_id === selectedPersonId) || null;
    if (selectedMarker) {
      selectedMarker.hidden = !selected;
      if (selected) {
        selectedMarker.style.left = `${selected.minimap_x}px`;
        selectedMarker.style.top = `${selected.minimap_y}px`;
      }
    }
  }

  function bindMinimap(mount, scroll, projection, allProjectedTracks, activePersonIds, regions, eras, contentWidth, timelineHeight) {
    const surface = mount.querySelector("#spacetimeMinimapSurface");
    if (!surface || !scroll) return;
    const { minimap, exploration } = runtime();
    drawMinimap(mount, allProjectedTracks, activePersonIds, regions, eras, contentWidth, timelineHeight);
    updateMinimapViewport(mount, scroll, contentWidth, timelineHeight);
    scroll.addEventListener("scroll", () => updateMinimapViewport(mount, scroll, contentWidth, timelineHeight), { passive: true });
    let dragging = false;
    const moveCamera = (event) => {
      const rect = surface.getBoundingClientRect();
      const size = { width: surface.clientWidth, height: surface.clientHeight };
      if (!(size.width > 0) || !(size.height > 0)) return;
      const point = minimap.localPoint({ x: event.clientX, y: event.clientY }, rect, size);
      const target = minimap.scrollTargetForMinimapPoint(
        point,
        { width: scroll.clientWidth, height: scroll.clientHeight },
        { width: contentWidth, height: timelineHeight },
        size,
        { left: AXIS_WIDTH, top: TIME_CAMERA_HEADER_HEIGHT }
      );
      scroll.scrollLeft = target.left;
      scroll.scrollTop = target.top;
      updateCameraPosition(scroll, projection);
      updateMinimapViewport(mount, scroll, contentWidth, timelineHeight);
    };
    const panCamera = (direction) => {
      const target = exploration.panTarget(
        { left: scroll.scrollLeft, top: scroll.scrollTop },
        { width: scroll.clientWidth, height: scroll.clientHeight },
        { scrollWidth: scroll.scrollWidth, scrollHeight: scroll.scrollHeight },
        direction,
        0.22
      );
      scroll.scrollLeft = target.left;
      scroll.scrollTop = target.top;
      updateCameraPosition(scroll, projection);
      updateMinimapViewport(mount, scroll, contentWidth, timelineHeight);
    };
    surface.addEventListener("keydown", (event) => {
      const direction = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" })[event.key];
      if (!direction) return;
      event.preventDefault();
      panCamera(direction);
    });
    surface.addEventListener("pointerdown", (event) => {
      dragging = true;
      surface.setPointerCapture?.(event.pointerId);
      moveCamera(event);
    });
    surface.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      moveCamera(event);
    });
    const stopDragging = (event) => {
      dragging = false;
      if (surface.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    };
    surface.addEventListener("pointerup", stopDragging);
    surface.addEventListener("pointercancel", stopDragging);
  }

  function drawDensityCanvas(mount, densityField, densityOpacity, cullRect) {
    const canvas = mount.querySelector("#spacetimeDensityCanvas");
    if (!canvas) return 0;
    if (!densityField || densityOpacity <= 0.01 || !cullRect) {
      canvas.hidden = true;
      canvas.width = 1;
      canvas.height = 1;
      return 0;
    }
    const { performance } = runtime();
    const width = Math.max(1, Math.ceil(cullRect.width));
    const height = Math.max(1, Math.ceil(cullRect.height));
    canvas.hidden = false;
    canvas.style.left = `${cullRect.left}px`;
    canvas.style.top = `${cullRect.top}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return 0;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#607ca9";
    const cells = performance.cullDensityCells(densityField.cells, cullRect);
    for (const cell of cells) {
      context.globalAlpha = densityOpacity * (0.12 + 0.72 * cell.intensity);
      context.fillRect(cell.left - cullRect.left, cell.top - cullRect.top, cell.width, cell.height);
    }
    context.globalAlpha = 1;
    return cells.length;
  }

  function bindVirtualizedLayers(mount, scroll, state) {
    if (!scroll) return;
    const { performance } = runtime();
    const world = { width: state.contentWidth, height: state.timelineHeight };
    const forcedIds = () => selectedPersonId ? new Set([selectedPersonId]) : new Set();
    let lastSignature = "";
    let frame = 0;

    const updateCount = (id, value) => {
      const node = mount.querySelector(`#${id}`);
      if (node) node.textContent = String(value);
    };

    const refresh = () => {
      frame = 0;
      const cullRect = performance.viewportWorldRect(
        { left: scroll.scrollLeft, top: scroll.scrollTop },
        { width: scroll.clientWidth, height: scroll.clientHeight },
        world,
        { left: AXIS_WIDTH, top: TIME_CAMERA_HEADER_HEIGHT }
      );
      const forced = forcedIds();
      const pointItems = performance.cullProjectedItems(state.projectedTracks, cullRect, forced);
      const segmentTracks = performance.cullTrackSegments(state.visibleTracks, state.projection, state.contentWidth, cullRect, forced);
      const segmentIds = segmentTracks.flatMap((track) => (track.primary_segments || []).map((segment) => segment.stable_id || `${track.person_id}:${segment.start_ordinal}:${segment.end_ordinal}`));
      const pointIds = pointItems.map((item) => item.person_id);
      const signature = `${pointIds.join(",")}|${segmentIds.join(",")}|${selectedPersonId || ""}|${state.needle}|${state.lodWeights.labels}|${state.lodWeights.points}|${state.lodWeights.rails}|${state.lodWeights.activities}`;

      if (signature !== lastSignature) {
        const needsLabels = state.lodWeights.labels > 0.01 || Boolean(state.needle) || Boolean(selectedPersonId);
        const labelPack = needsLabels ? packTrackLabels(pointItems, state.regions, state.timelineHeight, Boolean(state.needle)) : { placed: [], deferred: [] };
        const railLayer = mount.querySelector("#spacetimeRailLayer");
        const pointLayer = mount.querySelector("#spacetimePointLayer");
        const labelLayer = mount.querySelector("#spacetimeLabelLayer");
        const activityLayer = mount.querySelector("#spacetimeActivityLayer");
        if (railLayer) railLayer.innerHTML = renderRails(segmentTracks, state.projection, state.contentWidth, state.lodWeights.rails);
        if (pointLayer) pointLayer.innerHTML = renderPoints(pointItems, state.lodWeights.points);
        if (labelLayer) labelLayer.innerHTML = needsLabels ? renderLabels(pointItems, labelPack, state.lodWeights, state.needle) : "";
        if (activityLayer) activityLayer.innerHTML = state.horizontalViewMode === "detail" ? renderActivityGlyphs(segmentTracks, state.projection, state.contentWidth, state.lodWeights.activities) : "";
        updateCount("spacetimeDomPersonCount", pointItems.length);
        updateCount("spacetimeDomSegmentCount", segmentIds.length);
        updateCount("spacetimeDomLabelCount", labelPack.placed.length);
        updateCount("spacetimeDeferredLabelCount", labelPack.deferred.length);
        lastSignature = signature;
      }
      const densityCells = drawDensityCanvas(mount, state.densityField, state.lodWeights.density, cullRect);
      updateCount("spacetimeDensityCanvasCells", densityCells);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(refresh);
    };

    const canvas = mount.querySelector(".spacetime-canvas");
    canvas?.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-spacetime-person]");
      if (!target || !canvas.contains(target)) return;
      selectPerson(mount, target.dataset.spacetimePerson, { focus: false });
    });
    scroll.addEventListener("scroll", schedule, { passive: true });
    refresh();
  }

  function bindCameraViewport(mount, projection, navigationItems) {
    const scroll = mount.querySelector(".spacetime-scroll");
    if (!scroll) return;
    const { exploration } = runtime();
    restoreCameraViewport(scroll, projection);
    if (pendingFocusPersonId) {
      focusPersonInViewport(scroll, projection, navigationItems, pendingFocusPersonId);
      pendingFocusPersonId = null;
    }
    scroll.addEventListener("scroll", () => updateCameraPosition(scroll, projection), { passive: true });
    scroll.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const factor = event.deltaY < 0 ? TIME_CAMERA_ZOOM_STEP : 1 / TIME_CAMERA_ZOOM_STEP;
      const wheelZoomTarget = timeCameraZoom * factor;
      if (Math.abs(clampTimeCameraZoom(wheelZoomTarget) - timeCameraZoom) < 1e-9) return;
      event.preventDefault();
      const rect = scroll.getBoundingClientRect();
      requestTimeCameraZoom(mount, wheelZoomTarget, event.clientY - rect.top);
    }, { passive: false });
    scroll.addEventListener("keydown", (event) => {
      if (event.target !== scroll) return;
      const command = exploration.keyboardCommand(event);
      if (!command) return;
      if ((command === "previous-person" || command === "next-person") && navigationItems.length <= 1) return;
      const keyboardZoomTarget = command === "zoom-in"
        ? timeCameraZoom * TIME_CAMERA_ZOOM_STEP
        : command === "zoom-out" ? timeCameraZoom / TIME_CAMERA_ZOOM_STEP : null;
      if (keyboardZoomTarget != null && Math.abs(clampTimeCameraZoom(keyboardZoomTarget) - timeCameraZoom) < 1e-9) return;
      event.preventDefault();
      if (command === "previous-person" || command === "next-person") {
        const nextId = exploration.adjacentPersonId(navigationItems, selectedPersonId, command === "previous-person" ? -1 : 1);
        if (nextId) selectPerson(mount, nextId, { focus: true });
        return;
      }
      if (command === "focus-selected") {
        focusPersonInViewport(scroll, projection, navigationItems, selectedPersonId);
        return;
      }
      if (command === "zoom-in" || command === "zoom-out") {
        requestTimeCameraZoom(mount, keyboardZoomTarget);
        return;
      }
      if (command === "clear-selection") {
        clearSelection(mount);
        return;
      }
      const direction = command.endsWith("left") ? "left" : command.endsWith("right") ? "right" : command === "page-up" || command.endsWith("up") ? "up" : "down";
      const fraction = command.startsWith("page-") ? 0.8 : 0.22;
      const target = exploration.panTarget(
        { left: scroll.scrollLeft, top: scroll.scrollTop },
        { width: scroll.clientWidth, height: scroll.clientHeight },
        { scrollWidth: scroll.scrollWidth, scrollHeight: scroll.scrollHeight },
        direction,
        fraction
      );
      scroll.scrollLeft = target.left;
      scroll.scrollTop = target.top;
      updateCameraPosition(scroll, projection);
    });
  }

  function renderInto(mount) {
    const renderFocus = captureRenderFocus(mount);
    const { timeProjection, spaceAxis, semanticAxis, exploration, lod, density } = runtime();
    const timeline = timelineRange();
    const projection = timeProjection.createSemanticTimeProjection(timeline.start_year, timeline.end_year, DEFAULT_TIMELINE_HEIGHT * timeCameraZoom, LOG_SOFTENING_YEARS, timeCameraZoom);
    currentTimelineProjection = projection;
    const timelineHeight = projection.height;
    const compiled = compileAtlas();
    const needle = query.trim().toLocaleLowerCase("ko");
    const baseWorldWidth = Math.max(MIN_WORLD_WIDTH, Math.floor((Number(mount.clientWidth) || window.innerWidth || 1280) - AXIS_WIDTH - 2));
    const spaceZoom = horizontalViewMode === "detail" ? DETAIL_SPACE_ZOOM : 1;
    const contentWidth = baseWorldWidth * spaceZoom;
    const regions = spaceAxis.stableRegionLayout(compiled.continuum, contentWidth);
    const spaceHeader = semanticAxis.buildSpaceHeaderPlan(compiled.continuum, contentWidth, spaceZoom);
    const timeAxis = semanticAxis.buildTimeAxisPlan(timeline, projection, timeCameraZoom);
    const allProjectedTracks = compiled.partitioned.tracks.map((track) => exploration.projectTrack(track, projection, contentWidth)).filter(Boolean);
    const projectedTracks = needle ? allProjectedTracks.filter((item) => trackSearchable(item.track).includes(needle)) : allProjectedTracks;
    const visibleTracks = projectedTracks.map((item) => item.track);
    const activePersonIds = new Set(projectedTracks.map((item) => item.person_id));
    if (selectedPersonId && !activePersonIds.has(selectedPersonId)) {
      selectedPersonId = null;
      pendingFocusPersonId = null;
    }
    const navigationItems = exploration.orderItems(projectedTracks);
    const searchItems = needle ? exploration.rankSearchItems(projectedTracks, needle) : [];
    const lodWeights = lod.lodWeights({ timeZoom: timeCameraZoom, spaceZoom });
    const densityField = horizontalViewMode === "overview" && lodWeights.density > 0.01
      ? density.buildDensityField({ tracks: visibleTracks }, projection, { width: contentWidth, height: timelineHeight })
      : null;
    const ticks = timeAxis.ticks;
    const eras = buildEraBands(timeline, projection);
    const selectedTrack = compiled.partitioned.tracks.find((track) => track.person_id === selectedPersonId) || null;
    const counterpartyCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0) + compiled.partitioned.primary_unresolved.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0);
    const primarySegmentCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.primary_segments?.length || 0), 0);
    const frameModeClass = horizontalViewMode === "overview" ? " is-overview" : " is-detail";

    mount.innerHTML = `<section class="spacetime-toolbar card">
      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>하나의 연속된 역사 공간에서 Person track을 탐색합니다. 100% 세계 보기에서도 충돌 없이 배치 가능한 인물 이름은 기본으로 유지하며, 등록 인물 밀도를 배경으로 함께 보여줍니다. 검색 결과나 인물을 선택하면 현재 축척을 유지한 채 해당 시공간으로 이동하고, 자세히 보기에서만 공간·시간 해상도를 올립니다. 우하단 미니맵은 같은 world 좌표를 축약해 전체 위치와 현재 화면 범위를 보여주며 클릭·드래그로 카메라만 이동합니다. 화면 밖 Person DOM은 overscan 범위 밖에서 만들지 않고 density는 canvas로 그려 대규모 데이터에서도 좌표 의미를 유지한 채 렌더링 비용을 제한합니다. 좌표 자체는 검색·밀도·줌에 따라 바뀌지 않으며 opposes는 자기 위치를 결정하지 않습니다.</p><div class="spacetime-explore-help">방향키 이동 · PageUp/PageDown 큰 이동 · Shift+↑/↓ 이전/다음 인물 · F 선택 위치 · +/- 시간 확대 · Esc 선택 해제</div></div>
      <div class="spacetime-controls">
        <label>검색<input id="spacetimeSearch" type="search" value="${escapeHtml(query)}" placeholder="인물·정치체·역할 검색" /></label>
        <label>공간 보기<select id="spacetimeHorizontalMode"><option value="overview"${horizontalViewMode === "overview" ? " selected" : ""}>전체 보기</option><option value="detail"${horizontalViewMode === "detail" ? " selected" : ""}>공간 확대</option></select></label>
        <div class="spacetime-time-camera" role="group" aria-label="시간축 확대"><span>시간 확대</span><button id="spacetimeTimeZoomOut" type="button" aria-label="시간축 축소">−</button><output id="spacetimeTimeZoomValue">${escapeHtml(timeCameraZoomLabel())}</output><button id="spacetimeTimeZoomIn" type="button" aria-label="시간축 확대">+</button><button id="spacetimeTimeZoomReset" type="button">100%</button></div>
      </div>
    </section>
    ${renderSearchResults(searchItems, needle)}
    <section class="spacetime-status-row"><span><b>${visibleTracks.length}</b> ${needle ? "검색" : "전체"} Person track</span><span><b>${primarySegmentCount}</b> 전체 주 위치 구간</span><span><b>${counterpartyCount}</b> 전체 counterparty 제외</span><span><b>${compiled.unresolvedPosition.length}</b> 전체 위치 미확정</span><span><b>${compiled.unresolvedChronology.length}</b> 전체 연대 미확정</span><span><b id="spacetimeDomPersonCount">0</b> viewport Person DOM</span><span><b id="spacetimeDomSegmentCount">0</b> viewport segment DOM</span><span><b id="spacetimeDomLabelCount">0</b> 이름 표시</span><span><b id="spacetimeDeferredLabelCount">0</b> label defer</span>${densityField ? `<span><b id="spacetimeDensityCanvasCells">0</b> density canvas cell</span><span><b>${densityField.max_count}</b> 최대 cell 고유 인물</span>` : ""}<span><b>${escapeHtml(timeAxis.stage_label)}</b> 시간축</span><span><b>${escapeHtml(spaceHeader.stage_label)}</b> 공간축</span><span><b>${escapeHtml(lod.representationStage(lodWeights))}</b> LOD</span><span><b>${escapeHtml(timeCameraZoomLabel())}</b> 시간 줌</span></section>
    ${(compiled.unresolvedPosition.length || compiled.partitioned.relation_review.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>현재 canonical spatial index가 제공하는 검토된 macroregion만 좌표로 사용합니다. 세부 Place/subregion 근거가 없으면 macroregion보다 정밀한 좌표를 만들지 않으며, counterparty인 opposes는 자기 위치 계산에서 제외합니다.</p></section>` : ""}
    ${renderDensityLegend(densityField, Boolean(needle))}
    ${renderSelection(selectedTrack, navigationItems.length)}
    <section class="spacetime-frame card${frameModeClass}"><div class="spacetime-scroll${frameModeClass}" tabindex="0" aria-label="역사 시간과 검토된 정치체 권역에 따른 Person track 및 등록 인물 밀도 분포">
      <div class="spacetime-sticky-corner"><span>시대</span><span>연도<small>${escapeHtml(timeAxis.stage_label)}</small></span></div>
      <div class="spacetime-region-head" style="width:${contentWidth}px">
        <div class="spacetime-region-head-layer is-macro" style="opacity:${spaceHeader.macro_opacity}">${spaceHeader.macroregions.map((region) => `<div class="spacetime-region-head-band" style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(region.code)}</small></div>`).join("")}</div>
        <div class="spacetime-region-head-layer is-subregion" style="opacity:${spaceHeader.subregion_opacity}">${spaceHeader.subregions.map((region) => `<div class="spacetime-region-head-band" style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(region.parent_code)}</small></div>`).join("")}</div>
      </div>
      <div class="spacetime-era-axis" style="height:${timelineHeight}px;opacity:${timeAxis.era_opacity}">${eras.map((era) => `<div class="person-era-${escapeHtml(era.code)}" style="top:${era.top}px;height:${era.height}px"><span>${escapeHtml(era.label)}</span></div>`).join("")}</div>
      <div class="spacetime-year-axis" data-axis-stage="${escapeHtml(timeAxis.stage)}" style="height:${timelineHeight}px">${ticks.map((tick) => `<span class="${tick.major ? "is-major" : ""}" style="top:${tick.y}px">${escapeHtml(tick.label)}</span>`).join("")}</div>
      <div class="spacetime-canvas" style="width:${contentWidth}px;height:${timelineHeight}px">
        <canvas id="spacetimeDensityCanvas" class="spacetime-density-canvas" aria-hidden="true"></canvas>
        ${ticks.map((tick) => `<i class="spacetime-century-line${tick.major ? " is-major" : ""}" style="top:${tick.y}px"></i>`).join("")}
        ${regions.map((region) => `<i class="spacetime-region-line" style="left:${region.left}px;height:${timelineHeight}px"></i>`).join("")}
        ${spaceHeader.subregions.map((subregion) => `<i class="spacetime-subregion-line" style="left:${subregion.left}px;height:${timelineHeight}px;opacity:${spaceHeader.subregion_opacity}" title="${escapeHtml(subregion.label)}"></i>`).join("")}
        <div id="spacetimeRailLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimePointLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimeLabelLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimeActivityLayer" class="spacetime-runtime-layer"></div>
      </div>
    </div>${renderMinimap()}</section>
    <section class="spacetime-unresolved-grid"><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${compiled.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역·장소 기능으로 가로 위치를 확정할 수 없어 좌표를 만들지 않은 Activity입니다.</p>${unresolvedRows(compiled.unresolvedPosition)}</article><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">CHRONOLOGY REVIEW</p><h3>연대 미확정</h3></div><strong>${compiled.unresolvedChronology.length}</strong></div><p>Activity 시작·종료 연도를 둘 다 확정할 수 없는 경우 세로축에 임의 기간을 만들지 않습니다.</p>${unresolvedRows(compiled.unresolvedChronology)}</article></section>`;

    bindCameraViewport(mount, projection, navigationItems);
    const scroll = mount.querySelector(".spacetime-scroll");
    bindMinimap(mount, scroll, projection, allProjectedTracks, activePersonIds, regions, eras, contentWidth, timelineHeight);
    bindVirtualizedLayers(mount, scroll, {
      projectedTracks,
      visibleTracks,
      projection,
      contentWidth,
      timelineHeight,
      regions,
      densityField,
      lodWeights,
      needle,
      horizontalViewMode
    });

    const searchInput = mount.querySelector("#spacetimeSearch");
    searchInput?.addEventListener("input", (event) => {
      query = event.target.value || "";
      if (event.isComposing) return;
      renderInto(mount);
      requestAnimationFrame(() => { const input = mount.querySelector("#spacetimeSearch"); input?.focus(); input?.setSelectionRange(query.length, query.length); });
    });
    searchInput?.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "Enter") {
        const first = searchItems[0];
        if (!first) return;
        event.preventDefault();
        selectPerson(mount, first.person_id, { focus: true });
      } else if (event.key === "Escape" && query) {
        event.preventDefault();
        query = "";
        renderInto(mount);
        requestAnimationFrame(() => mount.querySelector("#spacetimeSearch")?.focus());
      }
    });
    mount.querySelector("#spacetimeHorizontalMode")?.addEventListener("change", (event) => { horizontalViewMode = event.target.value === "detail" ? "detail" : "overview"; renderInto(mount); });
    mount.querySelector("#spacetimeTimeZoomOut")?.addEventListener("click", () => requestTimeCameraZoom(mount, timeCameraZoom / TIME_CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeTimeZoomIn")?.addEventListener("click", () => requestTimeCameraZoom(mount, timeCameraZoom * TIME_CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeTimeZoomReset")?.addEventListener("click", () => requestTimeCameraZoom(mount, TIME_CAMERA_MIN_ZOOM));
    mount.querySelectorAll("[data-spacetime-search-result]").forEach((button) => button.addEventListener("click", () => selectPerson(mount, button.dataset.spacetimeSearchResult, { focus: true })));
    mount.querySelector("#spacetimePrevPerson")?.addEventListener("click", () => {
      const personId = exploration.adjacentPersonId(navigationItems, selectedPersonId, -1);
      if (personId) selectPerson(mount, personId, { focus: true });
    });
    mount.querySelector("#spacetimeNextPerson")?.addEventListener("click", () => {
      const personId = exploration.adjacentPersonId(navigationItems, selectedPersonId, 1);
      if (personId) selectPerson(mount, personId, { focus: true });
    });
    mount.querySelector("#spacetimeFocusPerson")?.addEventListener("click", () => {
      const activeScroll = mount.querySelector(".spacetime-scroll");
      focusPersonInViewport(activeScroll, projection, navigationItems, selectedPersonId);
      activeScroll?.focus();
    });
    mount.querySelector("#spacetimeDetailPerson")?.addEventListener("click", () => selectPerson(mount, selectedPersonId, { focus: true, detail: true }));
    mount.querySelector("#spacetimeClearPerson")?.addEventListener("click", () => clearSelection(mount));
    restoreRenderFocus(mount, renderFocus);
  }

  function bindResize() {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener("resize", () => {
      if (pendingViewportHorizontalRatio == null) pendingViewportHorizontalRatio = horizontalCameraRatioFromStoredGeometry();
      if (pendingViewportCameraOrdinal == null) pendingViewportCameraOrdinal = cameraCenterOrdinal;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const mount = document.getElementById("personSpacetimeMount");
        if (mount && !mount.hidden) renderInto(mount);
        else {
          pendingViewportHorizontalRatio = null;
          pendingViewportCameraOrdinal = null;
        }
      });
    });
  }

  async function activate() {
    const mount = document.getElementById("personSpacetimeMount");
    if (!mount) return;
    bindResize();
    if (pendingViewportHorizontalRatio == null) pendingViewportHorizontalRatio = horizontalCameraRatioFromStoredGeometry();
    if (pendingViewportCameraOrdinal == null) pendingViewportCameraOrdinal = cameraCenterOrdinal;
    dataLoadGeneration += 1;
    loadPromise = null;
    mount.innerHTML = '<section class="card spacetime-loading"><strong>시공간 인물도 준비 중</strong><p>Person track과 검토된 공간 배치 자료를 읽고 있습니다.</p></section>';
    try {
      await ensureRuntimeModules();
      const loaded = await ensureData();
      if (!loaded || document.getElementById("personSpacetimeMount") !== mount) return;
      renderInto(mount);
    } catch (error) {
      console.error(error);
      mount.innerHTML = `<section class="card spacetime-error"><strong>시공간 인물도를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.code || error?.message || "UNKNOWN_ERROR")}</p><button id="spacetimeRetry" type="button" class="btn">다시 시도</button></section>`;
      mount.querySelector("#spacetimeRetry")?.addEventListener("click", () => { loadPromise = null; runtimePromise = null; activate(); });
    }
  }

  window.ATLAS_PERSON_SPACETIME_VIEW = Object.freeze({ activate });
})();