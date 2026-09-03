(() => {
  "use strict";

  const reader = window.ATLAS_PERSON_BROWSER_READER;
  const model = window.ATLAS_PERSON_SPACETIME_MODEL;
  const eraModel = window.ATLAS_PERSON_ERA_MODEL;
  const SPATIAL_INDEX_URL = "./atlas-polity-spatial-index.json";
  const AXIS_WIDTH = 140;
  const ERA_AXIS_WIDTH = 68;
  const DEFAULT_TIMELINE_HEIGHT = 4200;
  const CAMERA_HEADER_HEIGHT = 36;
  const CAMERA_MIN_ZOOM = 5;
  const CAMERA_MAX_ZOOM = 8;
  const CAMERA_ZOOM_STEP = 1.25;
  const GLOBAL_EXTENT_COMPRESSION = 0.748;
  const FOCUS_DETAIL_ZOOM = 6.5;
  const RUNTIME_ASSETS = Object.freeze([
    ["./atlas-person-spacetime-time-projection.js?v=20260831-uniform-500-floor", "ATLAS_PERSON_SPACETIME_TIME_PROJECTION"],
    ["./atlas-person-spacetime-space-axis.js?v=20260903-leaf-equal-map-order", "ATLAS_PERSON_SPACETIME_SPACE_AXIS"],
    ["./atlas-person-spacetime-presentation-layout.js?v=20260903-band-corridor-v1", "ATLAS_PERSON_SPACETIME_PRESENTATION_LAYOUT"],
    ["./atlas-person-spacetime-semantic-axis.js?v=20260903-place-lod", "ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS"],
    ["./atlas-person-spacetime-uncertainty.js?v=20260903-c6", "ATLAS_PERSON_SPACETIME_UNCERTAINTY"],
    ["./atlas-person-spacetime-inspector.js?v=20260903-c8", "ATLAS_PERSON_SPACETIME_INSPECTOR"],
    ["./atlas-person-spacetime-exploration.js?v=20260826-p11", "ATLAS_PERSON_SPACETIME_EXPLORATION"],
    ["./atlas-person-spacetime-meanwhile.js?v=20260902-active-activity", "ATLAS_PERSON_SPACETIME_MEANWHILE"],
    ["./atlas-person-spacetime-data-parity.js?v=20260902-final-parity", "ATLAS_PERSON_SPACETIME_DATA_PARITY"],
    ["./atlas-person-spacetime-minimap.js?v=20260826-p12", "ATLAS_PERSON_SPACETIME_MINIMAP"],
    ["./atlas-person-spacetime-performance.js?v=20260826-p13", "ATLAS_PERSON_SPACETIME_PERFORMANCE"],
    ["./atlas-person-spacetime-spatial-compile.js?v=20260902-place-precision", "ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE"],
    ["./atlas-person-spacetime-person-tracks.js?v=20260902-inspector-evidence", "ATLAS_PERSON_SPACETIME_PERSON_TRACKS"],
    ["./atlas-person-spacetime-political-placement.js?v=20260826-inplace-p8", "ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT"],
    ["./atlas-person-spacetime-lod.js?v=20260831-500-floor", "ATLAS_PERSON_SPACETIME_LOD"],
    ["./atlas-person-spacetime-label-engine.js?v=20260903-cjk-band-zone", "ATLAS_PERSON_SPACETIME_LABEL_ENGINE"]
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
  let selectedPersonId = null;
  let selectedActivityId = null;
  let selectedTimeOrdinal = null;
  let pendingFocusPersonId = null;
  let resizeBound = false;
  let resizeFrame = 0;
  let cameraZoom = CAMERA_MIN_ZOOM;
  let cameraScrollTop = 0;
  let cameraScrollLeft = 0;
  let cameraHorizontalGeometry = null;
  let pendingViewportHorizontalRatio = null;
  let pendingViewportCameraOrdinal = null;
  let cameraCenterOrdinal = null;
  let currentTimelineProjection = null;
  let pendingCameraAnchor = null;
  let meanwhileSelectedOrdinal = null;
  let meanwhileSelectionSource = null;

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
    const end = activity?.end?.status === "ongoing" ? `현재 (${activity.end.as_of} 확인)` : Number.isInteger(activity?.end?.year) && activity.end.year !== 0 ? model.yearLabel(activity.end.year) : "종료 미상";
    return `${start} – ${end}`;
  }

  function placementBasisLabel(segment) {
    if (segment?.historical_placement_basis !== "polity_place_function") return "검토된 정치체 권역";
    const typeLabel = ({ capital: "수도", royal_court: "왕정 중심", royal_residence: "왕실 거점", imperial_court_core: "제국 궁정 중심", political_center: "정치 중심", administrative_center: "행정 중심" })[segment?.place_function_type] || "정치체 장소 기능";
    return `${typeLabel}: ${segment.location_label || segment.place_name || "미상"}`;
  }

  function spatialPrecisionLabel(segment) {
    return ({ place: "Place", subregion: "하위 권역", macroregion: "대권역", unresolved: "미확정" })[text(segment?.spatial_precision)] || text(segment?.spatial_precision) || "미확정";
  }

  function normalizedEvidenceRefs(refs) {
    return [...new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))];
  }

  function placeFunctionEvidence(segment) {
    return (Array.isArray(segment?.active_place_functions) ? segment.active_place_functions : []).map((fn) => {
      const typeLabel = ({ capital: "수도", royal_court: "왕정 중심", royal_residence: "왕실 거점", imperial_court_core: "제국 궁정 중심", political_center: "정치 중심", administrative_center: "행정 중심" })[text(fn?.function_type)] || text(fn?.function_type) || "장소 기능";
      const confidence = text(fn?.confidence);
      return `${typeLabel}: ${text(fn?.place_name) || "미상"}${confidence ? ` · ${confidence}` : ""}`;
    });
  }

  function evidenceRefsHtml(label, refs) {
    const normalized = normalizedEvidenceRefs(refs);
    return `<div class="spacetime-selection-evidence-sources"><b>${escapeHtml(label)}</b><span>${normalized.length ? normalized.map((ref) => escapeHtml(ref)).join(" · ") : "없음"}</span></div>`;
  }

  function renderSelectionEvidence(segment) {
    const placeFunctions = placeFunctionEvidence(segment);
    const historicalRefs = normalizedEvidenceRefs(segment?.historical_source_refs);
    const displayRefs = normalizedEvidenceRefs(segment?.display_source_refs);
    return `<article class="spacetime-selection-evidence-row">
      <div class="spacetime-selection-evidence-head"><strong>${escapeHtml(polityLabel(segment.activity))}</strong><span>${escapeHtml(periodLabel(segment.activity))}</span></div>
      <div class="spacetime-selection-evidence-meta"><span>공간 정밀도: <b>${escapeHtml(spatialPrecisionLabel(segment))}</b></span><span>배치 근거: <b>${escapeHtml(placementBasisLabel(segment))}</b></span></div>
      <div class="spacetime-selection-evidence-meta"><span>Place/region: <b>${escapeHtml(text(segment.place_name) || text(segment.subregion_code) || text(segment.macroregion_code) || "미확정")}</b></span><span>confidence: <b>${escapeHtml([text(segment.historical_confidence), text(segment.display_confidence)].filter(Boolean).join(" / ") || "미상")}</b></span></div>
      <div class="spacetime-selection-evidence-place"><b>Place evidence</b><span>${placeFunctions.length ? placeFunctions.map((value) => escapeHtml(value)).join(" · ") : "검토된 Place 기능 없음"}</span></div>
      ${evidenceRefsHtml("역사 배치 근거", historicalRefs)}
      ${evidenceRefsHtml("표시 정밀도 근거", displayRefs)}
      <div class="spacetime-selection-evidence-note">ATLAS 시공간 배치 기준이며 실제 거주 위치·활동 영역·이동 경로를 뜻하지 않습니다.</div>
    </article>`;
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
      script.addEventListener("load", () => {
        if (window[globalName]) {
          resolve(window[globalName]);
          return;
        }
        script.remove?.();
        reject(new Error(`ATLAS_SPACETIME_RUNTIME_MISSING: ${globalName}`));
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove?.();
        reject(new Error(`ATLAS_SPACETIME_RUNTIME_LOAD_FAILED: ${src}`));
      }, { once: true });
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
      presentationLayout: window.ATLAS_PERSON_SPACETIME_PRESENTATION_LAYOUT,
      semanticAxis: window.ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS,
      uncertainty: window.ATLAS_PERSON_SPACETIME_UNCERTAINTY,
      inspector: window.ATLAS_PERSON_SPACETIME_INSPECTOR,
      exploration: window.ATLAS_PERSON_SPACETIME_EXPLORATION,
      meanwhile: window.ATLAS_PERSON_SPACETIME_MEANWHILE,
      dataParity: window.ATLAS_PERSON_SPACETIME_DATA_PARITY,
      minimap: window.ATLAS_PERSON_SPACETIME_MINIMAP,
      performance: window.ATLAS_PERSON_SPACETIME_PERFORMANCE,
      spatialCompile: window.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE,
      personTracks: window.ATLAS_PERSON_SPACETIME_PERSON_TRACKS,
      politicalPlacement: window.ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT,
      lod: window.ATLAS_PERSON_SPACETIME_LOD,
      labelEngine: window.ATLAS_PERSON_SPACETIME_LABEL_ENGINE
    };
    if (Object.values(api).some((value) => !value)) throw new Error("ATLAS_SPACETIME_RUNTIME_INCOMPLETE");
    return api;
  }

  function clampCameraZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return CAMERA_MIN_ZOOM;
    return Math.min(CAMERA_MAX_ZOOM, Math.max(CAMERA_MIN_ZOOM, numeric));
  }

  function cameraZoomLabel() {
    return `${Math.round(cameraZoom * 100)}%`;
  }

  function cameraViewportCenterY(scroll) {
    const usableHeight = Math.max(1, scroll.clientHeight - CAMERA_HEADER_HEIGHT);
    return CAMERA_HEADER_HEIGHT + usableHeight / 2;
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
    const canvasY = Math.max(0, scroll.scrollTop + cameraViewportCenterY(scroll) - CAMERA_HEADER_HEIGHT);
    cameraCenterOrdinal = projection.screenToWorldOrdinal(canvasY);
  }

  function cameraViewportCenterX(scroll) {
    const usableWidth = Math.max(1, scroll.clientWidth - AXIS_WIDTH);
    return AXIS_WIDTH + usableWidth / 2;
  }

  function horizontalPointerRatio(scroll, viewportX) {
    const geometry = horizontalCameraGeometry(scroll);
    if (!geometry) return null;
    const raw = Number.isFinite(Number(viewportX)) ? Number(viewportX) : cameraViewportCenterX(scroll);
    const safe = Math.min(geometry.viewport_width, Math.max(geometry.axis_width, raw));
    const localX = Math.max(0, safe - geometry.axis_width);
    return Math.min(1, Math.max(0, (scroll.scrollLeft + localX) / geometry.world_width));
  }

  function scrollLeftForHorizontalPointerRatio(scroll, ratio, viewportX) {
    const geometry = horizontalCameraGeometry(scroll);
    if (!geometry || ratio == null) return null;
    const raw = Number.isFinite(Number(viewportX)) ? Number(viewportX) : cameraViewportCenterX(scroll);
    const safe = Math.min(geometry.viewport_width, Math.max(geometry.axis_width, raw));
    const localX = Math.max(0, safe - geometry.axis_width);
    const usableWidth = Math.max(1, geometry.viewport_width - geometry.axis_width);
    const maxScroll = Math.max(0, geometry.world_width - usableWidth);
    const target = Math.min(1, Math.max(0, Number(ratio))) * geometry.world_width - localX;
    return Math.min(maxScroll, Math.max(0, target));
  }

  function requestCameraZoom(mount, nextZoom, viewportX = null, viewportY = null) {
    const scroll = mount.querySelector(".spacetime-scroll");
    if (!scroll || !currentTimelineProjection?.screenToWorldOrdinal) return;
    const clampedZoom = clampCameraZoom(nextZoom);
    if (Math.abs(clampedZoom - cameraZoom) < 1e-9) return;
    const rawViewportX = Number.isFinite(Number(viewportX)) ? Number(viewportX) : cameraViewportCenterX(scroll);
    const rawViewportY = Number.isFinite(Number(viewportY)) ? Number(viewportY) : cameraViewportCenterY(scroll);
    const safeViewportX = Math.min(scroll.clientWidth, Math.max(AXIS_WIDTH, rawViewportX));
    const safeViewportY = Math.min(scroll.clientHeight, Math.max(CAMERA_HEADER_HEIGHT, rawViewportY));
    const currentCanvasY = Math.max(0, scroll.scrollTop + safeViewportY - CAMERA_HEADER_HEIGHT);
    pendingCameraAnchor = {
      ordinal: currentTimelineProjection.screenToWorldOrdinal(currentCanvasY),
      viewport_y: safeViewportY,
      horizontal_ratio: horizontalPointerRatio(scroll, safeViewportX),
      viewport_x: safeViewportX
    };
    cameraZoom = clampedZoom;
    renderInto(mount);
  }

  function clearActivityLinkedMeanwhile() {
    if (meanwhileSelectionSource === "activity") {
      meanwhileSelectedOrdinal = null;
      meanwhileSelectionSource = null;
    }
  }

  function selectPerson(mount, personId, options = {}) {
    const nextPersonId = personId || null;
    if (options.preserveActivity !== true || nextPersonId !== selectedPersonId) {
      clearActivityLinkedMeanwhile();
      selectedActivityId = null;
      selectedTimeOrdinal = null;
    }
    selectedPersonId = nextPersonId;
    pendingFocusPersonId = options.focus === false ? null : selectedPersonId;
    if (selectedPersonId && options.detail) {
      cameraZoom = Math.max(cameraZoom, FOCUS_DETAIL_ZOOM);
      pendingCameraAnchor = null;
    }
    renderInto(mount);
  }

  function selectActivity(mount, personId, activityId, options = {}) {
    const { inspector } = runtime();
    const track = compileAtlas().partitioned.tracks.find((item) => item.person_id === personId) || null;
    const activity = inspector.selectedActivity(track, activityId);
    if (!track || !activity) return false;
    selectedPersonId = track.person_id;
    selectedActivityId = activity.activity_id;
    selectedTimeOrdinal = activity.midpoint_ordinal;
    if (Number.isInteger(selectedTimeOrdinal)) {
      meanwhileSelectedOrdinal = selectedTimeOrdinal;
      meanwhileSelectionSource = "activity";
    } else {
      clearActivityLinkedMeanwhile();
    }
    pendingFocusPersonId = options.focus === true ? track.person_id : null;
    renderInto(mount);
    return true;
  }

  function clearSelection(mount) {
    clearActivityLinkedMeanwhile();
    selectedPersonId = null;
    selectedActivityId = null;
    selectedTimeOrdinal = null;
    pendingFocusPersonId = null;
    renderInto(mount);
  }

  function setMeanwhileYear(mount, year) {
    const ordinal = model.historicalYearToOrdinal(Number(year));
    if (ordinal == null) return false;
    meanwhileSelectedOrdinal = ordinal;
    meanwhileSelectionSource = "manual";
    renderInto(mount);
    return true;
  }

  function clearMeanwhile(mount) {
    meanwhileSelectedOrdinal = null;
    meanwhileSelectionSource = null;
    renderInto(mount);
  }

  function meanwhileRegionLabel(code) {
    return model.REGION_DEFINITIONS.find((region) => region.code === code)?.label || code || "미확정";
  }

  function meanwhileMomentLabel() {
    if (!Number.isInteger(meanwhileSelectedOrdinal)) return "시점 미상";
    const year = model.ordinalToHistoricalYear(meanwhileSelectedOrdinal);
    return year == null ? "시점 미상" : model.yearLabel(year);
  }

  function renderMeanwhile(summary) {
    if (!summary || meanwhileSelectedOrdinal == null) {
      return '<section class="spacetime-meanwhile card is-empty" aria-label="동시대 탐색"><div><small>MEANWHILE</small><strong>동시대 보기</strong><span>Activity를 선택하거나 연도축·빈 시공간을 클릭하면 그 시점에 실제 Activity가 활성인 인물들을 비교합니다.</span></div></section>';
    }
    const momentLabel = meanwhileMomentLabel();
    const sourceLabel = meanwhileSelectionSource === "activity" ? "선택 Activity 중간 시점" : "직접 선택 시점";
    const regionCounts = (summary.region_counts || []).map((item) =>
      `<span><b>${escapeHtml(meanwhileRegionLabel(item.code))}</b> ${item.unique_person_count}명</span>`
    ).join("");
    const visibleEntries = (summary.entries || []).slice(0, 24);
    const activityRows = visibleEntries.length
      ? `<div class="spacetime-meanwhile-activities">${visibleEntries.map((entry) => `<button type="button" data-spacetime-meanwhile-person="${escapeHtml(entry.person_id)}"><strong>${escapeHtml(entry.display_name)}</strong><span>${escapeHtml(polityLabel(entry.activity))}</span><small>${escapeHtml(periodLabel(entry.activity))}</small></button>`).join("")}</div>`
      : '<p class="spacetime-empty-inline">이 시점에 주 위치가 확정된 활성 Activity가 없습니다.</p>';
    return `<section class="spacetime-meanwhile card" aria-label="${escapeHtml(momentLabel)} 동시대 탐색">
      <div class="spacetime-meanwhile-head"><div><small>MEANWHILE · ${escapeHtml(sourceLabel)}</small><strong>${escapeHtml(momentLabel)}</strong><span>active Person ${summary.unique_person_count}명 · active Activity ${summary.activity_count}건</span></div><button id="spacetimeMeanwhileClear" type="button">시점 해제</button></div>
      <div class="spacetime-meanwhile-regions" aria-label="대권역별 동시대 인물 수">${regionCounts}</div>
      ${activityRows}
      ${summary.entries.length > visibleEntries.length ? `<p class="spacetime-more">외 ${summary.entries.length - visibleEntries.length}개 활성 Activity</p>` : ""}
    </section>`;
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
    const { spaceAxis, spatialCompile, personTracks, politicalPlacement, dataParity } = runtime();
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
    const parityReport = dataParity.verify(persons, compiledTracks);
    if (!parityReport.ok) {
      const error = new Error(`SPACETIME_DATA_PARITY_FAILED: ${dataParity.failureSummary(parityReport)}`);
      error.code = "SPACETIME_DATA_PARITY_FAILED";
      error.details = parityReport;
      throw error;
    }
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

  function packTrackLabels(projectedTracks, timelineHeight, forceAll) {
    const { labelEngine } = runtime();
    const placed = [];
    const deferred = [];
    const groups = new Map();

    for (const item of projectedTracks) {
      const bandCode = text(item?.presentation_band_code);
      const bandLeft = Number(item?.presentation_band_left);
      const bandRight = Number(item?.presentation_band_right);
      const zoneLeft = Number(item?.label_zone_left);
      const zoneRight = Number(item?.label_zone_right);
      if (!bandCode || !Number.isFinite(bandLeft) || !Number.isFinite(bandRight) || !(bandRight > bandLeft)
        || !Number.isFinite(zoneLeft) || !Number.isFinite(zoneRight) || !(zoneRight > zoneLeft)) {
        deferred.push(Object.freeze({ person_id:item?.track?.person_id || null, track_id:item?.track?.track_id || null, reason:"presentation_label_zone_missing" }));
        continue;
      }
      if (!groups.has(bandCode)) groups.set(bandCode, { bandCode, bandLeft, bandRight, items:[] });
      groups.get(bandCode).items.push(item);
    }

    for (const group of groups.values()) {
      const bandWidth = group.bandRight - group.bandLeft;
      const labels = group.items.map((item) => {
        const zoneLeft = Math.max(group.bandLeft, Number(item.label_zone_left));
        const zoneRight = Math.min(group.bandRight, Number(item.label_zone_right));
        const zoneWidth = Math.max(0, zoneRight - zoneLeft);
        const minimum = Math.min(labelEngine.DEFAULT_MIN_LABEL_WIDTH, Math.max(16, zoneWidth));
        const maximum = Math.max(minimum, Math.min(labelEngine.DEFAULT_MAX_LABEL_WIDTH, Math.max(16, zoneWidth)));
        return {
          person_id: item.track.person_id,
          track_id: item.track.track_id,
          text: item.track.display_name,
          anchor_x: item.x - group.bandLeft,
          anchor_y: item.y,
          min_left: zoneLeft - group.bandLeft,
          max_right: zoneRight - group.bandLeft,
          width: labelEngine.estimateWidth(
            { text:item.track.display_name },
            { minLabelWidth:minimum, maxLabelWidth:maximum }
          ),
          forced: forceAll || selectedPersonId === item.track.person_id
        };
      });
      const result = labelEngine.packLabels(
        labels,
        { width:bandWidth, height:timelineHeight },
        { maxLabelWidth:Math.min(labelEngine.DEFAULT_MAX_LABEL_WIDTH, bandWidth), maxHorizontalShift:bandWidth }
      );
      placed.push(...result.placed.map((label) => ({
        ...label,
        label_x:group.bandLeft + label.label_x,
        region_code:group.bandCode,
        region_left:group.bandLeft,
        region_right:group.bandRight
      })));
      deferred.push(...result.deferred.map((label) => ({ ...label, region_code:group.bandCode })));
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

  function ordinalLabel(ordinal) {
    if (!Number.isInteger(ordinal)) return "시점 미상";
    const year = model.ordinalToHistoricalYear(ordinal);
    return year == null ? "시점 미상" : model.yearLabel(year);
  }

  function ordinalRangeLabel(startOrdinal, endOrdinal) {
    if (!Number.isInteger(startOrdinal) || !Number.isInteger(endOrdinal)) return "기간 미상";
    return `${ordinalLabel(startOrdinal)} – ${ordinalLabel(endOrdinal)}`;
  }

  function activityClassificationLabel(group) {
    const classes = Array.isArray(group?.classifications) ? group.classifications : [];
    if (classes.includes("primary")) return classes.length > 1 ? "주 위치 + 관계 참조" : "주 위치";
    if (classes.includes("counterparty")) return "counterparty · 자기 위치 계산 제외";
    if (classes.includes("unresolved")) return "위치/연대 미확정";
    return "공간 관계 검토";
  }

  function renderInspectorActivity(group) {
    const activity = group.activity || {};
    const selected = selectedActivityId === group.activity_id;
    const relation = text(activity?.relation?.display_name) || text(activity?.relation?.code) || "관계 미상";
    const role = text(activity?.role?.display_name) || text(activity?.role?.source_label) || text(activity?.role?.code) || "역할 미상";
    const placements = (group.segments || []).map((segment) => renderSelectionEvidence(segment)).join("");
    return `<article class="spacetime-inspector-activity${selected ? " is-selected" : ""}">
      <button type="button" class="spacetime-inspector-activity-select" data-spacetime-inspector-activity="${escapeHtml(group.activity_id)}" data-spacetime-person="${escapeHtml(selectedPersonId)}" data-spacetime-activity="${escapeHtml(group.activity_id)}" aria-pressed="${selected ? "true" : "false"}">
        <span><strong>${escapeHtml(polityLabel(activity))}</strong><small>${escapeHtml(periodLabel(activity))}</small></span>
        <span>${escapeHtml(relation)} · ${escapeHtml(role)}</span>
        <em>${escapeHtml(activityClassificationLabel(group))}</em>
      </button>
      <div class="spacetime-inspector-activity-evidence">${placements || `<p class="spacetime-empty-inline">공간 배치 slice 없음${group.unresolved_reason ? ` · ${escapeHtml(reasonLabel(group.unresolved_reason))}` : ""}</p>`}</div>
    </article>`;
  }

  function renderStickyInspector(track, navigationCount = 0) {
    if (!track) {
      return `<aside class="spacetime-sticky-inspector card is-empty" id="spacetimeInspector" aria-label="Person Activity inspector"><div><small>PERSON INSPECTOR</small><strong>인물을 선택하세요</strong><p>Person을 선택하면 전체 Activity와 ATLAS 시공간 배치 근거·출처를 이 패널에서 확인할 수 있습니다.</p></div></aside>`;
    }
    const { inspector } = runtime();
    const activities = inspector.groupActivities(track);
    const extent = inspector.personExtent(track);
    const canCycle = Number(navigationCount) > 1;
    const cycleDisabled = canCycle ? "" : ' disabled aria-disabled="true"';
    const koName = text(track.preferred_name_ko) || text(track.display_name) || "이름 미상";
    const secondaryName = text(track.canonical_name_en) && text(track.canonical_name_en) !== koName ? text(track.canonical_name_en) : "";
    const selectedActivity = inspector.selectedActivity(track, selectedActivityId);
    return `<aside class="spacetime-sticky-inspector card" id="spacetimeInspector" aria-label="${escapeHtml(track.display_name)} Person Activity inspector">
      <header class="spacetime-inspector-person">
        <small>PERSON INSPECTOR</small>
        <strong>${escapeHtml(koName)}</strong>
        ${secondaryName ? `<span>${escapeHtml(secondaryName)}</span>` : ""}
        <p>${escapeHtml(extent ? ordinalRangeLabel(extent.start_ordinal, extent.end_ordinal) : "Activity 기간 미상")}</p>
        ${selectedActivity && Number.isInteger(selectedTimeOrdinal) ? `<output>선택 Activity 중간 시점 · ${escapeHtml(ordinalLabel(selectedTimeOrdinal))}</output>` : ""}
      </header>
      <div class="spacetime-inspector-actions" role="group" aria-label="선택 인물 탐색"><button id="spacetimePrevPerson" type="button"${cycleDisabled}>이전</button><button id="spacetimeFocusPerson" type="button">위치로</button><button id="spacetimeDetailPerson" type="button">확대</button><button id="spacetimeNextPerson" type="button"${cycleDisabled}>다음</button><button id="spacetimeClearPerson" type="button">해제</button></div>
      <section class="spacetime-inspector-activities"><div class="spacetime-inspector-section-title"><strong>Activities</strong><span>${activities.length}</span></div>${activities.map(renderInspectorActivity).join("") || '<p class="spacetime-empty-inline">Activity 없음</p>'}</section>
      <footer class="spacetime-inspector-disclaimer">공간 정보는 인물의 실제 거주지·활동 영역이 아니라 ATLAS의 검토된 시공간 배치 기준입니다.</footer>
    </aside>`;
  }

  function renderMinimap() {
    return `<aside class="spacetime-minimap" aria-label="전체 시공간 미니맵"><div class="spacetime-minimap-head"><strong>전체 시공간</strong><span>클릭·드래그·방향키 이동</span></div><div id="spacetimeMinimapSurface" class="spacetime-minimap-surface" role="group" tabindex="0" aria-label="현재 전체 시공간과 카메라 범위. 방향키로 카메라 이동"><canvas id="spacetimeMinimapCanvas" class="spacetime-minimap-canvas" aria-hidden="true"></canvas><div id="spacetimeMinimapViewport" class="spacetime-minimap-viewport" aria-hidden="true"></div><i id="spacetimeMinimapSelected" class="spacetime-minimap-selected" aria-hidden="true"></i></div><output id="spacetimeMinimapStatus" class="spacetime-minimap-status">현재 화면</output></aside>`;
  }

  function renderSpatialUncertainty(tracks, projection, contentWidth, activityOpacity) {
    const { uncertainty } = runtime();
    return tracks.flatMap((track) => (track.primary_segments || []).flatMap((segment) => {
      const selected = selectedPersonId === track.person_id;
      const activitySelected = selected && selectedActivityId === segment.activity_id;
      if (!uncertainty.visible(segment, activityOpacity, selected)) return [];
      const geometry = uncertainty.geometry(segment, contentWidth);
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const y = (y1 + y2) / 2;
      const precision = spatialPrecisionLabel(segment);
      if (geometry.kind === "range") {
        const title = `ATLAS 시공간 배치 정밀도 범위 · ${precision} · 활동 영역이나 실제 이동 경로가 아닙니다`;
        return [`<button type="button" class="spacetime-spatial-uncertainty ${escapeHtml(uncertainty.precisionClass(segment))}${selected ? " is-selected" : ""}${activitySelected ? " is-activity-selected" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" data-spacetime-activity="${escapeHtml(segment.activity_id)}" style="left:${geometry.left}px;top:${y}px;width:${geometry.width}px" title="${escapeHtml(title)}" aria-label="${escapeHtml(`${track.display_name} · ${title}`)}"><i></i></button>`];
      }
      if (geometry.kind === "multi-place") {
        const names = geometry.place_anchors.map((point) => point.place_name).filter(Boolean).join(" · ");
        const title = `복수 검토 Place 배치 기준: ${names || "복수 Place"} · 실제 이동 경로가 아닙니다`;
        const points = geometry.place_anchors.map((point) => `<i class="spacetime-multi-place-anchor" style="left:${point.x - geometry.left}px" title="${escapeHtml(point.place_name || "Place")}"></i>`).join("");
        return [`<button type="button" class="spacetime-spatial-uncertainty is-multi-place${selected ? " is-selected" : ""}${activitySelected ? " is-activity-selected" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" data-spacetime-activity="${escapeHtml(segment.activity_id)}" style="left:${geometry.left}px;top:${y}px;width:${geometry.width}px" title="${escapeHtml(title)}" aria-label="${escapeHtml(`${track.display_name} · ${title}`)}">${points}</button>`];
      }
      return [];
    })).join("");
  }

  function renderRails(tracks, projection, contentWidth, opacity, presentation, meanwhileOrdinal = null) {
    if (opacity <= 0.01) return "";
    const { uncertainty, presentationLayout } = runtime();
    return tracks.flatMap((track) => (track.primary_segments || []).map((segment) => {
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const top = Math.min(y1, y2);
      const height = Math.max(2, Math.abs(y2 - y1));
      const geometry = presentationLayout.geometryForSegment(presentation, segment);
      const x = Number.isFinite(Number(geometry?.rail_x)) ? Number(geometry.rail_x) : segment.x_anchor * contentWidth;
      const bandCode = text(geometry?.band_code) || text(segment.subregion_code) || text(segment.macroregion_code);
      const railBasis = text(geometry?.rail_basis) || "historical_fallback";
      const meanwhileActive = meanwhileOrdinal != null && segment.start_ordinal <= meanwhileOrdinal && meanwhileOrdinal <= segment.end_ordinal;
      return `<button type="button" class="spacetime-track-rail ${escapeHtml(uncertainty.precisionClass(segment))}${selectedPersonId === track.person_id ? " is-selected" : ""}${selectedPersonId === track.person_id && selectedActivityId === segment.activity_id ? " is-activity-selected" : ""}${meanwhileActive ? " is-meanwhile-active" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" data-spacetime-activity="${escapeHtml(segment.activity_id)}" data-spacetime-band="${escapeHtml(bandCode)}" data-spacetime-rail-basis="${escapeHtml(railBasis)}" style="left:${x}px;top:${top}px;height:${height}px;opacity:${opacity}" title="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}" aria-label="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}"></button>`;
    })).join("");
  }

  function renderActivityGlyphs(tracks, projection, contentWidth, opacity, presentation, meanwhileOrdinal = null) {
    const { uncertainty, presentationLayout, labelEngine } = runtime();
    return tracks.flatMap((track) => (track.primary_segments || []).flatMap((segment) => {
      const personSelected = selectedPersonId === track.person_id;
      const segmentOpacity = personSelected ? 1 : opacity;
      if (segmentOpacity <= 0.01) return [];
      const y1 = projection.yForOrdinal(segment.start_ordinal);
      const y2 = projection.yForOrdinal(segment.end_ordinal);
      const y = (y1 + y2) / 2;
      const geometry = presentationLayout.geometryForSegment(presentation, segment);
      const fallbackX = segment.x_anchor * contentWidth;
      const labelText = polityLabel(segment.activity);
      const naturalWidth = labelEngine.estimateWidth(
        { text:labelText },
        { minLabelWidth:28, maxLabelWidth:140, charWidth:6.2, cjkCharWidth:9 }
      ) + 10;
      const box = presentationLayout.activityBox(presentation, segment, naturalWidth, { minWidth:28, maxWidth:150 });
      const left = Number.isFinite(Number(box?.left)) ? Number(box.left) : fallbackX + 6;
      const widthStyle = Number.isFinite(Number(box?.width)) ? `width:${Number(box.width)}px;` : "";
      const bandCode = text(box?.band_code) || text(geometry?.band_code) || text(segment.subregion_code) || text(segment.macroregion_code);
      const meanwhileActive = meanwhileOrdinal != null && segment.start_ordinal <= meanwhileOrdinal && meanwhileOrdinal <= segment.end_ordinal;
      return [`<button type="button" class="spacetime-activity-glyph ${escapeHtml(uncertainty.precisionClass(segment))}${personSelected ? " is-selected" : ""}${personSelected && selectedActivityId === segment.activity_id ? " is-activity-selected" : ""}${meanwhileActive ? " is-meanwhile-active" : ""}" data-spacetime-person="${escapeHtml(track.person_id)}" data-spacetime-activity="${escapeHtml(segment.activity_id)}" data-spacetime-band="${escapeHtml(bandCode)}" style="left:${left}px;top:${y}px;${widthStyle}opacity:${segmentOpacity}" title="${escapeHtml(`${track.display_name} · ${labelText} · ${periodLabel(segment.activity)}`)}" aria-label="${escapeHtml(`${track.display_name} · ${labelText} · ${periodLabel(segment.activity)}`)}"><span>${escapeHtml(labelText)}</span></button>`];
    })).join("");
  }

  function renderLabels(projectedTracks, labelPack, lodWeights, needle, meanwhilePersonIds = new Set()) {
    const labelsByPerson = new Map(labelPack.placed.map((label) => [label.person_id, label]));
    return projectedTracks.map((item) => {
      const label = labelsByPerson.get(item.track.person_id);
      if (!label) return "";
      const forced = Boolean(needle) || selectedPersonId === item.track.person_id;
      const opacity = forced ? 1 : lodWeights.labels;
      const connector = label.connector ? `<i class="spacetime-label-connector" style="left:${label.region_left + Math.min(label.connector.x1, label.connector.x2)}px;top:${label.connector.y1}px;width:${label.connector.length}px"></i>` : "";
      const meanwhileActive = meanwhilePersonIds.has(item.track.person_id);
      return `${connector}<button type="button" class="spacetime-track-label${selectedPersonId === item.track.person_id ? " is-selected" : ""}${meanwhileActive ? " is-meanwhile-active" : ""}" data-spacetime-person="${escapeHtml(item.track.person_id)}" data-spacetime-band="${escapeHtml(label.region_code)}" style="left:${label.label_x}px;top:${label.label_y}px;width:${label.width}px;opacity:${opacity}" title="${escapeHtml(item.track.display_name)}">${escapeHtml(item.track.display_name)}</button>`;
    }).join("");
  }

  function restoreCameraViewport(scroll, projection) {
    if (pendingCameraAnchor?.ordinal != null && projection?.worldToScreenY) {
      const anchorY = projection.worldToScreenY(pendingCameraAnchor.ordinal);
      const restoredLeft = scrollLeftForHorizontalPointerRatio(scroll, pendingCameraAnchor.horizontal_ratio, pendingCameraAnchor.viewport_x);
      scroll.scrollLeft = restoredLeft == null ? cameraScrollLeft : restoredLeft;
      scroll.scrollTop = Math.max(0, CAMERA_HEADER_HEIGHT + anchorY - pendingCameraAnchor.viewport_y);
      pendingCameraAnchor = null;
    } else if (pendingViewportHorizontalRatio != null || pendingViewportCameraOrdinal != null) {
      const restoredScrollLeft = scrollLeftForHorizontalCameraRatio(scroll, pendingViewportHorizontalRatio);
      scroll.scrollLeft = restoredScrollLeft == null ? cameraScrollLeft : restoredScrollLeft;
      if (pendingViewportCameraOrdinal != null && projection?.worldToScreenY) {
        const centerY = projection.worldToScreenY(pendingViewportCameraOrdinal);
        scroll.scrollTop = Math.max(0, CAMERA_HEADER_HEIGHT + centerY - cameraViewportCenterY(scroll));
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
      { leftInset: AXIS_WIDTH, topInset: CAMERA_HEADER_HEIGHT }
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
      { left: AXIS_WIDTH, top: CAMERA_HEADER_HEIGHT }
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
        { left: AXIS_WIDTH, top: CAMERA_HEADER_HEIGHT }
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
        { left: AXIS_WIDTH, top: CAMERA_HEADER_HEIGHT }
      );
      const forced = forcedIds();
      const personItems = performance.cullProjectedItems(state.projectedTracks, cullRect, forced);
      const segmentTracks = performance.cullTrackSegments(state.visibleTracks, state.projection, state.contentWidth, cullRect, forced);
      const segmentIds = segmentTracks.flatMap((track) => (track.primary_segments || []).map((segment) => segment.stable_id || `${track.person_id}:${segment.start_ordinal}:${segment.end_ordinal}`));
      const personIds = personItems.map((item) => item.person_id);
      const signature = `${personIds.join(",")}|${segmentIds.join(",")}|${selectedPersonId || ""}|${selectedActivityId || ""}|${state.meanwhileOrdinal ?? ""}|${state.needle}|${state.lodWeights.labels}|${state.lodWeights.rails}|${state.lodWeights.activities}`;

      if (signature !== lastSignature) {
        const labelPack = packTrackLabels(personItems, state.timelineHeight, Boolean(state.needle));
        const railLayer = mount.querySelector("#spacetimeRailLayer");
        const uncertaintyLayer = mount.querySelector("#spacetimeUncertaintyLayer");
        const labelLayer = mount.querySelector("#spacetimeLabelLayer");
        const activityLayer = mount.querySelector("#spacetimeActivityLayer");
        if (railLayer) railLayer.innerHTML = renderRails(segmentTracks, state.projection, state.contentWidth, state.lodWeights.rails, state.presentation, state.meanwhileOrdinal);
        if (uncertaintyLayer) uncertaintyLayer.innerHTML = renderSpatialUncertainty(segmentTracks, state.projection, state.contentWidth, state.lodWeights.activities);
        if (labelLayer) labelLayer.innerHTML = renderLabels(personItems, labelPack, state.lodWeights, state.needle, state.meanwhilePersonIds);
        if (activityLayer) activityLayer.innerHTML = renderActivityGlyphs(segmentTracks, state.projection, state.contentWidth, state.lodWeights.activities, state.presentation, state.meanwhileOrdinal);
        updateCount("spacetimeDomPersonCount", personItems.length);
        updateCount("spacetimeDomSegmentCount", segmentIds.length);
        updateCount("spacetimeDomLabelCount", labelPack.placed.length);
        updateCount("spacetimeDeferredLabelCount", labelPack.deferred.length);
        lastSignature = signature;
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(refresh);
    };

    const canvas = mount.querySelector(".spacetime-canvas");
    canvas?.addEventListener("click", (event) => {
      const activityTarget = event.target.closest?.("[data-spacetime-activity]");
      if (activityTarget && canvas.contains(activityTarget)) {
        selectActivity(mount, activityTarget.dataset.spacetimePerson, activityTarget.dataset.spacetimeActivity, { focus: false });
        return;
      }
      const target = event.target.closest?.("[data-spacetime-person]");
      if (target && canvas.contains(target)) {
        selectPerson(mount, target.dataset.spacetimePerson, { focus: false });
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const year = state.projection?.historicalYearForScreenY?.(event.clientY - rect.top);
      if (year != null) setMeanwhileYear(mount, year);
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
      const factor = event.deltaY < 0 ? CAMERA_ZOOM_STEP : 1 / CAMERA_ZOOM_STEP;
      const wheelZoomTarget = cameraZoom * factor;
      if (Math.abs(clampCameraZoom(wheelZoomTarget) - cameraZoom) < 1e-9) return;
      event.preventDefault();
      const rect = scroll.getBoundingClientRect();
      requestCameraZoom(mount, wheelZoomTarget, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });
    scroll.addEventListener("keydown", (event) => {
      if (event.target !== scroll) return;
      const command = exploration.keyboardCommand(event);
      if (!command) return;
      if ((command === "previous-person" || command === "next-person") && navigationItems.length <= 1) return;
      if ((command === "focus-selected" || command === "clear-selection") && !selectedPersonId) return;
      const keyboardZoomTarget = command === "zoom-in"
        ? cameraZoom * CAMERA_ZOOM_STEP
        : command === "zoom-out" ? cameraZoom / CAMERA_ZOOM_STEP : null;
      if (keyboardZoomTarget != null && Math.abs(clampCameraZoom(keyboardZoomTarget) - cameraZoom) < 1e-9) return;
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
        requestCameraZoom(mount, keyboardZoomTarget);
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
    const { timeProjection, spaceAxis, semanticAxis, spatialCompile, exploration, inspector, meanwhile, lod, presentationLayout } = runtime();
    const timeline = timelineRange();
    const projection = timeProjection.createUniformTimeProjection(timeline.start_year, timeline.end_year, DEFAULT_TIMELINE_HEIGHT * cameraZoom * GLOBAL_EXTENT_COMPRESSION, cameraZoom);
    currentTimelineProjection = projection;
    const timelineHeight = projection.height;
    const compiled = compileAtlas();
    const needle = query.trim().toLocaleLowerCase("ko");
    const baseWorldWidth = spaceAxis.baseWorldWidthForViewport(Number(mount.clientWidth) || window.innerWidth || 1280, AXIS_WIDTH);
    const contentWidth = baseWorldWidth * cameraZoom * GLOBAL_EXTENT_COMPRESSION;
    const regions = spaceAxis.stableRegionLayout(compiled.continuum, contentWidth);
    const spaceHeader = semanticAxis.buildSpaceHeaderPlan(compiled.continuum, contentWidth, cameraZoom, spatialCompile.REVIEWED_PLACE_BINDINGS);
    const timeAxis = semanticAxis.buildTimeAxisPlan(timeline, projection, cameraZoom);
    const presentation = presentationLayout.compileTrackPresentation(compiled.partitioned.tracks, compiled.continuum, contentWidth);
    const allProjectedTracks = compiled.partitioned.tracks
      .map((track) => exploration.projectTrack(track, projection, contentWidth))
      .filter(Boolean)
      .map((item) => presentationLayout.applyTrackPresentation(item, presentation))
      .filter(Boolean);
    const projectedTracks = needle ? allProjectedTracks.filter((item) => trackSearchable(item.track).includes(needle)) : allProjectedTracks;
    const visibleTracks = projectedTracks.map((item) => item.track);
    const activePersonIds = new Set(projectedTracks.map((item) => item.person_id));
    if (selectedPersonId && !activePersonIds.has(selectedPersonId)) {
      clearActivityLinkedMeanwhile();
      selectedPersonId = null;
      selectedActivityId = null;
      selectedTimeOrdinal = null;
      pendingFocusPersonId = null;
    }
    const navigationItems = exploration.orderItems(projectedTracks);
    const searchItems = needle ? exploration.rankSearchItems(projectedTracks, needle) : [];
    const lodWeights = lod.lodWeights({ zoom: cameraZoom });
    const ticks = timeAxis.ticks;
    const eras = buildEraBands(timeline, projection);
    const selectedTrack = compiled.partitioned.tracks.find((track) => track.person_id === selectedPersonId) || null;
    if (selectedTrack && selectedActivityId && !inspector.selectedActivity(selectedTrack, selectedActivityId)) {
      clearActivityLinkedMeanwhile();
      selectedActivityId = null;
      selectedTimeOrdinal = null;
    }
    const meanwhileOrdinal = meanwhileSelectedOrdinal;
    const meanwhileSummary = meanwhileOrdinal == null ? null : meanwhile.summarize(
      compiled.partitioned.tracks,
      meanwhileOrdinal,
      model.REGION_DEFINITIONS.map((region) => region.code)
    );
    const meanwhilePersonIds = new Set(meanwhileSummary?.person_ids || []);
    const counterpartyCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0) + compiled.partitioned.primary_unresolved.reduce((sum, track) => sum + (track.counterparty_segments?.length || 0), 0);
    const primarySegmentCount = compiled.partitioned.tracks.reduce((sum, track) => sum + (track.primary_segments?.length || 0), 0);

    mount.innerHTML = `<section class="spacetime-toolbar card">
      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>시공간 인물도는 500%를 최소·기본 축척으로 사용합니다. 시간과 공간은 하나의 전역 카메라 배율로 함께 확대되며, 물리 캔버스 크기에는 모든 시대와 모든 지역에 동일한 0.748 압축만 적용합니다. 가로 base world는 900px 하한·1,275px 상한을 사용하므로 넓은 화면에서도 세계 자체가 불필요하게 늘어나지 않습니다. 특정 시대나 특정 지역의 빈 공간만 따로 접지 않습니다. 검색·선택·줌은 normalized world 좌표를 바꾸지 않으며, opposes는 자기 위치를 결정하지 않습니다.</p><div class="spacetime-explore-help">방향키 이동 · PageUp/PageDown 큰 이동 · Shift+↑/↓ 이전/다음 인물 · F 선택 위치 · +/- 시공간 확대 · Esc 선택 해제</div></div>
      <div class="spacetime-controls">
        <label>검색<input id="spacetimeSearch" type="search" value="${escapeHtml(query)}" placeholder="인물·정치체·역할 검색" /></label>
        <div class="spacetime-camera" role="group" aria-label="시공간 확대"><span>시공간 확대</span><button id="spacetimeCameraZoomOut" type="button" aria-label="시공간 축소">−</button><output id="spacetimeCameraZoomValue">${escapeHtml(cameraZoomLabel())}</output><button id="spacetimeCameraZoomIn" type="button" aria-label="시공간 확대">+</button><button id="spacetimeCameraZoomReset" type="button">500%</button></div>
      </div>
    </section>
    ${renderSearchResults(searchItems, needle)}
    <section class="spacetime-precision-legend card"><strong>공간 배치 정밀도</strong><span><i class="is-place"></i>Place</span><span><i class="is-subregion"></i>Subregion 범위</span><span><i class="is-macroregion"></i>Macroregion 범위</span><small>점선 가로선은 ATLAS 시공간 배치 정밀도 범위이며, 인물의 활동 영역이나 실제 이동 경로가 아닙니다.</small></section>
    <section class="spacetime-status-row"><span><b>${visibleTracks.length}</b> ${needle ? "검색" : "전체"} Person track</span><span><b>${primarySegmentCount}</b> 전체 주 위치 구간</span><span><b>${counterpartyCount}</b> 전체 counterparty 제외</span><span><b>${compiled.unresolvedPosition.length}</b> 전체 위치 미확정</span><span><b>${compiled.unresolvedChronology.length}</b> 전체 연대 미확정</span><span><b id="spacetimeDomPersonCount">0</b> viewport Person DOM</span><span><b id="spacetimeDomSegmentCount">0</b> viewport segment DOM</span><span><b id="spacetimeDomLabelCount">0</b> 이름 표시</span><span><b id="spacetimeDeferredLabelCount">0</b> label defer</span><span><b>${escapeHtml(timeAxis.stage_label)}</b> 시간축</span><span><b>${escapeHtml(spaceHeader.stage_label)}</b> 공간축</span><span><b>${escapeHtml(lod.representationStage(lodWeights))}</b> LOD</span><span><b>${escapeHtml(cameraZoomLabel())}</b> 시공간 줌</span></section>
    ${(compiled.unresolvedPosition.length || compiled.partitioned.relation_review.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>현재 canonical spatial index가 제공하는 검토된 macroregion만 좌표로 사용합니다. 세부 Place/subregion 근거가 없으면 macroregion보다 정밀한 좌표를 만들지 않으며, counterparty인 opposes는 자기 위치 계산에서 제외합니다.</p></section>` : ""}
    ${renderMeanwhile(meanwhileSummary)}
    <div class="spacetime-workspace">
    <section class="spacetime-frame card" style="--spacetime-axis-width:${AXIS_WIDTH}px;--spacetime-header-height:${CAMERA_HEADER_HEIGHT}px;--spacetime-era-axis-width:${ERA_AXIS_WIDTH}px;--spacetime-year-axis-width:${AXIS_WIDTH - ERA_AXIS_WIDTH}px"><div class="spacetime-scroll" tabindex="0" aria-label="역사 시간과 검토된 정치체 권역에 따른 Person track 및 등록 인물 밀도 분포">
      <div class="spacetime-sticky-corner"><span>시대</span><span>연도<small>${escapeHtml(timeAxis.stage_label)}</small></span></div>
      <div class="spacetime-region-head" style="width:${contentWidth}px">
        <div class="spacetime-region-head-layer is-macro" style="opacity:${spaceHeader.macro_opacity}">${spaceHeader.macroregions.map((region) => `<div class="spacetime-region-head-band" data-spacetime-band="${escapeHtml(region.code)}" style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(region.code)}</small></div>`).join("")}</div>
        <div class="spacetime-region-head-layer is-subregion" style="opacity:${spaceHeader.subregion_opacity}">${spaceHeader.subregions.map((region) => `<div class="spacetime-region-head-band" data-spacetime-band="${escapeHtml(region.code)}" style="left:${region.left}px;width:${region.width}px"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(region.parent_code)}</small></div>`).join("")}</div>
        <div class="spacetime-region-head-layer is-place" style="opacity:${spaceHeader.place_opacity}">${spaceHeader.places.map((place) => `<div class="spacetime-place-head-marker" style="left:${place.x}px" title="${escapeHtml(`검토 Place · ${place.place_name} · ${place.subregion_code}의 presentation anchor · 정확한 지리 좌표 아님`)}"><i></i><strong>${escapeHtml(place.place_name)}</strong></div>`).join("")}</div>
      </div>
      <div class="spacetime-era-axis" style="height:${timelineHeight}px;opacity:${timeAxis.era_opacity}">${eras.map((era) => `<div class="person-era-${escapeHtml(era.code)}" style="top:${era.top}px;height:${era.height}px"><span>${escapeHtml(era.label)}</span></div>`).join("")}</div>
      <div class="spacetime-year-axis" data-axis-stage="${escapeHtml(timeAxis.stage)}" style="height:${timelineHeight}px">${ticks.map((tick) => `<span class="${tick.major ? "is-major" : ""}" style="top:${tick.y}px">${escapeHtml(tick.label)}</span>`).join("")}</div>
      <div class="spacetime-canvas${selectedPersonId ? " has-person-selection" : ""}" style="width:${contentWidth}px;height:${timelineHeight}px">
        ${ticks.map((tick) => `<i class="spacetime-century-line${tick.major ? " is-major" : ""}" style="top:${tick.y}px"></i>`).join("")}
        ${regions.map((region) => `<i class="spacetime-region-line" style="left:${region.left}px;height:${timelineHeight}px"></i>`).join("")}
        ${spaceHeader.subregions.map((subregion) => `<i class="spacetime-subregion-line" style="left:${subregion.left}px;height:${timelineHeight}px;opacity:${spaceHeader.subregion_opacity}" title="${escapeHtml(subregion.label)}"></i>`).join("")}
        ${spaceHeader.places.map((place) => `<i class="spacetime-place-guide" style="left:${place.x}px;opacity:${spaceHeader.place_opacity}" title="${escapeHtml(`검토 Place: ${place.place_name} · presentation anchor · 정확한 지리 좌표 아님`)}"></i>`).join("")}
        ${meanwhileOrdinal == null ? "" : `<div class="spacetime-meanwhile-line${meanwhileSelectionSource === "activity" ? " is-activity-linked" : ""}" style="top:${projection.yForOrdinal(meanwhileOrdinal)}px;width:${contentWidth}px"><span>${escapeHtml(meanwhileMomentLabel())}</span></div>`}
        <div id="spacetimeRailLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimeUncertaintyLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimeLabelLayer" class="spacetime-runtime-layer"></div>
        <div id="spacetimeActivityLayer" class="spacetime-runtime-layer"></div>
      </div>
    </div>${renderMinimap()}</section>
    ${renderStickyInspector(selectedTrack, navigationItems.length)}
    </div>
    <section class="spacetime-unresolved-grid"><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${compiled.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역·장소 기능으로 가로 위치를 확정할 수 없어 좌표를 만들지 않은 Activity입니다.</p>${unresolvedRows(compiled.unresolvedPosition)}</article><article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">CHRONOLOGY REVIEW</p><h3>연대 미확정</h3></div><strong>${compiled.unresolvedChronology.length}</strong></div><p>Activity 시작·종료 연도를 둘 다 확정할 수 없는 경우 세로축에 임의 기간을 만들지 않습니다.</p>${unresolvedRows(compiled.unresolvedChronology)}</article></section>`;

    bindCameraViewport(mount, projection, navigationItems);
    const scroll = mount.querySelector(".spacetime-scroll");
    bindMinimap(mount, scroll, projection, allProjectedTracks, activePersonIds, regions, eras, contentWidth, timelineHeight);
    bindVirtualizedLayers(mount, scroll, {
      projectedTracks,
      visibleTracks,
      projection,
      presentation,
      contentWidth,
      timelineHeight,
      regions,
      lodWeights,
      needle,
      meanwhileOrdinal,
      meanwhilePersonIds
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
    const yearAxis = mount.querySelector(".spacetime-year-axis");
    yearAxis?.addEventListener("click", (event) => {
      const rect = yearAxis.getBoundingClientRect();
      const year = projection.historicalYearForScreenY(event.clientY - rect.top);
      if (year != null) setMeanwhileYear(mount, year);
    });
    mount.querySelector("#spacetimeMeanwhileClear")?.addEventListener("click", () => clearMeanwhile(mount));
    mount.querySelectorAll("[data-spacetime-meanwhile-person]").forEach((button) => button.addEventListener("click", () => selectPerson(mount, button.dataset.spacetimeMeanwhilePerson, { focus: true })));
    mount.querySelector("#spacetimeCameraZoomOut")?.addEventListener("click", () => requestCameraZoom(mount, cameraZoom / CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeCameraZoomIn")?.addEventListener("click", () => requestCameraZoom(mount, cameraZoom * CAMERA_ZOOM_STEP));
    mount.querySelector("#spacetimeCameraZoomReset")?.addEventListener("click", () => requestCameraZoom(mount, CAMERA_MIN_ZOOM));
    mount.querySelectorAll("[data-spacetime-search-result]").forEach((button) => button.addEventListener("click", () => selectPerson(mount, button.dataset.spacetimeSearchResult, { focus: true })));
    mount.querySelectorAll("[data-spacetime-inspector-activity]").forEach((button) => button.addEventListener("click", () => selectActivity(mount, selectedPersonId, button.dataset.spacetimeInspectorActivity, { focus: false })));
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
    mount.querySelector("#spacetimeDetailPerson")?.addEventListener("click", () => selectPerson(mount, selectedPersonId, { focus: true, detail: true, preserveActivity: true }));
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