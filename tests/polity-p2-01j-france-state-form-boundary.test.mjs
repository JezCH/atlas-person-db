import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const { requireExecutionPlan }=require("../server/atlas-correction-apply-handler.js");

const request=JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-france-second-restoration-boundary-20261009.v1.json",import.meta.url),"utf8"));
const plan=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-france-july-monarchy-state-form-20261009.v1.json",import.meta.url),"utf8"));
const workflow=fs.readFileSync(new URL("../.github/workflows/atlas-correction-apply.yml",import.meta.url),"utf8");
const temporalRead=fs.readFileSync(new URL("../server/atlas-polity-temporal-designation-read.js",import.meta.url),"utf8");

test("P2-01J release order creates official regime source and July state form before Restoration rewrite consumes that source",()=>{
  assert.equal(plan.release_order,2230);
  assert.equal(request.release_order,2231);
  assert.ok(plan.release_order<request.release_order);
  assert.equal(plan.stage2_assertions[0].type,"assert_source");
  assert.equal(plan.stage2_assertions[0].exact_after.source.id,"f4d11488-2e4c-49f7-b64c-7191976d5e42");
});

test("P2-01J precisions the existing Second Restoration UUID to 1830-08-02 without Person or identity rewrite",()=>{
  const op=request.operations[0];
  assert.equal(op.type,"rewrite_polity_designation");
  assert.equal(op.exact_before.designation.id,"21d2913e-c71a-40e9-865c-2d8a3a421b15");
  assert.equal(op.exact_after.designation.id,op.exact_before.designation.id);
  assert.equal(op.exact_before.designation.valid_to_granularity,"year");
  assert.deepEqual(
    [op.exact_after.designation.valid_to_year,op.exact_after.designation.valid_to_month,op.exact_after.designation.valid_to_day,op.exact_after.designation.valid_to_granularity],
    [1830,8,2,"day"]
  );
  assert.deepEqual(op.exact_after.names,op.exact_before.names);
  assert.ok(op.exact_after.source_links.length>op.exact_before.source_links.length);
});

test("P2-01J adds a separate July Monarchy state_form on France using the Assembly's broad 2 Aug boundary",()=>{
  const designation=plan.stage2_assertions.find((row)=>row.type==="assert_polity_designation");
  assert.ok(designation);
  const row=designation.exact_after.designation;
  assert.equal(row.polity_id,"1eaa48b6-dc60-49d6-91c4-49db556f4ddf");
  assert.equal(row.designation_type,"state_form");
  assert.deepEqual(
    [row.valid_from_year,row.valid_from_month,row.valid_from_day,row.valid_to_year,row.valid_to_month,row.valid_to_day],
    [1830,8,2,1848,2,24]
  );
  assert.deepEqual(designation.exact_after.names.map((name)=>name.locale),["en","fr","ko"]);
});

test("assertion-only correction workflow and endpoint both accept reviewed polity designations",()=>{
  assert.match(workflow,/assert_polity_designation/);
  assert.equal(requireExecutionPlan(plan),plan);
});

test("coarse year-only Activity display still fails closed unless exactly one designation fully contains it",()=>{
  assert.match(temporalRead,/count\(\*\) = 1/);
  assert.match(temporalRead,/coalesce\(pp\.activity_end_month, 12\)/);
  assert.match(temporalRead,/coalesce\(pp\.activity_end_day, 31\)/);
});
