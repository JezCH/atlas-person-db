import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(new URL("..",import.meta.url).pathname);
const contract=JSON.parse(fs.readFileSync(path.join(root,"contracts/person-domain-taxonomy.v2.json"),"utf8"));
const cutover=JSON.parse(fs.readFileSync(path.join(root,"contracts/person-domain-v2-final-cutover.json"),"utf8"));
const doc=fs.readFileSync(path.join(root,"docs/person/PERSON_DOMAIN_STANDARD_V2.md"),"utf8");
const authoringFileValidator=fs.readFileSync(path.join(root,"scripts/validate-authoring-request-files.mjs"),"utf8");
const liveVerifier=fs.readFileSync(path.join(root,"scripts/verify-person-domain-v2.mjs"),"utf8");
const domainWorkflow=fs.readFileSync(path.join(root,".github/workflows/atlas-person-domain-verify.yml"),"utf8");
const codes=["governance","military","science","technology","commerce","culture","religion","exploration"];
const labels=["정치·통치","군사","과학","공학·기술","경제·상업","인문·예술","종교","탐험"];

test("Person Domain v2 is the active exact eight-sector contract",()=>{
  assert.equal(contract.schema,"atlas-person-domain-taxonomy/v2");
  assert.equal(contract.status,"active");
  assert.equal(contract.sector_count,8);
  assert.deepEqual(contract.target_definitions.map((x)=>x.code),codes);
  assert.deepEqual(contract.target_definitions.map((x)=>x.label_ko),labels);
  assert.equal(new Set(contract.target_definitions.map((x)=>x.palette_source)).size,8);
  assert.equal(contract.target_definitions.find((x)=>x.code==="science").palette_source,"science");
});

test("legacy knowledge is retired from active writes but preserved as historical evidence",()=>{
  assert.equal(contract.legacy.runtime_code,"knowledge");
  assert.equal(contract.legacy.status,"retired");
  assert.equal(contract.legacy.retired_to,"science");
  assert.match(contract.legacy.retirement_rule,/historical|evidence/i);
  assert.match(doc,/new request carrying `knowledge` is rejected/i);
  assert.match(doc,/original manifest hash/i);
});

test("historical final cutover evidence remains explicit, exact and complete",()=>{
  assert.equal(cutover.schema,"atlas-person-domain-v2-final-cutover/v1");
  assert.equal(cutover.status,"approved");
  assert.equal(cutover.expected_assigned,1978);
  assert.equal(cutover.science_target_ids.length,72);
  assert.equal(new Set(cutover.science_target_ids).size,72);
  assert.deepEqual(cutover.canonical_codes,codes);
  assert.deepEqual(cutover.expected_post_cutover,{governance:1346,military:205,science:72,technology:38,commerce:28,culture:161,religion:100,exploration:28});
  assert.match(doc,/serializable transaction/i);
  assert.match(doc,/roll back everything/i);
});

test("classification remains representative-identity based without a ninth sector",()=>{
  const science=contract.target_definitions.find((x)=>x.code==="science");
  const culture=contract.target_definitions.find((x)=>x.code==="culture");
  assert.match(science.scope,/natural science/i);
  assert.match(science.scope,/mathematics/i);
  assert.match(culture.scope,/philosophy/i);
  assert.match(culture.scope,/history/i);
  assert.equal(contract.automatic_role_backfill,false);
  assert.equal(contract.secondary_domains,false);
});


test("authoring request file validation exposes only the v2 representative-domain vocabulary",()=>{
  assert.match(authoringFileValidator,/REPRESENTATIVE_DOMAINS = new Set\(\['governance','military','science','technology','commerce','culture','religion','exploration'\]\)/);
  assert.doesNotMatch(authoringFileValidator,/REPRESENTATIVE_DOMAINS = new Set\([^\n]*'knowledge'/);
});


test("active Person Domain verification is independent from the historical cutover snapshot",()=>{
  assert.doesNotMatch(liveVerifier,/person-domain-v2-final-cutover|science_target_ids|historicalScienceIds|expected_assigned|expected_post_cutover/);
  assert.doesNotMatch(domainWorkflow,/person-domain-v2-final-cutover|proposals\/person-representative-domain|apply-person-domain-proposals/);
  assert.match(liveVerifier,/Unsupported live representative domain/);
  assert.match(liveVerifier,/Legacy knowledge remains live/);
  assert.match(liveVerifier,/Assigned count and row count drift/);
});
