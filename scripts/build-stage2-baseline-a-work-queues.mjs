import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/stage2-baseline-a-work-queues.json');
const summaryPath = arg('--summary', 'artifacts/stage2-baseline-a-work-queues-summary.json');
if (!ledgerPath) throw new Error('missing --ledger');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported Baseline A master ledger schema');
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 338) throw new Error(`expected Baseline A 338 rows, got ${ledger?.rows?.length ?? 'invalid'}`);
const uniqueIds = new Set(ledger.rows.map((row) => row.activity_id));
if (uniqueIds.size !== ledger.rows.length) throw new Error('master ledger contains duplicate Activity UUIDs');

const dependencyNames = ['relation_type','historical_research','chronology_correction','polity_identity_model','person_identity_review','polity_relation_model','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'];
const compact=(row)=>({activity_id:row.activity_id,person_id:row.person?.uuid??null,person:row.person?.canonical??null,polity_id:row.polity?.uuid??null,polity:row.polity?.canonical??null,start_year:row.activity?.start_year??null,end_year:row.activity?.end_year??null,role:row.activity?.role??null,decision:row.audit?.decision??null,relation_hint:row.audit?.relation_hint??null,execution_class:row.audit?.execution_class??null,dependencies:row.audit?.dependencies??[],decision_source:row.audit?.primary_source??null});
const sortRows=(rows)=>[...rows].sort((a,b)=>(a.start_year??0)-(b.start_year??0)||(a.end_year??0)-(b.end_year??0)||String(a.person).localeCompare(String(b.person))||String(a.activity_id).localeCompare(String(b.activity_id)));
const byDependency=Object.fromEntries(dependencyNames.map((dep)=>[dep,sortRows(ledger.rows.filter((row)=>row.audit.dependencies.includes(dep)).map(compact))]));
const executionClasses=[...new Set(ledger.rows.map((row)=>row.audit.execution_class))].sort();
const byExecutionClass=Object.fromEntries(executionClasses.map((cls)=>[cls,sortRows(ledger.rows.filter((row)=>row.audit.execution_class===cls).map(compact))]));
const remaining={
  r1_blocked_schema:byExecutionClass.R1_BLOCKED_SCHEMA??[],
  person_identity:byDependency.person_identity_review,
  polity_identity:byDependency.polity_identity_model,
  polity_relations:byDependency.polity_relation_model,
  governance:byDependency.governance_context,
  chronology:byDependency.chronology_correction,
  sub_year:byDependency.sub_year_precision,
  provenance:byDependency.provenance_backfill,
  entity_model_migration:byDependency.entity_model_migration,
  historical_research:byDependency.historical_research,
  relation_type:byDependency.relation_type
};
const dependencyCounts=Object.fromEntries(dependencyNames.map((dep)=>[dep,byDependency[dep].length]));
const executionCounts=Object.fromEntries(executionClasses.map((cls)=>[cls,byExecutionClass[cls].length]));
for(const dep of dependencyNames){if(Number(ledger.summary?.dependency_counts?.[dep]??0)!==dependencyCounts[dep]) throw new Error(`dependency queue drift ${dep}`);}
if(ledger.summary?.current_schema_cleanup?.pending_r0_actions!==0||ledger.summary?.current_schema_cleanup?.pending_r1_current_schema_actions!==0) throw new Error('current-schema cleanup must be complete before Baseline A work queues');
if(Object.keys(byExecutionClass).some((key)=>/^R0_|^R1_READY_AFTER_R0$/.test(key))) throw new Error('applied R0/R1 actions leaked into fresh work queues');
const summary={schema:'atlas-stage2-baseline-a-work-queues-summary/v2',baseline:ledger.baseline,baseline_relationships:ledger.rows.length,unique_activity_ids:uniqueIds.size,reviewed_research_closures_applied:Number(ledger.summary?.reviewed_research_closures_applied||0),dependency_counts:dependencyCounts,execution_class_counts:executionCounts,current_schema_cleanup_pending:0,production_mutation_authorized:false};
const result={schema:'atlas-stage2-baseline-a-work-queues/v2',status:'AUDIT_ONLY_NO_PRODUCTION_MUTATION',derived_from:{ledger_schema:ledger.schema,baseline:ledger.baseline},summary,remaining,by_dependency:byDependency,by_execution_class:byExecutionClass};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.mkdirSync(path.dirname(summaryPath),{recursive:true});fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`);fs.writeFileSync(summaryPath,`${JSON.stringify(summary,null,2)}\n`);
console.log(`ATLAS_BASELINE_A_WORK_QUEUES_OK rows=${ledger.rows.length} cleanup_pending=0 research=${dependencyCounts.historical_research}`);console.log(JSON.stringify(summary,null,2));
