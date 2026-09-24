import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { normalizeWritePayload, assetSha256, assertPortraitDimensions }=require("../server/atlas-person-portrait-service.js");
const PERSON="11111111-1111-4111-8111-111111111111";
function webpBytes(){
 const b=Buffer.alloc(30);b.write("RIFF",0,"ascii");b.writeUInt32LE(22,4);b.write("WEBP",8,"ascii");b.write("VP8X",12,"ascii");b.writeUInt32LE(10,16);b.writeUIntLE(1023,24,3);b.writeUIntLE(1279,27,3);return b;
}
test("portrait write payload contains only canonical image identity and dimensions",()=>{
 const bytes=webpBytes();const n=normalizeWritePayload({person_id:PERSON,image_base64:bytes.toString("base64"),portrait_kind:"obsolete",evidence_level:"obsolete",sources:[{obsolete:true}]});
 assert.deepEqual(Object.keys(n).sort(),["asset_sha256","bytes","height_px","person_id","width_px"]);
 assert.equal(n.asset_sha256,crypto.createHash("sha256").update(bytes).digest("hex"));
 assert.equal(n.width_px,1024);assert.equal(n.height_px,1280);
});
test("portrait dimensions enforce exact 4:5",()=>{
 assert.deepEqual(assertPortraitDimensions({width_px:1024,height_px:1280}),{width_px:1024,height_px:1280});
 assert.throws(()=>assertPortraitDimensions({width_px:1024,height_px:1200}),/PERSON_PORTRAIT_ASPECT_RATIO_INVALID/);
});
test("portrait service source contains no retired taxonomy or provenance subsystem",()=>{
 const source=require("node:fs").readFileSync(new URL("../server/atlas-person-portrait-service.js",import.meta.url),"utf8");
 for(const token of ["portrait_kind","evidence_level","person_portrait_sources","person_portrait_revisions","person_portrait_generation_runs","current_revision_id"]) assert.equal(source.includes(token),false);
});
