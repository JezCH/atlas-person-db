#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DOMAIN_CODES } = require('../server/atlas-person-domain-service.js');
const {
  RELATION_CODES,
  CERTAINTIES,
  CONFIDENCE_VALUES,
  CALENDARS
} = require('../server/atlas-human-authoring-service.js');
const { historicalYear } = require('../server/atlas-activity-semantic-key-v2.js');

const REGISTRATION_OBLIGATION_REGISTRY_URL = new URL('../authoring/registration-obligations.json', import.meta.url);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function object(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}

function nonempty(value, code) {
  if (typeof value !== 'string' || !value.trim()) fail(code);
  return value.trim();
}

function empty(value) {
  return value == null || value === '';
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function canonicalNamuWikiUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== 'namu.wiki') return null;
    if (!url.pathname.startsWith('/w/') || url.pathname.length <= 3) return null;
    if (url.username || url.password) return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function loadRegistrationObligationRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRATION_OBLIGATION_REGISTRY_URL, 'utf8'));
  if (registry.schema !== 'atlas-registration-obligations/v1') fail('HUMAN_AUTHORING_OBLIGATION_REGISTRY_SCHEMA_INVALID');
  const policy = object(registry.policy, 'HUMAN_AUTHORING_OBLIGATION_REGISTRY_POLICY_REQUIRED');
  if (policy.promotion_trigger !== 'retrospective_full_coverage_audit_or_backfill') {
    fail('HUMAN_AUTHORING_OBLIGATION_REGISTRY_PROMOTION_TRIGGER_INVALID');
  }
  if (policy.no_unspecified_future_debt !== true) fail('HUMAN_AUTHORING_OBLIGATION_REGISTRY_DEBT_RULE_REQUIRED');
  const execution = object(policy.execution, 'HUMAN_AUTHORING_OBLIGATION_REGISTRY_EXECUTION_REQUIRED');
  const requiredEfficiencyFlags = [
    'bounded_screen_once',
    'bundle_review_once',
    'parallelize_independent_research',
    'reuse_existing_canonical_state',
    'prefer_same_authoring_transaction',
    'companion_write_only_when_canonical_writer_cannot_persist',
    'materialize_companion_before_registration_done',
    'batch_cohort_transport',
    'one_preflight_per_cohort',
    'one_authoring_apply_per_cohort',
    'one_runtime_publication_per_resulting_authoritative_state',
    'one_terminal_readback_pass',
    'stop_at_proven_terminal_state',
    'no_reassurance_reads',
    'no_feature_specific_registration_api',
    'no_feature_specific_registration_wrapper',
    'no_separate_workflow_unless_distinct_writer_boundary_requires_it',
    'serialize_only_actual_shared_write_boundary'
  ];
  for (const flag of requiredEfficiencyFlags) {
    if (execution[flag] !== true) fail(`HUMAN_AUTHORING_OBLIGATION_REGISTRY_EFFICIENCY_REQUIRED:${flag}`);
  }
  if (!Array.isArray(registry.obligations) || registry.obligations.length === 0) {
    fail('HUMAN_AUTHORING_OBLIGATION_REGISTRY_EMPTY');
  }
  const ids = new Set();
  for (const item of registry.obligations) {
    const obligation = object(item, 'HUMAN_AUTHORING_OBLIGATION_REGISTRY_ITEM_INVALID');
    const id = nonempty(obligation.id, 'HUMAN_AUTHORING_OBLIGATION_REGISTRY_ID_REQUIRED');
    if (ids.has(id)) fail(`HUMAN_AUTHORING_OBLIGATION_REGISTRY_DUPLICATE:${id}`);
    ids.add(id);
    nonempty(obligation.applies_when, `HUMAN_AUTHORING_OBLIGATION_REGISTRY_APPLICABILITY_REQUIRED:${id}`);
    nonempty(obligation.persistence, `HUMAN_AUTHORING_OBLIGATION_REGISTRY_PERSISTENCE_REQUIRED:${id}`);
  }

  const temporal = registry.obligations.find((item) => item?.id === 'activity.temporal_source_truth');
  if (!temporal) fail('HUMAN_AUTHORING_TEMPORAL_OBLIGATION_REQUIRED');
  if (temporal.ongoing_registration_forbidden !== true) fail('HUMAN_AUTHORING_ONGOING_REGISTRATION_POLICY_REQUIRED');
  if (temporal.historical_unknown_boundary_allowed !== true) fail('HUMAN_AUTHORING_HISTORICAL_UNKNOWN_POLICY_REQUIRED');
  if (temporal.living_status_is_not_gate !== true) fail('HUMAN_AUTHORING_LIVING_STATUS_POLICY_REQUIRED');

  return Object.freeze(registry);
}

