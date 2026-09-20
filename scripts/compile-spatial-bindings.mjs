import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const model = require('../atlas-person-spacetime-model.js');
const spaceAxis = require('../atlas-person-spacetime-space-axis.js');

export const REVIEWED_BINDING_SHARD_SCHEMA = 'atlas-reviewed-spatial-bindings/v1';
export const REVIEWED_SPATIAL_CORRECTION_SCHEMA = 'atlas-reviewed-spatial-corrections/v1';
export const CANONICAL_SPATIAL_INDEX_SCHEMA = 'atlas-polity-spatial-index/v2';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const CORRECTION_DISPOSITIONS = new Set(['place_function', 'review_queue', 'remove_orphan', 'remove_relinked_source']);
const PLACE_FUNCTION_TYPES = new Set(['capital', 'royal_court', 'royal_residence', 'imperial_court_core', 'political_center', 'administrative_center']);
const PLACE_FUNCTION_CONFIDENCE = new Set(['well_established', 'likely', 'speculative', 'disputed', 'unknown']);
function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_SPATIAL_BINDING_INPUT', `${label} must be an object`);
  return value;
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function taxonomyContract() {
  const macroCodes = new Set();
  const subregionParent = new Map();
  const macroOrder = [];
  const subregionOrder = [];
  for (const macro of spaceAxis.DEFAULT_SPATIAL_HIERARCHY) {
    macroCodes.add(macro.code);
    macroOrder.push(macro.code);
    for (const subregion of macro.subregions) {
      subregionParent.set(subregion.code, macro.code);
      subregionOrder.push(subregion.code);
    }
  }
  return { macroCodes, subregionParent, macroOrder, subregionOrder };
}

function assertCanonicalUuid(polityId, label) {
  if (!UUID_PATTERN.test(polityId)) fail('INVALID_SPATIAL_BINDING_UUID', `${label} must be a lowercase canonical UUID: ${polityId || '(empty)'}`);
}

function assertIsoInstant(value, label) {
  const input = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input) || Number.isNaN(Date.parse(input))) {
    fail('INVALID_SPATIAL_BINDING_TIMESTAMP', `${label} must be an ISO-8601 UTC instant`);
  }
  return new Date(input).toISOString();
}

function normalizeReviewDecision(raw, label) {
  const decision = asObject(raw, label);
  const polityId = text(decision.polity_id);
  const reason = text(decision.reason);
  assertCanonicalUuid(polityId, `${label}.polity_id`);
  if (!reason) fail('INVALID_SPATIAL_REVIEW_REASON', `${label}.reason is required`);
  return Object.freeze({ polity_id: polityId, reason });
}


function normalizeExpectedMapping(raw, label) {
  const expected = asObject(raw, label);
  const reviewQueueReason = text(expected.review_queue_reason);
  if (reviewQueueReason) {
    if (expected.region_code != null || expected.subregion_code != null) {
      fail('INVALID_SPATIAL_CORRECTION_EXPECTED_STATE', `${label}: review_queue expectation cannot also declare a static mapping`);
    }
    return Object.freeze({
      kind: 'review_queue',
      region_code: null,
      subregion_code: null,
      review_queue_reason: reviewQueueReason
    });
  }
  const regionCode = text(expected.region_code);
  const subregionCode = expected.subregion_code == null ? null : text(expected.subregion_code);
  const taxonomy = taxonomyContract();
  if (!taxonomy.macroCodes.has(regionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `${label}: ${regionCode || '(empty)'}`);
  if (subregionCode) {
    const parent = taxonomy.subregionParent.get(subregionCode);
    if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `${label}: ${subregionCode}`);
    if (parent !== regionCode) fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `${label}: ${subregionCode} is not a child of ${regionCode}`);
  }
  return Object.freeze({
    kind: 'static',
    region_code: regionCode,
    subregion_code: subregionCode,
    review_queue_reason: null
  });
}

