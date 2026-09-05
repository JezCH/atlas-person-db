import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ACTIVITY_REFERENCE = Object.freeze({
  source_schema: 'atlas_v2',
  source_table: 'person_politics_v2',
  source_column: 'polity_id'
});

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function assertAuditContract(audit, expectedDeploymentSha) {
  asObject(audit, 'audit');
  if (audit.ok !== true || audit.marker !== 'ATLAS_POLITY_REFERENCE_AUDIT_V1') {
    throw new Error('audit is not a successful ATLAS polity reference audit');
  }
  if (audit.read_only !== true || audit.committed !== false || audit.complete !== true) {
    throw new Error('audit must be complete, read-only, and uncommitted');
  }
  if (!Array.isArray(audit.polities)) {
    throw new Error('audit.polities must be an array');
  }
  if (expectedDeploymentSha && audit.deployment_sha !== expectedDeploymentSha) {
    throw new Error(`deployment SHA mismatch: expected ${expectedDeploymentSha}, got ${audit.deployment_sha || 'missing'}`);
  }
}

function assertSpatialContract(spatial) {
  asObject(spatial, 'spatial index');
  asObject(spatial.polity_geography, 'spatial index polity_geography');
  asObject(spatial.polity_subregions, 'spatial index polity_subregions');
}

function activityReferenceCount(polity) {
  const references = Array.isArray(polity?.external_references) ? polity.external_references : [];
  return references.reduce((total, reference) => {
    if (
      reference?.source_schema !== ACTIVITY_REFERENCE.source_schema ||
      reference?.source_table !== ACTIVITY_REFERENCE.source_table ||
      reference?.source_column !== ACTIVITY_REFERENCE.source_column
    ) {
      return total;
    }
    const count = Number(reference.count);
    return Number.isFinite(count) && count > 0 ? total + count : total;
  }, 0);
}

function preferredNames(polity) {
  const names = Array.isArray(polity?.names) ? polity.names : [];
  return names
    .filter((entry) => entry?.is_preferred === true && typeof entry?.name === 'string' && entry.name.trim())
    .map((entry) => ({ locale: entry.locale ?? null, name: entry.name }));
}

function stableCandidateSort(left, right) {
  const countDelta = right.activity_reference_count - left.activity_reference_count;
  if (countDelta !== 0) return countDelta;
  const keyDelta = String(left.canonical_key ?? '').localeCompare(String(right.canonical_key ?? ''), 'en');
  if (keyDelta !== 0) return keyDelta;
  return String(left.polity_id ?? '').localeCompare(String(right.polity_id ?? ''), 'en');
}

export function buildSpatialPolityCandidates({ audit, spatial, expectedDeploymentSha = null, topLimit = 100 }) {
  assertAuditContract(audit, expectedDeploymentSha);
  assertSpatialContract(spatial);

  const candidates = audit.polities
    .filter((polity) => {
      const polityId = polity?.polity_id;
      return typeof polityId === 'string' && polityId && spatial.polity_geography[polityId] == null;
    })
    .map((polity) => ({ polity, activityCount: activityReferenceCount(polity) }))
    .filter(({ activityCount }) => activityCount > 0)
    .map(({ polity, activityCount }) => ({
      polity_id: polity.polity_id,
      canonical_key: polity.canonical_key ?? null,
      polity_type: polity.polity_type ?? null,
      historicity: polity.historicity ?? null,
      preferred_names: preferredNames(polity),
      activity_reference_count: activityCount
    }))
    .sort(stableCandidateSort);

  const summary = {
    deployment_sha: audit.deployment_sha ?? null,
    geography_count: Object.keys(spatial.polity_geography).length,
    subregion_count: Object.keys(spatial.polity_subregions).length,
    unplaced_used_polity_count: candidates.length
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
      case '--audit': options.auditPath = value; index += 1; break;
      case '--spatial': options.spatialPath = value; index += 1; break;
      case '--out': options.outPath = value; index += 1; break;
      case '--top': options.topPath = value; index += 1; break;
      case '--summary': options.summaryPath = value; index += 1; break;
      case '--expected-deployment-sha': options.expectedDeploymentSha = value; index += 1; break;
      case '--top-limit': options.topLimit = Number(value); index += 1; break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }

  for (const [key, label] of [
    ['auditPath', '--audit'],
    ['spatialPath', '--spatial'],
    ['outPath', '--out'],
    ['topPath', '--top'],
    ['summaryPath', '--summary']
  ]) {
    if (!options[key]) throw new Error(`missing required argument ${label}`);
  }
  if (!Number.isInteger(options.topLimit) || options.topLimit < 0) {
    throw new Error('--top-limit must be a non-negative integer');
  }
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
  const result = buildSpatialPolityCandidates({
    audit: readJson(options.auditPath),
    spatial: readJson(options.spatialPath),
    expectedDeploymentSha: options.expectedDeploymentSha ?? null,
    topLimit: options.topLimit
  });

  writeJson(options.outPath, result.candidates);
  writeJson(options.topPath, result.top);
  writeJson(options.summaryPath, result.summary);
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
