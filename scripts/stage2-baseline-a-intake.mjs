import fs from 'node:fs';
import crypto from 'node:crypto';

const BASELINE_MARKER = 'ATLAS_CORRECTION_BASELINE_A_V2';
const INTAKE_SCHEMA = 'atlas-stage2-baseline-a-intake/v2';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[0-9a-f]{40}$/i;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const CATALOG_KEYS = ['persons', 'polities', 'roles', 'period_bases', 'sources'];

function fail(message) { throw new Error(`BASELINE_A_INTAKE_INVALID: ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function id(value, label) {
  const normalized = String(value || '').toLowerCase();
  assert(UUID_RE.test(normalized), `${label} must be UUID`);
  return normalized;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(rows, counts, catalogs) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(stable({ rows, counts, catalogs }))).digest('hex')}`;
}
function assertSortedUniqueUuidRows(rows, label, key = 'id') {
  assert(Array.isArray(rows), `${label} must be an array`);
  const ids = rows.map((row, index) => id(row?.[key], `${label}[${index}].${key}`));
  assert(new Set(ids).size === ids.length, `${label} UUIDs must be unique`);
  const sorted = [...ids].sort();
  assert(ids.every((value, index) => value === sorted[index]), `${label} must be sorted by ${key}`);
  return ids;
}
function validateNames(names, label) {
  const ids = assertSortedUniqueUuidRows(names, label);
  for (let index = 0; index < names.length; index += 1) {
    const row = names[index];
    assert(typeof row.locale === 'string' && row.locale.length > 0, `${label}[${index}].locale required`);
    assert(typeof row.name === 'string' && row.name.trim().length > 0, `${label}[${index}].name required`);
    if ('name_type' in row) assert(typeof row.name_type === 'string' && row.name_type.length > 0, `${label}[${index}].name_type required`);
    if ('is_preferred' in row) assert(typeof row.is_preferred === 'boolean', `${label}[${index}].is_preferred must be boolean`);
  }
  return ids.length;
}
function validateCatalogs(catalogs, counts) {
  assert(catalogs && typeof catalogs === 'object' && !Array.isArray(catalogs), 'catalogs object required');
  for (const key of CATALOG_KEYS) assert(Array.isArray(catalogs[key]), `catalogs.${key} required`);

  const personIds = new Set(assertSortedUniqueUuidRows(catalogs.persons, 'catalogs.persons'));
  const polityIds = new Set(assertSortedUniqueUuidRows(catalogs.polities, 'catalogs.polities'));
  const roleIds = new Set(assertSortedUniqueUuidRows(catalogs.roles, 'catalogs.roles'));
  const basisIds = new Set(assertSortedUniqueUuidRows(catalogs.period_bases, 'catalogs.period_bases'));
  const sourceIds = new Set(assertSortedUniqueUuidRows(catalogs.sources, 'catalogs.sources'));
  let personNames = 0;
  let polityNames = 0;
  let roleNames = 0;
  let periodBasisNames = 0;

  for (const [index, row] of catalogs.persons.entries()) {
    assert(typeof row.canonical_key === 'string' && row.canonical_key.length > 0, `catalogs.persons[${index}].canonical_key required`);
    assert(typeof row.person_type === 'string' && row.person_type.length > 0, `catalogs.persons[${index}].person_type required`);
    assert(typeof row.historicity === 'string' && row.historicity.length > 0, `catalogs.persons[${index}].historicity required`);
    personNames += validateNames(row.names, `catalogs.persons[${index}].names`);
  }
  for (const [index, row] of catalogs.polities.entries()) {
    assert(typeof row.canonical_key === 'string' && row.canonical_key.length > 0, `catalogs.polities[${index}].canonical_key required`);
    assert(typeof row.polity_type === 'string' && row.polity_type.length > 0, `catalogs.polities[${index}].polity_type required`);
    assert(typeof row.historicity === 'string' && row.historicity.length > 0, `catalogs.polities[${index}].historicity required`);
    polityNames += validateNames(row.names, `catalogs.polities[${index}].names`);
  }
  for (const [index, row] of catalogs.roles.entries()) {
    assert(typeof row.code === 'string' && row.code.length > 0, `catalogs.roles[${index}].code required`);
    assert(typeof row.category === 'string' && row.category.length > 0, `catalogs.roles[${index}].category required`);
    roleNames += validateNames(row.names, `catalogs.roles[${index}].names`);
  }
  for (const [index, row] of catalogs.period_bases.entries()) {
    assert(typeof row.code === 'string' && row.code.length > 0, `catalogs.period_bases[${index}].code required`);
    periodBasisNames += validateNames(row.names, `catalogs.period_bases[${index}].names`);
  }
  for (const [index, row] of catalogs.sources.entries()) {
    assert(typeof row.source_key === 'string' && row.source_key.length > 0, `catalogs.sources[${index}].source_key required`);
    assert(typeof row.source_type === 'string' && row.source_type.length > 0, `catalogs.sources[${index}].source_type required`);
    assert(typeof row.title === 'string', `catalogs.sources[${index}].title required`);
    assert(typeof row.sha256 === 'string' && row.sha256.length > 0, `catalogs.sources[${index}].sha256 required`);
    assert(Number.isInteger(Number(row.bytes)) && Number(row.bytes) >= 0, `catalogs.sources[${index}].bytes invalid`);
  }

  const expected = {
    persons: personIds.size, polities: polityIds.size, roles: roleIds.size, period_bases: basisIds.size, sources: sourceIds.size,
    person_names: personNames, polity_names: polityNames, role_names: roleNames, period_basis_names: periodBasisNames
  };
  for (const [key, value] of Object.entries(expected)) assert(Number(counts[key]) === value, `counts.${key} does not match full catalog`);
  return { personIds, polityIds, roleIds, basisIds, sourceIds };
}
function preferredName(entity, locale) {
  return (entity.names || []).find((row) => row.locale === locale && row.is_preferred)?.name ?? null;
}
function crossCheckActivity(row, index, maps) {
  const activityId = id(row.activity_id, `rows[${index}].activity_id`);
  const personId = id(row.person_id, `rows[${index}].person_id`);
  const polityId = id(row.polity_id, `rows[${index}].polity_id`);
  const basisId = id(row.period_basis_id, `rows[${index}].period_basis_id`);
  const roleId = row.role_id == null ? null : id(row.role_id, `rows[${index}].role_id`);
  const start = Number(row.activity_start);
  const end = Number(row.activity_end);
  assert(Number.isInteger(start) && Number.isInteger(end) && start !== 0 && end !== 0 && end >= start, `${activityId} invalid historical interval`);
  const person = maps.persons.get(personId);
  const polity = maps.polities.get(polityId);
  const basis = maps.periodBases.get(basisId);
  const role = roleId ? maps.roles.get(roleId) : null;
  assert(person, `${activityId} person UUID missing from full catalog`);
  assert(polity, `${activityId} polity UUID missing from full catalog`);
  assert(basis, `${activityId} period basis UUID missing from full catalog`);
  if (roleId) assert(role, `${activityId} role UUID missing from full catalog`);
  assert(row.person_canonical_key === person.canonical_key, `${activityId} person canonical metadata drift`);
  assert(row.polity_canonical_key === polity.canonical_key, `${activityId} polity canonical metadata drift`);
  assert(row.person_type === person.person_type && row.person_historicity === person.historicity, `${activityId} person type/historicity drift`);
  assert(row.polity_type === polity.polity_type && row.polity_historicity === polity.historicity, `${activityId} polity type/historicity drift`);
  assert(row.period_basis === basis.code, `${activityId} period basis metadata drift`);
  if (roleId) assert(row.role_code === role.code, `${activityId} role metadata drift`);
  assert((row.person_name_en ?? null) === preferredName(person, 'en'), `${activityId} preferred English person name drift`);
  assert((row.person_name_ko ?? null) === preferredName(person, 'ko'), `${activityId} preferred Korean person name drift`);
  assert((row.polity_name_en ?? null) === preferredName(polity, 'en'), `${activityId} preferred English polity name drift`);
  assert((row.polity_name_ko ?? null) === preferredName(polity, 'ko'), `${activityId} preferred Korean polity name drift`);
  return activityId;
}

export function buildBaselineAIntake(baseline) {
  assert(baseline && typeof baseline === 'object' && !Array.isArray(baseline), 'baseline object required');
  assert(baseline.marker === BASELINE_MARKER, `marker must be ${BASELINE_MARKER}`);
  assert(baseline.mode === 'full_stage2_baseline', 'mode must be full_stage2_baseline');
  assert(baseline.read_only === true && baseline.committed === false, 'Baseline A must be read-only and uncommitted');
  assert(SHA_RE.test(String(baseline.deployment_sha || '')), 'exact Production deployment SHA required');
  assert(DIGEST_RE.test(String(baseline.baseline_digest || '')), 'baseline digest malformed');
  assert(Array.isArray(baseline.rows), 'rows required');
  assert(baseline.counts && typeof baseline.counts === 'object', 'counts required');
  assert(Number(baseline.row_count) === baseline.rows.length, 'row_count mismatch');
  assert(Number(baseline.counts.activities) === baseline.rows.length, 'counts.activities mismatch');
  assert(digest(baseline.rows, baseline.counts, baseline.catalogs) === baseline.baseline_digest, 'baseline digest mismatch');

  const sets = validateCatalogs(baseline.catalogs, baseline.counts);
  const maps = {
    persons: new Map(baseline.catalogs.persons.map((row) => [String(row.id).toLowerCase(), row])),
    polities: new Map(baseline.catalogs.polities.map((row) => [String(row.id).toLowerCase(), row])),
    roles: new Map(baseline.catalogs.roles.map((row) => [String(row.id).toLowerCase(), row])),
    periodBases: new Map(baseline.catalogs.period_bases.map((row) => [String(row.id).toLowerCase(), row]))
  };
  const activityIds = baseline.rows.map((row, index) => crossCheckActivity(row, index, maps));
  assert(new Set(activityIds).size === activityIds.length, 'Activity UUIDs must be unique');
  const sorted = [...activityIds].sort();
  assert(activityIds.every((value, index) => value === sorted[index]), 'Activity rows must be sorted by UUID');

  return Object.freeze({
    schema: INTAKE_SCHEMA,
    source_marker: BASELINE_MARKER,
    deployment_sha: String(baseline.deployment_sha).toLowerCase(),
    baseline_digest: baseline.baseline_digest,
    row_count: baseline.rows.length,
    counts: baseline.counts,
    activity_uuids: activityIds,
    identity_catalogs: baseline.catalogs,
    authority: {
      live_uuid_inventory_authoritative: true,
      historical_identity_decisions_automatically_approved: false,
      canonical_keys_binding_authority: false,
      names_binding_authority: false,
      polity_name_type_is_raw_live_inventory_for_reviewed_mapping: true,
      old_346_baseline_authoritative: false,
      old_stage2_uuid_bindings_authoritative: false,
      correction_v2_authorized: false,
      semantic_key_v2_activation_authorized: false,
      person_merge_authorized: false,
      production_mutation_authorized: false
    },
    catalog_cardinality: {
      persons: sets.personIds.size, polities: sets.polityIds.size, roles: sets.roleIds.size,
      period_bases: sets.basisIds.size, sources: sets.sourceIds.size
    }
  });
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) throw new Error('usage: node scripts/stage2-baseline-a-intake.mjs <baseline-a.json> [output.json]');
  const baseline = JSON.parse(fs.readFileSync(input, 'utf8'));
  const intake = buildBaselineAIntake(baseline);
  const encoded = `${JSON.stringify(intake, null, 2)}\n`;
  if (output) fs.writeFileSync(output, encoded); else process.stdout.write(encoded);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export { BASELINE_MARKER, INTAKE_SCHEMA, digest };