function normalizeActivityOverrideRebind(raw, label) {
  const rebind = asObject(raw, label);
  const activityId = text(rebind.activity_id);
  const expectedPolityId = text(rebind.expected_polity_id);
  const nextPolityId = text(rebind.next_polity_id);
  const expectedStartYear = Number(rebind.expected_start_year);
  const expectedEndYear = Number(rebind.expected_end_year);
  const reason = text(rebind.reason);
  assertCanonicalUuid(activityId, `${label}.activity_id`);
  assertCanonicalUuid(expectedPolityId, `${label}.expected_polity_id`);
  assertCanonicalUuid(nextPolityId, `${label}.next_polity_id`);
  if (expectedPolityId === nextPolityId) fail('INVALID_SPATIAL_OVERRIDE_REBIND', `${label}: source and target polity IDs must differ`);
  if (!Number.isInteger(expectedStartYear) || expectedStartYear === 0) fail('INVALID_SPATIAL_OVERRIDE_REBIND', `${label}.expected_start_year must be a historical integer`);
  if (!Number.isInteger(expectedEndYear) || expectedEndYear === 0) fail('INVALID_SPATIAL_OVERRIDE_REBIND', `${label}.expected_end_year must be a historical integer`);
  if (expectedStartYear > expectedEndYear) fail('INVALID_SPATIAL_OVERRIDE_REBIND', `${label}: expected_start_year must not exceed expected_end_year`);
  if (!reason) fail('INVALID_SPATIAL_OVERRIDE_REBIND', `${label}.reason is required`);
  return Object.freeze({
    activity_id: activityId,
    expected_polity_id: expectedPolityId,
    next_polity_id: nextPolityId,
    expected_start_year: expectedStartYear,
    expected_end_year: expectedEndYear,
    reason
  });
}

function normalizeCorrectionFunction(raw, label) {
  const fn = asObject(raw, label);
  const functionType = text(fn.function_type);
  const placeName = text(fn.place_name);
  const placeId = fn.place_id == null ? null : text(fn.place_id) || null;
  const regionCode = text(fn.region_code);
  const confidence = text(fn.confidence);
  const sourceRefs = Array.isArray(fn.source_refs) ? fn.source_refs.map(text).filter(Boolean) : [];
  const startYear = fn.start_year == null ? null : Number(fn.start_year);
  const endYear = fn.end_year == null ? null : Number(fn.end_year);
  const taxonomy = taxonomyContract();
  if (!PLACE_FUNCTION_TYPES.has(functionType)) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.function_type: ${functionType || '(empty)'}`);
  if (!placeName) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.place_name is required`);
  if (!taxonomy.macroCodes.has(regionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `${label}.region_code: ${regionCode || '(empty)'}`);
  if (!PLACE_FUNCTION_CONFIDENCE.has(confidence)) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.confidence: ${confidence || '(empty)'}`);
  if (!sourceRefs.length) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.source_refs must be non-empty`);
  if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.start_year must be historical integer or null`);
  if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.end_year must be historical integer or null`);
  if (startYear != null && endYear != null && startYear > endYear) fail('INVALID_SPATIAL_PLACE_FUNCTION', `${label}.start_year must not exceed end_year`);
  return Object.freeze({
    start_year: startYear,
    end_year: endYear,
    function_type: functionType,
    place_name: placeName,
    place_id: placeId,
    region_code: regionCode,
    confidence,
    source_refs: Object.freeze(sourceRefs)
  });
}

