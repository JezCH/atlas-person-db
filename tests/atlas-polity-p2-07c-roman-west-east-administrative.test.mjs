import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../atlas-polity-review-registry.js",import.meta.url),"utf8"),ctx);
const registry=ctx.window.ATLAS_POLITY_REVIEW_REGISTRY;

test("P2-07C keeps Roman united imperial constitutional identity distinct from regional court catalog projections",()=>{
 const row=registry.rupture_probes.find(x=>x.id==="roman-west-east");
 assert.ok(row);
 assert.equal(row.status,"KEEP_SEPARATE");
 assert.equal(row.terminal_status,"KEEP_SEPARATE");
 assert.equal(row.suggested_action,"keep_both");
 assert.equal(row.reviewed_decision,"keep_both_administrative_territorial_projections_under_formal_roman_unity");
 assert.equal(row.locked,true);
 const ids=[row.left.polity_id,row.right.western_polity_id,row.right.eastern_polity_id];
 assert.deepEqual(Array.from(ids),["5d9a6186-bbe6-5d1a-ba93-02190ae4c417","54e73d73-15ca-431f-b7b4-904bd48f6183","074510f4-f2e7-5795-8cfb-2a4206fa7254"]);
 assert.equal(new Set(ids).size,3);
 assert.match(row.rationale,/법적.*단일/);
 assert.match(row.rationale,/395년/);
 assert.match(row.rationale,/인위적인.*월·일/);
 assert.ok(row.evidence.some(x=>x.includes("8ad3cc83-c69b-4e0d-b11b-ce69dd7ed935")));
 assert.ok(row.evidence.some(x=>x.includes("7f63697a-9164-5c4a-933f-d46ee52ed3ae")));
 assert.ok(row.evidence.some(x=>x.includes("cambridge.org")));
 assert.ok(row.evidence.some(x=>x.includes("academic.oup.com")));
});
test("P2-07C registry is 75/62/13 and does not quietly close Sweden or other Roman-unrelated seeds",()=>{
 const rows=[...registry.carry_forward_same_identity,...registry.historical_family_reviews,...registry.designation_residuals,...registry.naming_residuals,...registry.rupture_probes,...registry.resolved_history];
 assert.equal(rows.length,75);
 assert.ok(rows.filter(r=>r.terminal_status).length>=62);
 assert.ok(rows.filter(r=>!r.terminal_status).length<=13);
 assert.ok(registry.rupture_probes.filter(r=>!r.terminal_status).length<=5);
 assert.equal(registry.designation_residuals.find(r=>r.id==="sweden-temporal-designation").terminal_status,null);
 for(const id of ["roman-west-east","byzantine-nicaea-rupture","liao-western-liao"]) assert.equal(registry.rupture_probes.find(r=>r.id===id).terminal_status,"KEEP_SEPARATE");
 assert.equal(registry.rupture_probes.find(r=>r.id==="northern-southern-song").terminal_status,null);
});
