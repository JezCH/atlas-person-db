import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import {
  compileSpatialBindings,
  loadReviewedBindingShards,
  serializeSpatialIndex
} from './compile-spatial-bindings.mjs';
import { applySpatialTaxonomyMigration } from './spatial-taxonomy-migration.mjs';

const require = createRequire(import.meta.url);
const spaceAxis = require('../atlas-person-spacetime-space-axis.js');

const LEGACY_SUBREGION_PARENT = new Map([['east-africa-horn', 'africa']]);

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function taxonomyContract() {
  const macroCodes = new Set();
  const subregionParent = new Map();
  for (const macro of spaceAxis.DEFAULT_SPATIAL_HIERARCHY) {
    macroCodes.add(macro.code);
    for (const subregion of macro.subregions) subregionParent.set(subregion.code, macro.code);
  }
  return Object.freeze({
    macroCodes,
    subregionParent,
    legacySubregionParent: LEGACY_SUBREGION_PARENT
  });
}

export function loadTaxonomyMigrationManifests(migrationDir) {
  if (!fs.existsSync(migrationDir)) return [];
  return fs.readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => ({ source: name, value: readJson(path.join(migrationDir, name)) }));
}

export function applyTaxonomyMigrationManifests(baseline, manifests) {
  let current = structuredClone(baseline);
  const seen = new Map();
  const taxonomy = taxonomyContract();

  for (const manifestEntry of manifests) {
    const source = manifestEntry?.source || '(memory)';
    const result = applySpatialTaxonomyMigration({ baseline: current, manifest: manifestEntry?.value, taxonomy });
    for (const polityId of result.migrated_polity_ids) {
      const previous = seen.get(polityId);
      if (previous) fail('DUPLICATE_SPATIAL_TAXONOMY_MIGRATION', `${polityId}: ${previous} and ${source}`);
      seen.set(polityId, source);
    }
    current = {
      ...current,
      polity_geography: { ...result.polity_geography },
      polity_subregions: { ...result.polity_subregions }
    };
  }

  return Object.freeze({ baseline: current, migrated_polity_ids: Object.freeze([...seen.keys()].sort()) });
}

function parseArgs(argv) {
  const options = {
    baselinePath: 'spatial/reviewed-bindings/0000-migrated-baseline.index.json',
    shardsDir: 'spatial/reviewed-bindings/shards',
    migrationDir: 'spatial/taxonomy-migrations',
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
      case '--migration-dir': options.migrationDir = value; index += 1; break;
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
  const retainedBaseline = readJson(options.baselinePath);
  const migrations = loadTaxonomyMigrationManifests(options.migrationDir);
  const migrated = applyTaxonomyMigrationManifests(retainedBaseline, migrations);
  const shards = loadReviewedBindingShards(options.shardsDir);
  const result = compileSpatialBindings({ baseline: migrated.baseline, shards });
  const serialized = serializeSpatialIndex(result.index);

  if (options.validateOnly) {
    process.stdout.write(`${JSON.stringify({ ...result.stats, migrated_polity_count: migrated.migrated_polity_ids.length }, null, 2)}\n`);
    return result;
  }
  if (options.check) {
    const actual = fs.readFileSync(options.outPath, 'utf8');
    if (actual !== serialized) fail('SPATIAL_CANONICAL_OUT_OF_SYNC', `${options.outPath} does not match deterministic r4 compiled output`);
  } else {
    fs.writeFileSync(options.outPath, serialized, 'utf8');
  }
  process.stdout.write(`${JSON.stringify({ ...result.stats, migrated_polity_count: migrated.migrated_polity_ids.length }, null, 2)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
