import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integrationDir = path.join(root, 'stage2/integration');
const executionDir = path.join(root, 'stage2/execution');
const outPath = path.join(root, 'artifacts/stage2-p6-execution-blockers.json');

const genericNonBranchBlockers = new Set([
  'P5_PRODUCTION_SCHEMA_NOT_APPLIED',
  'PRODUCTION_RELEASE_NOT_AUTHORIZED',
  'PRODUCTION_MUTATION_NOT_AUTHORIZED',
  'PRODUCTION_EXECUTION_NOT_AUTHORIZED'
]);

function walk(value, visit, pointer = '$') {
  visit(value, pointer);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, `${pointer}[${index}]`));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) walk(child, visit, `${pointer}.${key}`);
  }
}

function extractCases(doc) {
  if (Array.isArray(doc.cases)) return doc.cases;
  if (Array.isArray(doc.prebindings)) return doc.prebindings;
  if (Array.isArray(doc.activities)) return doc.activities;
  return [];
}

function activityIds(doc) {
  const ids = new Set();
  walk(doc, (value, pointer) => {
    if (/activity_id$/.test(pointer) && typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) ids.add(value.toLowerCase());
  });
  return [...ids];
}

function classifyNullUuid(pointer) {
  const lower = pointer.toLowerCase();
  if (lower.includes('source_candidates') && lower.endsWith('.source_uuid')) return 'SOURCE_UUID_UNALLOCATED';
  if (/(target|polity|relation|activity).*_uuid$/.test(lower) || lower.endsWith('.source_uuid')) return 'LITERAL_UUID_UNALLOCATED';
  return null;
}

const batches = [];
for (let index = 1; index <= 18; index += 1) {
  const file = `p6-correction-v2-prebinding-batch${index}.v1.json`;
  const fullPath = path.join(integrationDir, file);
  if (!fs.existsSync(fullPath)) throw new Error(`P6_PREBINDING_FILE_MISSING:${file}`);
  const doc = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const blockers = [];
  const cases = extractCases(doc);

  for (const blocker of doc.common_execution_blockers || []) {
    if (!genericNonBranchBlockers.has(blocker)) blockers.push({ code: blocker, pointer: '$.common_execution_blockers' });
  }

  walk(doc, (value, pointer) => {
    if (value === null) {
      const code = classifyNullUuid(pointer);
      if (code) blockers.push({ code, pointer });
      return;
    }
    if (typeof value !== 'string') return;
    const upper = value.toUpperCase();
    if (upper.includes('NOT_EXECUTION_READY')) blockers.push({ code: 'EXPLICIT_NOT_EXECUTION_READY', pointer, value });
    if (upper.includes('UNRESOLVED') && !upper.includes('NO_UNRESOLVED')) blockers.push({ code: 'EXPLICIT_UNRESOLVED', pointer, value });
  });

  const dedup = new Map();
  for (const blocker of blockers) dedup.set(`${blocker.code}|${blocker.pointer}|${blocker.value || ''}`, blocker);
  batches.push({
    batch: index,
    file,
    batch_id: doc.batch_id || null,
    status: doc.status || null,
    case_count: cases.length,
    activity_ids: activityIds({ cases }),
    branch_blockers: [...dedup.values()]
  });
}

const executionBatch1 = path.join(executionDir, 'p6-correction-v2-execution-batch1.v1.json');
if (!fs.existsSync(executionBatch1)) throw new Error('P6_EXECUTION_BATCH1_MISSING');
const batch1Plan = JSON.parse(fs.readFileSync(executionBatch1, 'utf8'));
const alreadyPlannedActivities = new Set((batch1Plan.operations || []).map((operation) => operation.activity_id).filter(Boolean));

for (const batch of batches) {
  batch.already_execution_planned_activity_count = batch.activity_ids.filter((id) => alreadyPlannedActivities.has(id)).length;
}

const report = {
  schema: 'atlas-stage2-p6-execution-blocker-report/v1',
  status: 'BRANCH_ONLY_EXECUTION_PACKAGE_BLOCKER_INVENTORY',
  rules: {
    production_authorization_and_unapplied_p5_are_not_branch_compilation_blockers: true,
    null_literal_uuid_is_a_blocker_when_it_identifies_a_source_target_relation_or_activity_operand: true,
    explicit_not_execution_ready_or_unresolved_markers_are_fail_closed: true,
    report_does_not_invent_missing_uuid_or_chronology: true
  },
  summary: {
    prebinding_batches: batches.length,
    prebinding_case_count: batches.reduce((sum, batch) => sum + batch.case_count, 0),
    unique_activity_ids_seen: new Set(batches.flatMap((batch) => batch.activity_ids)).size,
    already_execution_planned_activities: alreadyPlannedActivities.size,
    batches_with_branch_blockers: batches.filter((batch) => batch.branch_blockers.length).length,
    branch_blocker_count: batches.reduce((sum, batch) => sum + batch.branch_blockers.length, 0)
  },
  batches
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
console.log(`P6_EXECUTION_BLOCKER_REPORT=${path.relative(root, outPath)}`);