export const REGISTRATION_OBLIGATION_REGISTRY = loadRegistrationObligationRegistry();

function validateHistoricalYear(value, prefix) {
  try {
    return historicalYear(value, `${prefix}_year`);
  } catch {
    fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_YEAR_INVALID`);
  }
}

function validateKnownBoundary(activity, prefix) {
  validateHistoricalYear(activity[`${prefix}_year`], prefix);
  const month = activity[`${prefix}_month`];
  const day = activity[`${prefix}_day`];
  if (!empty(month) && (!Number.isInteger(month) || month < 1 || month > 12)) fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_MONTH_INVALID`);
  if (!empty(day) && (!Number.isInteger(day) || day < 1 || day > 31)) fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_INVALID`);
  if (!empty(day) && empty(month)) fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_REQUIRES_MONTH`);
  if (!CERTAINTIES.has(activity[`${prefix}_certainty`])) fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CERTAINTY_INVALID`);
  const calendar = activity[`${prefix}_calendar`];
  if (!empty(calendar) && !CALENDARS.has(calendar)) fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CALENDAR_INVALID`);
}

function validateUnknownBoundary(activity, prefix) {
  const fields = ['year','month','day','granularity','certainty','calendar'];
  if (fields.some((suffix) => !empty(activity[`${prefix}_${suffix}`]))) {
    fail(`HUMAN_AUTHORING_${prefix.toUpperCase()}_BOUNDARY_NOT_ALL_NULL`);
  }
}

function validateBoundary(activity, prefix, { allowOngoing = false } = {}) {
  const year = activity[`${prefix}_year`];
  if (!empty(year)) {
    validateKnownBoundary(activity, prefix);
    return 'known';
  }
  if (allowOngoing && activity.chronology_status === 'ongoing') {
    validateUnknownBoundary(activity, prefix);
    if (typeof activity.ongoing_as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(activity.ongoing_as_of)) {
      fail('HUMAN_AUTHORING_ONGOING_AS_OF_REQUIRED');
    }
    return 'ongoing';
  }
  validateUnknownBoundary(activity, prefix);
  return 'unknown';
}

function validateNamuWikiDecision(request, { requireNamuWiki = true } = {}) {
  const raw = request?.external_references?.namuwiki;
  const deferral = request?.review_deferrals?.namuwiki;

  if (deferral != null && requireNamuWiki) {
    fail('HUMAN_AUTHORING_NAMUWIKI_DEFERRAL_NOT_TERMINAL');
  }
  if (raw == null) {
    if (requireNamuWiki) fail('HUMAN_AUTHORING_NAMUWIKI_REVIEW_REQUIRED');
    return undefined;
  }

  const reference = object(raw, 'HUMAN_AUTHORING_NAMUWIKI_INVALID');
  const status = nonempty(reference.status, 'HUMAN_AUTHORING_NAMUWIKI_STATUS_REQUIRED');
  if (status !== 'linked' && status !== 'not_found') fail('HUMAN_AUTHORING_NAMUWIKI_STATUS_INVALID');
  const checkedAt = nonempty(reference.checked_at, 'HUMAN_AUTHORING_NAMUWIKI_CHECKED_AT_REQUIRED');
  if (!validIsoDate(checkedAt)) fail('HUMAN_AUTHORING_NAMUWIKI_CHECKED_AT_INVALID');

  if (status === 'linked') {
    nonempty(reference.document_title, 'HUMAN_AUTHORING_NAMUWIKI_DOCUMENT_TITLE_REQUIRED');
    if (!canonicalNamuWikiUrl(reference.url)) fail('HUMAN_AUTHORING_NAMUWIKI_URL_INVALID');
    return 'linked';
  }

  if (reference.document_title != null || reference.url != null) fail('HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_FIELDS_INVALID');
  const evidence = object(reference.search_evidence, 'HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_EVIDENCE_REQUIRED');
  if (evidence.exhaustive !== true) fail('HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_EXHAUSTIVE_REQUIRED');
  if (!Array.isArray(evidence.attempted_variants)) fail('HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_VARIANTS_REQUIRED');
  const variants = [...new Set(evidence.attempted_variants.map((value) => String(value || '').trim()).filter(Boolean))];
  if (variants.length < 2) fail('HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_VARIANTS_INSUFFICIENT');
  nonempty(evidence.evidence_note, 'HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_EVIDENCE_NOTE_REQUIRED');
  return 'not_found';
}

