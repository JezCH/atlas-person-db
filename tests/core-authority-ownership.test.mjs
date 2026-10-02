import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const registry=JSON.parse(fs.readFileSync(path.join(root,"docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json"),"utf8"));
const document=fs.readFileSync(path.join(root,"docs/core/CORE_AUTHORITY_OWNERSHIP.md"),"utf8");
const statuses=new Set(["single_writer","derived_single_writer","repository_source_authority"]);

test("CORE authority registry is structurally complete and debt-free",()=>{
 const ids=new Set(); assert.equal(registry.schema,"atlas-core-authority-ownership/v1"); assert.ok(registry.resources.length>=20);
 for(const r of registry.resources){assert.match(r.id,/^[a-z0-9_]+$/);assert.equal(ids.has(r.id),false);ids.add(r.id);assert.ok(statuses.has(r.status),`${r.id} ${r.status}`);assert.ok(r.authoritative_writer?.path);assert.ok(r.canonical_state.length);assert.deepEqual(r.shadow_writers,[]);assert.equal(r.remediation_unit,null);assert.ok(document.includes("`"+r.id+"`"));}
 for(const id of ["person_identity_creation","polity_identity_creation","role_identity_creation","activity_authoring","activity_correction_lifecycle","source_identity","place_identity","person_external_reference","person_representative_domain","context_objects","polity_place_function","spatial_reviewed_facts","spatial_registration_disposition_lifecycle","runtime_projection","non_timeline_person_registry","reviewed_candidate_state","registration_execution_state","person_destructive_lifecycle","p14_territory_geometry_boundary"]) assert.ok(ids.has(id),id);
});
test("every ownership claim has live evidence anchors",()=>{
 for(const r of registry.resources){assert.ok(r.evidence_anchors?.length);for(const a of r.evidence_anchors){const p=path.join(root,a.path);assert.equal(fs.existsSync(p),true,`${r.id}: ${a.path}`);assert.equal(fs.readFileSync(p,"utf8").includes(a.contains),true,`${r.id}: ${a.contains}`);}}
});
test("normal authoring, correction, and destructive lifecycle are distinct",()=>{
 const b=new Map(registry.resources.map(r=>[r.id,r]));
 assert.equal(b.get("activity_authoring").authoritative_writer.path,"server/atlas-stage2-native-activity-service.js");
 assert.equal(b.get("activity_correction_lifecycle").authoritative_writer.path,"server/atlas-correction-manifest-v2-service.js");
 assert.match(b.get("person_destructive_lifecycle").semantic_fact,/merge and hard-delete/i);
 assert.equal(b.get("non_timeline_person_registry").canonical_state[0],"atlas_v2.person_timeline_dispositions");
 assert.equal(b.get("person_external_reference").authoritative_writer.path,"server/atlas-external-reference-service.js");
 assert.equal(b.get("p14_territory_geometry_boundary").status,"single_writer");
 assert.equal(b.get("p14_territory_geometry_boundary").authoritative_writer.path,"server/atlas-p14-territory-geometry-service.js");
 assert.deepEqual(
   b.get("p14_territory_geometry_boundary").canonical_state.slice(0,4),
   ["atlas_v2.geometries","atlas_v2.geometry_sources","atlas_v2.territory_records","atlas_v2.territory_record_sources"]
 );
});
test("derived and repository outputs are not historical authoring authority",()=>{
 const b=new Map(registry.resources.map(r=>[r.id,r]));
 assert.equal(b.get("runtime_projection").status,"derived_single_writer");
 assert.equal(b.get("spatial_reviewed_facts").status,"repository_source_authority");
 assert.match(b.get("spatial_reviewed_facts").note,/derived compatibility output/);
 assert.match(document,/atlas-polity-spatial-index\.json.*derived output/);
});
