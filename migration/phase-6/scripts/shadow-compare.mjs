#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const [legacyPath, v2Path, outputPath] = process.argv.slice(2);
if (!legacyPath || !v2Path || !outputPath) {
  console.error('usage: node shadow-compare.mjs <legacy.json> <v2.json> <report.json>');
  process.exit(64);
}

const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
const required = ['id','person_name','politic_name','activity_start','activity_end','role','period_basis','notes'];

function normalizeRow(row) {
  const out = {};
  for (const key of required) out[key] = row[key] ?? null;
  out.activity_start = Number(out.activity_start);
  out.activity_end = Number(out.activity_end);
  return out;
}

function stableRow(row) {
  return JSON.stringify(normalizeRow(row));
}

function fingerprint(rows) {
  const body = rows.map(stableRow).sort().join('\n');
  return `sha256:${crypto.createHash('sha256').update(body).digest('hex')}`;
}

function validate(rows, label) {
  const failures = [];
  const ids = new Map();
  rows.forEach((raw, index) => {
    const row = normalizeRow(raw);
    for (const key of required) {
      if (row[key] === null && !['role','notes'].includes(key)) failures.push(`${label}[${index}] ${key} is null`);
    }
    if (!Number.isInteger(row.activity_start) || !Number.isInteger(row.activity_end)) failures.push(`${label}[${index}] years must be integers`);
    if (row.activity_end < row.activity_start) failures.push(`${label}[${index}] invalid chronology`);
    const id = String(row.id);
    ids.set(id, (ids.get(id) || 0) + 1);
  });
  const duplicateIds = [...ids.entries()].filter(([,count]) => count > 1).map(([id,count]) => ({id,count}));
  return { failures, duplicateIds };
}

const legacyValidation = validate(legacy, 'legacy');
const v2Validation = validate(v2, 'v2');
const legacyById = new Map(legacy.map((row) => [String(row.id), normalizeRow(row)]));
const v2ById = new Map(v2.map((row) => [String(row.id), normalizeRow(row)]));
const exactMatches = [];
const changedSharedIds = [];
const missingInV2 = [];
const extraInV2 = [];

for (const [id, row] of legacyById) {
  if (!v2ById.has(id)) {
    missingInV2.push({id, row});
  } else if (stableRow(row) === stableRow(v2ById.get(id))) {
    exactMatches.push(id);
  } else {
    changedSharedIds.push({id, legacy: row, v2: v2ById.get(id)});
  }
}
for (const [id, row] of v2ById) if (!legacyById.has(id)) extraInV2.push({id, row});

const report = {
  marker: 'PHASE_6_SHADOW_COMPARISON',
  generated_at: new Date().toISOString(),
  counts: {
    legacy: legacy.length,
    v2: v2.length,
    exact_matches: exactMatches.length,
    changed_shared_ids: changedSharedIds.length,
    missing_in_v2: missingInV2.length,
    extra_in_v2: extraInV2.length,
    unexplained_differences: changedSharedIds.length + missingInV2.length + extraInV2.length
  },
  fingerprints: { legacy: fingerprint(legacy), v2: fingerprint(v2) },
  validation: {
    legacy_failures: legacyValidation.failures,
    v2_failures: v2Validation.failures,
    legacy_duplicate_ids: legacyValidation.duplicateIds,
    v2_duplicate_ids: v2Validation.duplicateIds
  },
  changed_shared_ids: changedSharedIds,
  missing_in_v2: missingInV2,
  extra_in_v2: extraInV2,
  pass: legacyValidation.failures.length === 0 && v2Validation.failures.length === 0 && legacyValidation.duplicateIds.length === 0 && v2Validation.duplicateIds.length === 0
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
if (!report.pass) process.exit(2);
