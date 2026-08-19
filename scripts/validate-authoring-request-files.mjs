import fs from 'node:fs';
import path from 'node:path';

const HUMAN_SCHEMA = 'atlas-human-authoring/v1';
const NATIVE_SCHEMA = 'atlas-authoring-manifest/v2';
const REQUEST_PATH = /^authoring\/requests\/[A-Za-z0-9._-]+\.json$/;
const RELATIONS = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);
const CERTAINTIES = new Set(['exact','approximate','uncertain']);
const CONFIDENCE = new Set(['well_established','likely','speculative','disputed','unknown']);
const CALENDARS = new Set(['gregorian','julian','unspecified_historical','source_calendar']);
const BINDING_MODES = new Set(['declared','existing']);
const ROLE_BINDING_MODES = new Set(['declared','existing','none']);

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function historicalYear(value) {
  return Number.isInteger(value) && value !== 0;
}

function optionalMonth(value) {
  return value == null || (Number.isInteger(value) && value >= 1 && value <= 12);
}

function optionalDay(value) {
  return value == null || (Number.isInteger(value) && value >= 1 && value <= 31);
}

function validateBoundary(file, activity, prefix) {
  const year = activity[`${prefix}_year`];
  const month = activity[`${prefix}_month`];
  const day = activity[`${prefix}_day`];
  if (!historicalYear(year)) fail(file, `${prefix}_year must be a non-zero integer historical year`);
  if (!optionalMonth(month)) fail(file, `${prefix}_month must be null or 1..12`);
  if (!optionalDay(day)) fail(file, `${prefix}_day must be null or 1..31`);
  if (day != null && month == null) fail(file, `${prefix}_day requires ${prefix}_month`);
  if (!CERTAINTIES.has(activity[`${prefix}_certainty`])) fail(file, `${prefix}_certainty is invalid`);
  const calendar = activity[`${prefix}_calendar`] ?? 'unspecified_historical';
  if (!CALENDARS.has(calendar)) fail(file, `${prefix}_calendar is invalid`);
}

function validateHuman(file, manifest) {
  if (manifest.review_status !== 'approved') fail(file, 'review_status must be approved');
  if (!nonEmptyString(manifest.request_id)) fail(file, 'request_id is required');
  if (!nonEmptyString(manifest?.person?.canonical_name_en)) fail(file, 'person.canonical_name_en is required');
  if (!nonEmptyString(manifest?.polity?.canonical_name_en)) fail(file, 'polity.canonical_name_en is required');
  const activity = manifest?.activity;
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) fail(file, 'activity object is required');
  if (!RELATIONS.has(activity.relation_type)) fail(file, 'activity.relation_type is invalid');
  if (!nonEmptyString(activity.period_basis)) fail(file, 'activity.period_basis is required');
  validateBoundary(file, activity, 'start');
  validateBoundary(file, activity, 'end');
  if (!CONFIDENCE.has(activity.confidence)) fail(file, 'activity.confidence is invalid');
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) fail(file, 'at least one source is required');
  for (const [index, source] of manifest.sources.entries()) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) fail(file, `sources[${index}] must be an object`);
    if (source.source_id != null) {
      if (!nonEmptyString(source.source_id) || !nonEmptyString(source.locator)) fail(file, `sources[${index}] existing source requires source_id and locator`);
    } else if (!nonEmptyString(source.title)) {
      fail(file, `sources[${index}].title is required for a new source`);
    }
  }
}

function validateNative(file, manifest) {
  if (manifest.review_status !== 'approved') fail(file, 'review_status must be approved');
  if (!nonEmptyString(manifest.request_id)) fail(file, 'request_id is required');
  if (!nonEmptyString(manifest?.person?.canonical_name_en)) fail(file, 'person.canonical_name_en is required');
  const activity = manifest?.activity;
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) fail(file, 'activity object is required');
  if (!nonEmptyString(activity.relation_type_id)) fail(file, 'activity.relation_type_id is required');
  if (!nonEmptyString(activity.period_basis_id)) fail(file, 'activity.period_basis_id is required');
  if (!BINDING_MODES.has(activity?.polity_binding?.mode)) fail(file, 'activity.polity_binding.mode is invalid');
  if (!ROLE_BINDING_MODES.has(activity?.role_binding?.mode)) fail(file, 'activity.role_binding.mode is invalid');
  for (const prefix of ['activity_start','activity_end']) {
    if (!historicalYear(activity[prefix])) fail(file, `${prefix} must be a non-zero integer historical year`);
    if (!nonEmptyString(activity[`${prefix}_granularity`])) fail(file, `${prefix}_granularity is required`);
    if (!nonEmptyString(activity[`${prefix}_certainty`])) fail(file, `${prefix}_certainty is required`);
    if (!nonEmptyString(activity[`${prefix}_calendar`])) fail(file, `${prefix}_calendar is required`);
  }
  for (const forbidden of ['person_name','politic_name','polity_name','role','period_basis','relation_type']) {
    if (activity[forbidden] != null) fail(file, `activity.${forbidden} is forbidden in Stage 2-native v2`);
  }
}

function semanticKey(manifest) {
  if (manifest.schema !== HUMAN_SCHEMA) return null;
  const a = manifest.activity || {};
  return JSON.stringify([
    manifest?.person?.canonical_name_en,
    manifest?.polity?.canonical_name_en,
    a.relation_type,
    a.role ?? null,
    a.period_basis,
    a.start_year,a.start_month ?? null,a.start_day ?? null,a.start_calendar ?? 'unspecified_historical',
    a.end_year,a.end_month ?? null,a.end_day ?? null,a.end_calendar ?? 'unspecified_historical'
  ]);
}

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('No authoring request files were supplied');

const requestIds = new Map();
const semanticKeys = new Map();
for (const file of files) {
  const normalized = file.split(path.sep).join('/');
  if (!REQUEST_PATH.test(normalized)) fail(file, 'path is outside authoring/requests/*.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(file, `invalid JSON: ${error.message}`); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail(file, 'manifest root must be an object');
  if (manifest.schema === HUMAN_SCHEMA) validateHuman(file, manifest);
  else if (manifest.schema === NATIVE_SCHEMA) validateNative(file, manifest);
  else fail(file, `unsupported schema ${String(manifest.schema || '')}`);

  const requestId = String(manifest.request_id);
  if (requestIds.has(requestId)) fail(file, `duplicate request_id also used by ${requestIds.get(requestId)}`);
  requestIds.set(requestId, file);

  const key = semanticKey(manifest);
  if (key) {
    if (semanticKeys.has(key)) fail(file, `duplicate Person/Activity request also represented by ${semanticKeys.get(key)}`);
    semanticKeys.set(key, file);
  }
}

console.log(`Validated ${files.length} authoring request file${files.length === 1 ? '' : 's'}.`);
