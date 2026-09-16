export const SPATIAL_TAXONOMY_MIGRATION_SCHEMA = 'atlas-spatial-taxonomy-migration/v1';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MANIFEST_KEYS = new Set(['schema', 'migration_id', 'reviewed_at', 'source_refs', 'migrations']);
const ENTRY_KEYS = new Set(['polity_id', 'from', 'to', 'reason']);
const MAPPING_KEYS = new Set(['region_code', 'subregion_code']);

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', `${label} must be an object`);
  }
  return value;
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail('UNSUPPORTED_SPATIAL_TAXONOMY_MIGRATION_FIELD', `${label}.${key} is not allowed`);
  }
}

function normalizeMapping(raw, label) {
  const value = asObject(raw, label);
  assertOnlyKeys(value, MAPPING_KEYS, label);
  const regionCode = text(value.region_code);
  const subregionCode = value.subregion_code == null ? null : text(value.subregion_code);
  if (!regionCode) fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', `${label}.region_code is required`);
  if (value.subregion_code != null && !subregionCode) {
    fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', `${label}.subregion_code must be null or a non-empty code`);
  }
  return Object.freeze({ region_code: regionCode, subregion_code: subregionCode });
}

function sameMapping(left, right) {
  return left.region_code === right.region_code && left.subregion_code === right.subregion_code;
}

function mappingLabel(mapping) {
  return `${mapping.region_code}/${mapping.subregion_code || '(macro-only)'}`;
}

function assertMappingInTaxonomy(mapping, label, { macroCodes, subregionParent, legacySubregionParent, allowLegacy }) {
  if (!macroCodes.has(mapping.region_code)) {
    fail('UNKNOWN_SPATIAL_MACROREGION', `${label}: ${mapping.region_code}`);
  }
  if (!mapping.subregion_code) return;
  const parent = subregionParent.get(mapping.subregion_code)
    || (allowLegacy ? legacySubregionParent.get(mapping.subregion_code) : null);
  if (!parent) fail('UNKNOWN_SPATIAL_SUBREGION', `${label}: ${mapping.subregion_code}`);
  if (parent !== mapping.region_code) {
    fail('SPATIAL_SUBREGION_PARENT_MISMATCH', `${label}: ${mapping.subregion_code} is not a child of ${mapping.region_code}`);
  }
}

export function normalizeSpatialTaxonomyMigration(raw, taxonomy) {
  const manifest = asObject(raw, 'migration manifest');
  assertOnlyKeys(manifest, MANIFEST_KEYS, 'migration manifest');
  if (manifest.schema !== SPATIAL_TAXONOMY_MIGRATION_SCHEMA) {
    fail('INVALID_SPATIAL_TAXONOMY_MIGRATION_SCHEMA', `schema must be ${SPATIAL_TAXONOMY_MIGRATION_SCHEMA}`);
  }
  const migrationId = text(manifest.migration_id);
  if (!migrationId) fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', 'migration_id is required');
  if (!Array.isArray(manifest.migrations) || manifest.migrations.length === 0) {
    fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', 'migrations must be a non-empty array');
  }

  const macroCodes = taxonomy?.macroCodes instanceof Set ? taxonomy.macroCodes : new Set();
  const subregionParent = taxonomy?.subregionParent instanceof Map ? taxonomy.subregionParent : new Map();
  const legacySubregionParent = taxonomy?.legacySubregionParent instanceof Map ? taxonomy.legacySubregionParent : new Map();
  const seen = new Set();
  const migrations = manifest.migrations.map((rawEntry, index) => {
    const label = `migration ${migrationId}[${index}]`;
    const entry = asObject(rawEntry, label);
    assertOnlyKeys(entry, ENTRY_KEYS, label);
    const polityId = text(entry.polity_id);
    const reason = text(entry.reason);
    if (!UUID_PATTERN.test(polityId)) {
      fail('INVALID_SPATIAL_TAXONOMY_MIGRATION_UUID', `${label}.polity_id must be a lowercase canonical UUID: ${polityId || '(empty)'}`);
    }
    if (seen.has(polityId)) fail('DUPLICATE_SPATIAL_TAXONOMY_MIGRATION', `${migrationId}: duplicate ${polityId}`);
    seen.add(polityId);
    if (!reason) fail('INVALID_SPATIAL_TAXONOMY_MIGRATION', `${label}.reason is required`);

    const from = normalizeMapping(entry.from, `${label}.from`);
    const to = normalizeMapping(entry.to, `${label}.to`);
    assertMappingInTaxonomy(from, `${label}.from`, { macroCodes, subregionParent, legacySubregionParent, allowLegacy: true });
    assertMappingInTaxonomy(to, `${label}.to`, { macroCodes, subregionParent, legacySubregionParent, allowLegacy: false });
    if (sameMapping(from, to)) fail('NOOP_SPATIAL_TAXONOMY_MIGRATION', `${migrationId}: ${polityId} does not change mapping`);
    return Object.freeze({ polity_id: polityId, from, to, reason });
  }).sort((left, right) => left.polity_id.localeCompare(right.polity_id, 'en'));

  return Object.freeze({ migration_id: migrationId, migrations: Object.freeze(migrations) });
}

export function applySpatialTaxonomyMigration({ baseline, manifest, taxonomy }) {
  const normalized = normalizeSpatialTaxonomyMigration(manifest, taxonomy);
  const polityGeography = { ...(baseline?.polity_geography || {}) };
  const politySubregions = { ...(baseline?.polity_subregions || {}) };

  for (const migration of normalized.migrations) {
    const currentRegion = Object.prototype.hasOwnProperty.call(polityGeography, migration.polity_id)
      ? text(polityGeography[migration.polity_id])
      : null;
    const currentSubregion = Object.prototype.hasOwnProperty.call(politySubregions, migration.polity_id)
      ? text(politySubregions[migration.polity_id]) || null
      : null;
    const current = Object.freeze({ region_code: currentRegion, subregion_code: currentSubregion });
    if (!currentRegion) {
      fail('SPATIAL_TAXONOMY_MIGRATION_SOURCE_MISSING', `${migration.polity_id}: baseline has no static mapping`);
    }
    if (!sameMapping(current, migration.from)) {
      fail(
        'SPATIAL_TAXONOMY_MIGRATION_SOURCE_MISMATCH',
        `${migration.polity_id}: expected ${mappingLabel(migration.from)} but found ${mappingLabel(current)}`
      );
    }

    polityGeography[migration.polity_id] = migration.to.region_code;
    if (migration.to.subregion_code) politySubregions[migration.polity_id] = migration.to.subregion_code;
    else delete politySubregions[migration.polity_id];
  }

  return Object.freeze({
    migration_id: normalized.migration_id,
    polity_geography: Object.freeze(polityGeography),
    polity_subregions: Object.freeze(politySubregions),
    migrated_polity_ids: Object.freeze(normalized.migrations.map((entry) => entry.polity_id))
  });
}
