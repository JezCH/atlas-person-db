from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old!r}")
    p.write_text(text.replace(old, new, 1))


def regex_once(path, pattern, replacement):
    p = Path(path)
    text = p.read_text()
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern!r}")
    p.write_text(new_text)


# Strict current-taxonomy compiler: no retired aliases.
replace_once('scripts/compile-spatial-bindings.mjs',
             "const LEGACY_BASELINE_SUBREGION_PARENT = new Map([\n  ['east-africa-horn', 'africa']\n]);\n\n", '')
replace_once('scripts/compile-spatial-bindings.mjs',
             '    const parent = taxonomy.subregionParent.get(subregionCode) || LEGACY_BASELINE_SUBREGION_PARENT.get(subregionCode);',
             '    const parent = taxonomy.subregionParent.get(subregionCode);')
replace_once('scripts/compile-spatial-bindings.mjs',
             "    if (Object.prototype.hasOwnProperty.call(subregionCounts, code)) subregionCounts[code] += 1;\n    else if (!LEGACY_BASELINE_SUBREGION_PARENT.has(code)) fail('UNKNOWN_SPATIAL_SUBREGION', `stats: ${code}`);",
             "    if (Object.prototype.hasOwnProperty.call(subregionCounts, code)) subregionCounts[code] += 1;\n    else fail('UNKNOWN_SPATIAL_SUBREGION', `stats: ${code}`);")

# r4 migration orchestration owns historical retired FROM codes.
replace_once('scripts/compile-spatial-bindings-r4.mjs',
             "import { applySpatialTaxonomyMigration } from './spatial-taxonomy-migration.mjs';",
             "import {\n  applySpatialTaxonomyMigration,\n  normalizeSpatialTaxonomyMigration,\n  SPATIAL_TAXONOMY_MIGRATION_SCHEMA\n} from './spatial-taxonomy-migration.mjs';")

helper = r'''
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
      if (previous) fail('DUPLICATE_SPATIAL_TAXONOMY_MIGRATION', `${migration.polity_id}: ${previous} and ${source}`);
      seen.set(migration.polity_id, source);
      if (migration.from.subregion_code && LEGACY_SUBREGION_PARENT.has(migration.from.subregion_code)) retiredSource.push(migration);
      else activeSource.push(migration);
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
replace_once('scripts/compile-spatial-bindings-r4.mjs', '\nfunction parseArgs(argv) {', '\n' + helper + 'function parseArgs(argv) {')

regex_once('scripts/compile-spatial-bindings-r4.mjs',
           r"  const retainedBaseline = readJson\(options\.baselinePath\);\n  const shards = loadReviewedBindingShards\(options\.shardsDir\);\n  const currentReviewed = compileSpatialBindings\(\{ baseline: retainedBaseline, shards \}\);\n  const migrations = loadTaxonomyMigrationManifests\(options\.migrationDir\);\n  const migrated = applyTaxonomyMigrationManifests\(currentReviewed\.index, migrations\);\n  const result = Object\.freeze\(\{\n    index: migrated\.baseline,\n    stats: computeSpatialStats\(migrated\.baseline\)\n  \}\);",
           "  const retainedBaseline = readJson(options.baselinePath);\n  const shards = loadReviewedBindingShards(options.shardsDir);\n  const migrations = loadTaxonomyMigrationManifests(options.migrationDir);\n  const result = compileSpatialBindingsR4({ baseline: retainedBaseline, shards, manifests: migrations });")

p = Path('scripts/compile-spatial-bindings-r4.mjs')
t = p.read_text()
old = 'migrated_polity_count: migrated.migrated_polity_ids.length'
count = t.count(old)
if count != 2:
    raise SystemExit(f'scripts/compile-spatial-bindings-r4.mjs: expected 2 migrated count references, found {count}')
p.write_text(t.replace(old, 'migrated_polity_count: result.migrated_polity_ids.length'))

# Tests: generic compiler receives only the precompiled active baseline.
replace_once('tests/spatial-binding-compiler.test.mjs',
             "import {\n  applyTaxonomyMigrationManifests,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';",
             "import {\n  compileSpatialBindingsR4,\n  loadTaxonomyMigrationManifests,\n  prepareCurrentTaxonomyBaseline\n} from '../scripts/compile-spatial-bindings-r4.mjs';")
replace_once('tests/spatial-binding-compiler.test.mjs',
             "const baseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));\nconst canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');\nconst canonical = JSON.parse(canonicalRaw);\nconst shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));\nconst migrationDir = fileURLToPath(new URL('../spatial/taxonomy-migrations', import.meta.url));\nconst reviewedShards = loadReviewedBindingShards(shardsDir);",
             "const retainedBaseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));\nconst canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');\nconst canonical = JSON.parse(canonicalRaw);\nconst shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));\nconst migrationDir = fileURLToPath(new URL('../spatial/taxonomy-migrations', import.meta.url));\nconst reviewedShards = loadReviewedBindingShards(shardsDir);\nconst migrationManifests = loadTaxonomyMigrationManifests(migrationDir);\nconst baseline = prepareCurrentTaxonomyBaseline(retainedBaseline, migrationManifests).baseline;")
regex_once('tests/spatial-binding-compiler.test.mjs',
           r"test\('canonical runtime index is exactly the deterministic r4 compiler output for all reviewed sources', \(\) => \{.*?\n\}\);",
           "test('canonical runtime index is exactly the deterministic staged r4 compiler output for all reviewed sources', () => {\n  const reviewed = compileSpatialBindingsR4({ baseline: retainedBaseline, shards: reviewedShards, manifests: migrationManifests });\n  assert.deepEqual(reviewed.index, canonical);\n  assert.equal(serializeSpatialIndex(reviewed.index), canonicalRaw);\n  assert.deepEqual(computeSpatialStats(reviewed.index), computeSpatialStats(canonical));\n});")

replace_once('tests/spatial-taxonomy-r4-compiler.test.mjs',
             "import {\n  applyTaxonomyMigrationManifests,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';",
             "import {\n  compileSpatialBindingsR4,\n  loadTaxonomyMigrationManifests\n} from '../scripts/compile-spatial-bindings-r4.mjs';")
regex_once('tests/spatial-taxonomy-r4-compiler.test.mjs',
           r"test\('r4 reviewed static migration manifest matches the current reviewed spatial source exactly', \(\) => \{.*?\n\}\);",
           "test('r4 stages retired-source migrations before strict compile and active-source migrations after shard merge', () => {\n  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));\n  assert.throws(() => compileSpatialBindings({ baseline: retainedBaseline, shards: [] }), { code: 'INVALID_SPATIAL_BASELINE' });\n  const migrations = loadTaxonomyMigrationManifests(migrationDir);\n  const compiled = compileSpatialBindingsR4({ baseline: retainedBaseline, shards: loadReviewedBindingShards(shardDir), manifests: migrations });\n  assert.equal(compiled.migrated_polity_ids.length, expected.size);\n  assert.deepEqual(new Set(compiled.migrated_polity_ids), new Set(expected.keys()));\n  for (const [polityId, subregion] of expected) assert.equal(compiled.index.polity_subregions[polityId], subregion, polityId);\n  assert.equal(Object.values(compiled.index.polity_subregions).includes('east-africa-horn'), false, 'strict compiled output must contain zero retired east-africa-horn assignments');\n});")
