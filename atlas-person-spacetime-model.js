((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_MODEL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const REGION_DEFINITIONS = Object.freeze([
    Object.freeze({ code: "americas", label: "아메리카" }),
    Object.freeze({ code: "europe", label: "유럽" }),
    Object.freeze({ code: "africa", label: "아프리카" }),
    Object.freeze({ code: "west-asia", label: "서아시아" }),
    Object.freeze({ code: "south-asia", label: "남아시아" }),
    Object.freeze({ code: "central-asia", label: "중앙아시아" }),
    Object.freeze({ code: "southeast-asia", label: "동남아시아" }),
    Object.freeze({ code: "oceania", label: "오세아니아" }),
    Object.freeze({ code: "east-asia", label: "동아시아" })
  ]);
  const REGION_CODES = new Set(REGION_DEFINITIONS.map((item) => item.code));
  const ALLOWED_CONFIDENCE = new Set(["well_established", "likely", "speculative", "disputed", "unknown"]);
  const PLACEMENT_BASES = new Set(["polity_geography", "polity_place_function"]);
  const PLACE_FUNCTION_TYPES = new Set(["capital", "royal_court", "royal_residence", "imperial_court_core", "political_center", "administrative_center"]);
  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v2";

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function historicalYearToOrdinal(year) {
    if (!Number.isInteger(year) || year === 0) return null;
    return year < 0 ? year : year - 1;
  }

  function ordinalToHistoricalYear(ordinal) {
    if (!Number.isInteger(ordinal)) return null;
    return ordinal < 0 ? ordinal : ordinal + 1;
  }

  function yearLabel(year) {
    if (!Number.isInteger(year) || year === 0) return "연도 미상";
    return year < 0 ? `BC ${Math.abs(year)}` : `AD ${year}`;
  }

  function normalizeInterval(startYear, endYear) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null && endOrdinal == null) return null;
    if (startOrdinal == null) {
      return Object.freeze({ start_year: null, end_year: endYear, start_ordinal: null, end_ordinal: endOrdinal, partial: true });
    }
    if (endOrdinal == null) {
      return Object.freeze({ start_year: startYear, end_year: null, start_ordinal: startOrdinal, end_ordinal: null, partial: true });
    }
    if (startOrdinal <= endOrdinal) {
      return Object.freeze({ start_year: startYear, end_year: endYear, start_ordinal: startOrdinal, end_ordinal: endOrdinal, partial: false });
    }
    return Object.freeze({ start_year: endYear, end_year: startYear, start_ordinal: endOrdinal, end_ordinal: startOrdinal, partial: false, reversed_input: true });
  }

  function boundaryYear(boundary) {
    return Number.isInteger(boundary?.year) && boundary.year !== 0 ? boundary.year : null;
  }

  function activityInterval(activity) {
    return normalizeInterval(boundaryYear(activity?.start), boundaryYear(activity?.end));
  }

  function validatePlaceFunction(fn, polityId, recordIndex, functionIndex) {
    const regionCode = text(fn?.region_code);
    const startYear = fn?.start_year == null ? null : Number(fn.start_year);
    const endYear = fn?.end_year == null ? null : Number(fn.end_year);
    const errors = [];
    if (!REGION_CODES.has(regionCode)) errors.push(`invalid region_code: ${regionCode || "(empty)"}`);
    if (!text(fn?.place_name)) errors.push("place_name is required");
    const functionType = text(fn?.function_type);
    if (!PLACE_FUNCTION_TYPES.has(functionType)) errors.push(`invalid function_type: ${functionType || "(empty)"}`);
    if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) errors.push("start_year must be a historical integer year or null");
    if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) errors.push("end_year must be a historical integer year or null");
    if (startYear != null && endYear != null && normalizeInterval(startYear, endYear)?.reversed_input) errors.push("start_year must not be after end_year");
    const sourceRefs = Array.isArray(fn?.source_refs) ? fn.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(fn?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(`invalid confidence: ${regionCode || "(empty)"}`);
    return errors.map((message) => `place_function_records[] polity  function : ${regionCode || "(empty)"}`);
  }

  function validateSpatialIndex(value) {
    const errors = [];
    if (!value || typeof value !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["spatial index must be an object"]) });
    if (value.schema !== SPATIAL_INDEX_SCHEMA) errors.push(`schema must be ${SPATIAL_INDEX_SCHEMA}`);
    if (!value.polity_geography || typeof value.polity_geography !== "object" || Array.isArray(value.polity_geography)) errors.push("polity_geography must be an object");
    if (!Array.isArray(value.place_function_records)) errors.push("place_function_records must be an array");
    if (Object.prototype.hasOwnProperty.call(value, "capital_records")) errors.push("capital_records is obsolete in v2");
    if (Object.prototype.hasOwnProperty.call(value, "authority_center_records")) errors.push("authority_center_records is obsolete in v2");
    if (value.review_queue != null && !Array.isArray(value.review_queue)) errors.push("review_queue must be an array when present");

    const resolved = new Set();
    for (const [polityId, rawRegionCode] of Object.entries(value.polity_geography || {})) {
      const id = text(polityId);
      const regionCode = text(rawRegionCode);
      if (!id) errors.push("polity_geography contains an empty polity_id");
      if (!REGION_CODES.has(regionCode)) errors.push(`polity_geography polity : invalid region_code ${regionCode || "(empty)"}`);
      if (id) resolved.add(id);
    }

    for (const [recordIndex, record] of (Array.isArray(value.place_function_records) ? value.place_function_records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`place_function_records[]: polity_id is required${regionCode || "(empty)"}`);
      if (resolved.has(polityId)) errors.push(`place_function_records[]: polity_id  is already resolved by polity_geography${regionCode || "(empty)"}`);
      if (polityId) resolved.add(polityId);
      if (!Array.isArray(record?.functions) || !record.functions.length) {
        errors.push(`place_function_records[] polity : functions must be a non-empty array${regionCode || "(empty)"}`);
      } else {
        for (const [functionIndex, fn] of record.functions.entries()) errors.push(...validatePlaceFunction(fn, polityId, recordIndex, functionIndex));
      }
    }

    const reviewSeen = new Set();
    for (const [index, record] of (Array.isArray(value.review_queue) ? value.review_queue : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`review_queue[]: polity_id is required${regionCode || "(empty)"}`);
      if (resolved.has(polityId)) errors.push(`review_queue[]: polity_id  is already resolved${regionCode || "(empty)"}`);
      if (reviewSeen.has(polityId)) errors.push(`review_queue[]: duplicate polity_id ${regionCode || "(empty)"}`);
      if (polityId) reviewSeen.add(polityId);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createSpatialLookup(index) {
    const validation = validateSpatialIndex(index);
    if (!validation.valid) {
      const error = new Error(`INVALID_SPATIAL_INDEX: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_SPATIAL_INDEX";
      error.details = validation.errors;
      throw error;
    }
    const lookup = new Map();
    for (const [polityId, regionCode] of Object.entries(index.polity_geography || {})) {
      lookup.set(text(polityId), Object.freeze({ placement_basis: "polity_geography", region_code: text(regionCode) }));
    }
    for (const record of index.place_function_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "polity_place_function", functions: Object.freeze(record.functions.slice()) }));
    }
    return lookup;
  }

  function functionOrdinals(fn) {
    const startOrdinal = fn.start_year == null ? Number.NEGATIVE_INFINITY : historicalYearToOrdinal(Number(fn.start_year));
    const endOrdinal = fn.end_year == null ? Number.POSITIVE_INFINITY : historicalYearToOrdinal(Number(fn.end_year));
    return { startOrdinal, endOrdinal };
  }

  const FUNCTION_PRIORITY = Object.freeze({ capital: 0, royal_court: 1, royal_residence: 2, imperial_court_core: 3, political_center: 4, administrative_center: 5 });

  function activePlaceFunctions(functions, startOrdinal, endOrdinal) {
    return functions.filter((fn) => {
      const bounds = functionOrdinals(fn);
      return bounds.startOrdinal <= startOrdinal && bounds.endOrdinal >= endOrdinal;
    });
  }

  function compiledFunctionLabel(active) {
    return active
      .slice()
      .sort((a, b) => (FUNCTION_PRIORITY[text(a.function_type)] ?? 99) - (FUNCTION_PRIORITY[text(b.function_type)] ?? 99) || text(a.place_name).localeCompare(text(b.place_name)))[0] || null;
  }

  function resolvePlaceFunctionPlacement(activityId, polityId, interval, functions) {
    const activityStart = interval.start_ordinal;
    const activityEnd = interval.end_ordinal;
    const cutPoints = new Set([activityStart, activityEnd + 1]);
    for (const fn of functions) {
      const bounds = functionOrdinals(fn);
      if (Number.isFinite(bounds.startOrdinal) && bounds.startOrdinal > activityStart && bounds.startOrdinal <= activityEnd) cutPoints.add(bounds.startOrdinal);
      if (Number.isFinite(bounds.endOrdinal) && bounds.endOrdinal >= activityStart && bounds.endOrdinal < activityEnd) cutPoints.add(bounds.endOrdinal + 1);
    }
    const points = [...cutPoints].sort((a, b) => a - b);
    const segments = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1] - 1;
      if (segmentStart > activityEnd || segmentEnd < activityStart) continue;
      const active = activePlaceFunctions(functions, segmentStart, segmentEnd);
      if (!active.length) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "place_function_period_gap", segments: Object.freeze([]) });
      const regions = [...new Set(active.map((fn) => text(fn.region_code)).filter(Boolean))];
      if (regions.length !== 1) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "place_function_region_conflict", segments: Object.freeze([]) });
      const representative = compiledFunctionLabel(active);
      segments.push(Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: regions[0],
        placement_basis: "polity_place_function",
        location_label: text(representative?.place_name),
        place_function_type: text(representative?.function_type),
        place_name: text(representative?.place_name),
        place_id: text(representative?.place_id) || null,
        active_place_functions: Object.freeze(active.map((fn) => Object.freeze({ function_type: text(fn.function_type), place_name: text(fn.place_name), place_id: text(fn.place_id) || null, region_code: text(fn.region_code) }))),
        confidence: text(representative?.confidence),
        source_refs: Object.freeze([...new Set(active.flatMap((fn) => Array.isArray(fn.source_refs) ? fn.source_refs.map(text).filter(Boolean) : []))]),
        start_year: ordinalToHistoricalYear(segmentStart),
        end_year: ordinalToHistoricalYear(segmentEnd),
        partial_activity_interval: false
      }));
    }
    if (!segments.length) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "place_function_period_gap", segments: Object.freeze([]) });
    return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "placed", segments: Object.freeze(segments) });
  }

  function resolveActivityPlacement(activity, spatialLookup) {
    const activityId = text(activity?.id);
    const polityId = text(activity?.polity?.id);
    const interval = activityInterval(activity);
    if (!interval) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "missing_boundaries", segments: Object.freeze([]) });
    if (interval.partial) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "incomplete_boundary", segments: Object.freeze([]) });
    if (interval.reversed_input) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "reversed_boundaries", segments: Object.freeze([]) });
    if (!polityId) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "polity_unresolved", segments: Object.freeze([]) });

    const record = spatialLookup instanceof Map ? spatialLookup.get(polityId) : null;
    if (!record) return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "spatial_unresolved", segments: Object.freeze([]) });

    if (record.placement_basis === "polity_geography") {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "placed", segments: Object.freeze([Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: text(record.region_code),
        placement_basis: "polity_geography",
        location_label: "정치체 권역",
        place_function_type: null,
        place_name: null,
        place_id: null,
        active_place_functions: Object.freeze([]),
        confidence: "reviewed",
        source_refs: Object.freeze([]),
        start_year: interval.start_year,
        end_year: interval.end_year,
        partial_activity_interval: false
      })]) });
    }

    return resolvePlaceFunctionPlacement(activityId, polityId, interval, record.functions || []);
  }

  function roundOlderToCentury(year) {
    if (!Number.isInteger(year) || year === 0) return -3000;
    if (year < 0) return -Math.ceil(Math.abs(year) / 100) * 100;
    const rounded = Math.floor((year - 1) / 100) * 100 + 1;
    return rounded === 0 ? 1 : rounded;
  }

  function deriveTimelineRange(activities, currentYear) {
    const now = Number.isInteger(currentYear) && currentYear > 0 ? currentYear : new Date().getFullYear();
    const knownYears = [];
    for (const activity of activities || []) {
      const start = boundaryYear(activity?.start);
      const end = boundaryYear(activity?.end);
      if (start != null) knownYears.push(start);
      if (end != null) knownYears.push(end);
    }
    const oldest = knownYears.length ? knownYears.reduce((minimum, year) => {
      const ordinal = historicalYearToOrdinal(year);
      return ordinal < historicalYearToOrdinal(minimum) ? year : minimum;
    }) : -3000;
    const startYear = historicalYearToOrdinal(oldest) < historicalYearToOrdinal(-3000) ? roundOlderToCentury(oldest) : -3000;
    return Object.freeze({ start_year: startYear, end_year: now });
  }

  function createLogTimelineScale(startYear, endYear, height = 2800, softeningYears = 180) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal >= endOrdinal) throw new Error("INVALID_TIMELINE_RANGE");
    const safeHeight = Number.isFinite(Number(height)) && Number(height) > 0 ? Number(height) : 2800;
    const softness = Number.isFinite(Number(softeningYears)) && Number(softeningYears) > 0 ? Number(softeningYears) : 180;
    const span = endOrdinal - startOrdinal;
    const denominator = Math.log1p(span / softness);

    function yForOrdinal(ordinal) {
      if (!Number.isFinite(Number(ordinal))) return null;
      const clamped = Math.min(endOrdinal, Math.max(startOrdinal, Number(ordinal)));
      const age = endOrdinal - clamped;
      return safeHeight * (1 - Math.log1p(age / softness) / denominator);
    }

    function yForYear(year) {
      const ordinal = historicalYearToOrdinal(year);
      return ordinal == null ? null : yForOrdinal(ordinal);
    }

    return Object.freeze({
      mode: "log_age",
      start_year: startYear,
      end_year: endYear,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      height: safeHeight,
      softening_years: softness,
      yForOrdinal,
      yForYear
    });
  }

  function adaptiveTickInterval(ageYears) {
    if (ageYears > 3500) return 1000;
    if (ageYears > 2200) return 500;
    if (ageYears > 1200) return 250;
    if (ageYears > 500) return 100;
    if (ageYears > 180) return 50;
    if (ageYears > 70) return 25;
    return 10;
  }

  function alignedHistoricalYear(year, interval) {
    if (!Number.isInteger(year) || year === 0) return false;
    return Math.abs(year) % interval === 0;
  }

  function buildAdaptiveTimeTicks(startYear, endYear, scale, minPixelGap = 24) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal || !scale?.yForYear) return Object.freeze([]);
    const candidates = new Map();
    const add = (year, intervalYears, terminal = false) => {
      if (!Number.isInteger(year) || year === 0) return;
      candidates.set(year, { year, interval_years: intervalYears, terminal });
    };
    add(startYear, adaptiveTickInterval(endOrdinal - startOrdinal), false);
    for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
      const year = ordinalToHistoricalYear(ordinal);
      const age = endOrdinal - ordinal;
      const interval = adaptiveTickInterval(age);
      if (alignedHistoricalYear(year, interval)) add(year, interval, false);
    }
    add(endYear, 0, true);
    const sorted = [...candidates.values()].sort((left, right) => historicalYearToOrdinal(left.year) - historicalYearToOrdinal(right.year));
    const ticks = [];
    let lastY = Number.NEGATIVE_INFINITY;
    for (const candidate of sorted) {
      const y = scale.yForYear(candidate.year);
      if (!Number.isFinite(y)) continue;
      const isBoundary = candidate.year === startYear || candidate.year === endYear;
      if (!isBoundary && y - lastY < minPixelGap) continue;
      ticks.push(Object.freeze({ ...candidate, ordinal: historicalYearToOrdinal(candidate.year), label: yearLabel(candidate.year), y }));
      lastY = y;
    }
    return Object.freeze(ticks);
  }

  function buildCenturyTicks(startYear, endYear) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal) return Object.freeze([]);

    const years = [];
    if (startYear < 0) {
      const firstBce = Math.ceil(startYear / 100) * 100;
      const lastBce = Math.min(endYear, -1);
      for (let year = firstBce; year <= lastBce; year += 100) if (year !== 0) years.push(year);
    }
    if (startOrdinal <= 0 && endOrdinal >= 0) years.push(1);
    if (endYear > 0) {
      const firstCe = Math.max(100, Math.ceil(Math.max(startYear, 1) / 100) * 100);
      for (let year = firstCe; year <= endYear; year += 100) years.push(year);
    }

    const uniqueYears = [...new Set(years)].sort((left, right) => historicalYearToOrdinal(left) - historicalYearToOrdinal(right));
    const ticks = uniqueYears.map((year) => Object.freeze({ year, ordinal: historicalYearToOrdinal(year), label: yearLabel(year) }));
    if (!ticks.length || ticks[ticks.length - 1].year !== endYear) {
      ticks.push(Object.freeze({ year: endYear, ordinal: endOrdinal, label: yearLabel(endYear), terminal: true }));
    }
    return Object.freeze(ticks);
  }

  function assignLanes(items, minimumGap = 6) {
    const sorted = (items || []).slice().sort((left, right) => {
      const leftTop = Number(left.visual_top ?? left.top ?? 0);
      const rightTop = Number(right.visual_top ?? right.top ?? 0);
      const leftBottom = Number(left.visual_bottom ?? left.bottom ?? leftTop);
      const rightBottom = Number(right.visual_bottom ?? right.bottom ?? rightTop);
      return leftTop - rightTop || leftBottom - rightBottom || text(left.stable_id).localeCompare(text(right.stable_id));
    });
    const laneEnds = [];
    return Object.freeze(sorted.map((item) => {
      const top = Number(item.visual_top ?? item.top ?? 0);
      const bottom = Number(item.visual_bottom ?? item.bottom ?? top);
      let lane = laneEnds.findIndex((end) => top >= end + minimumGap);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(bottom);
      } else {
        laneEnds[lane] = bottom;
      }
      return Object.freeze({ ...item, lane });
    }));
  }

  return Object.freeze({
    SPATIAL_INDEX_SCHEMA,
    REGION_DEFINITIONS,
    historicalYearToOrdinal,
    ordinalToHistoricalYear,
    yearLabel,
    normalizeInterval,
    activityInterval,
    validateSpatialIndex,
    createSpatialLookup,
    resolveActivityPlacement,
    deriveTimelineRange,
    buildCenturyTicks,
    createLogTimelineScale,
    buildAdaptiveTimeTicks,
    assignLanes
  });
});
