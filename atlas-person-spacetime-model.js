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
  const CAPITAL_INDEX_SCHEMA = "atlas-polity-capital-index/v1";

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
    if (startYear != null && endYear != null) {
      const normalized = normalizeInterval(startYear, endYear);
      if (normalized?.reversed_input) errors.push("start_year must not be after end_year");
    }
    const sourceRefs = Array.isArray(period?.source_refs) ? period.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(period?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(`invalid confidence: ${confidence || "(empty)"}`);
    return errors.map((message) => `records[${index}] polity ${polityId}: ${message}`);
  }

  function validateCapitalIndex(value) {
    const errors = [];
    if (!value || typeof value !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["capital index must be an object"]) });
    if (value.schema !== CAPITAL_INDEX_SCHEMA) errors.push(`schema must be ${CAPITAL_INDEX_SCHEMA}`);
    if (!Array.isArray(value.records)) errors.push("records must be an array");
    const seenPolities = new Set();
    for (const [index, record] of (Array.isArray(value.records) ? value.records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(`records[${index}]: polity_id is required`);
      if (seenPolities.has(polityId)) errors.push(`records[${index}]: duplicate polity_id ${polityId}`);
      if (polityId) seenPolities.add(polityId);
      if (!Array.isArray(record?.capital_periods) || !record.capital_periods.length) {
        errors.push(`records[${index}] polity ${polityId || "(empty)"}: capital_periods must be a non-empty array`);
        continue;
      }
      for (const period of record.capital_periods) errors.push(...validateCapitalPeriod(period, polityId, index));
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createCapitalLookup(index) {
    const validation = validateCapitalIndex(index);
    if (!validation.valid) {
      const error = new Error(`INVALID_CAPITAL_INDEX: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_CAPITAL_INDEX";
      error.details = validation.errors;
      throw error;
    }
    const lookup = new Map();
    for (const record of index.records) lookup.set(text(record.polity_id), record.capital_periods.slice());
    return lookup;
  }

  function periodOrdinals(period) {
    const startOrdinal = period.start_year == null ? Number.NEGATIVE_INFINITY : historicalYearToOrdinal(Number(period.start_year));
    const endOrdinal = period.end_year == null ? Number.POSITIVE_INFINITY : historicalYearToOrdinal(Number(period.end_year));
    return { startOrdinal, endOrdinal };
  }

  function resolveActivityPlacement(activity, capitalLookup) {
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
    const periods = capitalLookup instanceof Map ? capitalLookup.get(polityId) : null;
    if (!periods?.length) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "capital_unresolved", segments: Object.freeze([]) });
    }

    const activityStart = interval.start_ordinal;
    const activityEnd = interval.end_ordinal;
    const segments = [];
    for (const period of periods) {
      const { startOrdinal, endOrdinal } = periodOrdinals(period);
      const overlapStart = Math.max(activityStart, startOrdinal);
      const overlapEnd = Math.min(activityEnd, endOrdinal);
      if (overlapStart > overlapEnd) continue;
      segments.push(Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: text(period.region_code),
        capital_name: text(period.capital_name),
        capital_place_id: text(period.capital_place_id) || null,
        confidence: text(period.confidence),
        source_refs: Object.freeze((period.source_refs || []).map(text).filter(Boolean)),
        start_year: ordinalToHistoricalYear(overlapStart),
        end_year: ordinalToHistoricalYear(overlapEnd),
        partial_activity_interval: false
      }));
    }
    if (!segments.length) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "capital_period_no_overlap", segments: Object.freeze([]) });
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

  function buildCenturyTicks(startYear, endYear) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal) return Object.freeze([]);

    const years = [];
    if (startYear < 0) {
      const firstBce = Math.ceil(startYear / 100) * 100;
      const lastBce = Math.min(endYear, -1);
      for (let year = firstBce; year <= lastBce; year += 100) {
        if (year !== 0) years.push(year);
      }
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
      } else laneEnds[lane] = bottom;
      return Object.freeze({ ...item, lane });
    }));
  }

  return Object.freeze({
    CAPITAL_INDEX_SCHEMA,
    REGION_DEFINITIONS,
    historicalYearToOrdinal,
    ordinalToHistoricalYear,
    yearLabel,
    normalizeInterval,
    activityInterval,
    validateCapitalIndex,
    createCapitalLookup,
    resolveActivityPlacement,
    deriveTimelineRange,
    buildCenturyTicks,
    assignLanes
  });
});