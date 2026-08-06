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

function normalizeText(value) {
  return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

function normalizeRow(row) {
  return {
    id: row.id == null ? null : String(row.id),
    person_name: normalizeText(row.person_name),
    politic_name: normalizeText(row.politic_name),
    activity_start: Number(row.activity_start),
    activity_end: Number(row.activity_end),
    role: normalizeText(row.role) || null,
    period_basis: normalizeText(row.period_basis),
    notes: normalizeText(row.notes) || null
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalPayload(row) {
  const normalized = normalizeRow(row);
  return {
    person: normalized.person_name,
    polity: normalized.politic_name,
    start: normalized.activity_start,
    end: normalized.activity_end,
    role: normalized.role || 'unspecified',
    basis: normalized.period_basis || 'general_activity',
    notes: normalized.notes || ''
  };
}

function canonicalSignature(row) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(canonicalPayload(row)))).digest('hex');
}

function fingerprint(rows) {
  const body = rows.map((row) => canonicalSignature(row)).sort().join('\n');
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

function groupBySignature(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const normalized = normalizeRow(row);
    const signature = canonicalSignature(normalized);
    if (!map.has(signature)) map.set(signature, []);
    map.get(signature).push(normalized);
  });
  for (const group of map.values()) group.sort((a,b) => String(a.id).localeCompare(String(b.id)));
  return map;
}

const legacyValidation = validate(legacy, 'legacy');
const v2Validation = validate(v2, 'v2');
const legacyGroups = groupBySignature(legacy);
const v2Groups = groupBySignature(v2);
const allSignatures = [...new Set([...legacyGroups.keys(), ...v2Groups.keys()])].sort();

const matched = [];
const missingInV2 = [];
const extraInV2 = [];
const multiplicityMismatches = [];

for (const signature of allSignatures) {
  const legacyRows = legacyGroups.get(signature) || [];
  const v2Rows = v2Groups.get(signature) || [];
  const common = Math.min(legacyRows.length, v2Rows.length);
  for (let i = 0; i < common; i += 1) {
    matched.push({
      signature,
      legacy_id: legacyRows[i].id,
      v2_id: v2Rows[i].id,
      payload: canonicalPayload(legacyRows[i])
    });
  }
  if (legacyRows.length !== v2Rows.length) {
    multiplicityMismatches.push({
      signature,
      payload: canonicalPayload(legacyRows[0] || v2Rows[0]),
      legacy_count: legacyRows.length,
      v2_count: v2Rows.length,
      delta: v2Rows.length - legacyRows.length
    });
  }
  for (let i = common; i < legacyRows.length; i += 1) missingInV2.push({signature, row: legacyRows[i]});
  for (let i = common; i < v2Rows.length; i += 1) extraInV2.push({signature, row: v2Rows[i]});
}

const structuralPass = legacyValidation.failures.length === 0 &&
  v2Validation.failures.length === 0 &&
  legacyValidation.duplicateIds.length === 0 &&
  v2Validation.duplicateIds.length === 0;
const expansionRowDelta = multiplicityMismatches.reduce((sum, item) => sum + Math.max(0, item.delta), 0);
const contractionRowDelta = multiplicityMismatches.reduce((sum, item) => sum + Math.max(0, -item.delta), 0);
const duplicatePayloadExpansions = multiplicityMismatches.filter((item) => item.delta > 1);
const parityPass = missingInV2.length === 0 &&
  contractionRowDelta === 0 &&
  expansionRowDelta === extraInV2.length;

const report = {
  marker: 'PHASE_6_LINEAGE_PARITY',
  generated_at: new Date().toISOString(),
  comparison_basis: 'canonical compiler payload signature excluding runtime UUID',
  counts: {
    legacy: legacy.length,
    v2: v2.length,
    matched_lineage_rows: matched.length,
    missing_in_v2: missingInV2.length,
    approved_v2_expansion_candidates: extraInV2.length,
    multiplicity_mismatches: multiplicityMismatches.length,
    expansion_row_delta: expansionRowDelta,
    contraction_row_delta: contractionRowDelta,
    duplicate_payload_expansion_groups: duplicatePayloadExpansions.length,
    unexplained_differences: missingInV2.length + contractionRowDelta
  },
  fingerprints: { legacy: fingerprint(legacy), v2: fingerprint(v2) },
  validation: {
    legacy_failures: legacyValidation.failures,
    v2_failures: v2Validation.failures,
    legacy_duplicate_ids: legacyValidation.duplicateIds,
    v2_duplicate_ids: v2Validation.duplicateIds
  },
  matched,
  missing_in_v2: missingInV2,
  approved_v2_expansion_candidates: extraInV2,
  multiplicity_mismatches: multiplicityMismatches,
  duplicate_payload_expansions: duplicatePayloadExpansions,
  structural_pass: structuralPass,
  parity_pass: structuralPass && parityPass
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
if (!report.structural_pass) process.exit(2);
if (!report.parity_pass) process.exit(3);