function normalizeSpatialCorrectionFile(entry) {
  const source = text(entry?.source) || '(memory)';
  const value = asObject(entry?.value, `correction ${source}`);
  if (value.schema !== REVIEWED_SPATIAL_CORRECTION_SCHEMA) {
    fail('INVALID_SPATIAL_CORRECTION_SCHEMA', `${source}: schema must be ${REVIEWED_SPATIAL_CORRECTION_SCHEMA}`);
  }
  const correctionId = text(value.correction_id);
  if (!SHARD_ID_PATTERN.test(correctionId)) fail('INVALID_SPATIAL_CORRECTION_ID', `${source}: invalid correction_id ${correctionId || '(empty)'}`);
  const reviewedAt = assertIsoInstant(value.reviewed_at, `${source} reviewed_at`);
  const baseline = text(value.baseline);
  if (!baseline) fail('INVALID_SPATIAL_CORRECTION_BASELINE', `${source}: baseline is required`);
  const rawChanges = value.changes == null ? [] : value.changes;
  const rawRebinds = value.activity_override_rebinds == null ? [] : value.activity_override_rebinds;
  if (!Array.isArray(rawChanges)) fail('INVALID_SPATIAL_CORRECTIONS', `${source}: changes must be an array when present`);
  if (!Array.isArray(rawRebinds)) fail('INVALID_SPATIAL_OVERRIDE_REBINDS', `${source}: activity_override_rebinds must be an array when present`);
  if (!rawChanges.length && !rawRebinds.length) fail('INVALID_SPATIAL_CORRECTIONS', `${source}: at least one change or activity_override_rebind is required`);

  const localSeen = new Set();
  const changes = rawChanges.map((raw, index) => {
    const change = asObject(raw, `${source} changes[${index}]`);
    const polityId = text(change.polity_id);
    const disposition = text(change.disposition);
    const reason = text(change.reason);
    assertCanonicalUuid(polityId, `${source} changes[${index}].polity_id`);
    if (localSeen.has(polityId)) fail('DUPLICATE_SPATIAL_CORRECTION_TARGET', `${source}: duplicate polity_id ${polityId}`);
    localSeen.add(polityId);
    if (!CORRECTION_DISPOSITIONS.has(disposition)) fail('INVALID_SPATIAL_CORRECTION_DISPOSITION', `${source} ${polityId}: ${disposition || '(empty)'}`);
    if (!reason) fail('INVALID_SPATIAL_CORRECTION_REASON', `${source} ${polityId}: reason is required`);
    const expected = normalizeExpectedMapping(change.expected, `${source} ${polityId}.expected`);
    if ((disposition === 'place_function' || disposition === 'review_queue') && expected.kind !== 'static') {
      fail('INVALID_SPATIAL_CORRECTION_EXPECTED_STATE', `${source} ${polityId}: ${disposition} requires an expected static mapping`);
    }
    const rawFunctions = change.functions == null ? [] : change.functions;
    if (disposition === 'place_function') {
      if (!Array.isArray(rawFunctions) || !rawFunctions.length) fail('INVALID_SPATIAL_CORRECTION_FUNCTIONS', `${source} ${polityId}: functions must be non-empty`);
    } else if (rawFunctions != null && Array.isArray(rawFunctions) && rawFunctions.length) {
      fail('INVALID_SPATIAL_CORRECTION_FUNCTIONS', `${source} ${polityId}: functions allowed only for place_function`);
    }
    const functions = disposition === 'place_function'
      ? rawFunctions.map((fn, functionIndex) => normalizeCorrectionFunction(fn, `${source} ${polityId} functions[${functionIndex}]`))
      : [];
    return Object.freeze({ polity_id: polityId, disposition, reason, expected, functions: Object.freeze(functions) });
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  const rebindSeen = new Set();
  const activityOverrideRebinds = rawRebinds.map((raw, index) => {
    const rebind = normalizeActivityOverrideRebind(raw, `${source} activity_override_rebinds[${index}]`);
    if (rebindSeen.has(rebind.activity_id)) fail('DUPLICATE_SPATIAL_OVERRIDE_REBIND', `${source}: duplicate activity_id ${rebind.activity_id}`);
    rebindSeen.add(rebind.activity_id);
    return rebind;
  }).sort((left, right) => left.activity_id.localeCompare(right.activity_id, 'en'));

  return Object.freeze({
    source,
    correction_id: correctionId,
    reviewed_at: reviewedAt,
    baseline,
    changes: Object.freeze(changes),
    activity_override_rebinds: Object.freeze(activityOverrideRebinds)
  });
}

function applyNormalizedSpatialCorrections(baseline, corrections) {
  const next = structuredClone(baseline);
  next.polity_geography = { ...(baseline.polity_geography || {}) };
  next.polity_subregions = { ...(baseline.polity_subregions || {}) };
  next.place_function_records = structuredClone(baseline.place_function_records || []);
  next.review_queue = structuredClone(baseline.review_queue || []);
  next.activity_spatial_overrides = structuredClone(baseline.activity_spatial_overrides || []);

  const placeFunctionIds = new Set(next.place_function_records.map((record) => text(record?.polity_id)).filter(Boolean));
  const reviewIds = new Set(next.review_queue.map((record) => text(record?.polity_id)).filter(Boolean));

  for (const correction of corrections) {
    for (const change of correction.changes) {
      const currentRegion = Object.prototype.hasOwnProperty.call(next.polity_geography, change.polity_id)
        ? text(next.polity_geography[change.polity_id])
        : null;
      const currentSubregion = Object.prototype.hasOwnProperty.call(next.polity_subregions, change.polity_id)
        ? text(next.polity_subregions[change.polity_id]) || null
        : null;
      const reviewIndex = next.review_queue.findIndex((record) => text(record?.polity_id) === change.polity_id);
      const reviewRecord = reviewIndex >= 0 ? next.review_queue[reviewIndex] : null;
      const hasPlaceFunction = placeFunctionIds.has(change.polity_id);

      if (change.expected.kind === 'static') {
        if (currentRegion !== change.expected.region_code || currentSubregion !== change.expected.subregion_code || reviewRecord || hasPlaceFunction) {
          fail(
            'SPATIAL_CORRECTION_SOURCE_MISMATCH',
            `${change.polity_id}: expected ${mappingLabel(change.expected)} static mapping but found ${currentRegion || '(missing)'}/${currentSubregion || '(macro-only)'}${reviewRecord ? ' + review_queue' : ''}${hasPlaceFunction ? ' + place_function' : ''}`
          );
        }
      } else if (change.expected.kind === 'review_queue') {
        if (currentRegion != null || currentSubregion != null || hasPlaceFunction || !reviewRecord || text(reviewRecord.reason) !== change.expected.review_queue_reason) {
          fail(
            'SPATIAL_CORRECTION_SOURCE_MISMATCH',
            `${change.polity_id}: expected exact review_queue disposition but current reviewed state differs`
          );
        }
      } else {
        fail('INVALID_SPATIAL_CORRECTION_EXPECTED_STATE', `${change.polity_id}: unsupported expected state ${change.expected.kind || '(empty)'}`);
      }

      const removesDisposition = change.disposition === 'remove_orphan' || change.disposition === 'remove_relinked_source';
      if (removesDisposition) {
        delete next.polity_geography[change.polity_id];
        delete next.polity_subregions[change.polity_id];
        if (reviewIndex >= 0) {
          next.review_queue.splice(reviewIndex, 1);
          reviewIds.delete(change.polity_id);
        }
        continue;
      }

      delete next.polity_geography[change.polity_id];
      delete next.polity_subregions[change.polity_id];

      if (change.disposition === 'place_function') {
        next.place_function_records.push({
          polity_id: change.polity_id,
          functions: change.functions.map((fn) => ({ ...fn, source_refs: [...fn.source_refs] }))
        });
        placeFunctionIds.add(change.polity_id);
      } else if (change.disposition === 'review_queue') {
        next.review_queue.push({ polity_id: change.polity_id, reason: change.reason });
        reviewIds.add(change.polity_id);
      }
    }

    for (const rebind of correction.activity_override_rebinds) {
      const matching = next.activity_spatial_overrides
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => text(record?.activity_id) === rebind.activity_id);
      if (matching.length !== 1) {
        fail('SPATIAL_OVERRIDE_REBIND_SOURCE_MISMATCH', `${rebind.activity_id}: expected exactly one Activity spatial override, found ${matching.length}`);
      }
      const { record, index } = matching[0];
      if (
        text(record?.expected_polity_id) !== rebind.expected_polity_id ||
        Number(record?.expected_start_year) !== rebind.expected_start_year ||
        Number(record?.expected_end_year) !== rebind.expected_end_year
      ) {
        fail('SPATIAL_OVERRIDE_REBIND_SOURCE_MISMATCH', `${rebind.activity_id}: expected polity/interval no longer matches reviewed source state`);
      }
      next.activity_spatial_overrides[index] = {
        ...record,
        expected_polity_id: rebind.next_polity_id
      };
    }
  }
  return next;
}

export function validateCanonicalBaseline(baseline) {
  asObject(baseline, 'baseline');
  if (baseline.schema !== CANONICAL_SPATIAL_INDEX_SCHEMA) {
    fail('INVALID_SPATIAL_BASELINE_SCHEMA', `baseline schema must be ${CANONICAL_SPATIAL_INDEX_SCHEMA}`);
  }
  const validation = model.validateSpatialIndex(baseline);
  if (!validation.valid) fail('INVALID_SPATIAL_BASELINE', validation.errors.join(' | '));

  const taxonomy = taxonomyContract();
  const regionCodes = Array.isArray(baseline.regions) ? baseline.regions.map((region) => text(region?.code)) : [];
  if (JSON.stringify(regionCodes) !== JSON.stringify(taxonomy.macroOrder)) {
    fail('SPATIAL_TAXONOMY_MISMATCH', `baseline regions do not match current taxonomy: ${regionCodes.join(',')}`);
  }

  for (const [polityId, regionCode] of Object.entries(baseline.polity_geography || {})) {
    assertCanonicalUuid(polityId, 'baseline polity_geography key');
    if (!taxonomy.macroCodes.has(regionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `baseline polity ${polityId}: ${regionCode}`);
  }
  for (const [polityId, subregionCode] of Object.entries(baseline.polity_subregions || {})) {
    const regionCode = baseline.polity_geography?.[polityId];
    const parent = taxonomy.subregionParent.get(subregionCode);
    if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `baseline polity ${polityId}: ${subregionCode}`);
    if (parent !== regionCode) fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `baseline polity ${polityId}: ${subregionCode} is not a child of ${regionCode}`);
  }
  const reviewSeen = new Set();
  for (const [index, raw] of (baseline.review_queue || []).entries()) {
    const decision = normalizeReviewDecision(raw, `baseline review_queue[${index}]`);
    if (reviewSeen.has(decision.polity_id)) fail('DUPLICATE_SPATIAL_REVIEW_DECISION', `baseline review_queue duplicate ${decision.polity_id}`);
    if (baseline.polity_geography?.[decision.polity_id] != null) {
      fail('CONFLICTING_SPATIAL_DISPOSITION', `baseline polity ${decision.polity_id} has both static geography and review_queue disposition`);
    }
    reviewSeen.add(decision.polity_id);
  }
  return baseline;
}

