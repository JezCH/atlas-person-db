import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { auditBaselineBDocument } = require('../server/atlas-project-integrity-audit.js');

function fail(message) {
  throw new Error(`ATLAS_PROJECT_INTEGRITY_AUDIT_INVALID: ${message}`);
}

const inputArg = process.argv[2];
const outputArg = process.argv[3] || null;
if (!inputArg) fail('usage: node scripts/audit-atlas-project-integrity.mjs <baseline-b.json> [output.json]');

const inputPath = path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) fail(`input not found: ${inputArg}`);

const baseline = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (baseline?.schema !== 'atlas-stage2-baseline-b/v2') {
  fail(`expected atlas-stage2-baseline-b/v2, got ${baseline?.schema || 'missing schema'}`);
}

const audit = auditBaselineBDocument(baseline);
const rendered = `${JSON.stringify(audit, null, 2)}\n`;

if (outputArg) {
  const outputPath = path.resolve(process.cwd(), outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered);
}

process.stdout.write(rendered);
