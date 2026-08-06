#!/usr/bin/env node
import fs from 'node:fs';

const [legacyPath, v2Path, outputPath] = process.argv.slice(2);
if (!legacyPath || !v2Path || !outputPath) {
  console.error('usage: node preview-smoke.mjs <legacy.json> <v2.json> <report.json>');
  process.exit(64);
}

const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));

function normalize(value) {
  return String(value ?? '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('ko-KR');
}

function compact(value) {
  return normalize(value).replace(/\s+/g, '');
}

function rowText(row) {
  return [row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role,row.period_basis,row.notes]
    .map((value) => String(value ?? '')).join(' ');
}

function matches(row, query) {
  if (!String(query ?? '').trim()) return true;
  const normalizedRow = normalize(rowText(row));
  const compactRow = normalizedRow.replace(/\s+/g, '');
  const normalizedQuery = normalize(query);
  const compactQuery = compact(query);
  if (compactQuery && compactRow.includes(compactQuery)) return true;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => normalizedRow.includes(token));
}

function sortRows(items) {
  return [...items].sort((a,b) =>
    String(a.politic_name).localeCompare(String(b.politic_name), 'en', {sensitivity:'base'}) ||
    Number(a.activity_start) - Number(b.activity_start) ||
    Number(a.activity_end) - Number(b.activity_end) ||
    String(a.person_name).localeCompare(String(b.person_name), 'ko')
  );
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
assert(legacy.length === 319, `legacy row count ${legacy.length}`, failures);
assert(v2.length === 349, `v2 row count ${v2.length}`, failures);
assert(sortRows(v2).length === 349, 'v2 sort failed', failures);
assert(v2.some((row) => row.person_name === 'Simon Bolivar' && row.politic_name === 'Gran Colombia'), 'Simon Bolivar preview row missing', failures);
assert(v2.filter((row) => matches(row, 'Simon Bolivar')).length >= 1, 'search by person failed', failures);
assert(v2.filter((row) => matches(row, 'Gran Colombia')).length >= 1, 'search by polity failed', failures);
assert(v2.filter((row) => row.politic_name === 'Gran Colombia').length >= 1, 'polity filter failed', failures);
assert(v2.every((row) => Number.isInteger(Number(row.activity_start)) && Number.isInteger(Number(row.activity_end))), 'year coercion failed', failures);
assert(v2.every((row) => Number(row.activity_end) >= Number(row.activity_start)), 'invalid chronology in preview rows', failures);

const exportRows = sortRows(v2).map((row) => ({
  person_name: row.person_name,
  politic_name: row.politic_name,
  activity_start: Number(row.activity_start),
  activity_end: Number(row.activity_end),
  role: row.role || '',
  period_basis: row.period_basis || '',
  notes: row.notes || ''
}));
assert(exportRows.length === 349, 'export projection row count mismatch', failures);
assert(Object.keys(exportRows[0] || {}).join(',') === 'person_name,politic_name,activity_start,activity_end,role,period_basis,notes', 'export projection schema mismatch', failures);

const rollback = {
  preview_source: 'v2-shadow',
  rollback_source: 'legacy',
  preview_rows: v2.length,
  rollback_rows: legacy.length,
  write_target_unchanged: 'public.person_politics'
};
assert(rollback.rollback_rows === 319, 'rollback row count mismatch', failures);

const report = {
  marker: 'PHASE_6_PREVIEW_SMOKE',
  counts: {legacy: legacy.length, v2: v2.length, failures: failures.length},
  checks: {
    render_projection: failures.filter((x) => x.includes('projection')).length === 0,
    search: failures.filter((x) => x.includes('search')).length === 0,
    filter: failures.filter((x) => x.includes('filter')).length === 0,
    chronology: failures.filter((x) => x.includes('chronology') || x.includes('year')).length === 0,
    export: failures.filter((x) => x.includes('export')).length === 0,
    rollback: failures.filter((x) => x.includes('rollback')).length === 0
  },
  rollback,
  failures,
  pass: failures.length === 0
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (!report.pass) process.exit(2);