function normalizeShard(shardEntry) {
  const source = text(shardEntry?.source) || '(memory)';
  const shard = asObject(shardEntry?.value, `shard ${source}`);
  if (shard.schema !== REVIEWED_BINDING_SHARD_SCHEMA) {
    fail('INVALID_SPATIAL_BINDING_SHARD_SCHEMA', `${source}: schema must be ${REVIEWED_BINDING_SHARD_SCHEMA}`);
  }
  const shardId = text(shard.shard_id);
  if (!SHARD_ID_PATTERN.test(shardId)) fail('INVALID_SPATIAL_BINDING_SHARD_ID', `${source}: invalid shard_id ${shardId || '(empty)'}`);
  const reviewedAt = assertIsoInstant(shard.reviewed_at, `${source} reviewed_at`);
  const baseline = text(shard.baseline);
  if (!baseline) fail('INVALID_SPATIAL_BINDING_BASELINE', `${source}: baseline is required`);

  const rawBindings = shard.bindings == null ? [] : shard.bindings;
  const rawReviewQueue = shard.review_queue == null ? [] : shard.review_queue;
  if (!Array.isArray(rawBindings)) fail('INVALID_SPATIAL_BINDINGS', `${source}: bindings must be an array when present`);
  if (!Array.isArray(rawReviewQueue)) fail('INVALID_SPATIAL_REVIEW_QUEUE', `${source}: review_queue must be an array when present`);
  if (rawBindings.length === 0 && rawReviewQueue.length === 0) {
    fail('INVALID_SPATIAL_BINDINGS', `${source}: at least one binding or review_queue decision is required`);
  }

  const taxonomy = taxonomyContract();
  const localSeen = new Set();
  const bindings = rawBindings.map((raw, index) => {
    const binding = asObject(raw, `${source} bindings[${index}]`);
    const polityId = text(binding.polity_id);
    const regionCode = text(binding.region_code);
    const subregionCode = binding.subregion_code == null ? null : text(binding.subregion_code);
    assertCanonicalUuid(polityId, `${source} bindings[${index}].polity_id`);
    if (localSeen.has(polityId)) fail('DUPLICATE_SPATIAL_DISPOSITION', `${source}: duplicate polity_id ${polityId}`);
    localSeen.add(polityId);
    if (!taxonomy.macroCodes.has(regionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `${source} polity ${polityId}: ${regionCode || '(empty)'}`);
    if (subregionCode) {
      const parent = taxonomy.subregionParent.get(subregionCode);
      if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `${source} polity ${polityId}: ${subregionCode}`);
      if (parent !== regionCode) fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `${source} polity ${polityId}: ${subregionCode} is not a child of ${regionCode}`);
    }
    return Object.freeze({ polity_id: polityId, region_code: regionCode, subregion_code: subregionCode });
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  const reviewQueue = rawReviewQueue.map((raw, index) => {
    const decision = normalizeReviewDecision(raw, `${source} review_queue[${index}]`);
    if (localSeen.has(decision.polity_id)) fail('DUPLICATE_SPATIAL_DISPOSITION', `${source}: duplicate polity_id ${decision.polity_id}`);
    localSeen.add(decision.polity_id);
    return decision;
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  return Object.freeze({ source, shard_id: shardId, reviewed_at: reviewedAt, baseline, bindings, review_queue: reviewQueue });
}

function sourceMapping(regionCode, subregionCode = null) {
  return Object.freeze({ region_code: regionCode, subregion_code: subregionCode || null });
}

function mappingLabel(mapping) {
  return `${mapping.region_code}/${mapping.subregion_code || '(macro-only)'}`;
}

function generatedAtFor(baseline, shards, corrections = []) {
  const instants = [];
  if (text(baseline.generated_at)) instants.push(assertIsoInstant(baseline.generated_at, 'baseline generated_at'));
  for (const shard of shards) instants.push(shard.reviewed_at);
  for (const correction of corrections) instants.push(correction.reviewed_at);
  if (!instants.length) return baseline.generated_at ?? null;
  return instants.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
}

export function compileSpatialBindings({ baseline, shards = [], corrections = [] }) {
  validateCanonicalBaseline(baseline);
  const normalizedCorrections = corrections.map(normalizeSpatialCorrectionFile).sort((left, right) => {
    const idOrder = left.correction_id.localeCompare(right.correction_id, 'en');
    return idOrder || left.source.localeCompare(right.source, 'en');
  });
  const normalizedShards = shards.map(normalizeShard).sort((left, right) => {
    const idOrder = left.shard_id.localeCompare(right.shard_id, 'en');
    return idOrder || left.source.localeCompare(right.source, 'en');
  });

  const shardIds = new Set();
  for (const shard of normalizedShards) {
    if (shardIds.has(shard.shard_id)) fail('DUPLICATE_SPATIAL_SHARD_ID', `duplicate shard_id ${shard.shard_id}`);
    shardIds.add(shard.shard_id);
  }

  const polityGeography = { ...(baseline.polity_geography || {}) };
  const politySubregions = { ...(baseline.polity_subregions || {}) };
  const placeFunctionRecords = structuredClone(baseline.place_function_records || []);
  const reviewQueue = structuredClone(baseline.review_queue || []);
  const seen = new Map();

  for (const [polityId, regionCode] of Object.entries(polityGeography)) {
    seen.set(polityId, { source: 'baseline', kind: 'binding', mapping: sourceMapping(regionCode, politySubregions[polityId] || null) });
  }
  for (const [index, raw] of reviewQueue.entries()) {
    const decision = normalizeReviewDecision(raw, `baseline review_queue[${index}]`);
    const previous = seen.get(decision.polity_id);
    if (previous) fail('CONFLICTING_SPATIAL_DISPOSITION', `${decision.polity_id}: baseline has both binding and review_queue disposition`);
    seen.set(decision.polity_id, { source: 'baseline review_queue', kind: 'review', reason: decision.reason });
  }
  for (const [index, record] of placeFunctionRecords.entries()) {
    const polityId = text(record?.polity_id);
    assertCanonicalUuid(polityId, `baseline place_function_records[${index}].polity_id`);
    const previous = seen.get(polityId);
    if (previous) fail('CONFLICTING_SPATIAL_DISPOSITION', `${polityId}: baseline place-function conflicts with ${previous.source}`);
    seen.set(polityId, { source: 'baseline place_function_records', kind: 'place_function' });
  }

  for (const shard of normalizedShards) {
    for (const binding of shard.bindings) {
      const nextMapping = sourceMapping(binding.region_code, binding.subregion_code);
      const previous = seen.get(binding.polity_id);
      if (previous) {
        if (previous.kind !== 'binding') {
          fail('CONFLICTING_SPATIAL_DISPOSITION', `${binding.polity_id}: ${previous.source}=${previous.kind}; ${shard.source}=${mappingLabel(nextMapping)}`);
        }
        const same = previous.mapping.region_code === nextMapping.region_code && previous.mapping.subregion_code === nextMapping.subregion_code;
        const code = same ? 'DUPLICATE_POLITY_BINDING' : 'CONFLICTING_POLITY_BINDING';
        fail(code, `${binding.polity_id}: ${previous.source}=${mappingLabel(previous.mapping)}; ${shard.source}=${mappingLabel(nextMapping)}`);
      }
      seen.set(binding.polity_id, { source: shard.source, kind: 'binding', mapping: nextMapping });
      polityGeography[binding.polity_id] = binding.region_code;
      if (binding.subregion_code) politySubregions[binding.polity_id] = binding.subregion_code;
    }
    for (const decision of shard.review_queue) {
      const previous = seen.get(decision.polity_id);
      if (previous) {
        const code = previous.kind === 'review' ? 'DUPLICATE_SPATIAL_REVIEW_DECISION' : 'CONFLICTING_SPATIAL_DISPOSITION';
        fail(code, `${decision.polity_id}: ${previous.source} already owns a ${previous.kind} disposition; ${shard.source}=review`);
      }
      seen.set(decision.polity_id, { source: shard.source, kind: 'review', reason: decision.reason });
      reviewQueue.push({ polity_id: decision.polity_id, reason: decision.reason });
    }
  }

  const merged = {};
  for (const [key, value] of Object.entries(baseline)) {
    if (key === 'generated_at') merged[key] = generatedAtFor(baseline, normalizedShards);
    else if (key === 'polity_geography') merged[key] = polityGeography;
    else if (key === 'polity_subregions') merged[key] = politySubregions;
    else if (key === 'place_function_records') merged[key] = placeFunctionRecords;
    else if (key === 'review_queue') merged[key] = reviewQueue;
    else merged[key] = structuredClone(value);
  }
  if (!Object.prototype.hasOwnProperty.call(merged, 'polity_subregions')) merged.polity_subregions = politySubregions;
  if (!Object.prototype.hasOwnProperty.call(merged, 'place_function_records')) merged.place_function_records = placeFunctionRecords;
  if (!Object.prototype.hasOwnProperty.call(merged, 'review_queue')) merged.review_queue = reviewQueue;

  const corrected = applyNormalizedSpatialCorrections(merged, normalizedCorrections);
  corrected.generated_at = generatedAtFor(baseline, normalizedShards, normalizedCorrections);

  const validation = model.validateSpatialIndex(corrected);
  if (!validation.valid) fail('COMPILED_SPATIAL_INDEX_INVALID', validation.errors.join(' | '));
  return Object.freeze({ index: corrected, stats: computeSpatialStats(corrected) });
}

export function computeSpatialStats(index) {
  validateCanonicalBaseline(index);
  const taxonomy = taxonomyContract();
  const macroregionCounts = Object.fromEntries(taxonomy.macroOrder.map((code) => [code, 0]));
  const subregionCounts = Object.fromEntries(taxonomy.subregionOrder.map((code) => [code, 0]));
  for (const code of Object.values(index.polity_geography || {})) macroregionCounts[code] += 1;
  for (const code of Object.values(index.polity_subregions || {})) {
    if (Object.prototype.hasOwnProperty.call(subregionCounts, code)) subregionCounts[code] += 1;
    else fail('UNKNOWN_SPATIAL_SUBREGION', `stats: ${code}`);
  }
  return Object.freeze({
    geography_count: Object.keys(index.polity_geography || {}).length,
    subregion_count: Object.keys(index.polity_subregions || {}).length,
    review_queue_count: (index.review_queue || []).length,
    macroregion_counts: Object.freeze(macroregionCounts),
    subregion_counts: Object.freeze(subregionCounts)
  });
}

export function serializeSpatialIndex(index) {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function loadReviewedBindingShards(shardsDir) {
  if (!fs.existsSync(shardsDir)) return [];
  return fs.readdirSync(shardsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.bindings.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => ({
      source: name,
      value: JSON.parse(fs.readFileSync(path.join(shardsDir, name), 'utf8'))
    }));
}

export function loadReviewedSpatialCorrections(correctionsDir) {
  if (!fs.existsSync(correctionsDir)) return [];
  return fs.readdirSync(correctionsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.corrections.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => ({
      source: name,
      value: JSON.parse(fs.readFileSync(path.join(correctionsDir, name), 'utf8'))
    }));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const options = {
    baselinePath: 'spatial/reviewed-bindings/0000-migrated-baseline.index.json',
    shardsDir: 'spatial/reviewed-bindings/shards',
    correctionsDir: 'spatial/reviewed-bindings/corrections',
    outPath: 'atlas-polity-spatial-index.json',
    check: false,
    validateOnly: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    switch (arg) {
      case '--baseline': options.baselinePath = value; index += 1; break;
      case '--shards-dir': options.shardsDir = value; index += 1; break;
      case '--corrections-dir': options.correctionsDir = value; index += 1; break;
      case '--out': options.outPath = value; index += 1; break;
      case '--check': options.check = true; break;
      case '--validate-only': options.validateOnly = true; break;
      default: fail('INVALID_SPATIAL_COMPILER_ARGUMENT', `unknown argument ${arg}`);
    }
  }
  if (options.check && options.validateOnly) fail('INVALID_SPATIAL_COMPILER_ARGUMENT', '--check and --validate-only are mutually exclusive');
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const baseline = readJson(options.baselinePath);
  const shards = loadReviewedBindingShards(options.shardsDir);
  const corrections = loadReviewedSpatialCorrections(options.correctionsDir);
  const result = compileSpatialBindings({ baseline, shards, corrections });
  const serialized = serializeSpatialIndex(result.index);

  if (options.validateOnly) {
    process.stdout.write(`${JSON.stringify(result.stats, null, 2)}\n`);
    return result;
  }
  if (options.check) {
    const actual = fs.readFileSync(options.outPath, 'utf8');
    if (actual !== serialized) fail('SPATIAL_CANONICAL_OUT_OF_SYNC', `${options.outPath} does not match deterministic compiled output`);
  } else {
    fs.writeFileSync(options.outPath, serialized, 'utf8');
  }
  process.stdout.write(`${JSON.stringify(result.stats, null, 2)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();