import fs from 'node:fs';

const INDEX_PATH = 'atlas-polity-spatial-index.json';
const MODEL_PATH = 'atlas-person-spacetime-model.js';
const VIEW_PATH = 'atlas-person-spacetime-view.js';
const TEST_PATH = 'tests/person-spacetime-spatial-index-coverage.test.mjs';
const SELEUCID_ID = 'a1c6b0b4-ca71-420d-8d9f-502dc7914dd7';

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing replacement anchor: ${label}`);
  return source.replace(from, to);
}

const oldIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
if (oldIndex.schema !== 'atlas-polity-spatial-index/v1') throw new Error(`unexpected spatial schema ${oldIndex.schema}`);

const placeFunctionRecords = [];
for (const record of oldIndex.capital_records || []) {
  placeFunctionRecords.push({
    polity_id: record.polity_id,
    functions: (record.capital_periods || []).map((period) => ({
      start_year: period.start_year ?? null,
      end_year: period.end_year ?? null,
      function_type: 'capital',
      place_name: period.capital_name,
      place_id: period.capital_place_id || null,
      region_code: period.region_code,
      confidence: period.confidence,
      source_refs: period.source_refs || []
    }))
  });
}
for (const record of oldIndex.authority_center_records || []) {
  placeFunctionRecords.push({
    polity_id: record.polity_id,
    functions: (record.authority_periods || []).map((period) => ({
      start_year: period.start_year ?? null,
      end_year: period.end_year ?? null,
      function_type: period.center_type,
      place_name: period.center_name,
      place_id: period.center_place_id || null,
      region_code: period.region_code,
      confidence: period.confidence,
      source_refs: period.source_refs || []
    }))
  });
}
placeFunctionRecords.sort((a, b) => a.polity_id.localeCompare(b.polity_id));

const reviewQueue = (oldIndex.review_queue || []).map((record) => record.polity_id === SELEUCID_ID
  ? { ...record, reason: 'multiple_reviewed_royal_centers_require_activity_specific_spatial_representation' }
  : record
);

const newIndex = {
  schema: 'atlas-polity-spatial-index/v2',
  generated_at: '2026-08-18T11:26:00+09:00',
  policy: {
    primary: 'Use reviewed broad polity geography when the polity has an unambiguous horizontal placement.',
    ambiguous_fallback: 'When broad polity geography is transregional, compile placement from reviewed temporal polity-place functions instead of a special-purpose capital field.',
    temporal_segmentation: 'Split an Activity only on reviewed polity-place-function temporal boundaries. Every segment must have complete reviewed coverage.',
    regional_consensus: 'If multiple reviewed place functions are simultaneously active, they may place the Activity only when they resolve to one region. Conflicting regions remain unresolved.',
    no_partial_placement: 'A gap or regional conflict anywhere in an Activity prevents silent partial placement of that Activity.',
    presentation_boundary: 'Pure display anchors are compile/runtime presentation data and must not masquerade as historical polity-place facts.',
    no_guessing: 'Do not infer placement from person names, modern nationality, ethnicity, or unreviewed geometry.',
    unresolved: 'If neither reviewed broad geography nor complete reviewed polity-place-function coverage yields one region, keep the Activity unresolved.'
  },
  regions: oldIndex.regions,
  polity_geography: oldIndex.polity_geography,
  place_function_records: placeFunctionRecords,
  review_queue: reviewQueue
};
fs.writeFileSync(INDEX_PATH, `${JSON.stringify(newIndex, null, 2)}\n`);

let model = fs.readFileSync(MODEL_PATH, 'utf8');
model = mustReplace(
  model,
  '  const PLACEMENT_BASES = new Set(["polity_geography", "capital", "authority_center"]);\n  const AUTHORITY_CENTER_TYPES = new Set(["imperial_court_core", "royal_court", "political_center"]);\n  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v1";',
  '  const PLACEMENT_BASES = new Set(["polity_geography", "polity_place_function"]);\n  const PLACE_FUNCTION_TYPES = new Set(["capital", "royal_court", "royal_residence", "imperial_court_core", "political_center", "administrative_center"]);\n  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v2";',
  'model constants'
);

const modelStart = model.indexOf('  function validateCapitalPeriod');
const modelEnd = model.indexOf('  function roundOlderToCentury');
if (modelStart < 0 || modelEnd <= modelStart) throw new Error('spatial model block anchors not found');
const spatialBlock = String.raw`  function validatePlaceFunction(fn, polityId, recordIndex, functionIndex) {
    const regionCode = text(fn?.region_code);
    const startYear = fn?.start_year == null ? null : Number(fn.start_year);
    const endYear = fn?.end_year == null ? null : Number(fn.end_year);
    const errors = [];
    if (!REGION_CODES.has(regionCode)) errors.push(invalid region_code: 0);
    if (!text(fn?.place_name)) errors.push("place_name is required");
    const functionType = text(fn?.function_type);
    if (!PLACE_FUNCTION_TYPES.has(functionType)) errors.push(invalid function_type: 0);
    if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) errors.push("start_year must be a historical integer year or null");
    if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) errors.push("end_year must be a historical integer year or null");
    if (startYear != null && endYear != null && normalizeInterval(startYear, endYear)?.reversed_input) errors.push("start_year must not be after end_year");
    const sourceRefs = Array.isArray(fn?.source_refs) ? fn.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(fn?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(invalid confidence: 0);
    return errors.map((message) => place_function_records[] polity  function : 0);
  }

  function validateSpatialIndex(value) {
    const errors = [];
    if (!value || typeof value !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["spatial index must be an object"]) });
    if (value.schema !== SPATIAL_INDEX_SCHEMA) errors.push(schema must be 0);
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
      if (!REGION_CODES.has(regionCode)) errors.push(polity_geography polity : invalid region_code 0);
      if (id) resolved.add(id);
    }

    for (const [recordIndex, record] of (Array.isArray(value.place_function_records) ? value.place_function_records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(place_function_records[]: polity_id is required0);
      if (resolved.has(polityId)) errors.push(place_function_records[]: polity_id  is already resolved by polity_geography0);
      if (polityId) resolved.add(polityId);
      if (!Array.isArray(record?.functions) || !record.functions.length) {
        errors.push(place_function_records[] polity : functions must be a non-empty array0);
      } else {
        for (const [functionIndex, fn] of record.functions.entries()) errors.push(...validatePlaceFunction(fn, polityId, recordIndex, functionIndex));
      }
    }

    const reviewSeen = new Set();
    for (const [index, record] of (Array.isArray(value.review_queue) ? value.review_queue : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(review_queue[]: polity_id is required0);
      if (resolved.has(polityId)) errors.push(review_queue[]: polity_id  is already resolved0);
      if (reviewSeen.has(polityId)) errors.push(review_queue[]: duplicate polity_id 0);
      if (polityId) reviewSeen.add(polityId);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createSpatialLookup(index) {
    const validation = validateSpatialIndex(index);
    if (!validation.valid) {
      const error = new Error(INVALID_SPATIAL_INDEX: 0);
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

`;
const repairedBlock = spatialBlock
  .replaceAll('\u0010', '`')
  .replaceAll('\u00010', '${regionCode || "(empty)"}`')
  .replace('`invalid function_type: ${regionCode || "(empty)"}`', '`invalid function_type: ${functionType || "(empty)"}`')
  .replace('`place_function_records[] polity ${regionCode || "(empty)"}` function : ${regionCode || "(empty)"}`', '`place_function_records[${recordIndex}] polity ${polityId} function ${functionIndex}: ${message}`')
  .replace('`schema must be ${regionCode || "(empty)"}`', '`schema must be ${SPATIAL_INDEX_SCHEMA}`')
  .replace('`polity_geography polity ${regionCode || "(empty)"}`: invalid region_code ${regionCode || "(empty)"}`', '`polity_geography polity ${id}: invalid region_code ${regionCode || "(empty)"}`')
  .replace('`place_function_records[${regionCode || "(empty)"}`]: polity_id is required`', '`place_function_records[${recordIndex}]: polity_id is required`')
  .replace('`place_function_records[${regionCode || "(empty)"}`]: polity_id  is already resolved by polity_geography`', '`place_function_records[${recordIndex}]: polity_id ${polityId} is already resolved by polity_geography`')
  .replace('`place_function_records[${regionCode || "(empty)"}`] polity : functions must be a non-empty array`', '`place_function_records[${recordIndex}] polity ${polityId}: functions must be a non-empty array`')
  .replace('`review_queue[${regionCode || "(empty)"}`]: polity_id is required`', '`review_queue[${index}]: polity_id is required`')
  .replace('`review_queue[${regionCode || "(empty)"}`]: polity_id  is already resolved`', '`review_queue[${index}]: polity_id ${polityId} is already resolved`')
  .replace('`review_queue[${regionCode || "(empty)"}`]: duplicate polity_id ${regionCode || "(empty)"}`', '`review_queue[${index}]: duplicate polity_id ${polityId}`')
  .replace('`INVALID_SPATIAL_INDEX: ${regionCode || "(empty)"}`', '`INVALID_SPATIAL_INDEX: ${validation.errors.join(" | ")}`');
model = model.slice(0, modelStart) + repairedBlock + model.slice(modelEnd);
fs.writeFileSync(MODEL_PATH, model);

let view = fs.readFileSync(VIEW_PATH, 'utf8');
view = mustReplace(view,
`  function placementBasisLabel(segment) {\n    if (segment?.placement_basis === "capital") return \`수도: \${segment.location_label || segment.capital_name || "미상"}\`;\n    if (segment?.placement_basis === "authority_center") return \`왕정·정치 중심: \${segment.location_label || segment.authority_center_name || "미상"}\`;\n    return "검토된 정치체 권역";\n  }`,
`  function placementBasisLabel(segment) {\n    if (segment?.placement_basis !== "polity_place_function") return "검토된 정치체 권역";\n    const typeLabel = ({ capital: "수도", royal_court: "왕정 중심", royal_residence: "왕실 거점", imperial_court_core: "제국 궁정 중심", political_center: "정치 중심", administrative_center: "행정 중심" })[segment?.place_function_type] || "정치체 장소 기능";\n    return \`\${typeLabel}: \${segment.location_label || segment.place_name || "미상"}\`;\n  }`,
'placement basis label');
view = mustReplace(view,
`      spatial_unresolved: "검토된 정치체 권역·수도·왕정 중심 기준 없음",\n      capital_period_no_overlap: "활동기간과 검토된 수도 기간이 겹치지 않음",\n      authority_center_period_no_overlap: "활동기간과 검토된 왕정·정치 중심 기간이 겹치지 않음",`,
`      spatial_unresolved: "검토된 정치체 권역·장소 기능 기준 없음",\n      place_function_period_gap: "활동기간 전체를 덮는 검토된 정치체 장소 기능이 없음",\n      place_function_region_conflict: "동시기 검토된 정치체 장소 기능이 여러 권역으로 갈림",`,
'reason labels');
view = mustReplace(view,
`    const capitalCount = Array.isArray(spatialIndex?.capital_records) ? spatialIndex.capital_records.length : 0;\n    const authorityCount = Array.isArray(spatialIndex?.authority_center_records) ? spatialIndex.authority_center_records.length : 0;`,
`    const placeFunctionCount = Array.isArray(spatialIndex?.place_function_records) ? spatialIndex.place_function_records.length : 0;`,
'place function count');
view = mustReplace(view,
`<span><b>\${entries.length}</b> Activity</span><span><b>\${placedCount}</b> 배치 구간</span><span><b>\${placement.unresolvedPosition.length}</b> 위치 미확정</span><span><b>\${placement.unresolvedChronology.length}</b> 연대 미확정</span><span><b>\${directCount}</b> 정치체 권역</span><span><b>\${capitalCount}</b> 수도 판정 Polity</span><span><b>\${authorityCount}</b> 왕정 중심 Polity</span><span><b>\${reviewCount}</b> 기준 검토 대기</span>`,
`<span><b>\${entries.length}</b> Activity</span><span><b>\${placedCount}</b> 배치 구간</span><span><b>\${placement.unresolvedPosition.length}</b> 위치 미확정</span><span><b>\${placement.unresolvedChronology.length}</b> 연대 미확정</span><span><b>\${directCount}</b> 정치체 권역</span><span><b>\${placeFunctionCount}</b> 장소 기능 Polity</span><span><b>\${reviewCount}</b> 기준 검토 대기</span>`,
'status counts');
view = view.replace(
  '명확한 정치체는 검토된 광역 권역, 다지역 정치체는 검토된 당시 수도를 사용합니다. 고정 수도가 없다고 확인된 경우에만 사료로 검토된 왕정·정치 중심을 사용하며, 그마저 특정할 수 없으면 ‘위치 미확정’으로 보존합니다.',
  '명확한 정치체는 검토된 광역 권역을 사용합니다. 다지역 정치체는 수도·왕정 중심·정치 중심 등 검토된 동시기 정치체 장소 기능을 하나의 시간 모델에서 Compile하며, 기간 공백이나 권역 충돌이 있으면 임의 좌표를 만들지 않고 ‘위치 미확정’으로 보존합니다.'
);
view = view.replace(
  '광역 위치가 애매하면 당시 수도를 사용하고, 고정 수도가 성립하지 않는 유목·순회 왕정에 한해서만 검토된 왕정·정치 중심을 보조 기준으로 사용합니다.',
  '광역 위치가 애매하면 수도·왕정 중심·정치 중심 등 검토된 동시기 정치체 장소 기능을 하나의 시간 모델에서 사용합니다.'
);
view = view.replace(
  '검토된 정치체 권역 또는 필요한 당시 수도·왕정 중심 기준이 없어 가로 위치를 확정하지 않은 Activity입니다.',
  '검토된 정치체 권역 또는 활동기간 전체를 일관되게 설명하는 정치체 장소 기능이 없어 가로 위치를 확정하지 않은 Activity입니다.'
);
fs.writeFileSync(VIEW_PATH, view);

const testContent = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { createRequire } from "node:module";\nimport { readFileSync } from "node:fs";\n\nconst require = createRequire(import.meta.url);\nconst model = require("../atlas-person-spacetime-model.js");\nconst index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));\n\nconst IDS = Object.freeze({\n  byzantine: "074510f4-f2e7-5795-8cfb-2a4206fa7254",\n  ottoman: "6d1520e2-0aff-5063-b2b7-95eb86daf372",\n  kushan: "7ccd9ba0-28fb-55d7-8ae8-60de77c38603",\n  hun: "9354d5c8-9a01-5021-af36-053adc967dba",\n  daxi: "c40d4e85-38a3-59ab-b3f4-a618ffbde2e5",\n  macedonian: "2f6e890f-1704-5c76-aa94-f18d7f905e06",\n  omani: "68c83ef6-0023-5af9-a6e8-26ccf5b8e116",\n  seleucid: "a1c6b0b4-ca71-420d-8d9f-502dc7914dd7",\n  mongol: "d54c540c-f3fb-5d05-9dc0-26af4ee9815a",\n  roman: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417"\n});\n\nfunction activity(polityId, startYear, endYear, id = "activity-test") { return { id, polity: { id: polityId }, start: { year: startYear }, end: { year: endYear } }; }\nfunction contiguous(segments, startYear, endYear) {\n  assert.ok(segments.length > 0);\n  assert.equal(segments[0].start_year, startYear);\n  assert.equal(segments.at(-1).end_year, endYear);\n  for (let i = 1; i < segments.length; i += 1) assert.equal(model.historicalYearToOrdinal(segments[i].start_year), model.historicalYearToOrdinal(segments[i - 1].end_year) + 1);\n}\n\ntest("spatial index v2 uses one canonical temporal polity-place-function family", () => {\n  const validation = model.validateSpatialIndex(index);\n  assert.equal(validation.valid, true, validation.errors.join(" | "));\n  assert.equal(index.schema, "atlas-polity-spatial-index/v2");\n  assert.equal(Object.keys(index.polity_geography).length, 325);\n  assert.equal(index.place_function_records.length, 11);\n  assert.equal(index.review_queue.length, 2);\n  assert.equal(Object.hasOwn(index, "capital_records"), false);\n  assert.equal(Object.hasOwn(index, "authority_center_records"), false);\n});\n\ntest("all canonical place functions retain reviewed source evidence", () => {\n  const functions = index.place_function_records.flatMap((record) => record.functions);\n  assert.ok(functions.length > 0);\n  assert.equal(functions.every((fn) => Array.isArray(fn.source_refs) && fn.source_refs.length > 0), true);\n  assert.equal(functions.some((fn) => fn.source_refs.some((ref) => String(ref).startsWith("ATLAS reviewed"))), false);\n});\n\ntest("direct reviewed coarse placement remains unchanged", () => {\n  const lookup = model.createSpatialLookup(index);\n  for (const [polityId, region] of [[IDS.kushan,"south-asia"],[IDS.hun,"europe"],[IDS.daxi,"east-asia"]]) {\n    const placement = model.resolveActivityPlacement(activity(polityId, 100, 101, polityId), lookup);\n    assert.equal(placement.status, "placed"); assert.equal(placement.segments[0].placement_basis, "polity_geography"); assert.equal(placement.segments[0].region_code, region);\n  }\n});\n\ntest("Roman imperial Rome placement remains Europe", () => {\n  const placement = model.resolveActivityPlacement(activity(IDS.roman, -27, 100, "roman"), model.createSpatialLookup(index));\n  assert.equal(placement.status, "placed");\n  assert.equal(placement.segments[0].place_name, "Rome");\n  assert.equal(placement.segments[0].region_code, "europe");\n});\n\ntest("Ottoman temporal place functions remain contiguous across regional capital change", () => {\n  const lookup = model.createSpatialLookup(index);\n  const placement = model.resolveActivityPlacement(activity(IDS.ottoman, 1451, 1481, "mehmed"), lookup);\n  assert.equal(placement.status, "placed");\n  assert.deepEqual(placement.segments.map((s) => [s.place_function_type,s.place_name,s.region_code,s.start_year,s.end_year]), [["capital","Edirne","europe",1451,1452],["capital","Constantinople","europe",1453,1481]]);\n  contiguous(placement.segments, 1451, 1481);\n});\n\ntest("Byzantine place-function transitions retain full Activity coverage", () => {\n  const placement = model.resolveActivityPlacement(activity(IDS.byzantine, 1203, 1262, "byzantine"), model.createSpatialLookup(index));\n  assert.equal(placement.status, "placed"); contiguous(placement.segments, 1203, 1262);\n});\n\ntest("Mongol court centers use the same polity-place-function contract as capitals", () => {\n  const placement = model.resolveActivityPlacement(activity(IDS.mongol, 1260, 1271, "kublai"), model.createSpatialLookup(index));\n  assert.equal(placement.status, "placed");\n  assert.equal(placement.segments.length, 1);\n  assert.equal(placement.segments[0].placement_basis, "polity_place_function");\n  assert.equal(placement.segments[0].place_function_type, "imperial_court_core");\n  assert.equal(placement.segments[0].region_code, "east-asia");\n});\n\ntest("same-region simultaneous place functions compile; conflicting regions do not", () => {\n  const base = { schema:index.schema, regions:index.regions, polity_geography:{}, review_queue:[] };\n  const same = { ...base, place_function_records:[{ polity_id:"p", functions:[\n    { start_year:100,end_year:110,function_type:"capital",place_name:"A",region_code:"west-asia",confidence:"well_established",source_refs:["s"] },\n    { start_year:100,end_year:110,function_type:"royal_court",place_name:"B",region_code:"west-asia",confidence:"well_established",source_refs:["s"] }\n  ]}]};\n  const placed = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(same));\n  assert.equal(placed.status,"placed"); assert.equal(placed.segments[0].region_code,"west-asia"); assert.equal(placed.segments[0].active_place_functions.length,2);\n  const conflict = structuredClone(same); conflict.place_function_records[0].functions[1].region_code="central-asia";\n  const unresolved = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(conflict));\n  assert.equal(unresolved.status,"place_function_region_conflict"); assert.equal(unresolved.segments.length,0);\n});\n\ntest("a place-function gap prevents silent partial placement", () => {\n  const synthetic = { schema:index.schema, regions:index.regions, polity_geography:{}, review_queue:[], place_function_records:[{ polity_id:"p", functions:[\n    { start_year:100,end_year:104,function_type:"capital",place_name:"A",region_code:"west-asia",confidence:"well_established",source_refs:["s"] },\n    { start_year:106,end_year:110,function_type:"capital",place_name:"B",region_code:"west-asia",confidence:"well_established",source_refs:["s"] }\n  ]}]};\n  const result = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(synthetic));\n  assert.equal(result.status,"place_function_period_gap"); assert.equal(result.segments.length,0);\n});\n\ntest("Seleucid Activity stays unresolved for representation, not because the model assumes one fixed capital", () => {\n  const review = index.review_queue.find((row) => row.polity_id === IDS.seleucid);\n  assert.equal(review?.reason, "multiple_reviewed_royal_centers_require_activity_specific_spatial_representation");\n  const result = model.resolveActivityPlacement(activity(IDS.seleucid,-305,-281,"seleucus"), model.createSpatialLookup(index));\n  assert.equal(result.status,"spatial_unresolved");\n});\n`;
fs.writeFileSync(TEST_PATH, testContent);

console.log(JSON.stringify({ schema:newIndex.schema, direct:Object.keys(newIndex.polity_geography).length, placeFunctionPolities:newIndex.place_function_records.length, review:newIndex.review_queue.length }, null, 2));
