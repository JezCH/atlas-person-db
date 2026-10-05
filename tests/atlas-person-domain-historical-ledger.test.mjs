import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);

const root=path.resolve(new URL("..",import.meta.url).pathname);
const dir=path.join(root,"proposals/person-representative-domain");
const registry=require("../atlas-person-domain-registry.js");
const css=fs.readFileSync(path.join(root,"atlas-person-domain-palette.css"),"utf8").toLowerCase();
const workflow=fs.readFileSync(path.join(root,".github/workflows/atlas-person-domain-verify.yml"),"utf8");
const cutover=JSON.parse(fs.readFileSync(path.join(root,"contracts/person-domain-v2-final-cutover.json"),"utf8"));

const seq=(prefix)=>fs.readdirSync(dir).filter((name)=>new RegExp(`^${prefix}-\\d{3}\\.json$`).test(name)).sort();
const batchFiles=seq("batch");
const repairFiles=seq("batch-repair");
const holdFiles=seq("hold");
const cancelled={batch:new Set([22,27,28,29,30]),"batch-repair":new Set(),hold:new Set()};

function assertContiguous(files,prefix){
  const max=Number(files.at(-1).match(/-(\d{3})\.json$/)[1]);
  const expected=Array.from({length:max},(_,i)=>i+1).filter((n)=>!cancelled[prefix].has(n)).map((n)=>`${prefix}-${String(n).padStart(3,"0")}.json`);
  assert.deepEqual(files,expected);
}

test("historical review ledger remains immutable and contiguous",()=>{
  assertContiguous(batchFiles,"batch");
  assertContiguous(repairFiles,"batch-repair");
  assertContiguous(holdFiles,"hold");
  const historicalCodes=new Set(["governance","military","knowledge","technology","commerce","culture","religion","exploration"]);
  for(const name of [...batchFiles,...repairFiles]){
    const parsed=JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
    for(const entry of parsed.entries||[]){
      if(entry.representative_domain!=null) assert.equal(historicalCodes.has(entry.representative_domain),true,`${name}:${entry.person_id}`);
      assert.notEqual(entry.representative_domain,"science");
    }
  }
});

test("durable science-retained ledger is exactly the approved 72-Person cutover set",()=>{
  const retained=[];
  for(const name of [...batchFiles,...repairFiles]){
    const parsed=JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
    for(const entry of parsed.science_retained||[]){
      assert.equal(entry.v2_target_domain,"science");
      assert.equal(entry.stored_domain,"knowledge");
      retained.push(String(entry.person_id).toLowerCase());
    }
  }
  assert.equal(retained.length,72);
  assert.equal(new Set(retained).size,72);
  assert.deepEqual(retained.sort(),[...cutover.science_target_ids].sort());
});

test("active runtime palette and registry contain science, not knowledge",()=>{
  assert.deepEqual(registry.CODES,["governance","military","science","technology","commerce","culture","religion","exploration"]);
  assert.equal(registry.LABELS.science,"과학");
  assert.equal(Object.hasOwn(registry.LABELS,"knowledge"),false);
  assert.match(css,/--atlas-person-domain-science:\s*#3f78c5/);
  assert.match(css,/data-representative-domain="science"/);
  assert.doesNotMatch(css,/atlas-person-domain-knowledge|data-representative-domain="knowledge"/);
});

test("pre-v2 proposal ledger is archival and active workflow is verification-only",()=>{
  assert.match(workflow,/name:\s*ATLAS Person Domain Verify/);
  assert.doesNotMatch(workflow,/id-token:\s*write/);
  assert.doesNotMatch(workflow,/apply-person-domain-proposals\.mjs|id-token:\s*write/);
  assert.match(workflow,/verify-person-domain-v2\.mjs/);
});
