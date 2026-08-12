import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASELINE_A_MARKER = 'ATLAS_CORRECTION_BASELINE_A_V1';
export const BASELINE_A_MODE = 'full_activity_baseline';
export const INTAKE_SCHEMA = 'atlas-stage2-baseline-a-intake/v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const COUNT_KEYS = [
  'persons','polities','roles','period_bases','activities','activity_source_links','chronology_claims','relationship_descriptions'
];

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')}`;
}

export function calculateBaselineDigest(rows, counts) {
  return sha256({ rows, counts });
}

function fail(code, detail = '') {
  const error = new Error(code);
  if (detail) error.detail = detail;
  throw error;
}

function integer(value, code, { min = null, max = null } = {}) {
  if (!Number.isInteger(value)) fail(code);
  if (min != null && value < min) fail(code);
  if (max != null && value > max) fail(code);
  return value;
}

function uuid(value, code, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) fail(code);
  return value;
}

function nonblank(value, code, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) fail(code);
  return value;
}

function nullableText(value, code) {
  if (value == null) return null;
  return nonblank(value, code);
}

function sameObject(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function addConsistent(map, id, value, code) {
  const prior = map.get(id);
  if (prior && !sameObject(prior, value)) fail(code, id);
  if (!prior) map.set(id, value);
}

export function validateBaselineA(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('BASELINE_A_OBJECT_REQUIRED');
  if (input.marker !== BASELINE_A_MARKER) fail('BASELINE_A_MARKER_MISMATCH');
  if (input.mode !== BASELINE_A_MODE) fail('BASELINE_A_MODE_MISMATCH');
  if (input.read_only !== true || input.committed !== false) fail('BASELINE_A_NOT_READ_ONLY_EVIDENCE');
  if (typeof input.deployment_sha !== 'string' || !SHA_RE.test(input.deployment_sha)) fail('BASELINE_A_DEPLOYMENT_SHA_INVALID');
  if (typeof input.baseline_digest !== 'string' || !DIGEST_RE.test(input.baseline_digest)) fail('BASELINE_A_DIGEST_INVALID');
  if (!Array.isArray(input.rows)) fail('BASELINE_A_ROWS_REQUIRED');
  if (!input.counts || typeof input.counts !== 'object' || Array.isArray(input.counts)) fail('BASELINE_A_COUNTS_REQUIRED');

  integer(input.row_count, 'BASELINE_A_ROW_COUNT_INVALID', { min: 0 });
  for (const key of COUNT_KEYS) integer(input.counts[key], `BASELINE_A_COUNT_INVALID_${key.toUpperCase()}`, { min: 0 });
  if (input.row_count !== input.rows.length || input.row_count !== input.counts.activities) fail('BASELINE_A_ACTIVITY_COUNT_MISMATCH');

  const seenActivities = new Set();
  const personCatalog = new Map();
  const polityCatalog = new Map();
  const roleCatalog = new Map();
  const periodBasisCatalog = new Map();
  let previousActivityId = null;

  for (const row of input.rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('BASELINE_A_ROW_OBJECT_REQUIRED');
    const activityId = uuid(row.activity_id, 'BASELINE_A_ACTIVITY_UUID_INVALID');
    const personId = uuid(row.person_id, 'BASELINE_A_PERSON_UUID_INVALID');
    const polityId = uuid(row.polity_id, 'BASELINE_A_POLITY_UUID_INVALID');
    const roleId = uuid(row.role_id, 'BASELINE_A_ROLE_UUID_INVALID', true);
    const periodBasisId = uuid(row.period_basis_id, 'BASELINE_A_PERIOD_BASIS_UUID_INVALID');

    if (seenActivities.has(activityId)) fail('BASELINE_A_DUPLICATE_ACTIVITY_UUID', activityId);
    if (previousActivityId != null && activityId <= previousActivityId) fail('BASELINE_A_ACTIVITY_ORDER_INVALID', activityId);
    seenActivities.add(activityId);
    previousActivityId = activityId;

    integer(row.activity_start, 'BASELINE_A_ACTIVITY_START_INVALID', { min: -10000, max: 9999 });
    integer(row.activity_end, 'BASELINE_A_ACTIVITY_END_INVALID', { min: -10000, max: 9999 });
    if (row.activity_start === 0 || row.activity_end === 0) fail('BASELINE_A_HISTORICAL_YEAR_ZERO_FORBIDDEN');
    if (row.activity_end < row.activity_start) fail('BASELINE_A_ACTIVITY_INTERVAL_REVERSED');

    nonblank(row.confidence, 'BASELINE_A_CONFIDENCE_INVALID');
    nonblank(row.chronology_status, 'BASELINE_A_CHRONOLOGY_STATUS_INVALID');
    nonblank(row.legacy_source_key, 'BASELINE_A_LEGACY_SOURCE_KEY_INVALID');
    nullableText(row.notes, 'BASELINE_A_NOTES_INVALID');
    integer(row.source_count, 'BASELINE_A_SOURCE_COUNT_INVALID', { min: 0 });
    integer(row.chronology_claim_count, 'BASELINE_A_CHRONOLOGY_CLAIM_COUNT_INVALID', { min: 0 });
    integer(row.description_count, 'BASELINE_A_DESCRIPTION_COUNT_INVALID', { min: 0 });

    const person = {
      id: personId,
      canonical_key: nonblank(row.person_canonical_key, 'BASELINE_A_PERSON_CANONICAL_KEY_INVALID'),
      person_type: nonblank(row.person_type, 'BASELINE_A_PERSON_TYPE_INVALID'),
      historicity: nonblank(row.person_historicity, 'BASELINE_A_PERSON_HISTORICITY_INVALID'),
      name_en: nullableText(row.person_name_en, 'BASELINE_A_PERSON_NAME_EN_INVALID'),
      name_ko: nullableText(row.person_name_ko, 'BASELINE_A_PERSON_NAME_KO_INVALID')
    };
    const polity = {
      id: polityId,
      canonical_key: nonblank(row.polity_canonical_key, 'BASELINE_A_POLITY_CANONICAL_KEY_INVALID'),
      polity_type: nonblank(row.polity_type, 'BASELINE_A_POLITY_TYPE_INVALID'),
      historicity: nonblank(row.polity_historicity, 'BASELINE_A_POLITY_HISTORICITY_INVALID'),
      name_en: nullableText(row.polity_name_en, 'BASELINE_A_POLITY_NAME_EN_INVALID'),
      name_ko: nullableText(row.polity_name_ko, 'BASELINE_A_POLITY_NAME_KO_INVALID')
    };
    addConsistent(personCatalog, personId, person, 'BASELINE_A_PERSON_METADATA_DRIFT');
    addConsistent(polityCatalog, polityId, polity, 'BASELINE_A_POLITY_METADATA_DRIFT');

    if (roleId == null) {
      if (row.role_code != null || row.role_category != null || row.role_source_label != null) fail('BASELINE_A_NULL_ROLE_METADATA_PRESENT');
    } else {
      const role = {
        id: roleId,
        code: nonblank(row.role_code, 'BASELINE_A_ROLE_CODE_INVALID'),
        category: nonblank(row.role_category, 'BASELINE_A_ROLE_CATEGORY_INVALID'),
        source_label: nonblank(row.role_source_label, 'BASELINE_A_ROLE_SOURCE_LABEL_INVALID')
      };
      addConsistent(roleCatalog, roleId, role, 'BASELINE_A_ROLE_METADATA_DRIFT');
    }

    const periodBasis = {
      id: periodBasisId,
      code: nonblank(row.period_basis, 'BASELINE_A_PERIOD_BASIS_CODE_INVALID')
    };
    addConsistent(periodBasisCatalog, periodBasisId, periodBasis, 'BASELINE_A_PERIOD_BASIS_METADATA_DRIFT');
  }

  const recomputed = calculateBaselineDigest(input.rows, input.counts);
  if (recomputed !== input.baseline_digest) fail('BASELINE_A_DIGEST_MISMATCH');

  return Object.freeze({
    baseline: input,
    catalogs: Object.freeze({ personCatalog, polityCatalog, roleCatalog, periodBasisCatalog })
  });
}

function sortedValues(map) {
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildBaselineAIntake(input) {
  const validated = validateBaselineA(input);
  const { baseline, catalogs } = validated;

  const intake = {
    schema: INTAKE_SCHEMA,
    production_mutation: false,
    source: {
      marker: baseline.marker,
      deployment_sha: baseline.deployment_sha,
      baseline_digest: baseline.baseline_digest,
      row_count: baseline.row_count,
      counts: baseline.counts
    },
    authority: {
      baseline_a_is_execution_uuid_source_of_truth: true,
      old_346_activity_baseline_authoritative: false,
      old_stage2_activity_uuid_bindings_authoritative: false,
      names_or_canonical_keys_are_identity_binding_authority: false,
      generic_relation_default_allowed: false
    },
    activity_bindings: baseline.rows.map((row) => ({
      activity_id: row.activity_id,
      person_id: row.person_id,
      polity_id: row.polity_id,
      role_id: row.role_id,
      period_basis_id: row.period_basis_id,
      activity_start: row.activity_start,
      activity_end: row.activity_end,
      legacy_source_key: row.legacy_source_key
    })),
    referenced_identity_catalogs: {
      binding_authority: false,
      purpose: 'review labels and candidate discovery only; explicit reviewed UUID decisions remain required',
      persons: sortedValues(catalogs.personCatalog),
      polities: sortedValues(catalogs.polityCatalog),
      roles: sortedValues(catalogs.roleCatalog),
      period_bases: sortedValues(catalogs.periodBasisCatalog)
    },
    downstream_gates: {
      fresh_master_ledger_seed_ready: true,
      fresh_stage2_work_queue_seed_ready: true,
      reviewed_person_identity_bindings_required: true,
      reviewed_polity_identity_bindings_required: true,
      polity_identity_resolution_required_before_semantic_key_v2: true,
      correction_v2_target_generation_authorized: false,
      semantic_key_v2_activation_authorized: false,
      physical_person_merge_authorized: false
    },
    next_artifacts: [
      'fresh_master_ledger_from_baseline_a',
      'fresh_stage2_work_queues_from_baseline_a',
      'reviewed_person_identity_decisions',
      'reviewed_polity_identity_decisions',
      'reviewed_uuid_rebind_registry',
      'correction_v2_manifests_after_review'
    ]
  };
  intake.intake_digest = sha256(intake);
  return Object.freeze(intake);
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/stage2-baseline-a-intake.mjs <baseline-a.json> <output-intake.json>');
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
  const intake = buildBaselineAIntake(baseline);
  const target = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(intake, null, 2)}\n`);
  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_BASELINE_A_INTAKE_V1',
    status: 'PASS',
    deployment_sha: intake.source.deployment_sha,
    baseline_digest: intake.source.baseline_digest,
    intake_digest: intake.intake_digest,
    activities: intake.activity_bindings.length,
    production_mutation: false
  }, null, 2));
}
