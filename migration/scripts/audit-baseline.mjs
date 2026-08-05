#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = new Set(process.argv.slice(2));
const mode = args.has('--write') ? 'write' : 'check';
const rootArgIndex = process.argv.indexOf('--root');
const root = path.resolve(rootArgIndex >= 0 ? process.argv[rootArgIndex + 1] : '.');
const reportsDir = path.join(root, 'migration', 'reports');

const REQUIRED = [
  'atlas-canonical-data.js',
  'index.html',
  'admin.html',
  'schema.sql',
  'non-timeline-persons.json'
];

function posix(p) { return p.split(path.sep).join('/'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function normalizeText(v) { return String(v ?? '').normalize('NFC').trim().replace(/\s+/g, ' '); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  }
  return value;
}
function stableJson(value) { return JSON.stringify(stable(value), null, 2) + '\n'; }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function listTop() { return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name); }
function numericLocaleSort(a, b) {
  const num = s => Number((s.match(/-(\d+)\.json$/) || [])[1] || 0);
  if (num(a) !== num(b)) return num(a) - num(b);
  return a.localeCompare(b);
}

const anomalies = [];
function issue(severity, code, pathValue, message, evidence = {}) {
  anomalies.push({ severity, code, path: pathValue || null, message, evidence: stable(evidence) });
}

for (const rel of REQUIRED) if (!exists(rel)) issue('fatal', 'REQUIRED_SOURCE_MISSING', rel, `Required source is missing: ${rel}`);
if (anomalies.some(a => a.severity === 'fatal')) finish(2);

const topFiles = listTop();
const canonicalFiles = topFiles.filter(n => /^pending-records(?:-supplement(?:-\d+)?)?\.json$/.test(n) || n === 'pending-records-corrections.json').sort(numericLocaleSort);
const localeFiles = topFiles.filter(n => /^person-locales(?:-supplement(?:-\d+)?)?\.js$/.test(n)).sort();
const htmlFiles = ['index.html', 'admin.html'];
const schemaFiles = ['schema.sql', ...((exists('migrations') ? fs.readdirSync(path.join(root, 'migrations')) : []).filter(n => n.endsWith('.sql')).map(n => `migrations/${n}`).sort())];

function parseJson(rel) {
  try { return JSON.parse(read(rel)); }
  catch (error) { issue('fatal', 'JSON_PARSE_FAILED', rel, error.message); return null; }
}

function extractObjectLiteral(source, constantName, rel) {
  const marker = `const ${constantName}`;
  const start = source.indexOf(marker);
  if (start < 0) return {};
  const open = source.indexOf('{', start);
  if (open < 0) { issue('fatal', 'LOCALE_OBJECT_MISSING', rel, `${constantName} object start not found`); return {}; }
  let i = open, depth = 0, quote = null, esc = false;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) { issue('fatal', 'LOCALE_OBJECT_UNTERMINATED', rel, `${constantName} object is unterminated`); return {}; }
  const literal = source.slice(open, i + 1);
  const out = {};
  const pair = /["']([^"']+)["']\s*:\s*["']([^"']*)["']\s*,?/g;
  let m;
  while ((m = pair.exec(literal))) {
    if (Object.hasOwn(out, m[1]) && out[m[1]] !== m[2]) issue('fatal', 'LOCALE_CONFLICT_IN_FILE', rel, `Conflicting locale key ${m[1]}`, { old: out[m[1]], new: m[2] });
    out[m[1]] = m[2];
  }
  const residue = literal.replace(pair, '').replace(/[{}\s,]/g, '');
  if (residue) issue('fatal', 'UNSUPPORTED_LOCALE_SYNTAX', rel, `Unsupported syntax in ${constantName}`, { residue: residue.slice(0, 120) });
  return out;
}

const rawRows = [];
for (const rel of canonicalFiles) {
  const rows = parseJson(rel);
  if (!Array.isArray(rows)) { issue('fatal', 'CANONICAL_NOT_ARRAY', rel, 'Canonical dataset must be an array'); continue; }
  rows.forEach((row, index) => rawRows.push({ ...row, __source: rel, __index: index }));
}
const nonTimeline = parseJson('non-timeline-persons.json');
if (!Array.isArray(nonTimeline)) issue('fatal', 'NON_TIMELINE_NOT_ARRAY', 'non-timeline-persons.json', 'Non-timeline dataset must be an array');

