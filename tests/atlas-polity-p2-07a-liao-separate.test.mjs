import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const content=readFileSync(new URL("../atlas-polity-review-registry.js",import.meta.url),"utf8");
const ctx={window:{}};
vm.runInNewContext(content,ctx);
const registry=ctx.window.ATLAS_POLITY_REVIEW_REGISTRY || ctx.window.ATLAS_POLITY_REVIEW_SEEDS || ctx.window.ATLAS_POLITY_REVIEW_REGISTRY_V1;
test("P2-07A Liao-Western Liao distinct canonical UUIDs and terminalized rupture seed",()=>{
 const row=registry?.rupture_probes?.find(r=>r.id==="liao-western-liao");
 assert.ok(row,"must remain in canonical registry");
 assert.equal(row.status,"KEEP_SEPARATE");
 assert.equal(row.terminal_status,"KEEP_SEPARATE");
 assert.equal(row.reviewed_decision,"keep_both");
 assert.equal(row.suggested_action,"keep_both");
 assert.equal(row.locked,true);
 assert.equal(row.left.polity_id,"c7414968-29fc-5749-bfda-bf4dab331dd8");
 assert.equal(row.right.polity_id,"60d35355-b385-55d4-8d5c-f9b27cad29a3");
 assert.ok(row.evidence.some(x=>x.includes("81b6ff0d-02da-411d-8c0a-b22036625721")));
 assert.ok(row.evidence.some(x=>x.includes("academic.oup.com")));
 assert.ok(row.evidence.some(x=>x.includes("iranicaonline.org")));
 assert.match(row.rationale,/중앙아시아/);
 assert.match(row.rationale,/approximate/);
});
test("P2-07A Liao closure persists while later independent seeds may close",()=>{
 assert.ok(registry);
 const rows=[...registry.carry_forward_same_identity,...registry.historical_family_reviews,...registry.designation_residuals,...registry.naming_residuals,...registry.rupture_probes,...registry.resolved_history];
 assert.equal(rows.length,75);
 assert.ok(rows.filter(r=>r.terminal_status).length>=60);
 assert.ok(rows.filter(r=>!r.terminal_status).length<=15);
 assert.equal(registry.designation_residuals.find(r=>r.id==="sweden-temporal-designation").terminal_status,null);
 assert.ok(registry.rupture_probes.filter(r=>!r.terminal_status).length<=7);
});
