import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../atlas-polity-review-registry.js",import.meta.url),"utf8"),ctx);
const reg=ctx.window.ATLAS_POLITY_REVIEW_REGISTRY;
test("P2-07D terminal Northern/Southern Song operative rupture retains both identities while keeping distinct generic Song ownership debt",()=>{
 const x=reg.rupture_probes.find(r=>r.id==="northern-southern-song");
 assert.ok(x);
 assert.equal(x.status,"KEEP_SEPARATE");
 assert.equal(x.terminal_status,"KEEP_SEPARATE");
 assert.equal(x.reviewed_decision,"keep_both_operative_song_periods_preserve_single_dynasty");
 assert.equal(x.left.polity_id,"407d91cf-7a97-45e3-81ea-d42a3cbfba35");
 assert.equal(x.right.polity_id,"fe073a4c-d967-56e2-bb31-f74bdde1af87");
 assert.equal(x.right.generic_song_polity_id,"1a1983fd-1850-5756-877c-3d2c17b85e1f");
 assert.equal(new Set([x.left.polity_id,x.right.polity_id,x.right.generic_song_polity_id]).size,3);
 assert.equal(x.followup_key,"song-generic-polity-activity-ownership");
 assert.equal(x.followup_status,"REPAIR_REQUIRED_SEPARATE_AUTHORING_GATE");
 assert.equal(x.locked,true);
 for(const a of ["4517af83-d656-47b0-a558-3a3df717f726","d5eaf14b-417d-4ed9-a594-d819314a1ff5","82809cc5-fc51-4e96-98e5-b290126fdcac"]) assert.ok(x.evidence.some(s=>s.includes(a)),a);
 assert.ok(x.evidence.some(s=>s.includes("archontology.org")));
 assert.ok(x.evidence.some(s=>s.includes("cambridge.org")));
 assert.match(x.rationale,/1129년/);
 assert.match(x.rationale,/병합하거나 삭제하면 안 됩니다/);
});
test("P2-07D review does not claim total Production or Song-ownership correction is complete",()=>{
 const all=[...reg.carry_forward_same_identity,...reg.historical_family_reviews,...reg.designation_residuals,...reg.naming_residuals,...reg.rupture_probes,...reg.resolved_history];
 assert.equal(all.length,75);
 assert.ok(all.filter(x=>!!x.terminal_status).length>=63);
 assert.ok(all.filter(x=>!x.terminal_status).length<=12);
 assert.ok(reg.rupture_probes.filter(x=>!x.terminal_status).length<=4);
 assert.equal(reg.designation_residuals.find(x=>x.id==="sweden-temporal-designation").terminal_status,null);
});
