import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {MANIFEST_SCHEMA,readReviewedPolityAuthoringManifest}=require("../server/atlas-stage2-reviewed-polity-authoring.js");
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
test("reviewed French Republic polity authoring is literal and fail-closed",()=>{const {manifest,manifest_sha256}=readReviewedPolityAuthoringManifest(path.join(root,"stage2/authoring/p7-charles-de-gaulle-polity.v1.json"));assert.equal(manifest.schema,MANIFEST_SCHEMA);assert.match(manifest_sha256,/^[0-9a-f]{64}$/);assert.equal(manifest.polities.length,1);assert.equal(manifest.polities[0].row.id,"b138f5e4-ff83-40f6-bdb1-83b08c0256cb");assert.equal(manifest.polities[0].names.length,3);assert.equal(manifest.rules.runtime_name_resolution_forbidden,true);assert.equal(manifest.rules.territory_geometry_mutation_forbidden,true);assert.equal(manifest.rules.production_mutation_authorized,false);});