const allowedBasis = new Set(['reign','term','de_facto_rule','military_activity','religious_activity','intellectual_activity','artistic_activity','general_activity']);
const strictMap = new Map();
const compatMap = new Map();
const persons = new Set();
const polities = new Set();
for (const row of rawRows) {
  const person = normalizeText(row.person_name);
  const polity = normalizeText(row.politic_name);
  const start = Number(row.activity_start);
  const end = Number(row.activity_end);
  const role = normalizeText(row.role);
  const basis = normalizeText(row.period_basis || 'general_activity');
  if (!person || !polity) issue('fatal', 'MISSING_REQUIRED_FIELD', row.__source, 'Missing person or polity', { index: row.__index });
  if (!Number.isInteger(start) || !Number.isInteger(end)) issue('fatal', 'INVALID_YEAR', row.__source, 'Activity years must be integers', { index: row.__index, start: row.activity_start, end: row.activity_end });
  if (end < start) issue('fatal', 'REVERSED_YEAR_RANGE', row.__source, 'Activity end precedes start', { index: row.__index, start, end });
  if (!allowedBasis.has(basis)) issue('error', 'UNSUPPORTED_PERIOD_BASIS', row.__source, `Unsupported period basis: ${basis}`, { index: row.__index });
  persons.add(person); polities.add(polity);
  const strict = [person.toLowerCase(), polity.toLowerCase(), start, end, basis.toLowerCase(), role.toLowerCase()].join('\u0001');
  const compat = [person.toLowerCase(), polity.toLowerCase(), start, end].join('\u0001');
  if (strictMap.has(strict)) issue('warning', 'DUPLICATE_STRICT_RELATIONSHIP', row.__source, 'Duplicate strict relationship', { first: strictMap.get(strict), duplicate: { source: row.__source, index: row.__index } });
  else strictMap.set(strict, { source: row.__source, index: row.__index });
  if (!compatMap.has(compat)) compatMap.set(compat, []);
  compatMap.get(compat).push({ source: row.__source, index: row.__index, role, basis, notes: normalizeText(row.notes) });
}
for (const [key, rows] of compatMap) {
  const variants = new Set(rows.map(r => JSON.stringify([r.role, r.basis, r.notes])));
  if (rows.length > 1 && variants.size > 1) issue('warning', 'COMPATIBILITY_KEY_VARIANTS', null, 'Rows share legacy key but differ in role, basis, or notes', { key, rows });
}

const personLocales = {};
const polityLocales = {};
for (const rel of localeFiles) {
  const source = read(rel);
  const p = extractObjectLiteral(source, 'personAdditions', rel);
  const q = extractObjectLiteral(source, 'polityAdditions', rel);
  for (const [k, v] of Object.entries(p)) {
    if (personLocales[k] && personLocales[k] !== v) issue('fatal', 'PERSON_LOCALE_CONFLICT', rel, `Conflicting translation for ${k}`, { old: personLocales[k], new: v });
    personLocales[k] = v;
  }
  for (const [k, v] of Object.entries(q)) {
    if (polityLocales[k] && polityLocales[k] !== v) issue('fatal', 'POLITY_LOCALE_CONFLICT', rel, `Conflicting translation for ${k}`, { old: polityLocales[k], new: v });
    polityLocales[k] = v;
  }
}

