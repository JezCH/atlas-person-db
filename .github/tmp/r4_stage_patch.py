from pathlib import Path


def replace_exact(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old!r}")
    p.write_text(text.replace(old, new, 1))


# 1) Generic/current compiler must validate only active taxonomy.
replace_exact(
    'scripts/compile-spatial-bindings.mjs',
    "const LEGACY_BASELINE_SUBREGION_PARENT = new Map([\n  ['east-africa-horn', 'africa']\n]);\n\n",
    ''
)
replace_exact(
    'scripts/compile-spatial-bindings.mjs',
    '    const parent = taxonomy.subregionParent.get(subregionCode) || LEGACY_BASELINE_SUBREGION_PARENT.get(subregionCode);',
    '    const parent = taxonomy.subregionParent.get(subregionCode);'
)
replace_exact(
    'scripts/compile-spatial-bindings.mjs',
    "    if (Object.prototype.hasOwnProperty.call(subregionCounts, code)) subregionCounts[code] += 1;\n    else if (!LEGACY_BASELINE_SUBREGION_PARENT.has(code)) fail('UNKNOWN_SPATIAL_SUBREGION', `stats: ${code}`);",
    "    if (Object.prototype.hasOwnProperty.call(subregionCounts, code)) subregionCounts[code] += 1;\n    else fail('UNKNOWN_SPATIAL_SUBREGION', `stats: ${code}`);"
)

# 2) r4 orchestration owns retired-source handling. It validates/splits every
# manifest first, migrates retired FROM codes before the strict compiler,
# compiles reviewed shards, then applies active-to-active migrations.
replace_exact(
    'scripts/compile-spatial-bindings-r4.mjs',
    "import { applySpatialTaxonomyMigration } from './spatial-taxonomy-migration.mjs';",
    "import {\n  applySpatialTaxonomyMigration,\n  normalizeSpatialTaxonomyMigration,\n  SPATIAL_TAXONOMY_MIGRATION_SCHEMA\n} from './spatial-taxonomy-migration.mjs';"
)

marker = '\nfunction parseArgs(argv) {'
insertion = r'''

function migrationPhaseEntry(source, normalized, phase, migrations) {
  if (!migrations.length) return null;
  return Object.freeze({
    source: `${source}#${phase}`,
    value: Object.freeze({
      schema: SPATIAL_TAXONOMY_MIGRATION_SCHEMA,
      migration_id: `${normalized.migration_id}:${phase}`,
      migrations: Object.freeze(migrations.map((migration) => Object.freeze({
        polity_id: migration.polity_id,
        from: migration.from,
        to: migration.to,
        reason: migration.reason
      })))
    })
  });
}

export function partitionTaxonomyMigrationManifests(manifests) {
  const taxonomy = taxonomyContract();
  const precompile = [];
  const postcompile = [];
  const seen = new Map();

  for (const manifestEntry of manifests) {
    const source = manifestEntry?.source || '(memory)';
    const normalized = normalizeSpatialTaxonomyMigration(manifestEntry?.value, taxonomy);
    const retiredSource = [];
    const activeSource = [];

    for (const migration of normalized.migrations) {
      const previous = seen.get(migration.polity_id);
      if (previous) {
        fail('DUPLICATE_SPATIAL_TAXONOMY_MIGRATION', `${migration.polity_id}: ${previous} and ${source}`);
      }
      seen.set(migration.polity_id, source);
      if (migration.from.subregion_code && LEGACY_SUBREGION_PARENT.has(migration.from.subregion_code)) {
        retiredSource.push(migration);
      } else {
        activeSource.push(migration);
      }
    }

    const before = migrationPhaseEntry(source, normalized, 'precompile-retired-source', retiredSource);
    const after = migrationPhaseEntry(source, normalized, 'postcompile-active-source', activeSource);
    if (before) precompile.push(before);
    if (after) postcompile.push(after);
  }

  return Object.freeze({
    precompile: Object.freeze(precompile),
    postcompile: Object.freeze(postcompile),
    migration_polity_ids: Object.freeze([...seen.keys()].sort())
  });
}

export function prepareCurrentTaxonomyBaseline(retainedBaseline, manifests) {
  const phases = partitionTaxonomyMigrationManifests(manifests);
  const migrated = applyTaxonomyMigrationManifests(retainedBaseline, phases.precompile);
  return Object.freeze({
    baseline: migrated.baseline,
    migrated_polity_ids: migrated.migrated_polity_ids,
    postcompile: phases.postcompile,
    migration_polity_ids: phases.migration_polity_ids
  });
}

export function compileSpatialBindingsR4({ baseline, shards = [], manifests = [] }) {
  const prepared = prepareCurrentTaxonomyBaseline(baseline, manifests);
  const reviewed = compileSpatialBindings({ baseline: prepared.baseline, shards });
  const migrated = applyTaxonomyMigrationManifests(reviewed.index, prepared.postcompile);
  const migratedPolityIds = [...prepared.migrated_polity_ids, ...migrated.migrated_polity_ids].sort();

  if (JSON.stringify(migratedPolityIds) !== JSON.stringify(prepared.migration_polity_ids)) {
    fail('SPATIAL_TAXONOMY_MIGRATION_COVERAGE_MISMATCH', 'not every reviewed taxonomy migration was applied exactly once');
  }

  return Object.freeze({
    index: migrated.baseline,
    stats: computeSpatialStats(migrated.baseline),
    migrated_polity_ids: Object.freeze(migratedPolityIds)
  });
}
'''
p = Path('scripts/compile-spatial-bindings-r4.mjs')
text = p.read_text()
if text.count(marker) != 1:
    raise SystemExit('compile-spatial-bindings-r4.mjs: parseArgs marker mismatch')
