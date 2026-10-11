import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const {requireUnifiedV2Manifest}=require("../server/atlas-correction-manifest-v2-unified-service.js");
const plan=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-sweden-historiographic-stormaktstiden-20261011.v1.json",import.meta.url),"utf8"));

test("postcommit review metadata does not change protected original applied manifest or source/period fact",()=>{
 assert.equal(requireExecutionPlan(plan),plan);
 assert.equal(plan.execution_rules.production_executable,false);
 assert.equal(plan.execution_rules.production_mutation_authorized,false);
 assert.equal(plan.post_apply_verification_request.proof_only_no_new_operation,true);
 assert.equal(plan.post_apply_verification_request.expected_insert_count,0);
 assert.equal(plan.post_apply_verification_request.expected_replay,true);
 assert.equal(plan.post_apply_verification_request.original_production_correction_run,38134300667);
 assert.equal(plan.post_apply_verification_request.independent_public_read_run,38134695893);
 const digest=plan.post_apply_verification_request.original_activity_snapshot_digest;
 const snapshot={schema:"atlas-correction-v2-target-snapshot/v1",snapshot_digest:digest,
   activity_ids:[],activities:[],normalized_activity_source_links:[],chronology_claims:[],relationship_descriptions:[]};
 const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);
 const loaded=requireUnifiedV2Manifest(manifest);
 assert.equal(manifest.manifest_sha256,plan.post_apply_verification_request.original_manifest_sha256);
 assert.deepEqual(loaded.operations.map(x=>x.type),["assert_source","assert_source","assert_polity_designation"]);
 assert.equal(plan.batch_id,"polity_p2_06c_sweden_historiographic_stormaktstiden_1611_1718_20261011_v1");
 assert.equal(loaded.operations[2].exact_after.designation.polity_id,"93613017-b4c4-5f82-8e96-3ce6b2d3a61e");
});