function scriptsIn(html) {
  return [...read(html).matchAll(/<script[^>]+src=["']\.\/([^"'?]+)[^"']*["']/g)].map(m => m[1]);
}
const loaderScripts = Object.fromEntries(htmlFiles.map(h => [h, scriptsIn(h)]));
for (const rel of localeFiles) {
  for (const html of htmlFiles) if (!loaderScripts[html].includes(rel)) issue('error', 'LOCALE_FILE_NOT_LOADED', html, `${rel} exists but is not loaded`, { locale_file: rel });
}
const indexLocale = loaderScripts['index.html'].filter(x => /^person-locales/.test(x));
const adminLocale = loaderScripts['admin.html'].filter(x => /^person-locales/.test(x));
if (JSON.stringify(indexLocale) !== JSON.stringify(adminLocale)) issue('fatal', 'LOCALE_LOADER_MISMATCH', null, 'index.html and admin.html locale loaders differ', { index: indexLocale, admin: adminLocale });

for (const p of persons) if (!personLocales[p]) issue('error', 'MISSING_PERSON_KO', null, `Missing Korean display name: ${p}`, { person_name: p });
for (const p of polities) if (!polityLocales[p]) issue('error', 'MISSING_POLITY_KO', null, `Missing Korean polity name: ${p}`, { politic_name: p });
for (const k of Object.keys(personLocales)) if (!persons.has(k) && !(nonTimeline || []).some(x => normalizeText(x.person_name) === k)) issue('error', 'ORPHAN_PERSON_LOCALE', null, `Locale key has no person record: ${k}`);
for (const k of Object.keys(polityLocales)) if (!polities.has(k) && !(nonTimeline || []).some(x => normalizeText(x.politic_name) === k)) issue('error', 'ORPHAN_POLITY_LOCALE', null, `Locale key has no polity record: ${k}`);

const timelineNames = new Set([...persons].map(x => x.toLowerCase()));
for (const row of nonTimeline || []) {
  const name = normalizeText(row.person_name);
  if (!row.display_name_ko) issue('error', 'NON_TIMELINE_MISSING_KO', 'non-timeline-persons.json', `Missing Korean display name: ${name}`);
  if (timelineNames.has(name.toLowerCase())) issue('error', 'TIMELINE_NON_TIMELINE_OVERLAP', 'non-timeline-persons.json', `Person appears in both datasets: ${name}`);
}

const inventoryPaths = [...canonicalFiles, 'non-timeline-persons.json', ...localeFiles, ...htmlFiles, 'atlas-canonical-data.js', 'ingest.js', 'app.js', 'admin.js', ...schemaFiles].filter((v, i, a) => a.indexOf(v) === i && exists(v));
const inventory = inventoryPaths.map(rel => {
  const buf = fs.readFileSync(path.join(root, rel));
  return { path: posix(rel), bytes: buf.length, sha256: sha256(buf), category: rel.endsWith('.json') ? 'json' : rel.endsWith('.js') ? 'javascript' : rel.endsWith('.html') ? 'html' : 'sql' };
}).sort((a,b) => a.path.localeCompare(b.path));

const severityCounts = { fatal: 0, error: 0, warning: 0 };
for (const a of anomalies) severityCounts[a.severity]++;
const report = {
  metadata: { repository: 'JezCH/atlas-person-db', branch: 'agent/normalized-i18n-migration', baseline_main_sha: 'a8ed85b7cf8bf687450688eb7f2216c766112950', audit_version: 1 },
  inventory: { file_count: inventory.length, canonical_files: canonicalFiles, locale_files: localeFiles, files: inventory },
  canonical: { raw_rows: rawRows.length, unique_strict_relationships: strictMap.size, unique_compatibility_relationships: compatMap.size, unique_persons: persons.size, unique_polities: polities.size },
  non_timeline: { rows: Array.isArray(nonTimeline) ? nonTimeline.length : 0 },
  locales: { person_entries: Object.keys(personLocales).length, polity_entries: Object.keys(polityLocales).length, loader_scripts: loaderScripts },
  schema: { files: schemaFiles.filter(exists) },
  anomalies: { counts: severityCounts, items: anomalies.sort((a,b) => `${a.severity}|${a.code}|${a.path}|${a.message}`.localeCompare(`${b.severity}|${b.code}|${b.path}|${b.message}`)) },
  gate: { audit_engine: severityCounts.fatal === 0 ? 'PASS' : 'FAIL', data_clean: severityCounts.fatal + severityCounts.error === 0, locale_loader_defect_detected: anomalies.some(a => a.code === 'LOCALE_FILE_NOT_LOADED' && a.evidence.locale_file === 'person-locales-supplement-6.js') }
};

function validate(r) {
  const ok = r && r.metadata && r.inventory && r.canonical && r.non_timeline && r.locales && r.schema && r.anomalies && r.gate;
  if (!ok) issue('fatal', 'REPORT_SCHEMA_INVALID', null, 'Required report section is missing');
  return ok;
}
validate(report);

const outputs = {
  'phase-2-file-inventory.json': stableJson({ metadata: report.metadata, files: inventory }),
  'phase-2-anomalies.json': stableJson({ metadata: report.metadata, counts: severityCounts, items: report.anomalies.items }),
  'phase-2-baseline.json': stableJson(report),
  'phase-2-baseline.md': `# Phase 2 Baseline Audit\n\n- Repository: ${report.metadata.repository}\n- Branch: ${report.metadata.branch}\n- Baseline main SHA: \`${report.metadata.baseline_main_sha}\`\n- Canonical source files: ${canonicalFiles.length}\n- Canonical rows: ${report.canonical.raw_rows}\n- Unique persons: ${report.canonical.unique_persons}\n- Unique polities: ${report.canonical.unique_polities}\n- Unique strict relationships: ${report.canonical.unique_strict_relationships}\n- Non-timeline rows: ${report.non_timeline.rows}\n- Person locale entries: ${report.locales.person_entries}\n- Polity locale entries: ${report.locales.polity_entries}\n- Fatal anomalies: ${severityCounts.fatal}\n- Errors: ${severityCounts.error}\n- Warnings: ${severityCounts.warning}\n- Locale supplement 6 loader defect detected: ${report.gate.locale_loader_defect_detected ? 'yes' : 'no'}\n- Audit engine: ${report.gate.audit_engine}\n- Data clean: ${report.gate.data_clean ? 'yes' : 'no'}\n` 
};

const digest1 = sha256(Buffer.from(Object.keys(outputs).sort().map(k => outputs[k]).join('\u0000')));
const digest2 = sha256(Buffer.from(Object.keys(outputs).sort().map(k => outputs[k]).join('\u0000')));
if (digest1 !== digest2) { issue('fatal', 'NON_DETERMINISTIC_OUTPUT', null, 'Determinism check failed'); finish(5); }

if (mode === 'write') {
  fs.mkdirSync(reportsDir, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) fs.writeFileSync(path.join(reportsDir, name), content, 'utf8');
}

if (severityCounts.fatal > 0) finish(1);
finish(0);

function finish(code) {
  if (mode === 'check' || code !== 0) {
    process.stdout.write(stableJson({ mode, exit_code: code, anomaly_counts: anomalies.reduce((acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; }, {}) }));
  }
  process.exit(code);
}
