import fs from 'node:fs';
import path from 'node:path';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const BASELINE_ROWS = 338;
const APPLIED_R0_KEEP = new Set([
  'da809f25-40ff-5c27-b10b-88d4acc4070d',
  '4263e4d0-a0a0-5803-a61b-85a57322db7e',
  'b0d35acc-9705-5b80-96bb-02616df72bcc',
  '16ebebde-e4e4-553d-a520-00da68a276d2',
  '05d7091a-5cfc-5ec0-9aa3-32461925e7c7',
  '1ff585a7-c481-5d38-98ff-38381c81d961'
]);
const APPLIED_REMOVED = new Set([
  '75a124e8-df55-5247-aa48-dc9d7934c10e',
  'd1e0a5a6-31a1-5691-8d05-570dccdcad18',
  '25ce2112-9b21-55dd-88d1-029153fc1a5a',
  'd641eec9-2770-5099-8017-8ec3bcc9244e',
  'caa526f9-220d-540c-93ea-d889f6d9b8cb',
  'a8946a02-9235-5985-b882-0c7d60b555dd',
  '2a749964-c057-5671-bdaa-8388099b871d',
  'e4b374f5-ee25-5c12-80bf-5b7b1d2d149c'
]);
const BISMARCK_PRUSSIA = '6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8';
const RELATION_CODES = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const intakePath = arg('--intake');
const outPath = arg('--out', 'artifacts/stage2-baseline-a-master-ledger.json');
const summaryPath = arg('--summary', 'artifacts/stage2-baseline-a-master-ledger-summary.json');
const auditDir = arg('--audit-dir', 'docs/audits');
if (!intakePath) throw new Error('missing --intake');

