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

export function validateHumanRegistrationRequest(raw, { requireDomain = true } = {}) {
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

  const polity = object(request.polity, 'HUMAN_AUTHORING_POLITY_REQUIRED');
  nonempty(polity.canonical_name_en, 'HUMAN_AUTHORING_POLITY_EN_REQUIRED');

  const activity = object(request.activity, 'HUMAN_AUTHORING_ACTIVITY_REQUIRED');
  if (!RELATION_CODES.has(activity.relation_type)) fail('HUMAN_AUTHORING_RELATION_TYPE_INVALID');
  nonempty(activity.period_basis, 'HUMAN_AUTHORING_PERIOD_BASIS_REQUIRED');
  if (!CONFIDENCE_VALUES.has(activity.confidence)) fail('HUMAN_AUTHORING_CONFIDENCE_INVALID');

  const startStatus = validateBoundary(activity, 'start');
  const endStatus = validateBoundary(activity, 'end', { allowOngoing:true });
  if (activity.chronology_status === 'ongoing' && startStatus !== 'known') fail('HUMAN_AUTHORING_ONGOING_START_REQUIRED');

  if (!Array.isArray(request.sources) || request.sources.length === 0) fail('HUMAN_AUTHORING_SOURCE_REQUIRED');
  for (const [index, source] of request.sources.entries()) {
    object(source, `HUMAN_AUTHORING_SOURCE_INVALID:${index + 1}`);
    if (source.source_id == null) nonempty(source.title, `HUMAN_AUTHORING_SOURCE_TITLE_REQUIRED:${index + 1}`);
  }

  return Object.freeze({
    ok:true,
    representative_domain:hasDomain ? person.representative_domain : undefined,
    start_status:startStatus,
    end_status:endStatus,
    runtime_expected:startStatus === 'known' && (endStatus === 'known' || endStatus === 'ongoing')
  });
}

function parseArgs(argv) {
  const file = argv.find((arg) => !arg.startsWith('--'));
  const requireDomainArg = argv.find((arg) => arg.startsWith('--require-domain='));
  return {
    file,
    requireDomain:requireDomainArg ? requireDomainArg.split('=')[1] !== 'false' : true
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { file, requireDomain } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('usage: validate-human-registration-request.mjs <manifest.json> [--require-domain=true|false]');
    process.exit(2);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(JSON.stringify(validateHumanRegistrationRequest(raw, { requireDomain })));
  } catch (error) {
    console.error(String(error?.code || error?.message || error));
    process.exit(1);
  }
}
