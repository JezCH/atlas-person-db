import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const model = require('../atlas-person-spacetime-model.js');
const spaceAxis = require('../atlas-person-spacetime-space-axis.js');

export const REVIEWED_BINDING_SHARD_SCHEMA = 'atlas-reviewed-spatial-bindings/v1';
export const REVIEWED_CORRECTION_SCHEMA = 'atlas-reviewed-spatial-corrections/v1';
export const CANONICAL_SPATIAL_INDEX_SCHEMA = 'atlas-polity-spatial-index/v2';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

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

function normalizeCorrectionManifest(correctionEntry) {
  const source = text(correctionEntry?.source) || '(memory correction)';
  const manifest = asObject(correctionEntry?.value, `correction ${source}`);
  if (manifest.schema !== REVIEWED_CORRECTION_SCHEMA) {
    fail('INVALID_SPATIAL_CORRECTION_SCHEMA', `${source}: schema must be ${REVIEWED_CORRECTION_SCHEMA}`);
  }
  const correctionId = text(manifest.correction_id);
  if (!SHARD_ID_PATTERN.test(correctionId)) fail('INVALID_SPATIAL_CORRECTION_ID', `${source}: invalid correction_id ${correctionId || '(empty)'}`);
  const reviewedAt = assertIsoInstant(manifest.reviewed_at, `${source} reviewed_at`);
  const baseline = text(manifest.baseline);
  if (!baseline) fail('INVALID_SPATIAL_CORRECTION_BASELINE', `${source}: baseline is required`);
  if (!Array.isArray(manifest.review_refs) || manifest.review_refs.length === 0 || manifest.review_refs.some((ref) => !text(ref))) {
    fail('INVALID_SPATIAL_CORRECTION_PROVENANCE', `${source}: non-empty review_refs are required`);
  }
  if (!Array.isArray(manifest.corrections) || manifest.corrections.length === 0) {
    fail('INVALID_SPATIAL_CORRECTIONS', `${source}: corrections must be a non-empty array`);
  }

  const taxonomy = taxonomyContract();
  const localSeen = new Set();
  const corrections = manifest.corrections.map((raw, index) => {
    const correction = asObject(raw, `${source} corrections[${index}]`);
    const polityId = text(correction.polity_id);
    const expectedRegionCode = text(correction.expected_region_code);
    const expectedSubregionCode = correction.expected_subregion_code == null ? null : text(correction.expected_subregion_code);
    const regionCode = text(correction.region_code);
    const subregionCode = text(correction.subregion_code);
    assertCanonicalUuid(polityId, `${source} corrections[${index}].polity_id`);
    if (localSeen.has(polityId)) fail('DUPLICATE_SPATIAL_CORRECTION', `${source}: duplicate polity_id ${polityId}`);
    localSeen.add(polityId);
    if (!taxonomy.macroCodes.has(expectedRegionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `${source} polity ${polityId}: expected ${expectedRegionCode || '(empty)'}`);
    if (expectedSubregionCode !== null) fail('INVALID_SPATIAL_PRECISION_CORRECTION', `${source} polity ${polityId}: expected_subregion_code must be null`);
    if (regionCode !== expectedRegionCode) fail('SPATIAL_CORRECTION_MACRO_CROSSING', `${source} polity ${polityId}: ${expectedRegionCode} -> ${regionCode}`);
    const parent = taxonomy.subregionParent.get(subregionCode);
    if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `${source} polity ${polityId}: ${subregionCode || '(empty)'}`);
    if (parent !== regionCode) fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `${source} polity ${polityId}: ${subregionCode} is not a child of ${regionCode}`);
    return Object.freeze({
      polity_id: polityId,
      expected_region_code: expectedRegionCode,
      expected_subregion_code: null,
      region_code: regionCode,
      subregion_code: subregionCode
    });
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  return Object.freeze({
    source,
    correction_id: correctionId,
    reviewed_at: reviewedAt,
    baseline,
    review_refs: Object.freeze(manifest.review_refs.map((ref) => text(ref))),
    corrections
  });
}

function sourceMapping(regionCode, subregionCode = null) {
  return Object.freeze({ region_code: regionCode, subregion_code: subregionCode || null });
}

function mappingLabel(mapping) {
  return `${mapping.region_code}/${mapping.subregion_code || '(macro-only)'}`;
}

function generatedAtFor(baseline, shards, corrections) {
  const instants = [];
  if (text(baseline.generated_at)) instants.push(assertIsoInstant(baseline.generated_at, 'baseline generated_at'));
  for (const shard of shards) instants.push(shard.reviewed_at);
  for (const correction of corrections) instants.push(correction.reviewed_at);
  if (!instants.length) return baseline.generated_at ?? null;
  return instants.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
}

export function compileSpatialBindings({ baseline, shards = [], corrections = [] }) {
  validateCanonicalBaseline(baseline);
  const normalizedShards = shards.map(normalizeShard).sort((left, right) => {
    const idOrder = left.shard_id.localeCompare(right.shard_id, 'en');
    return idOrder || left.source.localeCompare(right.source, 'en');
  });
  const normalizedCorrections = corrections.map(normalizeCorrectionManifest).sort((left, right) => {
    const idOrder = left.correction_id.localeCompare(right.correction_id, 'en');
    return idOrder || left.source.localeCompare(right.source, 'en');
  });

  const shardIds = new Set();
  for (const shard of normalizedShards) {
    if (shardIds.has(shard.shard_id)) fail('DUPLICATE_SPATIAL_SHARD_ID', `duplicate shard_id ${shard.shard_id}`);
    shardIds.add(shard.shard_id);
  }
  const correctionIds = new Set();
  const correctedPolities = new Set();
  for (const manifest of normalizedCorrections) {
    if (correctionIds.has(manifest.correction_id)) fail('DUPLICATE_SPATIAL_CORRECTION_ID', `duplicate correction_id ${manifest.correction_id}`);
    correctionIds.add(manifest.correction_id);
    for (const correction of manifest.corrections) {
      if (correctedPolities.has(correction.polity_id)) fail('DUPLICATE_SPATIAL_CORRECTION', `duplicate correction target ${correction.polity_id}`);
      correctedPolities.add(correction.polity_id);
    }
  }

  const polityGeography = { ...(baseline.polity_geography || {}) };
  const politySubregions = { ...(baseline.polity_subregions || {}) };
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

  for (const shard of normalizedShards) {
    for (const binding of shard.bindings) {
      const nextMapping = sourceMapping(binding.region_code, binding.subregion_code);
      const previous = seen.get(binding.polity_id);
      if (previous) {
        if (previous.kind === 'review') {
          fail('CONFLICTING_SPATIAL_DISPOSITION', `${binding.polity_id}: ${previous.source}=review; ${shard.source}=${mappingLabel(nextMapping)}`);
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

  for (const manifest of normalizedCorrections) {
    for (const correction of manifest.corrections) {
      const previous = seen.get(correction.polity_id);
      if (!previous) fail('UNKNOWN_SPATIAL_CORRECTION_TARGET', `${manifest.source}: ${correction.polity_id} is not owned by the compiled baseline`);
      if (previous.kind !== 'binding' || previous.source !== 'baseline') {
        fail('INVALID_SPATIAL_CORRECTION_OWNER', `${manifest.source}: ${correction.polity_id} must be owned by baseline, found ${previous.source}/${previous.kind}`);
      }
      const currentRegion = polityGeography[correction.polity_id] ?? null;
      const currentSubregion = politySubregions[correction.polity_id] ?? null;
      if (currentRegion !== correction.expected_region_code || currentSubregion !== correction.expected_subregion_code) {
        fail('SPATIAL_CORRECTION_STALE_BEFORE', `${manifest.source}: ${correction.polity_id} expected ${correction.expected_region_code}/${correction.expected_subregion_code || '(macro-only)'} but found ${currentRegion || '(none)'}/${currentSubregion || '(macro-only)'}`);
      }
      polityGeography[correction.polity_id] = correction.region_code;
      politySubregions[correction.polity_id] = correction.subregion_code;
      seen.set(correction.polity_id, {
        source: manifest.source,
        kind: 'binding',
        mapping: sourceMapping(correction.region_code, correction.subregion_code)
      });
    }
  }

  const compiled = {};
  for (const [key, value] of Object.entries(baseline)) {
    if (key === 'generated_at') compiled[key] = generatedAtFor(baseline, normalizedShards, normalizedCorrections);
    else if (key === 'polity_geography') compiled[key] = polityGeography;
    else if (key === 'polity_subregions') compiled[key] = politySubregions;
    else if (key === 'review_queue') compiled[key] = reviewQueue;
    else compiled[key] = structuredClone(value);
  }
  if (!Object.prototype.hasOwnProperty.call(compiled, 'polity_subregions')) compiled.polity_subregions = politySubregions;
  if (!Object.prototype.hasOwnProperty.call(compiled, 'review_queue')) compiled.review_queue = reviewQueue;

  const validation = model.validateSpatialIndex(compiled);
  if (!validation.valid) fail('COMPILED_SPATIAL_INDEX_INVALID', validation.errors.join(' | '));
  return Object.freeze({ index: compiled, stats: computeSpatialStats(compiled) });
}

export function computeSpatialStats(index) {
  validateCanonicalBaseline(index);
  const taxonomy = taxonomyContract();
  const macroregionCounts = Object.fromEntries(taxonomy.macroOrder.map((code) => [code, 0]));
  const subregionCounts = Object.fromEntries(taxonomy.subregionOrder.map((code) => [code, 0]));
  for (const code of Object.values(index.polity_geography || {})) macroregionCounts[code] += 1;
  for (const code of Object.values(index.polity_subregions || {})) subregionCounts[code] += 1;
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

export function loadReviewedCorrectionManifests(correctionsDir) {
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
    correctionsDir: 'spatial/reviewed-binding-corrections',
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
  const corrections = loadReviewedCorrectionManifests(options.correctionsDir);
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