function cleanCell(s) { return String(s ?? '').trim().replace(/^`|`$/g, '').replace(/\\\|/g, '|').trim(); }
function splitMarkdownRow(line) {
  const trimmed = line.trim(); if (!trimmed.startsWith('|')) return [];
  const body = trimmed.replace(/^\|/, '').replace(/\|$/, ''); const cells = []; let current = ''; let inCode = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '`') { inCode = !inCode; current += ch; continue; }
    if (ch === '|' && !inCode && body[i - 1] !== '\\') { cells.push(cleanCell(current)); current = ''; continue; }
    current += ch;
  }
  cells.push(cleanCell(current)); return cells;
}
function isSeparator(line) { const cells = splitMarkdownRow(line || ''); return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, ''))); }
function normalizeHeader(h) { return cleanCell(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function parseTables(text, file) {
  const lines = text.split(/\r?\n/); const out = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!lines[i].trim().startsWith('|') || !isSeparator(lines[i + 1])) continue;
    const headers = splitMarkdownRow(lines[i]).map(normalizeHeader); let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|')) {
      const cells = splitMarkdownRow(lines[j]);
      if (cells.length === headers.length) out.push({ file, line: j + 1, values: Object.fromEntries(headers.map((h, k) => [h, cells[k]])) });
      j += 1;
    }
    i = j - 1;
  }
  return out;
}
function firstField(values, names) { for (const n of names) if (values[n] != null && String(values[n]).trim() !== '') return cleanCell(values[n]); return null; }
function parsePeriod(period) { const nums = cleanCell(period || '').replace(/[–—]/g, '-').match(/-?\d+/g)?.map(Number) ?? []; return nums.length >= 2 ? [nums[0], nums[1]] : nums.length === 1 ? [nums[0], nums[0]] : [null, null]; }
function semanticKey({ person, polity, start, end, role }) { return [person, polity, start, end, role].map((v) => String(v ?? '').trim().toLowerCase()).join('|'); }
function filePriority(file) {
  const b = path.basename(file);
  if (b.includes('STAGE2_R1_CORRECTION_DECISION_LEDGER')) return 100;
  if (b.includes('STAGE2_R0_NORMALIZED_INVENTORY_EVIDENCE')) return 95;
  if (b.includes('BASELINE_A_EXPLICIT_CARRY_FORWARD')) return 92;
  if (b.includes('STAGE2_R0_RECONCILIATION_DECISIONS')) return 90;
  if (b.includes('WAVE14_CURRENT_HIGH_RISK')) return 85;
  if (b.includes('WAVE15')) return 80;
  if (b.includes('WAVE13_LIVE_RECONCILIATION')) return 75;
  if (b.includes('CURRENT_UUID_CARRY_FORWARD')) return 70;
  if (/WAVE(?:8|9|10|11|12)_/.test(b)) return 60;
  if (/WAVE(?:2|3|4|5|6|7)_/.test(b)) return 55;
  if (b === 'POLITY_SEMANTIC_AUDIT_2026-08-11.md') return 50;
  return 20;
}
function classifyDependencies(decision, relationHint, contextText = '') {
  const decisionText = String(decision ?? '').toUpperCase();
  const relation = String(relationHint ?? '').trim().toLowerCase();
  const s = `${decision ?? ''} ${relationHint ?? ''} ${contextText}`.toUpperCase(); const deps = new Set();
  if (RELATION_CODES.has(relation) || /RELATION|SERVES|ACTIVE_IN|ACTIVE IN|OPPOSES|GOVERNS|CLAIMS_RULE|CLAIMS RULE|CONTROLS_GOVERNMENT|CONTROLS GOVERNMENT/.test(decisionText)) deps.add('relation_type');
  if (/REGIME|GOVERNMENT_LAYER|GOVERNANCE_CONTEXT|FIFTH REPUBLIC|GANDEN PHODRANG/.test(s)) deps.add('governance_context');
  if (/CONTINUITY|PARENT_CHILD|PARENT-CHILD|STATE_FORM|STATE FORM|TEMPORAL_LABEL|IDENTITY_RECONCILIATION|POLITY_ALIAS|POLITY_NAME|CANONICAL_NAME|STABLE_RUSSIA_IDENTITY/.test(s)) deps.add('polity_identity_model');
  if (/SPLIT|CHRONOLOGY|BACK_PROJECT|BACKPROJECT|BACK-PROJECT|BACK PROJECTION|UPDATE_ACTIVITY_END/.test(decisionText)) deps.add('chronology_correction');
  if (/SUB_YEAR|SUBYEAR|SUB-YEAR|MONTH|DAY PRECISION/.test(s)) deps.add('sub_year_precision');
  if (/DUPLICATE_PERSON/.test(decisionText)) deps.add('person_identity_review');
  if (/RESEARCH|DEFER|UNCERTAIN|HISTORICITY_REVIEW|PERSON_HISTORICITY_REVIEW/.test(decisionText)) deps.add('historical_research');
  if (/LAYERED_AUTHORITY|REGIONAL_AUTHORITY|OVERLORD|TRIBUTARY|DEPENDENT|CONSTITUENT/.test(decisionText)) deps.add('polity_relation_model');
  return [...deps].sort();
}
function executionClass(decision, deps, relationHint = null) {
  const s = String(decision ?? '').toUpperCase();
  if (s.startsWith('R1_BLOCKED_')) return 'R1_BLOCKED_SCHEMA';
  if (/OUT_OF_POLITY_MODEL/.test(s)) return 'DEFER_MODEL_EXTENSION';
  if (deps.includes('person_identity_review')) return 'BLOCKED_PERSON_IDENTITY';
  if (deps.includes('polity_identity_model')) return 'BLOCKED_POLITY_IDENTITY';
  if (deps.includes('polity_relation_model')) return 'BLOCKED_LAYERED_AUTHORITY';
  if (deps.includes('governance_context')) return 'BLOCKED_GOVERNANCE_CONTEXT';
  if (deps.includes('relation_type') && /KEEP/.test(s)) return 'KEEP_POLITY_RELATION_LAYER_PENDING';
  if (deps.includes('historical_research')) return 'DEFER_RESEARCH';
  if (deps.includes('chronology_correction')) return 'STAGE2_CHRONOLOGY_CORRECTION';
  if (/^KEEP(?:_POLITY)?$/.test(s) && ['rules', null, undefined, ''].includes(relationHint)) return 'NO_CHANGE_POLITY';
  if (/KEEP/.test(s)) return 'KEEP_POLITY_STAGE2_REVIEW';
  if (/RELINK/.test(s)) return 'STAGE2_RELINK';
  if (/SPLIT/.test(s)) return 'STAGE2_SPLIT';
  return 'STAGE2_REVIEW';
}

