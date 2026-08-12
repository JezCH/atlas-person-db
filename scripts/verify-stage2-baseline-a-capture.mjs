import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { buildBaselineAIntake, readBaselineFile } from './stage2-baseline-a-intake.mjs';

const descriptorPath = process.argv[2];
const outputPath = process.argv[3];
if (!descriptorPath) throw new Error('usage: node scripts/verify-stage2-baseline-a-capture.mjs <descriptor.json> [intake-output.json]');

const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
if (descriptor?.schema !== 'atlas-stage2-baseline-a-capture/v2') throw new Error('BASELINE_A_CAPTURE_INVALID: unsupported descriptor schema');
const capturePath = path.resolve(path.dirname(descriptorPath), '..', '..', String(descriptor.capture_path || ''));
if (!fs.existsSync(capturePath)) throw new Error(`BASELINE_A_CAPTURE_INVALID: capture missing ${descriptor.capture_path}`);
const compressed = fs.readFileSync(capturePath);
const compressedDigest = `sha256:${crypto.createHash('sha256').update(compressed).digest('hex')}`;
if (compressedDigest !== descriptor.compressed_sha256) throw new Error('BASELINE_A_CAPTURE_INVALID: compressed sha256 mismatch');

const baseline = readBaselineFile(capturePath);
const intake = buildBaselineAIntake(baseline);
if (intake.deployment_sha !== descriptor.deployment_sha) throw new Error('BASELINE_A_CAPTURE_INVALID: deployment SHA mismatch');
if (intake.baseline_digest !== descriptor.baseline_digest) throw new Error('BASELINE_A_CAPTURE_INVALID: baseline digest mismatch');
if (intake.row_count !== descriptor.row_count) throw new Error('BASELINE_A_CAPTURE_INVALID: row count mismatch');
for (const [key, value] of Object.entries(descriptor.counts || {})) {
  if (Number(intake.counts?.[key]) !== Number(value)) throw new Error(`BASELINE_A_CAPTURE_INVALID: counts.${key} mismatch`);
}
if (intake.row_count !== 338) throw new Error(`BASELINE_A_CAPTURE_INVALID: reviewed Baseline A must contain 338 Activities, got ${intake.row_count}`);
if (intake.authority.production_mutation_authorized !== false) throw new Error('BASELINE_A_CAPTURE_INVALID: intake cannot authorize Production mutation');
if (intake.durability.full_activity_rows_preserved !== true) throw new Error('BASELINE_A_CAPTURE_INVALID: Activity rows not preserved');

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(intake, null, 2)}\n`);
}
console.log(`ATLAS_BASELINE_A_CAPTURE_OK sha=${intake.deployment_sha} rows=${intake.row_count} digest=${intake.baseline_digest}`);
