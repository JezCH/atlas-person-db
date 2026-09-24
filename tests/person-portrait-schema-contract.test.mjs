import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const migration=fs.readFileSync(new URL("../db/migrations/20260924_person_portraits_simple_v3.sql",import.meta.url),"utf8");
test("portrait v3 removes taxonomy provenance and history structures",()=>{
 for(const col of ["current_revision_id","portrait_kind","evidence_level"]) assert.match(migration,new RegExp("DROP COLUMN IF EXISTS "+col,"i"));
 for(const table of ["person_portrait_revision_sources","person_portrait_revisions","person_portrait_generation_runs","person_portrait_sources","person_portrait_assets"]) assert.match(migration,new RegExp("DROP TABLE IF EXISTS atlas_v2\\."+table,"i"));
});
test("portrait v3 keeps the current Person portrait projection",()=>{
 assert.match(migration,/ALTER TABLE atlas_v2\.person_portraits/i);
 assert.doesNotMatch(migration,/DROP TABLE IF EXISTS atlas_v2\.person_portraits/i);
 assert.match(migration,/one concept: the current portrait attached to a Person/i);
});
