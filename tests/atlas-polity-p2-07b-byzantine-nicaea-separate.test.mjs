import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const registryContext={window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../atlas-polity-review-registry.js",import.meta.url),"utf8"),registryContext);
const registry=registryContext.window.ATLAS_POLITY_REVIEW_REGISTRY;

test("P2-07B Byzantine–Nicaea 1204 rupture keeps two real normalized polities and a single Michael VIII Person",()=>{
 const row=registry.rupture_probes.find(x=>x.id==="byzantine-nicaea-rupture");
 assert.ok(row);
 assert.equal(row.status,"KEEP_SEPARATE");
 assert.equal(row.terminal_status,"KEEP_SEPARATE");
 assert.equal(row.reviewed_decision,"keep_both");
 assert.equal(row.suggested_action,"keep_both");
 assert.equal(row.locked,true);
 assert.equal(row.left.polity_id,"074510f4-f2e7-5795-8cfb-2a4206fa7254");
 assert.equal(row.right.polity_id,"1868fd1e-1fb4-4cbe-b880-25b8ba8ebf8d");
 assert.notEqual(row.left.polity_id,row.right.polity_id);
 assert.ok(row.evidence.some(x=>x.includes("b6c47e76-f0ad-45ec-a8c8-c80623234a01")));
 for(const id of ["660acd70-9516-48b9-a4a6-5037e30db555","60823af7-0b38-4406-9793-e0797dcc3f25"]) assert.ok(row.evidence.some(x=>x.includes(id)),id);
 assert.ok(row.evidence.some(x=>x.includes("academic.oup.com")));
 assert.ok(row.evidence.some(x=>x.includes("cambridge.org")));
 assert.match(row.rationale,/1204년/);
 assert.match(row.rationale,/1261년/);
 assert.match(row.rationale,/라스카리스/);
});

test("P2-07B has at least 61 terminal cases, 14 or fewer pending and no duplicate family closure",()=>{
 const dup=registry.historical_family_reviews.find(x=>x.id==="nicaea-byzantine");
 assert.equal(dup.status,"SUPERSEDED");
 assert.equal(dup.terminal_status,"SUPERSEDED");
 const rows=[...registry.carry_forward_same_identity,...registry.historical_family_reviews,...registry.designation_residuals,...registry.naming_residuals,...registry.rupture_probes,...registry.resolved_history];
 assert.equal(rows.length,75);
 assert.ok(rows.filter(x=>!!x.terminal_status).length>=61);
 assert.ok(rows.filter(x=>!x.terminal_status).length<=14);
 assert.ok(registry.rupture_probes.filter(x=>!x.terminal_status).length<=6);
 assert.equal(registry.designation_residuals.find(x=>x.id==="sweden-temporal-designation").terminal_status,null);
});
