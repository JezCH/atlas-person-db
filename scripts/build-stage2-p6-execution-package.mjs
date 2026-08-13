import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compileCoverage } = require('../server/atlas-p6-prebinding-execution-compiler.js');
const { materializePackage } = require('../server/atlas-p6-execution-plan-materializer.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

function normalizeNode(value) {
  if (Array.isArray(value)) return value.map(normalizeNode);
  if (!value || typeof value !== 'object') return value;
  const out = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeNode(child)]));
  for (const key of Object.keys(out)) {
    if (!key.endsWith('_identity_class') || typeof out[key] !== 'string') continue;
    const uuidKey = `${key.slice(0, -'_identity_class'.length)}_polity_uuid`;
    if (Object.prototype.hasOwnProperty.call(out, uuidKey) && out[uuidKey] != null) delete out[key];
  }
  if (out.type === 'retire_activity' && !Array.isArray(out.replacement_activity_ids) && out.survivor_activity_id != null) out.replacement_activity_ids = [out.survivor_activity_id];
  return out;
}

function normalizeAdapters(raw) {
  return { ...raw, adapters: (raw.adapters || []).map((adapter) => ({ ...adapter, fragments: (adapter.fragments || []).map((fragment) => ({
    ...fragment,
    polity_id: fragment.polity_id ?? fragment.polity_uuid ?? null,
    role_id: fragment.role_id ?? fragment.role_uuid ?? null,
    period_basis_id: fragment.period_basis_id ?? fragment.period_basis_uuid ?? null,
    activity_start: fragment.activity_start ?? fragment.start_year,
    activity_end: fragment.activity_end ?? fragment.end_year,
    relation: fragment.relation || (fragment.relation_type_uuid ? ['reviewed_literal', fragment.relation_type_uuid] : null),
    start_boundary: fragment.start_boundary || { year: fragment.start_year, granularity: 'year', certainty: fragment.certainty || 'exact' },
    end_boundary: fragment.end_boundary || { year: fragment.end_year, granularity: 'year', certainty: fragment.certainty || 'exact' }
  })) })) };
}

function commonInputs() {
  const allocations = readJson('stage2/execution/p6-execution-identity-allocations.v1.json');
  const p5Reviewed = readJson('stage2/execution/p5-reviewed-identity-source-authoring.v1.json');
  const rolePrerequisites = readJson('stage2/execution/p6-reviewed-role-prerequisites.v1.json');
  const resolutionAdapters = readJson('stage2/integration/p6-execution-resolution-adapters.v1.json');
  const reviewedSources = (p5Reviewed.sources || []).map((row) => ({ candidate_key: row.candidate_key, source_uuid: row.row.id }));
  return { allocations, reviewedSources, rolePrerequisites, resolutionAdapters };
}

export function buildStage2P6ExecutionPackage() {
  const goldenPlan = readJson('stage2/execution/p6-correction-v2-execution-batch1.v1.json');
  const prebindingBatches = Array.from({ length: 18 }, (_, index) => normalizeNode(readJson(`stage2/integration/p6-correction-v2-prebinding-batch${index + 1}.v1.json`)));
  return compileCoverage({ goldenPlan, prebindingBatches, ...commonInputs() });
}

export function buildStage2P6LiteralExecutionPackage() {
  const prebindingBatches = Array.from({ length: 17 }, (_, index) => readJson(`stage2/integration/p6-correction-v2-prebinding-batch${index + 2}.v1.json`));
  const common = commonInputs();
  return materializePackage({ prebindingBatches, allocations: common.allocations, reviewedSources: common.reviewedSources, rolePrerequisites: common.rolePrerequisites, resolutionAdapters: normalizeAdapters(common.resolutionAdapters) });
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const literal = process.argv.includes('--literal');
  const built = literal ? buildStage2P6LiteralExecutionPackage() : buildStage2P6ExecutionPackage();
  const text = `${JSON.stringify(built, null, 2)}\n`;
  const writeIndex = process.argv.indexOf('--write');
  if (writeIndex >= 0) {
    const output = process.argv[writeIndex + 1] || (literal ? 'stage2/execution/p6-literal-execution-package.v1.json' : 'stage2/execution/p6-execution-package.v1.json');
    fs.writeFileSync(path.join(root, output), text);
  } else process.stdout.write(text);
  if (!literal && built.coverage.blockers !== 0) process.exitCode = 2;
}
