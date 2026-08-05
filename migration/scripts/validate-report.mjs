#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'migration/reports');
const required = ['phase-2-file-inventory.json','phase-2-anomalies.json','phase-2-baseline.json'];
function fail(message) { console.error(message); process.exit(12); }
for (const name of required) if (!fs.existsSync(path.join(dir,name))) fail(`Missing report: ${name}`);
let baseline, anomalies, inventory;
try {
  baseline = JSON.parse(fs.readFileSync(path.join(dir,'phase-2-baseline.json'),'utf8'));
  anomalies = JSON.parse(fs.readFileSync(path.join(dir,'phase-2-anomalies.json'),'utf8'));
  inventory = JSON.parse(fs.readFileSync(path.join(dir,'phase-2-file-inventory.json'),'utf8'));
} catch (error) { fail(`Invalid JSON: ${error.message}`); }
const sha40 = /^[0-9a-f]{40}$/;
if (!baseline || typeof baseline !== 'object') fail('Baseline must be an object');
for (const key of ['metadata','inventory','canonical','non_timeline','locales','schema','anomalies','gate']) if (!(key in baseline)) fail(`Baseline missing ${key}`);
if (baseline.metadata.repository !== 'JezCH/atlas-person-db') fail('Repository mismatch');
if (!sha40.test(baseline.metadata.baseline_main_sha)) fail('Invalid baseline SHA');
if (baseline.metadata.audited_commit_sha !== 'unknown' && !sha40.test(baseline.metadata.audited_commit_sha)) fail('Invalid audited commit SHA');
if (!['PASS','FAIL'].includes(baseline.gate.audit_engine)) fail('Invalid audit engine state');
if (typeof baseline.gate.data_clean !== 'boolean') fail('Invalid data_clean');
if (typeof baseline.gate.locale_loader_defect_detected !== 'boolean') fail('Invalid locale defect flag');
for (const n of ['fatal','error','warning']) if (!Number.isInteger(baseline.anomalies.counts[n]) || baseline.anomalies.counts[n] < 0) fail(`Invalid anomaly count ${n}`);
if (!Array.isArray(baseline.anomalies.items)) fail('Anomaly items must be an array');
if (!Array.isArray(inventory.files)) fail('Inventory files must be an array');
if (!Array.isArray(anomalies.items)) fail('Anomaly report items must be an array');
if (JSON.stringify(anomalies.counts) !== JSON.stringify(baseline.anomalies.counts)) fail('Anomaly counts mismatch');
console.log('REPORT_SCHEMA_PASS');
