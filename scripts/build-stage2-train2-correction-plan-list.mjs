import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildStage2P6LiteralExecutionPackage } from './build-stage2-p6-execution-package.mjs';

const require=createRequire(import.meta.url);
const { scheduleCorrectionPlans }=require('../server/atlas-correction-v2-plan-scheduler.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outDir=path.resolve(process.argv[2]||'/tmp/atlas-stage2-train2-plans');
fs.mkdirSync(outDir,{recursive:true});
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(name,obj)=>{const p=path.join(outDir,name);fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');return p;};

const golden=read('stage2/execution/p6-correction-v2-execution-batch1.v1.json');
const literal=buildStage2P6LiteralExecutionPackage();
const p6=scheduleCorrectionPlans([golden,...literal.plans]).execution_units;

const executionDir=path.join(root,'stage2/execution');
const p7Files=fs.readdirSync(executionDir).filter(name=>/^p7-.*-execution\.v1\.json$/.test(name)).sort();
const loaded=p7Files.map(name=>({name,plan:read(`stage2/execution/${name}`)}));
for(const {name,plan} of loaded){if(plan?.schema!=='atlas-stage2-correction-v2-execution-plan/v1')throw new Error(`TRAIN2_P7_PLAN_SCHEMA_INVALID:${name}`);}
const nonRetire=loaded.filter(({name})=>!name.includes('retire'));
const retire=loaded.filter(({name})=>name.includes('retire'));
const orderedP7=[...nonRetire,...retire];

const seenBatch=new Set();
const targetOwners=new Map();
const entries=[];
function add(phase,label,plan,index){
 if(seenBatch.has(plan.batch_id))throw new Error(`TRAIN2_DUPLICATE_BATCH_ID:${plan.batch_id}`);seenBatch.add(plan.batch_id);
 const duplicates=[];
 for(const op of plan.operations||[]){const id=String(op.activity_id||'').toLowerCase();if(!id)continue;if(targetOwners.has(id))duplicates.push({activity_id:id,previous:targetOwners.get(id)});targetOwners.set(id,label);}
 const file=write(`${String(entries.length+1).padStart(3,'0')}-${phase}-${index}.json`,plan);entries.push({phase,label,batch_id:plan.batch_id,file,duplicate_targets_from_prior:duplicates});
}
p6.forEach((plan,i)=>add('p6',`p6:${plan.batch_id}`,plan,i+1));
orderedP7.forEach(({name,plan},i)=>add('p7',name,plan,i+1));
const manifest={schema:'atlas-stage2-train2-correction-plan-list/v1',p6_reviewed_plans:1+literal.plans.length,p6_execution_units:p6.length,p7_plan_files:p7Files.length,p7_non_retire_plans:nonRetire.length,p7_retire_plans:retire.length,total_execution_units:entries.length,duplicate_target_transitions:entries.flatMap(e=>e.duplicate_targets_from_prior.map(d=>({...d,next:e.label}))),entries};
fs.writeFileSync(path.join(outDir,'plan-list.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
