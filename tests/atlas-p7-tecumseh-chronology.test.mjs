import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const sources=readJson('stage2/authoring/p7-tecumseh-chronology-sources.v1.json');
const plan=readJson('stage2/execution/p7-tecumseh-chronology-execution.v1.json');
const RULES='7ca4de8f-01d4-542c-acc1-a06848c6742c';
function uuidBytes(uuid){return Buffer.from(String(uuid).replaceAll('-',''),'hex');}
function uuid5(namespace,name){const hash=crypto.createHash('sha1').update(Buffer.concat([uuidBytes(namespace),Buffer.from(name,'utf8')])).digest();const bytes=Buffer.from(hash.subarray(0,16));bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;const hex=bytes.toString('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}

test('Tecumseh reviewed NPS Source is a deterministic literal identity',()=>{
  assert.equal(sources.schema,'atlas-stage2-p7-reviewed-relation-sources/v1');
  assert.equal(sources.sources.length,1);
  assert.equal(sources.rules.production_mutation_authorized,false);
  const entry=sources.sources[0];
  assert.equal(entry.candidate_key,'bibliographic:nps:tecumseh');
  assert.equal(entry.row.id,uuid5(sources.uuid_allocation.repository_namespace,`p7:source:${entry.row.source_key}`));
  assert.equal(entry.row.id,'01fcf441-ccd5-5e7d-adba-9d53ad672d7a');
  assert.equal(entry.row.sha256,null);
  assert.equal(entry.row.bytes,null);
  assert.equal(entry.row.canonical_url,'https://www.nps.gov/people/tecumseh.htm');
});

test('Tecumseh Correction v2 keeps polity identity and normalizes only reviewed temporal semantics',()=>{
  assert.equal(plan.schema,'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.execution_rules.keep_existing_confederacy_polity,true);
  assert.equal(plan.execution_rules.shawnee_peoplegroup_is_auxiliary_not_activity_relink,true);
  assert.equal(plan.execution_rules.no_fabricated_month_or_day,true);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.operations.length,1);
  const op=plan.operations[0];
  assert.equal(op.type,'rewrite_activity');
  assert.equal(op.activity_id,'5be7f060-46d1-58f9-ad7c-3b03458c198a');
  assert.equal(op.baseline_before.activity_start,1805);
  assert.equal(op.baseline_before.activity_end,1813);
  assert.equal(op.after.activity_id,op.activity_id);
  assert.equal(op.after.person_id,op.baseline_before.person_id);
  assert.equal(op.after.polity_id,op.baseline_before.polity_id);
  assert.equal(op.after.role_id,op.baseline_before.role_id);
  assert.equal(op.after.period_basis_id,op.baseline_before.period_basis_id);
  assert.equal(op.after.activity_start,1808);
  assert.equal(op.after.activity_end,1813);
  assert.equal(op.after.relation_type_id,RULES);
  assert.deepEqual(op.after.activity_start_detail,{year:1808,month:null,day:null,granularity:'year',certainty:'approximate',calendar:'unspecified_historical'});
  assert.deepEqual(op.after.activity_end_detail,{year:1813,month:null,day:null,granularity:'year',certainty:'exact',calendar:'unspecified_historical'});
  assert.equal(op.after.notes_policy,'PRESERVE_EXACT_LIVE_NOTES');
  assert.equal(op.after.add_source_links.length,1);
  assert.equal(op.after.add_source_links[0].source_id,sources.sources[0].row.id);
});
