import fs from 'node:fs';
import path from 'node:path';
import { buildBaselineAIntake, readBaselineFile } from './stage2-baseline-a-intake.mjs';

const descriptorPath = process.argv[2];
const baselinePath = process.argv[3];
const outputPath = process.argv[4];
if (!descriptorPath || !baselinePath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-capture.mjs <descriptor.json> <baseline-a.json|baseline-a.json.gz> [intake-output.json]');
}

const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
if (descriptor?.schema !== 'atlas-stage2-baseline-a-capture/v2') {
  throw new Error('BASELINE_A_CAPTURE_INVALID: unsupported descriptor schema');
}
if (descriptor?.source?.kind !== 'github_actions_artifact') {
  throw new Error('BASELINE_A_CAPTURE_INVALID: source must be reviewed GitHub Actions artifact');
}
if (!Number.isInteger(descriptor?.source?.workflow_run_id) || !Number.isInteger(descriptor?.source?.artifact_id)) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: source run/artifact id required');
}
if (!/^sha256:[0-9a-f]{64}$/.test(String(descriptor?.source?.artifact_digest || ''))) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: artifact digest malformed');
}

const baseline = readBaselineFile(baselinePath);
const intake = buildBaselineAIntake(baseline);
if (intake.deployment_sha !== descriptor.source.deployment_sha) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: deployment SHA mismatch');
}
if (intake.baseline_digest !== descriptor.baseline_digest) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: baseline digest mismatch');
}
if (intake.row_count !== descriptor.row_count) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: row count mismatch');
}
for (const [key, value] of Object.entries(descriptor.counts || {})) {
  if (Number(intake.counts?.[key]) !== Number(value)) {
    throw new Error(`BASELINE_A_CAPTURE_INVALID: counts.${key} mismatch`);
  }
}
if (intake.row_count !== 338) {
  throw new Error(`BASELINE_A_CAPTURE_INVALID: reviewed Baseline A must contain 338 Activities, got ${intake.row_count}`);
}
if (intake.authority.production_mutation_authorized !== false) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: intake cannot authorize Production mutation');
}
if (intake.durability.full_activity_rows_preserved !== true || intake.durability.full_identity_catalogs_preserved !== true) {
  throw new Error('BASELINE_A_CAPTURE_INVALID: full Baseline A handoff was not preserved');
}

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(intake, null, 2)}\n`);
}
console.log(`ATLAS_BASELINE_A_CAPTURE_OK sha=${intake.deployment_sha} rows=${intake.row_count} digest=${intake.baseline_digest}`);
