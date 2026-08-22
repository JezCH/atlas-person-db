((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-model.js")
    : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const cameraApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-camera-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_CAMERA_V2;
  const api = factory(modelApi, cameraApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_TIME_SCALE_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi, cameraApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  if (!cameraApi) throw new Error("ATLAS_PERSON_SPACETIME_CAMERA_V2 is required");

  const DEFAULT_SOFTENING_YEARS = 420;
  const DEFAULT_LINEAR_BLEND_START_ZOOM = 2;
  const DEFAULT_LINEAR_BLEND_FULL_ZOOM = 16;
  const DEFAULT_MIN_TICK_GAP = 42;
  const TIME_WORLD_BOUNDS = Object.freeze({ minTime: 0, maxTime: 1, minSpace: 0, maxSpace: 1 });
  const NICE_TICK_INTERVALS = Object.freeze([1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000]);
  const EPSILON = 1e-9;

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
  }

  function positive(value, label) {
    const number = finite(value, label);
    if (number <= 0) throw new RangeError(`${label} must be > 0`);
    return number;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep01(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function normalizeBlendOptions(options = {}) {
    const startZoom = positive(options.linearBlendStartZoom ?? DEFAULT_LINEAR_BLEND_START_ZOOM, "linearBlendStartZoom");
    const fullZoom = positive(options.linearBlendFullZoom ?? DEFAULT_LINEAR_BLEND_FULL_ZOOM, "linearBlendFullZoom");
    if (!(fullZoom > startZoom)) throw new RangeError("linearBlendFullZoom must be greater than linearBlendStartZoom");
    return Object.freeze({ startZoom, fullZoom });
  }

  function linearBlendForZoom(zoom, options = {}) {
    const value = positive(zoom, "zoom");
    const { startZoom, fullZoom } = normalizeBlendOptions(options);
    if (value <= startZoom) return 0;
    if (value >= fullZoom) return 1;
    const logStart = Math.log(startZoom);
    const logFull = Math.log(fullZoom);
    return smoothstep01((Math.log(value) - logStart) / (logFull - logStart));
  }

  function createSemanticTimeScale(startYear, endYear, options = {}) {
    const startOrdinal = modelApi.historicalYearToOrdinal(startYear);
    const endOrdinal = modelApi.historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal >= endOrdinal) throw new Error("INVALID_TIMELINE_RANGE");
    const softness = positive(options.softeningYears ?? DEFAULT_SOFTENING_YEARS, "softeningYears");
    const span = endOrdinal - startOrdinal;
    const denominator = Math.log1p(span / softness);

    function baseForOrdinal(ordinal) {
      const raw = finite(ordinal, "ordinal");
      const bounded = clamp(raw, startOrdinal, endOrdinal);
      const age = endOrdinal - bounded;
      return 1 - Math.log1p(age / softness) / denominator;
    }

    function ordinalForBase(base) {
      const bounded = clamp(finite(base, "base"), 0, 1);
      const age = softness * Math.expm1((1 - bounded) * denominator);
      return clamp(endOrdinal - age, startOrdinal, endOrdinal);
    }

    function baseForYear(year) {
      const ordinal = modelApi.historicalYearToOrdinal(year);
      return ordinal == null ? null : baseForOrdinal(ordinal);
    }

    function nearestHistoricalYearForOrdinal(ordinal) {
      const bounded = clamp(finite(ordinal, "ordinal"), startOrdinal, endOrdinal);
      return modelApi.ordinalToHistoricalYear(Math.round(bounded));
    }

    return Object.freeze({
      mode: "semantic_log_to_local_linear",
      start_year: startYear,
      end_year: endYear,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      softening_years: softness,
      baseForOrdinal,
      ordinalForBase,
      baseForYear,
      nearestHistoricalYearForOrdinal
    });
  }

  function createTimeProjection(scale, cameraInput, viewportInput, options = {}) {
    if (!scale?.baseForOrdinal || !scale?.ordinalForBase) throw new TypeError("semantic time scale is required");
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const camera = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const visible = cameraApi.visibleWorld(camera, TIME_WORLD_BOUNDS);
    const minBase = visible.minTime;
    const maxBase = visible.maxTime;
    const minOrdinal = scale.ordinalForBase(minBase);
    const maxOrdinal = scale.ordinalForBase(maxBase);
    const baseSpan = maxBase - minBase;
    const ordinalSpan = maxOrdinal - minOrdinal;
    const blend = linearBlendForZoom(camera.zoomTime, options);

    function normalizedForOrdinal(ordinal) {
      const value = finite(ordinal, "ordinal");
      const globalPosition = (scale.baseForOrdinal(value) - minBase) / baseSpan;
      const localPosition = ordinalSpan > EPSILON ? (value - minOrdinal) / ordinalSpan : globalPosition;
      return globalPosition * (1 - blend) + localPosition * blend;
    }

    function yForOrdinal(ordinal) {
      return normalizedForOrdinal(ordinal) * viewport.height;
    }

    function yForYear(year) {
      const ordinal = modelApi.historicalYearToOrdinal(year);
      return ordinal == null ? null : yForOrdinal(ordinal);
    }

    function ordinalAtY(y) {
      const target = finite(y, "y") / viewport.height;
      let low = scale.start_ordinal;
      let high = scale.end_ordinal;
      for (let index = 0; index < 64; index += 1) {
        const mid = (low + high) / 2;
        if (normalizedForOrdinal(mid) < target) low = mid;
        else high = mid;
      }
      return (low + high) / 2;
    }

    function historicalYearAtY(y) {
      return scale.nearestHistoricalYearForOrdinal(ordinalAtY(y));
    }

    function pixelsPerYearAtOrdinal(ordinal) {
      const value = clamp(finite(ordinal, "ordinal"), scale.start_ordinal, scale.end_ordinal);
      const low = Math.max(scale.start_ordinal, value - 0.5);
      const high = Math.min(scale.end_ordinal, value + 0.5);
      if (high <= low) return 0;
      return Math.abs(yForOrdinal(high) - yForOrdinal(low)) / (high - low);
    }

    return Object.freeze({
      camera,
      viewport,
      blend,
      visible_base: Object.freeze({ min: minBase, max: maxBase }),
      visible_ordinals: Object.freeze({ min: minOrdinal, max: maxOrdinal }),
      normalizedForOrdinal,
      yForOrdinal,
      yForYear,
      ordinalAtY,
      historicalYearAtY,
      pixelsPerYearAtOrdinal
    });
  }

  function cameraForHistoricalRange(scale, startYear, endYear, options = {}) {
    const start = scale.baseForYear(startYear);
    const end = scale.baseForYear(endYear);
    if (start == null || end == null || !(end > start)) throw new Error("INVALID_HISTORICAL_CAMERA_RANGE");
    const padding = Math.max(1, positive(options.padding ?? 1, "padding"));
    const requestedSpan = Math.min(1, (end - start) * padding);
    const zoomTime = 1 / requestedSpan;
    const centerTime = (start + end) / 2;
    return cameraApi.createCamera(TIME_WORLD_BOUNDS, {
      ...options,
      centerTime,
      centerSpace: options.centerSpace ?? 0.5,
      zoomTime,
      zoomSpace: options.zoomSpace ?? 1
    });
  }

  function recenterHistoricalAnchor(cameraInput, scale, viewportInput, anchorOrdinal, targetY, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const camera = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const visibleSpan = 1 / camera.zoomTime;
    if (visibleSpan >= 1 - EPSILON) return camera;
    const half = visibleSpan / 2;
    let low = half;
    let high = 1 - half;
    const target = finite(targetY, "targetY");

    function errorForCenter(centerTime) {
      const candidate = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...camera, centerTime });
      return createTimeProjection(scale, candidate, viewport, options).yForOrdinal(anchorOrdinal) - target;
    }

    const lowError = errorForCenter(low);
    const highError = errorForCenter(high);
    if (Math.abs(lowError) <= EPSILON) return cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...camera, centerTime: low });
    if (Math.abs(highError) <= EPSILON) return cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...camera, centerTime: high });
    if (lowError * highError > 0) {
      const centerTime = Math.abs(lowError) <= Math.abs(highError) ? low : high;
      return cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...camera, centerTime });
    }

    for (let index = 0; index < 56; index += 1) {
      const mid = (low + high) / 2;
      const error = errorForCenter(mid);
      if (error > 0) low = mid;
      else high = mid;
    }
    return cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...camera, centerTime: (low + high) / 2 });
  }

  function zoomTimeAt(cameraInput, scale, viewportInput, y, factor, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const current = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const anchorOrdinal = createTimeProjection(scale, current, viewport, options).ordinalAtY(y);
    const target = cameraApi.createCamera(TIME_WORLD_BOUNDS, {
      ...options,
      ...current,
      zoomTime: current.zoomTime * positive(factor, "zoom factor time")
    });
    if (Math.abs(target.zoomTime - current.zoomTime) <= EPSILON) return current;
    return recenterHistoricalAnchor(target, scale, viewport, anchorOrdinal, y, options);
  }

  function panTimeByPixels(cameraInput, scale, viewportInput, deltaY, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const current = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const projection = createTimeProjection(scale, current, viewport, options);
    const anchorY = viewport.height / 2;
    const anchorOrdinal = projection.ordinalAtY(anchorY);
    return recenterHistoricalAnchor(current, scale, viewport, anchorOrdinal, anchorY + finite(deltaY, "deltaY"), options);
  }

  function zoomCameraAt(cameraInput, scale, viewportInput, screenPoint, factors = {}, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const point = Object.freeze({ x: finite(screenPoint?.x, "screenPoint.x"), y: finite(screenPoint?.y, "screenPoint.y") });
    const spaceFactor = positive(factors.space ?? factors.uniform ?? 1, "zoom factor space");
    const timeFactor = positive(factors.time ?? factors.uniform ?? 1, "zoom factor time");
    let next = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    if (Math.abs(spaceFactor - 1) > EPSILON) {
      next = cameraApi.zoomAt(next, TIME_WORLD_BOUNDS, viewport, point, { time: 1, space: spaceFactor }, options);
    }
    if (Math.abs(timeFactor - 1) > EPSILON) next = zoomTimeAt(next, scale, viewport, point.y, timeFactor, options);
    return next;
  }

  function panCameraByPixels(cameraInput, scale, viewportInput, delta = {}, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const dx = finite(delta?.x ?? 0, "delta.x");
    const dy = finite(delta?.y ?? 0, "delta.y");
    let next = cameraApi.createCamera(TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    if (Math.abs(dx) > EPSILON) next = cameraApi.panByPixels(next, TIME_WORLD_BOUNDS, viewport, { x: dx, y: 0 }, options);
    if (Math.abs(dy) > EPSILON) next = panTimeByPixels(next, scale, viewport, dy, options);
    return next;
  }

  function chooseTickInterval(pixelsPerYear, minPixelGap = DEFAULT_MIN_TICK_GAP) {
    const density = Math.max(EPSILON, finite(pixelsPerYear, "pixelsPerYear"));
    const gap = positive(minPixelGap, "minPixelGap");
    const requiredYears = gap / density;
    return NICE_TICK_INTERVALS.find((interval) => interval + EPSILON >= requiredYears) ?? NICE_TICK_INTERVALS[NICE_TICK_INTERVALS.length - 1];
  }

  function alignedHistoricalYear(year, interval) {
    return Number.isInteger(year) && year !== 0 && (interval === 1 || Math.abs(year) % interval === 0);
  }

  function buildAdaptiveTimeTicks(scale, cameraInput, viewportInput, options = {}) {
    const projection = createTimeProjection(scale, cameraInput, viewportInput, options);
    const minPixelGap = positive(options.minPixelGap ?? DEFAULT_MIN_TICK_GAP, "minPixelGap");
    const firstOrdinal = Math.max(scale.start_ordinal, Math.ceil(projection.visible_ordinals.min - EPSILON));
    const lastOrdinal = Math.min(scale.end_ordinal, Math.floor(projection.visible_ordinals.max + EPSILON));
    const candidates = [];

    for (let ordinal = firstOrdinal; ordinal <= lastOrdinal; ordinal += 1) {
      const year = modelApi.ordinalToHistoricalYear(ordinal);
      if (!Number.isInteger(year) || year === 0) continue;
      const pixelsPerYear = projection.pixelsPerYearAtOrdinal(ordinal);
      const interval = chooseTickInterval(pixelsPerYear, minPixelGap);
      const eraBoundary = year === 1;
      if (!eraBoundary && !alignedHistoricalYear(year, interval)) continue;
      candidates.push({
        year,
        ordinal,
        interval_years: interval,
        y: projection.yForOrdinal(ordinal),
        priority: eraBoundary ? Number.POSITIVE_INFINITY : interval,
        era_boundary: eraBoundary
      });
    }

    for (const year of [scale.start_year, scale.end_year]) {
      const ordinal = modelApi.historicalYearToOrdinal(year);
      if (ordinal == null || ordinal < firstOrdinal || ordinal > lastOrdinal) continue;
      candidates.push({
        year,
        ordinal,
        interval_years: 0,
        y: projection.yForOrdinal(ordinal),
        priority: Number.POSITIVE_INFINITY,
        terminal: true
      });
    }

    const deduped = new Map();
    for (const candidate of candidates) {
      const current = deduped.get(candidate.year);
      if (!current || candidate.priority > current.priority) deduped.set(candidate.year, candidate);
    }

    const accepted = [];
    const ranked = [...deduped.values()].sort((left, right) => right.priority - left.priority || left.y - right.y || left.ordinal - right.ordinal);
    for (const candidate of ranked) {
      if (accepted.some((item) => Math.abs(item.y - candidate.y) < minPixelGap - EPSILON)) continue;
      accepted.push(candidate);
    }

    return Object.freeze(accepted
      .sort((left, right) => left.y - right.y || left.ordinal - right.ordinal)
      .map((candidate) => Object.freeze({
        year: candidate.year,
        ordinal: candidate.ordinal,
        label: modelApi.yearLabel(candidate.year),
        y: candidate.y,
        interval_years: candidate.interval_years,
        era_boundary: Boolean(candidate.era_boundary),
        terminal: Boolean(candidate.terminal)
      })));
  }

  return Object.freeze({
    DEFAULT_SOFTENING_YEARS,
    DEFAULT_LINEAR_BLEND_START_ZOOM,
    DEFAULT_LINEAR_BLEND_FULL_ZOOM,
    DEFAULT_MIN_TICK_GAP,
    TIME_WORLD_BOUNDS,
    NICE_TICK_INTERVALS,
    linearBlendForZoom,
    createSemanticTimeScale,
    createTimeProjection,
    cameraForHistoricalRange,
    recenterHistoricalAnchor,
    zoomTimeAt,
    panTimeByPixels,
    zoomCameraAt,
    panCameraByPixels,
    chooseTickInterval,
    buildAdaptiveTimeTicks
  });
});