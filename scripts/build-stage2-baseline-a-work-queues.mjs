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
const compact=(row)=>({activity_id:row.activity_id,person_id:row.person?.uuid??null,person:row.person?.canonical??null,polity_id:row.polity?.uuid??null,polity:row.polity?.canonical??null,start_year:row.activity?.start_year??null,end_year:row.activity?.end_year??null,role:row.activity?.role??null,decision:row.audit?.decision??null,relation_hint:row.audit?.relation_hint??null,execution_class:row.audit?.execution_class??null,dependencies:row.audit?.dependencies??[],decision_source:row.audit?.primary_source??null,polity_identity_decision:row.audit?.polity_identity_decision??null,polity_relation_decision:row.audit?.polity_relation_decision??null});
const sortRows=(rows)=>[...rows].sort((a,b)=>(a.start_year??0)-(b.start_year??0)||(a.end_year??0)-(b.end_year??0)||String(a.person).localeCompare(String(b.person))||String(a.activity_id).localeCompare(String(b.activity_id)));
const byDependency=Object.fromEntries(dependencyNames.map((dep)=>[dep,sortRows(ledger.rows.filter((row)=>row.audit.dependencies.includes(dep)).map(compact))]));
const executionClasses=[...new Set(ledger.rows.map((row)=>row.audit.execution_class))].sort();
const byExecutionClass=Object.fromEntries(executionClasses.map((cls)=>[cls,sortRows(ledger.rows.filter((row)=>row.audit.execution_class===cls).map(compact))]));
const polityIdentityDecidedExecutionPending=sortRows(ledger.rows.filter((row)=>row.audit?.polity_identity_decision?.status==='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING').map(compact));
const polityRelationDecidedExecutionPending=sortRows(ledger.rows.filter((row)=>row.audit?.polity_relation_decision?.status==='P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING').map(compact));
const remaining={
  r1_blocked_schema:byExecutionClass.R1_BLOCKED_SCHEMA??[],
  person_identity:byDependency.person_identity_review,
  polity_identity:byDependency.polity_identity_model,
  polity_identity_decided_execution_pending:polityIdentityDecidedExecutionPending,
  polity_relations:byDependency.polity_relation_model,
  polity_relation_decided_execution_pending:polityRelationDecidedExecutionPending,
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
if(dependencyCounts.historical_research!==0) throw new Error(`P3 generic historical research must be closed before current work queues: ${dependencyCounts.historical_research}`);
if(dependencyCounts.person_identity_review!==0) throw new Error(`P4 Person identity decisions must be closed before current work queues: ${dependencyCounts.person_identity_review}`);
if(Number(ledger.summary?.person_identity_decisions_applied||0)!==2||Number(ledger.summary?.person_identity_decisions_unresolved||0)!==0) throw new Error('P4 Person identity ledger closure missing');
if(Number(ledger.summary?.p10_physical_person_merges_required||0)!==1||Number(ledger.summary?.physical_person_merges_performed||0)!==0) throw new Error('P10 Person merge handoff drift');
const p4PolityTotal=Number(ledger.summary?.p4_polity_identity_dependency_total||0);
const p4PolityApplied=Number(ledger.summary?.p4_polity_identity_decisions_applied||0);
const p4PolityUnresolved=Number(ledger.summary?.p4_polity_identity_decisions_unresolved||0);
const p4PolityExecutionPending=Number(ledger.summary?.p4_polity_identity_decided_execution_pending||0);
if(p4PolityTotal!==49) throw new Error(`P4 Polity identity total drift ${p4PolityTotal}`);
if(p4PolityApplied+p4PolityUnresolved!==p4PolityTotal) throw new Error(`P4 Polity identity accounting drift applied=${p4PolityApplied} unresolved=${p4PolityUnresolved} total=${p4PolityTotal}`);
if(dependencyCounts.polity_identity_model!==p4PolityUnresolved) throw new Error(`P4 unresolved Polity identity queue drift ${dependencyCounts.polity_identity_model} != ${p4PolityUnresolved}`);
if(polityIdentityDecidedExecutionPending.length!==p4PolityExecutionPending||p4PolityExecutionPending!==p4PolityApplied) throw new Error('P4 decided Polity identity execution handoff drift');
const p3RelationTotal=Number(ledger.summary?.p3_polity_relation_dependency_total||0);
const p3RelationApplied=Number(ledger.summary?.p3_polity_relation_decisions_applied||0);
const p3RelationUnresolved=Number(ledger.summary?.p3_polity_relation_decisions_unresolved||0);
if(p3RelationTotal!==14||p3RelationApplied!==14||p3RelationUnresolved!==0) throw new Error(`P3 Polity relation closure drift total=${p3RelationTotal} applied=${p3RelationApplied} unresolved=${p3RelationUnresolved}`);
if(dependencyCounts.polity_relation_model!==0||polityRelationDecidedExecutionPending.length!==14) throw new Error('P3 Polity relation queue must be decision-closed before P5/P6 handoff');
const summary={schema:'atlas-stage2-baseline-a-work-queues-summary/v3',baseline:ledger.baseline,baseline_relationships:ledger.rows.length,unique_activity_ids:uniqueIds.size,reviewed_research_closures_applied:Number(ledger.summary?.reviewed_research_closures_applied||0),reviewed_model_refinements_applied:Number(ledger.summary?.reviewed_model_refinements_applied||0),person_identity_decisions_applied:Number(ledger.summary?.person_identity_decisions_applied||0),person_identity_decisions_unresolved:Number(ledger.summary?.person_identity_decisions_unresolved||0),p10_physical_person_merges_required:Number(ledger.summary?.p10_physical_person_merges_required||0),physical_person_merges_performed:Number(ledger.summary?.physical_person_merges_performed||0),p4_polity_identity_dependency_total:p4PolityTotal,p4_polity_identity_decisions_applied:p4PolityApplied,p4_polity_identity_decisions_unresolved:p4PolityUnresolved,p4_polity_identity_decided_execution_pending:p4PolityExecutionPending,p3_polity_relation_dependency_total:p3RelationTotal,p3_polity_relation_decisions_applied:p3RelationApplied,p3_polity_relation_decisions_unresolved:p3RelationUnresolved,p3_polity_relation_decided_execution_pending:polityRelationDecidedExecutionPending.length,p3_polity_relation_assertions_reviewed:Number(ledger.summary?.p3_polity_relation_assertions_reviewed||0),dependency_counts:dependencyCounts,execution_class_counts:executionCounts,current_schema_cleanup_pending:0,production_mutation_authorized:false};
const result={schema:'atlas-stage2-baseline-a-work-queues/v3',status:'AUDIT_ONLY_NO_PRODUCTION_MUTATION',derived_from:{ledger_schema:ledger.schema,baseline:ledger.baseline},summary,remaining,by_dependency:byDependency,by_execution_class:byExecutionClass};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.mkdirSync(path.dirname(summaryPath),{recursive:true});fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`);fs.writeFileSync(summaryPath,`${JSON.stringify(summary,null,2)}\n`);
console.log(`ATLAS_BASELINE_A_WORK_QUEUES_OK rows=${ledger.rows.length} cleanup_pending=0 research=${dependencyCounts.historical_research} person_identity=${dependencyCounts.person_identity_review} polity_identity_unresolved=${p4PolityUnresolved} polity_relation_unresolved=${p3RelationUnresolved} polity_identity_decided_execution_pending=${p4PolityExecutionPending} polity_relation_decided_execution_pending=${polityRelationDecidedExecutionPending.length}`);console.log(JSON.stringify(summary,null,2));
