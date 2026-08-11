import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-runtime-integrity-'));
const reportPath = path.join(tmp, 'report.json');

execFileSync(process.execPath, [
  path.join(root, 'migration/phase-8/scripts/phase8c-c7-runtime-dependency-inventory.mjs'),
  root,
  reportPath
], { stdio: 'inherit' });

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.status !== 'ZERO_REACHABLE_LEGACY_RUNTIME') {
  throw new Error(`runtime status is ${report.status}`);
}
if (report.unexpected_api_routes.length) {
  throw new Error(`unexpected API routes: ${JSON.stringify(report.unexpected_api_routes)}`);
}
if (report.intended_runtime_forbidden_hits.length) {
  throw new Error(`intended runtime legacy hits: ${JSON.stringify(report.intended_runtime_forbidden_hits)}`);
}
if (report.public_runtime_forbidden_hits.length) {
  throw new Error(`public runtime legacy hits: ${JSON.stringify(report.public_runtime_forbidden_hits)}`);
}
if (report.transitional_candidates.length) {
  throw new Error(`transitional runtime files remain: ${JSON.stringify(report.transitional_candidates)}`);
}

console.log(JSON.stringify({
  marker: 'ATLAS_RUNTIME_INTEGRITY_V1',
  status: 'PASS',
  api_routes: report.api_routes,
  browser_reachable_count: report.browser_reachable_count,
  public_api_reachable_count: report.public_api_reachable_count
}, null, 2));