const auditFiles = fs.readdirSync(auditDir).filter((n) => n.endsWith('.md')).filter((n) => /POLITY_SEMANTIC_AUDIT|STAGE2_R0|STAGE2_R1/.test(n)).map((n) => path.join(auditDir, n));
const fileTexts = new Map(auditFiles.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const tableRows = auditFiles.flatMap((file) => parseTables(fileTexts.get(file), file));
const directCandidatesByUuid = new Map(); const historicalByKey = new Map(); const carryRows = [];
function addCandidate(uuid, candidate) { const id = uuid.toLowerCase(); if (!directCandidatesByUuid.has(id)) directCandidatesByUuid.set(id, []); directCandidatesByUuid.get(id).push(candidate); }

for (const row of tableRows) {
  const v = row.values; const uuidField = firstField(v, ['current_activity_uuid','activity_uuid','current_uuid','uuid','id']);
  const person = firstField(v, ['person','current_person']); const polity = firstField(v, ['current_polity','polity','politic']); const role = firstField(v, ['role','current_role']);
  const [start,end] = parsePeriod(firstField(v,['period'])); const decision = firstField(v,['decision','verdict','status','classification']); const relationHint = firstField(v,['relation_hint','relation']);
  const priorSource = firstField(v,['prior_audit_source']); const contextText = Object.values(v).join(' | ');
  for (const uuid of uuidField?.match(UUID_RE) ?? []) {
    addCandidate(uuid,{kind:priorSource?'carry_forward':'table',file:row.file,line:row.line,decision,relation_hint:relationHint,prior_source:priorSource,person,polity,role,start,end,context_text:contextText,priority:filePriority(row.file)});
    if (priorSource) carryRows.push({uuid:uuid.toLowerCase(),...row,person,polity,role,start,end,priorSource});
  }
  if (person && polity && decision) { const key=semanticKey({person,polity,start,end,role}); if(!historicalByKey.has(key)) historicalByKey.set(key,[]); historicalByKey.get(key).push({file:row.file,line:row.line,decision,relation_hint:relationHint,context_text:contextText,priority:filePriority(row.file)}); }
}

const r1TargetDecisions = new Map(Object.entries({
  '2a749964-c057-5671-bdaa-8388099b871d':'R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE',
  '6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8':'R1_READY_UPDATE_ACTIVITY_END',
  'e4b374f5-ee25-5c12-80bf-5b7b1d2d149c':'R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE',
  '4ac4c38c-6d8b-55ce-b999-b0639e67eb22':'R1_BLOCKED_REGIME_LAYER',
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d':'R1_BLOCKED_RELATION_SEMANTICS',
  'e5337054-ff56-58fd-a105-ea6d71d4ef33':'R1_BLOCKED_RELATION_AND_ROLE_SPLIT',
  '0c084a88-58be-52e8-81bb-b73bf0a11bb1':'R1_BLOCKED_SUBYEAR_PRECISION',
  'b651ff3e-0df1-552a-9134-56ca95e9f3be':'R1_DEFER_TARGET_POLITY',
  '7eefdc4d-8aec-5689-b4d8-6b1745240581':'R1_DEFER_LAYERED_HAN_WEI_TARGET',
  'f64072c1-a665-5e09-9581-ab5d8cf766a9':'R1_DEFER_PRE221_SHU_TARGET',
  'df6cc626-135e-5abc-ae54-6dc1f64ac2aa':'R1_DEFER_PRE221_SHU_TARGET',
  'b16e2fb0-7515-5bd6-8aa0-0f921f55b63f':'R1_DEFER_PRE221_SHU_TARGET'
}));
for (const [file,text] of fileTexts.entries()) if (/STAGE2_R1_CORRECTION_DECISION_LEDGER/.test(file)) {
  const lines=text.split(/\r?\n/); for(const [uuid,decision] of r1TargetDecisions){ const lineIndex=lines.findIndex((line)=>line.toLowerCase().includes(uuid)); if(lineIndex<0) throw new Error(`R1 target UUID ${uuid} missing from ${file}`); addCandidate(uuid,{kind:'stage2_r1_target',file,line:lineIndex+1,decision,relation_hint:null,context_text:lines.slice(Math.max(0,lineIndex-8),Math.min(lines.length,lineIndex+24)).join('\n'),priority:filePriority(file)}); }
}
for (const row of tableRows.filter((r)=>/STAGE2_R0_NORMALIZED_INVENTORY_EVIDENCE/.test(r.file))) {
  const keep=firstField(row.values,['keep']); const drop=firstField(row.values,['drop']);
  const keepUuid=keep?.match(UUID_RE)?.[0]; const dropUuid=drop?.match(UUID_RE)?.[0];
  if(keepUuid) addCandidate(keepUuid,{kind:'r0_normalized',file:row.file,line:row.line,decision:'R0_TRUE_ACTIVITY_DUPLICATE_KEEP',relation_hint:null,context_text:Object.values(row.values).join(' | '),priority:95});
  if(dropUuid) addCandidate(dropUuid,{kind:'r0_normalized',file:row.file,line:row.line,decision:'R0_TRUE_ACTIVITY_DUPLICATE_DROP',relation_hint:null,context_text:Object.values(row.values).join(' | '),priority:95});
}
for (const c of carryRows) {
  const carry=(directCandidatesByUuid.get(c.uuid)??[]).find((x)=>x.kind==='carry_forward'&&x.line===c.line); if(!carry||carry.decision) continue;
  const priorMatch=c.priorSource.match(/([^`:\s]+\.md):(\d+)/); let inherited=null;
  if(priorMatch){
    const priorFile=path.join(auditDir,priorMatch[1]); const targetLine=Number(priorMatch[2]);
    const exactRow=tableRows.find((r)=>r.file===priorFile&&r.line===targetLine)??null;
    if(exactRow){
      const priorPerson=firstField(exactRow.values,['person','current_person']); const priorPolity=firstField(exactRow.values,['current_polity','polity','politic']); const priorRole=firstField(exactRow.values,['role','current_role']);
      const [priorStart,priorEnd]=parsePeriod(firstField(exactRow.values,['period']));
      const currentKey=semanticKey({person:c.person,polity:c.polity,start:c.start,end:c.end,role:c.role}); const priorKey=semanticKey({person:priorPerson,polity:priorPolity,start:priorStart,end:priorEnd,role:priorRole});
      if(priorKey!==currentKey) throw new Error(`carry-forward source semantic mismatch for ${c.uuid}: ${path.basename(priorFile)}:${targetLine}`);
      const exactDecision=firstField(exactRow.values,['decision','verdict','status','classification']);
      if(exactDecision) inherited={decision:exactDecision,relation_hint:firstField(exactRow.values,['relation_hint','relation']),file:exactRow.file,line:exactRow.line,context_text:Object.values(exactRow.values).join(' | ')};
    }
  }
  if(!inherited&&c.person&&c.polity){const key=semanticKey({person:c.person,polity:c.polity,start:c.start,end:c.end,role:c.role}); inherited=(historicalByKey.get(key)??[]).sort((a,b)=>b.priority-a.priority)[0]??null;}
  if(inherited){carry.decision=inherited.decision;carry.relation_hint=inherited.relation_hint;carry.inherited_from=`${path.basename(inherited.file)}:${inherited.line}`;carry.context_text=`${carry.context_text} | inherited: ${inherited.context_text}`;}
}

const intake=JSON.parse(fs.readFileSync(intakePath,'utf8'));
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||!Array.isArray(intake.activity_rows)) throw new Error('intake must be validated atlas-stage2-baseline-a-intake/v2 with activity_rows');
if(intake.row_count!==BASELINE_ROWS||intake.activity_rows.length!==BASELINE_ROWS) throw new Error(`expected reviewed Baseline A ${BASELINE_ROWS} rows, got ${intake.activity_rows?.length}`);
if(intake.authority?.old_346_baseline_authoritative!==false||intake.authority?.production_mutation_authorized!==false) throw new Error('invalid Baseline A authority flags');
const roleKo=new Map(); for(const role of intake.identity_catalogs.roles||[]) roleKo.set(role.id,(role.names||[]).find((n)=>n.locale==='ko'&&n.is_preferred)?.name??null);
for(const removed of APPLIED_REMOVED) if(intake.activity_uuids.includes(removed)) throw new Error(`applied removed Activity survived Baseline A: ${removed}`);
for(const keep of APPLIED_R0_KEEP) if(!intake.activity_uuids.includes(keep)) throw new Error(`R0 representative missing from Baseline A: ${keep}`);
const bismarck=intake.activity_rows.find((r)=>r.activity_id===BISMARCK_PRUSSIA); if(!bismarck||bismarck.activity_start!==1862||bismarck.activity_end!==1890) throw new Error('Bismarck R1 interval postcondition missing');

const ledgerRows=[]; const missing=[]; const seen=new Set();
for(const row of intake.activity_rows){
  const id=String(row.activity_id).toLowerCase(); if(seen.has(id)) throw new Error(`duplicate Activity ${id}`); seen.add(id);
  const all=(directCandidatesByUuid.get(id)??[]).filter((c)=>c.decision).sort((a,b)=>b.priority-a.priority||a.file.localeCompare(b.file)||a.line-b.line);
  let candidates=all.filter((c)=>c.decision!=='R0_TRUE_ACTIVITY_DUPLICATE_KEEP' && !(id===BISMARCK_PRUSSIA&&c.decision==='R1_READY_UPDATE_ACTIVITY_END'));
  let primary=candidates[0]??null; let applied=[];
  if(APPLIED_R0_KEEP.has(id)) applied.push('R0_TRUE_ACTIVITY_DUPLICATE_COALESCE_APPLIED');
  if(id===BISMARCK_PRUSSIA) applied.push('R1_ACTIVITY_INTERVAL_UPDATE_APPLIED');
  if(!primary && APPLIED_R0_KEEP.has(id)) primary={kind:'applied_cleanup_fallback',file:'docs/release/PRODUCTION_TRAIN1_RESULT_2026-08-12.md',line:1,decision:'POST_R0_REVIEWED_SURVIVOR',relation_hint:null,context_text:'R0 applied; semantic review preserved for Stage 2',priority:0};
  if(!primary && id===BISMARCK_PRUSSIA) primary={kind:'applied_cleanup_fallback',file:'docs/release/PRODUCTION_TRAIN1_RESULT_2026-08-12.md',line:1,decision:'POST_R1_INTERVAL_UPDATED',relation_hint:null,context_text:'R1 interval correction applied',priority:0};
  if(!primary){missing.push({activity_id:id,person:row.person_name_en,polity:row.polity_name_en});continue;}
  const deps=classifyDependencies(primary.decision,primary.relation_hint,primary.context_text); const cls=executionClass(primary.decision,deps,primary.relation_hint);
  ledgerRows.push({activity_id:id,person:{uuid:row.person_id,canonical:row.person_name_en,display_ko:row.person_name_ko??null},polity:{uuid:row.polity_id,canonical:row.polity_name_en,display_ko:row.polity_name_ko??null},activity:{start_year:row.activity_start,end_year:row.activity_end,role_id:row.role_id??null,role:row.role_source_label??null,role_display_ko:row.role_id?roleKo.get(row.role_id)??null:null,period_basis_id:row.period_basis_id,period_basis:row.period_basis},audit:{decision:primary.decision,relation_hint:primary.relation_hint??null,execution_class:cls,dependencies:deps,primary_source:`${path.basename(primary.file)}:${primary.line}`,inherited_from:primary.inherited_from??null,applied_current_schema_corrections:applied,candidate_decisions:all.map((c)=>({decision:c.decision,relation_hint:c.relation_hint??null,source:`${path.basename(c.file)}:${c.line}`,kind:c.kind}))}});
}
if(missing.length){console.error(JSON.stringify({missing},null,2));throw new Error(`Baseline A ledger has ${missing.length} Activity UUID(s) without reviewed audit coverage`);}
if(ledgerRows.length!==BASELINE_ROWS) throw new Error(`ledger row count mismatch ${ledgerRows.length}`);
ledgerRows.sort((a,b)=>a.activity.start_year-b.activity.start_year||a.activity.end_year-b.activity.end_year||String(a.person.canonical).localeCompare(String(b.person.canonical))||a.activity_id.localeCompare(b.activity_id));
const countBy=(getter)=>Object.fromEntries([...ledgerRows.reduce((m,r)=>{const k=getter(r);m.set(k,(m.get(k)??0)+1);return m;},new Map()).entries()].sort((a,b)=>a[0].localeCompare(b[0])));
const dependencyCounts={}; for(const row of ledgerRows) for(const dep of row.audit.dependencies) dependencyCounts[dep]=(dependencyCounts[dep]??0)+1;
const summary={schema:'atlas-stage2-baseline-a-master-ledger-summary/v2',baseline:{deployment_sha:intake.deployment_sha,baseline_digest:intake.baseline_digest,relationship_count:BASELINE_ROWS},ledger_rows:ledgerRows.length,unique_activity_ids:new Set(ledgerRows.map((r)=>r.activity_id)).size,execution_class_counts:countBy((r)=>r.audit.execution_class),primary_decision_counts:countBy((r)=>r.audit.decision),dependency_counts:Object.fromEntries(Object.entries(dependencyCounts).sort((a,b)=>a[0].localeCompare(b[0]))),current_schema_cleanup:{r0_removed_absent:APPLIED_REMOVED.size===8,r0_keep_representatives_present:APPLIED_R0_KEEP.size===6,bismarck_interval_applied:true,pending_r0_actions:0,pending_r1_current_schema_actions:0}};
const master={schema:'atlas-stage2-baseline-a-master-ledger/v2',status:'BASELINE_A_POST_R0_R1_AUDIT_ONLY_NO_PRODUCTION_MUTATION',baseline:summary.baseline,generated_from:{baseline_intake:intakePath,audit_directory:auditDir,audit_markdown_files:auditFiles.map((f)=>path.basename(f)).sort(),generator:'scripts/build-stage2-baseline-a-master-ledger.mjs'},summary,rows:ledgerRows};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.mkdirSync(path.dirname(summaryPath),{recursive:true});fs.writeFileSync(outPath,`${JSON.stringify(master,null,2)}\n`);fs.writeFileSync(summaryPath,`${JSON.stringify(summary,null,2)}\n`);
console.log(`ATLAS_BASELINE_A_MASTER_LEDGER_OK rows=${ledgerRows.length} digest=${intake.baseline_digest}`);console.log(JSON.stringify(summary,null,2));