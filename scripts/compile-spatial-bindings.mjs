import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const model = require('../atlas-person-spacetime-model.js');
const spaceAxis = require('../atlas-person-spacetime-space-axis.js');

export const REVIEWED_BINDING_SHARD_SCHEMA = 'atlas-reviewed-spatial-bindings/v1';
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
  if (!Array.isArray(shard.bindings) || shard.bindings.length === 0) fail('INVALID_SPATIAL_BINDINGS', `${source}: bindings must be a non-empty array`);

  const taxonomy = taxonomyContract();
  const localSeen = new Set();
  const bindings = shard.bindings.map((raw, index) => {
    const binding = asObject(raw, `${source} bindings[${index}]`);
    const polityId = text(binding.polity_id);
    const regionCode = text(binding.region_code);
    const subregionCode = binding.subregion_code == null ? null : text(binding.subregion_code);
    assertCanonicalUuid(polityId, `${source} bindings[${index}].polity_id`);
    if (localSeen.has(polityId)) fail('DUPLICATE_POLITY_BINDING', `${source}: duplicate polity_id ${polityId}`);
    localSeen.add(polityId);
    if (!taxonomy.macroCodes.has(regionCode)) fail('UNKNOWN_SPATIAL_MACROREGION', `${source} polity ${polityId}: ${regionCode || '(empty)'}`);
    if (subregionCode) {
      const parent = taxonomy.subregionParent.get(subregionCode);
      if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `${source} polity ${polityId}: ${subregionCode}`);
      if (parent !== regionCode) fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `${source} polity ${polityId}: ${subregionCode} is not a child of ${regionCode}`);
    }
    return Object.freeze({ polity_id: polityId, region_code: regionCode, subregion_code: subregionCode });
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  return Object.freeze({ source, shard_id: shardId, reviewed_at: reviewedAt, baseline, bindings });
}

function sourceMapping(regionCode, subregionCode = null) {
  return Object.freeze({ region_code: regionCode, subregion_code: subregionCode || null });
}

function mappingLabel(mapping) {
  return `${mapping.region_code}/${mapping.subregion_code || '(macro-only)'}`;
}

function generatedAtFor(baseline, shards) {
  const instants = [];
  if (text(baseline.generated_at)) instants.push(assertIsoInstant(baseline.generated_at, 'baseline generated_at'));
  for (const shard of shards) instants.push(shard.reviewed_at);
  if (!instants.length) return baseline.generated_at ?? null;
  return instants.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
}

export function compileSpatialBindings({ baseline, shards = [] }) {
  validateCanonicalBaseline(baseline);
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
  const seen = new Map();
  for (const [polityId, regionCode] of Object.entries(polityGeography)) {
    seen.set(polityId, { source: 'baseline', mapping: sourceMapping(regionCode, politySubregions[polityId] || null) });
  }

  for (const shard of normalizedShards) {
    for (const binding of shard.bindings) {
      const nextMapping = sourceMapping(binding.region_code, binding.subregion_code);
      const previous = seen.get(binding.polity_id);
      if (previous) {
        const same = previous.mapping.region_code === nextMapping.region_code && previous.mapping.subregion_code === nextMapping.subregion_code;
        const code = same ? 'DUPLICATE_POLITY_BINDING' : 'CONFLICTING_POLITY_BINDING';
        fail(code, `${binding.polity_id}: ${previous.source}=${mappingLabel(previous.mapping)}; ${shard.source}=${mappingLabel(nextMapping)}`);
      }
      seen.set(binding.polity_id, { source: shard.source, mapping: nextMapping });
      polityGeography[binding.polity_id] = binding.region_code;
      if (binding.subregion_code) politySubregions[binding.polity_id] = binding.subregion_code;
    }
  }

  const compiled = {};
  for (const [key, value] of Object.entries(baseline)) {
    if (key === 'generated_at') compiled[key] = generatedAtFor(baseline, normalizedShards);
    else if (key === 'polity_geography') compiled[key] = polityGeography;
    else if (key === 'polity_subregions') compiled[key] = politySubregions;
    else compiled[key] = structuredClone(value);
  }
  if (!Object.prototype.hasOwnProperty.call(compiled, 'polity_subregions')) compiled.polity_subregions = politySubregions;

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const options = {
    baselinePath: 'spatial/reviewed-bindings/0000-migrated-baseline.index.json',
    shardsDir: 'spatial/reviewed-bindings/shards',
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
  const result = compileSpatialBindings({ baseline, shards });
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