p.write_text(text.replace(marker, insertion + marker, 1))

replace_exact(
    'scripts/compile-spatial-bindings-r4.mjs',
    "  const retainedBaseline = readJson(options.baselinePath);\n  const shards = loadReviewedBindingShards(options.shardsDir);\n  const currentReviewed = compileSpatialBindings({ baseline: retainedBaseline, shards });\n  const migrations = loadTaxonomyMigrationManifests(options.migrationDir);\n  const migrated = applyTaxonomyMigrationManifests(currentReviewed.index, migrations);\n  const result = Object.freeze({\n    index: migrated.baseline,\n    stats: computeSpatialStats(migrated.baseline)\n  });",
    "  const retainedBaseline = readJson(options.baselinePath);\n  const shards = loadReviewedBindingShards(options.shardsDir);\n  const migrations = loadTaxonomyMigrationManifests(options.migrationDir);\n  const result = compileSpatialBindingsR4({ baseline: retainedBaseline, shards, manifests: migrations });"
)
replace_exact(
    'scripts/compile-spatial-bindings-r4.mjs',
    'migrated_polity_count: migrated.migrated_polity_ids.length',
    'migrated_polity_count: result.migrated_polity_ids.length'
)

# 3) Compiler tests use only the precompiled active baseline. Canonical equality
# must go through the full staged r4 orchestration.
replace_exact(
    'tests/spatial-binding-compiler.test.mjs',
    "import {\n  applyTaxonomyMigrationManifests,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';",
    "import {\n  compileSpatialBindingsR4,\n  loadTaxonomyMigrationManifests,\n  prepareCurrentTaxonomyBaseline\n} from '../scripts/compile-spatial-bindings-r4.mjs';"
)
replace_exact(
    'tests/spatial-binding-compiler.test.mjs',
    "const baseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));\nconst canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');\nconst canonical = JSON.parse(canonicalRaw);\nconst shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));\nconst migrationDir = fileURLToPath(new URL('../spatial/taxonomy-migrations', import.meta.url));\nconst reviewedShards = loadReviewedBindingShards(shardsDir);",
    "const retainedBaseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));\nconst canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');\nconst canonical = JSON.parse(canonicalRaw);\nconst shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));\nconst migrationDir = fileURLToPath(new URL('../spatial/taxonomy-migrations', import.meta.url));\nconst reviewedShards = loadReviewedBindingShards(shardsDir);\nconst migrationManifests = loadTaxonomyMigrationManifests(migrationDir);\nconst baseline = prepareCurrentTaxonomyBaseline(retainedBaseline, migrationManifests).baseline;"
)
replace_exact(
    'tests/spatial-binding-compiler.test.mjs',
    "test('canonical runtime index is exactly the deterministic r4 compiler output for all reviewed sources', () => {\n  const reviewed = compileSpatialBindings({ baseline, shards: reviewedShards });\n  const migrated = applyTaxonomyMigrationManifests(\n    reviewed.index,\n    loadTaxonomyMigrationManifests(migrationDir)\n  );\n  assert.deepEqual(migrated.baseline, canonical);\n  assert.equal(serializeSpatialIndex(migrated.baseline), canonicalRaw);\n  assert.deepEqual(computeSpatialStats(migrated.baseline), computeSpatialStats(canonical));\n});",
    "test('canonical runtime index is exactly the deterministic staged r4 compiler output for all reviewed sources', () => {\n  const reviewed = compileSpatialBindingsR4({\n    baseline: retainedBaseline,\n    shards: reviewedShards,\n    manifests: migrationManifests\n  });\n  assert.deepEqual(reviewed.index, canonical);\n  assert.equal(serializeSpatialIndex(reviewed.index), canonicalRaw);\n  assert.deepEqual(computeSpatialStats(reviewed.index), computeSpatialStats(canonical));\n});"
)