export function validateHumanRegistrationRequest(raw, { requireDomain = true, requireNamuWiki = true } = {}) {
  const request = object(raw, 'HUMAN_AUTHORING_REQUEST_REQUIRED');
  if (request.schema !== 'atlas-human-authoring/v1') fail('HUMAN_AUTHORING_SCHEMA_REQUIRED');
  if (request.review_status !== 'approved') fail('HUMAN_AUTHORING_REVIEW_STATUS_REQUIRED');
  if (request.request_id != null) nonempty(request.request_id, 'HUMAN_AUTHORING_REQUEST_ID_INVALID');

  const person = object(request.person, 'HUMAN_AUTHORING_PERSON_REQUIRED');
  nonempty(person.canonical_name_en, 'HUMAN_AUTHORING_PERSON_EN_REQUIRED');
  const hasDomain = Object.prototype.hasOwnProperty.call(person, 'representative_domain');
  if (requireDomain && !hasDomain) fail('HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_REVIEW_REQUIRED');
  if (hasDomain && person.representative_domain != null && !DOMAIN_CODES.has(String(person.representative_domain))) {
    fail('HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_INVALID');
  }

  const namuwikiStatus = validateNamuWikiDecision(request, { requireNamuWiki });

  const polity = object(request.polity, 'HUMAN_AUTHORING_POLITY_REQUIRED');
  nonempty(polity.canonical_name_en, 'HUMAN_AUTHORING_POLITY_EN_REQUIRED');

  const activity = object(request.activity, 'HUMAN_AUTHORING_ACTIVITY_REQUIRED');
  if (!RELATION_CODES.has(activity.relation_type)) fail('HUMAN_AUTHORING_RELATION_TYPE_INVALID');
  nonempty(activity.period_basis, 'HUMAN_AUTHORING_PERIOD_BASIS_REQUIRED');
  if (!CONFIDENCE_VALUES.has(activity.confidence)) fail('HUMAN_AUTHORING_CONFIDENCE_INVALID');

  const startStatus = validateBoundary(activity, 'start');
  const endStatus = validateBoundary(activity, 'end', { allowOngoing:true });
  if (activity.chronology_status === 'ongoing') fail('HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN');

  if (!Array.isArray(request.sources) || request.sources.length === 0) fail('HUMAN_AUTHORING_SOURCE_REQUIRED');
  for (const [index, source] of request.sources.entries()) {
    object(source, `HUMAN_AUTHORING_SOURCE_INVALID:${index + 1}`);
    if (source.source_id == null) nonempty(source.title, `HUMAN_AUTHORING_SOURCE_TITLE_REQUIRED:${index + 1}`);
  }

  return Object.freeze({
    ok:true,
    representative_domain:hasDomain ? person.representative_domain : undefined,
    namuwiki_status:namuwikiStatus,
    obligation_registry_schema:REGISTRATION_OBLIGATION_REGISTRY.schema,
    start_status:startStatus,
    end_status:endStatus,
    runtime_expected:startStatus === 'known' && endStatus === 'known'
  });
}

function parseArgs(argv) {
  const file = argv.find((arg) => !arg.startsWith('--'));
  const requireDomainArg = argv.find((arg) => arg.startsWith('--require-domain='));
  const requireNamuWikiArg = argv.find((arg) => arg.startsWith('--require-namuwiki='));
  return {
    file,
    requireDomain:requireDomainArg ? requireDomainArg.split('=')[1] !== 'false' : true,
    requireNamuWiki:requireNamuWikiArg ? requireNamuWikiArg.split('=')[1] !== 'false' : true
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { file, requireDomain, requireNamuWiki } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('usage: validate-human-registration-request.mjs <manifest.json> [--require-domain=true|false] [--require-namuwiki=true|false]');
    process.exit(2);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(JSON.stringify(validateHumanRegistrationRequest(raw, { requireDomain, requireNamuWiki })));
  } catch (error) {
    console.error(String(error?.code || error?.message || error));
    process.exit(1);
  }
}
