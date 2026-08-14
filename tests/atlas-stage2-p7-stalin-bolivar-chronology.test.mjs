import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const sources=read('stage2/authoring/p7-stalin-bolivar-chronology-sources.v1.json');
const stalin=read('stage2/execution/p7-stalin-chronology-execution.v1.json');
const bolivar=read('stage2/execution/p7-bolivar-bolivia-chronology-execution.v1.json');

test('Stalin and Bolívar chronology package preserves uncertainty and only hardens supported boundaries',()=>{
  assert.equal(sources.sources.length,2);
  assert.deepEqual(new Set(sources.sources.map(x=>x.row.id)),new Set(['067f54f2-04ff-5b40-b2aa-54a4c51bee4b','597d13f4-c609-51ea-820d-780fc19b0fca']));
  assert.equal(sources.rules.no_fabricated_start_day,true);
  assert.equal(sources.result.production_mutation_authorized,false);

  assert.equal(stalin.operations.length,1);
  const s=stalin.operations[0];
  assert.equal(s.type,'rewrite_activity');
  assert.equal(s.activity_id,'055a3ef9-4cc1-5e1e-8a91-a0c5d9eb0521');
  assert.equal(s.after.relation_type_id,'7ca4de8f-01d4-542c-acc1-a06848c6742c');
  assert.deepEqual(s.after.activity_start_detail,{year:1924,month:null,day:null,granularity:'year',certainty:'approximate',calendar:'gregorian'});
  assert.deepEqual(s.after.activity_end_detail,{year:1953,month:3,day:5,granularity:'day',certainty:'exact',calendar:'gregorian'});
  assert.equal(s.after.add_source_links[0].source_id,'067f54f2-04ff-5b40-b2aa-54a4c51bee4b');
  assert.equal(stalin.execution_rules.de_facto_leadership_start_1924_is_approximate_not_exact_office_transition,true);
  assert.equal(stalin.result.fabricated_exact_start_date,false);

  assert.equal(bolivar.operations.length,1);
  const b=bolivar.operations[0];
  assert.equal(b.type,'rewrite_activity');
  assert.equal(b.activity_id,'ec54cba5-8e17-52f9-8849-be88a3bbc81b');
  assert.equal(b.after.relation_type_id,'7ca4de8f-01d4-542c-acc1-a06848c6742c');
  assert.deepEqual(b.after.activity_start_detail,{year:1825,month:null,day:null,granularity:'year',certainty:'exact',calendar:'gregorian'});
  assert.deepEqual(b.after.activity_end_detail,{year:1825,month:12,day:29,granularity:'day',certainty:'exact',calendar:'gregorian'});
  assert.equal(b.after.add_source_links[0].source_id,'597d13f4-c609-51ea-820d-780fc19b0fca');
  assert.equal(bolivar.execution_rules.start_month_or_day_must_not_be_fabricated,true);
  assert.equal(bolivar.result.fabricated_start_month_or_day,false);
  assert.equal(stalin.result.production_mutation_authorized,false);
  assert.equal(bolivar.result.production_mutation_authorized,false);
});