# 4) Regression test proves historical source is rejected by the strict compiler,
# yet the r4 migration orchestrator consumes it completely and emits no retired leaf.
replace_exact(
    'tests/spatial-taxonomy-r4-compiler.test.mjs',
    "import {\n  applyTaxonomyMigrationManifests,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';",
    "import {\n  compileSpatialBindingsR4,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';"
)
replace_exact(
    'tests/spatial-taxonomy-r4-compiler.test.mjs',
    "test('r4 reviewed static migration manifest matches the current reviewed spatial source exactly', () => {\n  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));\n  const currentReviewed = compileSpatialBindings({\n    baseline: retainedBaseline,\n    shards: loadReviewedBindingShards(shardDir)\n  });\n  const migrations = loadTaxonomyMigrationManifests(migrationDir);\n  const migrated = applyTaxonomyMigrationManifests(currentReviewed.index, migrations);\n\n  assert.equal(migrated.migrated_polity_ids.length, expected.size);\n  assert.deepEqual(new Set(migrated.migrated_polity_ids), new Set(expected.keys()));\n  for (const [polityId, subregion] of expected) {\n    assert.equal(migrated.baseline.polity_subregions[polityId], subregion, polityId);\n  }\n\n  const compiled = compileSpatialBindings({ baseline: migrated.baseline, shards: [] });\n  for (const [polityId, subregion] of expected) {\n    assert.equal(compiled.index.polity_subregions[polityId], subregion, polityId);\n  }\n});",
    "test('r4 stages retired-source migrations before strict compile and active-source migrations after shard merge', () => {\n  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));\n  assert.throws(\n    () => compileSpatialBindings({ baseline: retainedBaseline, shards: [] }),\n    { code: 'INVALID_SPATIAL_BASELINE' }\n  );\n\n  const migrations = loadTaxonomyMigrationManifests(migrationDir);\n  const compiled = compileSpatialBindingsR4({\n    baseline: retainedBaseline,\n    shards: loadReviewedBindingShards(shardDir),\n    manifests: migrations\n  });\n\n  assert.equal(compiled.migrated_polity_ids.length, expected.size);\n  assert.deepEqual(new Set(compiled.migrated_polity_ids), new Set(expected.keys()));\n  for (const [polityId, subregion] of expected) {\n    assert.equal(compiled.index.polity_subregions[polityId], subregion, polityId);\n  }\n  assert.equal(\n    Object.values(compiled.index.polity_subregions).includes('east-africa-horn'),\n    false,\n    'strict compiled output must contain zero retired east-africa-horn assignments'\n  );\n});"
)
