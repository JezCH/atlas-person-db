import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compileCoverage } = require('../server/atlas-p6-prebinding-execution-compiler.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function buildStage2P6ExecutionPackage() {
  const goldenPlan = readJson('stage2/execution/p6-correction-v2-execution-batch1.v1.json');
  const prebindingBatches = Array.from({ length: 18 }, (_, index) => readJson(`stage2/integration/p6-correction-v2-prebinding-batch${index + 1}.v1.json`));
  const allocations = readJson('stage2/execution/p6-execution-identity-allocations.v1.json');
  const p5Reviewed = readJson('stage2/execution/p5-reviewed-identity-source-authoring.v1.json');
  const rolePrerequisites = readJson('stage2/execution/p6-reviewed-role-prerequisites.v1.json');
  const resolutionAdapters = readJson('stage2/integration/p6-execution-resolution-adapters.v1.json');
  const reviewedSources = (p5Reviewed.sources || []).map((row) => ({ candidate_key: row.candidate_key, source_uuid: row.row.id }));
  return compileCoverage({ goldenPlan, prebindingBatches, allocations, reviewedSources, rolePrerequisites, resolutionAdapters });
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const built = buildStage2P6ExecutionPackage();
  const text = `${JSON.stringify(built, null, 2)}\n`;
  const writeIndex = process.argv.indexOf('--write');
  if (writeIndex >= 0) {
    const output = process.argv[writeIndex + 1] || 'stage2/execution/p6-execution-package.v1.json';
    fs.writeFileSync(path.join(root, output), text);
  } else {
    process.stdout.write(text);
  }
  if (built.coverage.blockers !== 0) process.exitCode = 2;
}
