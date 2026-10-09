import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ROOT=new URL("../",import.meta.url);
const files=["scripts/verify-vis2-13-production-keyboard-density.mjs","scripts/verify-vis2-13-production-final-acceptance.mjs"];
const workflow=fs.readFileSync(new URL(".github/workflows/atlas-spacetime-production-visual.yml",ROOT),"utf8");
const keyboard=fs.readFileSync(new URL(files[0],ROOT),"utf8");
const final=fs.readFileSync(new URL(files[1],ROOT),"utf8");
test("VIS2-13 is evidence-only and preserves existing acceptance workflow",()=>{
 for(const filename of files){assert.ok(workflow.includes('node '+filename));assert.ok(workflow.includes('node --check '+filename));}
 const order=["scripts/verify-vis2-13-production-keyboard-density.mjs","scripts/verify-vis2-12-production-interaction-motion.mjs","scripts/verify-vis2-11-production-polity-dashboard.mjs","scripts/verify-vis2-10-production-chronicle-source.mjs","scripts/verify-vis2-13-production-final-acceptance.mjs"];
 for(let i=1;i<order.length;i++)assert.ok(workflow.indexOf('node '+order[i-1])<workflow.indexOf('node '+order[i]),"Wrong final acceptance order "+order[i]);
 assert.match(keyboard,/Input\.dispatchKeyEvent/);
 assert.match(keyboard,/focusVisible:el\.matches\(':focus-visible'\)/);
 assert.match(keyboard,/\[1\.25,1\.5\]/);
 assert.match(keyboard,/\[390,1440\]/);
 assert.match(final,/pending.manual|PENDING_MANUAL_REVIEW/i);
 assert.match(final,/production_candidate_shipped===false/);
 assert.match(final,/spacetime_zooms/);
 assert.match(final,/createHash\("sha256"\)/);
});
test("VIS2-13 does not edit app/UI/DB, and keeps human visual signoff separate",()=>{
 for(const src of [keyboard,final]){
  assert.doesNotMatch(src,/ATLAS_PERSON_MAIN\?\.save|fetch\(.+method\s*:\s*["'](?:POST|PATCH|DELETE)/);
  assert.doesNotMatch(src,/supabase\.from\(|localStorage\.setItem/);
 }
 assert.match(final,/manual_visual_review:"REQUIRED"/);
 assert.doesNotMatch(final,/report\.status="PASS";/);
});
