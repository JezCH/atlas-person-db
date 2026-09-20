import fs from 'node:fs';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const model = require('../atlas-person-spacetime-model.js');
const spatialCompile = require('../atlas-person-spacetime-spatial-compile.js');

function text(value) {
  return value == null ? '' : String(value).trim();
}

function assertPersonReadContract(personRead) {
  if (!personRead || typeof personRead !== 'object' || personRead.ok !== true || personRead.schema !== 'atlas-person-read/v1') {
    throw new Error('person read must be a successful atlas-person-read/v1 payload');
  }
  if (!Array.isArray(personRead.persons)) throw new Error('person read persons must be an array');
}

function assertSpatialContract(spatial) {
  const validation = model.validateSpatialIndex(spatial);
  if (!validation.valid) throw new Error(`invalid spatial index: ${validation.errors.join(' | ')}`);
}

function stableSort(left, right) {
  const personDelta = String(left.person_name ?? '').localeCompare(String(right.person_name ?? ''), 'ko');
  if (personDelta !== 0) return personDelta;
  const startDelta = Number(left.start_year ?? 0) - Number(right.start_year ?? 0);
  if (startDelta !== 0) return startDelta;
  return String(left.activity_id ?? '').localeCompare(String(right.activity_id ?? ''), 'en');
}

function reviewReasonByPolity(spatial) {
  return new Map((spatial.review_queue || [])
    .map((row) => [text(row?.polity_id), text(row?.reason)])
    .filter(([polityId]) => polityId));
}

function overrideIds(spatial) {
  return new Set((spatial.activity_spatial_overrides || []).map((row) => text(row?.activity_id)).filter(Boolean));
}

function candidateFor({ person, activity, resolved, compiled, spatial, reviewReasons, overrides }) {
  const activityId = text(activity?.id);
  const polityId = text(activity?.polity?.id);
  const reviewQueueReason = reviewReasons.get(polityId) || null;
  let reason = text(compiled?.reason) || text(resolved?.reason) || text(resolved?.status) || 'spatial_unresolved';
  let category = reason;

  if (reviewQueueReason && !overrides.has(activityId)) {
    category = 'review_queue_activity_override_missing';
    reason = category;
  } else if (
    polityId &&
    Object.prototype.hasOwnProperty.call(spatial.polity_geography || {}, polityId) &&
    !text(spatial.polity_subregions?.[polityId])
  ) {
    category = 'macroregion_only_activity_unresolved';
  } else if (resolved?.status === 'placed' && compiled?.status !== 'placed') {
    category = 'spatial_compile_unresolved';
  }

  return {
    activity_id: activityId,
    person_id: text(person?.id) || null,
    person_name: text(person?.display_name || person?.preferred_name_ko || person?.canonical_name_en) || null,
    polity_id: polityId || null,
    polity_name: text(activity?.polity?.display_name || activity?.polity?.preferred_name_ko || activity?.polity?.canonical_name_en) || null,
    start_year: Number.isInteger(activity?.start?.year) ? activity.start.year : null,
    end_year: Number.isInteger(activity?.end?.year) ? activity.end.year : null,
    category,
    reason,
    review_queue_reason: reviewQueueReason
  };
}

export function buildSpatialActivityCandidates({ personRead, spatial, topLimit = 100 }) {
  assertPersonReadContract(personRead);
  assertSpatialContract(spatial);
  const lookup = model.createSpatialLookup(spatial);
  const reviewReasons = reviewReasonByPolity(spatial);
  const overrides = overrideIds(spatial);
  const candidates = [];
  let activityCount = 0;
  let chronologyUnresolvedCount = 0;

  for (const person of personRead.persons) {
    for (const activity of (Array.isArray(person?.activity_summaries) ? person.activity_summaries : [])) {
      activityCount += 1;
      const resolved = model.resolveActivityPlacement(activity, lookup);
      if (resolved.status === 'chronology_unresolved') {
        chronologyUnresolvedCount += 1;
        continue;
      }
      const compiled = spatialCompile.compileActivityPlacement(resolved);
      if (resolved.status === 'placed' && compiled.status === 'placed') continue;
      candidates.push(candidateFor({ person, activity, resolved, compiled, spatial, reviewReasons, overrides }));
    }
  }

  candidates.sort(stableSort);
  const summary = {
    person_count: personRead.persons.length,
    activity_count: activityCount,
    chronology_unresolved_activity_count: chronologyUnresolvedCount,
    spatial_unresolved_activity_count: candidates.length,
    review_queue_activity_override_missing_count: candidates.filter((row) => row.category === 'review_queue_activity_override_missing').length,
    macroregion_only_activity_unresolved_count: candidates.filter((row) => row.category === 'macroregion_only_activity_unresolved').length,
    spatial_compile_unresolved_count: candidates.filter((row) => row.category === 'spatial_compile_unresolved').length
  };

  return {
    summary,
    candidates,
    top: candidates.slice(0, Math.max(0, Number(topLimit) || 0))
  };
}

function parseArgs(argv) {
  const options = { topLimit: 100 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    switch (arg) {
      case '--person-read': options.personReadPath = value; index += 1; break;
      case '--spatial': options.spatialPath = value; index += 1; break;
      case '--out': options.outPath = value; index += 1; break;
      case '--top': options.topPath = value; index += 1; break;
      case '--summary': options.summaryPath = value; index += 1; break;
      case '--top-limit': options.topLimit = Number(value); index += 1; break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }
  for (const [key, label] of [
    ['personReadPath', '--person-read'],
    ['spatialPath', '--spatial'],
    ['outPath', '--out'],
    ['topPath', '--top'],
    ['summaryPath', '--summary']
  ]) if (!options[key]) throw new Error(`missing required argument ${label}`);
  if (!Number.isInteger(options.topLimit) || options.topLimit < 0) throw new Error('--top-limit must be a non-negative integer');
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = buildSpatialActivityCandidates({
    personRead: readJson(options.personReadPath),
    spatial: readJson(options.spatialPath),
    topLimit: options.topLimit
  });
  writeJson(options.outPath, result.candidates);
  writeJson(options.topPath, result.top);
  writeJson(options.summaryPath, result.summary);
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
