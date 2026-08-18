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
  const PLACEMENT_BASES = new Set(["polity_geography", "capital", "authority_center"]);
  const AUTHORITY_CENTER_TYPES = new Set(["imperial_court_core", "royal_court", "political_center"]);
  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v1";

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

  function validateCapitalPeriod(period, polityId, index) {
    const regionCode = text(period?.region_code);
    const startYear = period?.start_year == null ? null : Number(period.start_year);
    const endYear = period?.end_year == null ? null : Number(period.end_year);
    const errors = [];
    if (!REGION_CODES.has(regionCode)) errors.push(`invalid region_code: ${regionCode || "(empty)"}`);
    if (!text(period?.capital_name)) errors.push("capital_name is required");
    if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) errors.push("start_year must be a historical integer year or null");
    if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) errors.push("end_year must be a historical integer year or null");
    if (startYear != null && endYear != null && normalizeInterval(startYear, endYear)?.reversed_input) {
      errors.push("start_year must not be after end_year");
    }
    const sourceRefs = Array.isArray(period?.source_refs) ? period.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(period?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(`invalid confidence: ${confidence || "(empty)"}`);
    return errors.map((message) => `records[${index}] polity ${polityId}: ${message}`);
  }

  function validateAuthorityCenterPeriod(period, polityId, index) {
    const regionCode = text(period?.region_code);
    const startYear = period?.start_year == null ? null : Number(period.start_year);
    const endYear = period?.end_year == null ? null : Number(period.end_year);
    const errors = [];
    if (!REGION_CODES.has(regionCode)) errors.push(`invalid region_code: ${regionCode || "(empty)"}`);
    if (!text(period?.center_name)) errors.push("center_name is required");
    const centerType = text(period?.center_type);
    if (!AUTHORITY_CENTER_TYPES.has(centerType)) errors.push(`invalid center_type: ${centerType || "(empty)"}`);
    if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) errors.push("start_year must be a historical integer year or null");
    if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) errors.push("end_year must be a historical integer year or null");
    if (startYear != null && endYear != null && normalizeInterval(startYear, endYear)?.reversed_input) errors.push("start_year must not be after end_year");
    const sourceRefs = Array.isArray(period?.source_refs) ? period.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(period?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(`invalid confidence: ${confidence || "(empty)"}`);
    return errors.map((message) => `authority_center_records[${index}] polity ${polityId}: ${message}`);
  }

  function validateSpatialIndex(value) {
    const errors = [];
    if (!value || typeof value !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["spatial index must be an object"]) });
    if (value.schema !== SPATIAL_INDEX_SCHEMA) errors.push(`schema must be ${SPATIAL_INDEX_SCHEMA}`);
    if (!value.polity_geography || typeof value.polity_geography !== "object" || Array.isArray(value.polity_geography)) errors.push("polity_geography must be an object");
    if (!Array.isArray(value.capital_records)) errors.push("capital_records must be an array");
    if (value.authority_center_records != null && !Array.isArray(value.authority_center_records)) errors.push("authority_center_records must be an array when present");
    if (value.review_queue != null && !Array.isArray(value.review_queue)) errors.push("review_queue must be an array when present");

    const resolved = new Set();
    for (const [polityId, rawRegionCode] of Object.entries(value.polity_geography || {})) {
      const id = text(polityId);
      const regionCode = text(rawRegionCode);
      if (!id) errors.push("polity_geography contains an empty polity_id");
      if (!REGION_CODES.has(regionCode)) errors.push(`polity_geography polity ${id}: invalid region_code ${regionCode || "(empty)"}`);
      if (id) resolved.add(id);
    }

    for (const [index, record] of (Array.isArray(value.capital_records) ? value.capital_records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`capital_records[${index}]: polity_id is required`);
      if (resolved.has(polityId)) errors.push(`capital_records[${index}]: polity_id ${polityId} is already resolved by polity_geography`);
      if (polityId) resolved.add(polityId);
      if (!Array.isArray(record?.capital_periods) || !record.capital_periods.length) {
        errors.push(`capital_records[${index}] polity ${polityId}: capital_periods must be a non-empty array`);
      } else {
        for (const period of record.capital_periods) errors.push(...validateCapitalPeriod(period, polityId, index));
      }
    }

    for (const [index, record] of (Array.isArray(value.authority_center_records) ? value.authority_center_records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`authority_center_records[${index}]: polity_id is required`);
      if (resolved.has(polityId)) errors.push(`authority_center_records[${index}]: polity_id ${polityId} is already resolved`);
      if (polityId) resolved.add(polityId);
      if (!Array.isArray(record?.authority_periods) || !record.authority_periods.length) {
        errors.push(`authority_center_records[${index}] polity ${polityId}: authority_periods must be a non-empty array`);
      } else {
        for (const period of record.authority_periods) errors.push(...validateAuthorityCenterPeriod(period, polityId, index));
      }
    }

    const reviewSeen = new Set();
    for (const [index, record] of (Array.isArray(value.review_queue) ? value.review_queue : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`review_queue[${index}]: polity_id is required`);
      if (resolved.has(polityId)) errors.push(`review_queue[${index}]: polity_id ${polityId} is already resolved`);
      if (reviewSeen.has(polityId)) errors.push(`review_queue[${index}]: duplicate polity_id ${polityId}`);
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
    for (const record of index.capital_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "capital", capital_periods: record.capital_periods.slice() }));
    }
    for (const record of index.authority_center_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "authority_center", authority_periods: record.authority_periods.slice() }));
    }
    return lookup;
  }

  function periodOrdinals(period) {
    const startOrdinal = period.start_year == null ? Number.NEGATIVE_INFINITY : historicalYearToOrdinal(Number(period.start_year));
    const endOrdinal = period.end_year == null ? Number.POSITIVE_INFINITY : historicalYearToOrdinal(Number(period.end_year));
    return { startOrdinal, endOrdinal };
  }

  function resolveActivityPlacement(activity, spatialLookup) {
    const activityId = text(activity?.id);
    const polityId = text(activity?.polity?.id);
    const interval = activityInterval(activity);
    if (!interval) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "missing_boundaries", segments: Object.freeze([]) });
    }
    if (interval.partial) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "incomplete_boundary", segments: Object.freeze([]) });
    }
    if (interval.reversed_input) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "chronology_unresolved", chronology_reason: "reversed_boundaries", segments: Object.freeze([]) });
    }
    if (!polityId) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "polity_unresolved", segments: Object.freeze([]) });
    }

    const record = spatialLookup instanceof Map ? spatialLookup.get(polityId) : null;
    if (!record) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "spatial_unresolved", segments: Object.freeze([]) });
    }

    if (record.placement_basis === "polity_geography") {
      return Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        status: "placed",
        segments: Object.freeze([Object.freeze({
          activity_id: activityId,
          polity_id: polityId,
          region_code: text(record.region_code),
          placement_basis: "polity_geography",
          location_label: "정치체 권역",
          capital_name: null,
          confidence: "reviewed",
          source_refs: Object.freeze([]),
          start_year: interval.start_year,
          end_year: interval.end_year,
          partial_activity_interval: false
        })])
      });
    }

    const activityStart = interval.start_ordinal;
    const activityEnd = interval.end_ordinal;
    const isAuthorityCenter = record.placement_basis === "authority_center";
    const periods = isAuthorityCenter ? (record.authority_periods || []) : (record.capital_periods || []);
    const segments = [];
    for (const period of periods) {
      const { startOrdinal, endOrdinal } = periodOrdinals(period);
      const overlapStart = Math.max(activityStart, startOrdinal);
      const overlapEnd = Math.min(activityEnd, endOrdinal);
      if (overlapStart > overlapEnd) continue;
      const locationName = isAuthorityCenter ? text(period.center_name) : text(period.capital_name);
      segments.push(Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: text(period.region_code),
        placement_basis: isAuthorityCenter ? "authority_center" : "capital",
        location_label: locationName,
        capital_name: isAuthorityCenter ? null : locationName,
        capital_place_id: isAuthorityCenter ? null : (text(period.capital_place_id) || null),
        authority_center_name: isAuthorityCenter ? locationName : null,
        authority_center_type: isAuthorityCenter ? text(period.center_type) : null,
        confidence: text(period.confidence),
        source_refs: Object.freeze((period.source_refs || []).map(text).filter(Boolean)),
        start_year: ordinalToHistoricalYear(overlapStart),
        end_year: ordinalToHistoricalYear(overlapEnd),
        partial_activity_interval: false
      }));
    }
    if (!segments.length) {
      const status = isAuthorityCenter ? "authority_center_period_no_overlap" : "capital_period_no_overlap";
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status, segments: Object.freeze([]) });
    }
    return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "placed", segments: Object.freeze(segments) });
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
