#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = path.resolve(getArg('--root', '.'));
const outputDir = path.resolve(getArg('--output', path.join(root, 'migration', 'reports')));
const branch = getArg('--branch', process.env.GITHUB_REF_NAME || 'agent/phase2-audit-hardening');
const auditedCommit = getArg('--commit', process.env.GITHUB_SHA || 'unknown');
const baselineMainSha = 'a8ed85b7cf8bf687450688eb7f2216c766112950';

const REQUIRED = ['atlas-canonical-data.js','index.html','admin.html','schema.sql','non-timeline-persons.json'];
const ALLOWED_BASIS = new Set(['reign','term','de_facto_rule','military_activity','religious_activity','intellectual_activity','artistic_activity','general_activity']);
const anomalies = [];

function issue(severity, code, filePath, message, evidence = {}) {
  anomalies.push({ severity, code, path: filePath || null, message, evidence: stable(evidence) });
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function stableJson(value) { return JSON.stringify(stable(value), null, 2) + '\n'; }
function normalizeText(v) { return String(v ?? '').normalize('NFC').trim().replace(/\s+/g, ' '); }
function posix(p) { return p.split(path.sep).join('/'); }
function abs(rel) { return path.join(root, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function sha256Buffer(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function parseJson(rel) {
  try { return JSON.parse(read(rel)); }
  catch (error) { issue('fatal','JSON_PARSE_FAILED',rel,error.message); return null; }
}
function listTopFiles() { return fs.readdirSync(root, {withFileTypes:true}).filter(e => e.isFile()).map(e => e.name); }
function numericSuffix(file) {
  const m = file.match(/-supplement-(\d+)\./);
  return m ? Number(m[1]) : file.includes('-supplement.') ? 1 : 0;
}
function stableFileSort(a,b) {
  const na = numericSuffix(a), nb = numericSuffix(b);
  if (na !== nb) return na - nb;
  return a.localeCompare(b);
}
function decodeStringLiteral(source, start) {
  const quote = source[start];
  let out = '';
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === quote) return { value: out, end: i + 1 };
    if (ch === '\\') {
      const n = source[++i];
      if (n === 'n') out += '\n'; else if (n === 'r') out += '\r'; else if (n === 't') out += '\t';
      else if (n === 'u') {
        const hex = source.slice(i + 1, i + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('Invalid Unicode escape');
        out += String.fromCharCode(parseInt(hex,16)); i += 4;
      } else out += n;
    } else out += ch;
  }
  throw new Error('Unterminated string literal');
}
function skipTrivia(source, i) {
  while (i < source.length) {
    if (/\s/.test(source[i])) { i++; continue; }
    if (source[i] === '/' && source[i+1] === '/') { i += 2; while (i < source.length && source[i] !== '\n') i++; continue; }
    if (source[i] === '/' && source[i+1] === '*') { i += 2; while (i + 1 < source.length && !(source[i] === '*' && source[i+1] === '/')) i++; i += 2; continue; }
    break;
  }
  return i;
}
function parseStaticObject(source, openIndex, rel, label) {
  const out = {};
  let i = openIndex + 1;
  while (i < source.length) {
    i = skipTrivia(source, i);
    if (source[i] === '}') return { value: out, end: i + 1 };
    if (source[i] !== '"' && source[i] !== "'") throw new Error(`${label}: expected quoted key at ${i}`);
    const key = decodeStringLiteral(source, i); i = skipTrivia(source, key.end);
    if (source[i] !== ':') throw new Error(`${label}: expected colon after ${key.value}`);
    i = skipTrivia(source, i + 1);
    if (source[i] !== '"' && source[i] !== "'") throw new Error(`${label}: expected quoted value for ${key.value}`);
    const val = decodeStringLiteral(source, i); i = skipTrivia(source, val.end);
    if (Object.hasOwn(out,key.value) && out[key.value] !== val.value) issue('fatal','LOCALE_CONFLICT_IN_FILE',rel,`Conflicting locale key ${key.value}`,{old:out[key.value],new:val.value});
    out[key.value] = val.value;
    if (source[i] === ',') { i++; continue; }
    if (source[i] === '}') return { value: out, end: i + 1 };
    throw new Error(`${label}: expected comma or closing brace at ${i}`);
  }
  throw new Error(`${label}: unterminated object`);
}
function findObjectAfter(source, marker, rel) {
  const start = source.indexOf(marker);
  if (start < 0) return {};
  let i = source.indexOf('=', start);
  if (i < 0) throw new Error(`${marker}: assignment missing`);
  i = skipTrivia(source, i + 1);
  if (source.startsWith('Object.freeze', i)) {
    i += 'Object.freeze'.length; i = skipTrivia(source, i);
    if (source[i] !== '(') throw new Error(`${marker}: Object.freeze call malformed`);
    i = skipTrivia(source, i + 1);
  }
  if (source[i] !== '{') throw new Error(`${marker}: object literal missing`);
  return parseStaticObject(source, i, rel, marker).value;
}
function parseLocaleFile(rel) {
  const source = read(rel);
  try {
    if (rel === 'person-locales.js') {
      return {
        persons: findObjectAfter(source, 'const koPersons', rel),
        polities: findObjectAfter(source, 'const koPolities', rel)
      };
    }
    let persons = findObjectAfter(source, 'const personAdditions', rel);
    let polities = findObjectAfter(source, 'const polityAdditions', rel);
    if (Object.keys(persons).length === 0) persons = findObjectAfter(source, 'const persons', rel);
    if (Object.keys(polities).length === 0) polities = findObjectAfter(source, 'const polities', rel);
    return { persons, polities };
  } catch (error) {
    issue('error','LOCALE_PARSE_FAILED',rel,error.message);
    return { persons:{}, polities:{} };
  }
}
function scriptsIn(htmlPath) {
  const html = read(htmlPath);
  return [...html.matchAll(/<script[^>]+src=["'](?:\.\/)?([^"'?]+)(?:\?[^"']*)?["']/g)].map(m => m[1]);
}

for (const rel of REQUIRED) if (!exists(rel)) issue('fatal','REQUIRED_SOURCE_MISSING',rel,`Required source is missing: ${rel}`);
if (anomalies.some(a => a.severity === 'fatal')) process.exit(10);

const top = listTopFiles();
const canonicalFiles = top.filter(n => /^pending-records(?:-supplement(?:-\d+)?)?\.json$/.test(n) || n === 'pending-records-corrections.json').sort(stableFileSort);
const localeFiles = top.filter(n => /^person-locales(?:-supplement(?:-\d+)?)?\.js$/.test(n)).sort(stableFileSort);
const htmlFiles = ['index.html','admin.html'];
const schemaFiles = ['schema.sql', ...((exists('migrations') ? fs.readdirSync(abs('migrations')) : []).filter(n => n.endsWith('.sql')).map(n => `migrations/${n}`).sort())];

const rows = [];
for (const rel of canonicalFiles) {
  const parsed = parseJson(rel);
  if (!Array.isArray(parsed)) { issue('fatal','CANONICAL_NOT_ARRAY',rel,'Canonical dataset must be an array'); continue; }
  parsed.forEach((row,index) => rows.push({...row,__source:rel,__index:index}));
}
const nonTimeline = parseJson('non-timeline-persons.json');
if (!Array.isArray(nonTimeline)) issue('fatal','NON_TIMELINE_NOT_ARRAY','non-timeline-persons.json','Non-timeline dataset must be an array');

const persons = new Set(), polities = new Set(), strict = new Map(), compat = new Map();
for (const row of rows) {
  const person = normalizeText(row.person_name), polity = normalizeText(row.politic_name);
  const start = Number(row.activity_start), end = Number(row.activity_end);
  const role = normalizeText(row.role), basis = normalizeText(row.period_basis || 'general_activity');
  if (!person || !polity) issue('fatal','MISSING_REQUIRED_FIELD',row.__source,'Missing person or polity',{index:row.__index});
  if (!Number.isInteger(start) || !Number.isInteger(end)) issue('fatal','INVALID_YEAR',row.__source,'Activity years must be integers',{index:row.__index,start:row.activity_start,end:row.activity_end});
  if (end < start) issue('fatal','REVERSED_YEAR_RANGE',row.__source,'Activity end precedes start',{index:row.__index,start,end});
  if (!ALLOWED_BASIS.has(basis)) issue('error','UNSUPPORTED_PERIOD_BASIS',row.__source,`Unsupported period basis: ${basis}`,{index:row.__index});
  persons.add(person); polities.add(polity);
  const sk = [person.toLowerCase(),polity.toLowerCase(),start,end,basis.toLowerCase(),role.toLowerCase()].join('\u0001');
  const ck = [person.toLowerCase(),polity.toLowerCase(),start,end].join('\u0001');
  if (strict.has(sk)) issue('warning','DUPLICATE_STRICT_RELATIONSHIP',row.__source,'Duplicate strict relationship',{first:strict.get(sk),duplicate:{source:row.__source,index:row.__index}});
  else strict.set(sk,{source:row.__source,index:row.__index});
  if (!compat.has(ck)) compat.set(ck,[]);
  compat.get(ck).push({source:row.__source,index:row.__index,role,basis,notes:normalizeText(row.notes)});
}
for (const [key, group] of compat) {
  const variants = new Set(group.map(r => JSON.stringify([r.role,r.basis,r.notes])));
  if (group.length > 1 && variants.size > 1) issue('warning','COMPATIBILITY_KEY_VARIANTS',null,'Rows share legacy key but differ in role, basis, or notes',{key,rows:group});
}

const personLocales = {}, polityLocales = {};
for (const rel of localeFiles) {
  const parsed = parseLocaleFile(rel);
  for (const [k,v] of Object.entries(parsed.persons)) {
    if (Object.hasOwn(personLocales,k) && personLocales[k] !== v) issue('fatal','PERSON_LOCALE_CONFLICT',rel,`Conflicting translation for ${k}`,{old:personLocales[k],new:v});
    personLocales[k] = v;
  }
  for (const [k,v] of Object.entries(parsed.polities)) {
    if (Object.hasOwn(polityLocales,k) && polityLocales[k] !== v) issue('fatal','POLITY_LOCALE_CONFLICT',rel,`Conflicting translation for ${k}`,{old:polityLocales[k],new:v});
    polityLocales[k] = v;
  }
}

const loaderScripts = Object.fromEntries(htmlFiles.map(h => [h,scriptsIn(h)]));
for (const rel of localeFiles) for (const html of htmlFiles) if (!loaderScripts[html].includes(rel)) issue('error','LOCALE_FILE_NOT_LOADED',html,`${rel} exists but is not loaded`,{locale_file:rel});
const indexLocale = loaderScripts['index.html'].filter(x => /^person-locales/.test(x));
const adminLocale = loaderScripts['admin.html'].filter(x => /^person-locales/.test(x));
if (JSON.stringify(indexLocale) !== JSON.stringify(adminLocale)) issue('error','LOCALE_LOADER_MISMATCH',null,'index.html and admin.html locale loaders differ',{index:indexLocale,admin:adminLocale});

for (const p of persons) if (!Object.hasOwn(personLocales,p)) issue('error','MISSING_PERSON_KO',null,`Missing Korean display name: ${p}`,{person_name:p});
for (const p of polities) if (!Object.hasOwn(polityLocales,p)) issue('error','MISSING_POLITY_KO',null,`Missing Korean polity name: ${p}`,{politic_name:p});
for (const k of Object.keys(personLocales)) if (!persons.has(k) && !(nonTimeline || []).some(x => normalizeText(x.person_name) === k)) issue('error','ORPHAN_PERSON_LOCALE',null,`Locale key has no person record: ${k}`);
for (const k of Object.keys(polityLocales)) if (!polities.has(k) && !(nonTimeline || []).some(x => normalizeText(x.politic_name) === k)) issue('error','ORPHAN_POLITY_LOCALE',null,`Locale key has no polity record: ${k}`);
const timelineNames = new Set([...persons].map(x => x.toLowerCase()));
for (const row of nonTimeline || []) {
  const name = normalizeText(row.person_name);
  if (!row.display_name_ko) issue('error','NON_TIMELINE_MISSING_KO','non-timeline-persons.json',`Missing Korean display name: ${name}`);
  if (timelineNames.has(name.toLowerCase())) issue('error','TIMELINE_NON_TIMELINE_OVERLAP','non-timeline-persons.json',`Person appears in both datasets: ${name}`);
}

const inventoryPaths = [...canonicalFiles,'non-timeline-persons.json',...localeFiles,...htmlFiles,'atlas-canonical-data.js','ingest.js','app.js','admin.js',...schemaFiles].filter((v,i,a)=>a.indexOf(v)===i && exists(v));
const inventory = inventoryPaths.map(rel => { const buf = fs.readFileSync(abs(rel)); return { path:posix(rel), bytes:buf.length, sha256:sha256Buffer(buf), category:rel.endsWith('.json')?'json':rel.endsWith('.js')?'javascript':rel.endsWith('.html')?'html':'sql' }; }).sort((a,b)=>a.path.localeCompare(b.path));
const severityCounts = {fatal:0,error:0,warning:0};
for (const a of anomalies) severityCounts[a.severity]++;
const sortedAnomalies = anomalies.sort((a,b)=>`${a.severity}|${a.code}|${a.path}|${a.message}`.localeCompare(`${b.severity}|${b.code}|${b.path}|${b.message}`));
const report = {
  metadata:{repository:'JezCH/atlas-person-db',branch,baseline_main_sha:baselineMainSha,audited_commit_sha:auditedCommit,audit_version:2},
  inventory:{file_count:inventory.length,canonical_files:canonicalFiles,locale_files:localeFiles,files:inventory},
  canonical:{raw_rows:rows.length,unique_strict_relationships:strict.size,unique_compatibility_relationships:compat.size,unique_persons:persons.size,unique_polities:polities.size},
  non_timeline:{rows:Array.isArray(nonTimeline)?nonTimeline.length:0},
  locales:{person_entries:Object.keys(personLocales).length,polity_entries:Object.keys(polityLocales).length,loader_scripts:loaderScripts},
  schema:{files:schemaFiles.filter(exists)},
  anomalies:{counts:severityCounts,items:sortedAnomalies},
  gate:{audit_engine:severityCounts.fatal===0?'PASS':'FAIL',data_clean:severityCounts.fatal+severityCounts.error===0,locale_loader_defect_detected:sortedAnomalies.some(a=>a.code==='LOCALE_FILE_NOT_LOADED'&&a.evidence.locale_file==='person-locales-supplement-6.js')}
};

if (severityCounts.fatal > 0) process.exit(11);
fs.mkdirSync(outputDir,{recursive:true});
const outputs = {
  'phase-2-file-inventory.json': stableJson({metadata:report.metadata,files:inventory}),
  'phase-2-anomalies.json': stableJson({metadata:report.metadata,counts:severityCounts,items:sortedAnomalies}),
  'phase-2-baseline.json': stableJson(report),
  'phase-2-baseline.md': `# Phase 2 Baseline Audit\n\n- Repository: ${report.metadata.repository}\n- Branch: ${report.metadata.branch}\n- Baseline main SHA: \`${report.metadata.baseline_main_sha}\`\n- Audited commit SHA: \`${report.metadata.audited_commit_sha}\`\n- Canonical source files: ${canonicalFiles.length}\n- Canonical rows: ${report.canonical.raw_rows}\n- Unique persons: ${report.canonical.unique_persons}\n- Unique polities: ${report.canonical.unique_polities}\n- Unique strict relationships: ${report.canonical.unique_strict_relationships}\n- Non-timeline rows: ${report.non_timeline.rows}\n- Person locale entries: ${report.locales.person_entries}\n- Polity locale entries: ${report.locales.polity_entries}\n- Fatal anomalies: ${severityCounts.fatal}\n- Errors: ${severityCounts.error}\n- Warnings: ${severityCounts.warning}\n- Locale supplement 6 loader defect detected: ${report.gate.locale_loader_defect_detected?'yes':'no'}\n- Audit engine: ${report.gate.audit_engine}\n- Data clean: ${report.gate.data_clean?'yes':'no'}\n`
};
for (const [name,content] of Object.entries(outputs)) fs.writeFileSync(path.join(outputDir,name),content,'utf8');
console.log(JSON.stringify({status:'PASS',output:posix(path.relative(root,outputDir)),counts:severityCounts},null,2));
