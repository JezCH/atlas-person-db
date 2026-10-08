import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../experiments/vis2-05-monumental-watermark-candidate.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const nav=fs.readFileSync(new URL("../atlas-main-authority-nav.js",import.meta.url),"utf8");
const view=fs.readFileSync(new URL("../atlas-person-spacetime-view.js",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../scripts/verify-vis2-05-watermark-ab.mjs",import.meta.url),"utf8");

test("VIS2-05 candidate is NOT shipped, opted in or imported by product",()=>{
  const name="vis2-05-monumental-watermark-candidate.css";
  for(const [file,text] of [["index.html",html],["atlas-main-authority-nav.js",nav],["atlas-person-spacetime-view.js",view]])assert.ok(!text.includes(name),file+" cannot load experiment");
  assert.ok(!html.includes("data-vis2-05-watermark")&&!view.includes("data-vis2-05-watermark"));
  assert.ok(js.includes("fs.readFileSync")&&js.includes(name));
});
test("Watermarks derive only from actual year-axis and era boundary text",()=>{
  assert.match(css,/content:\s*attr\(data-vis2-05-watermark-year\)/);
  assert.match(css,/content:\s*attr\(data-vis2-05-watermark-era\)/);
  assert.match(js,/\.spacetime-year-axis span\.is-major/);
  assert.match(js,/\.spacetime-era-boundary/);
  assert.match(js,/querySelector\('b'\)/);
  assert.ok(!css.includes("content: '")&&!css.includes('content: "'));
});
test("Experiment only paints noninteractive pseudo-elements and always cleans up",()=>{
  assert.match(css,/data-vis2-05-watermark="experiment"/);
  assert.match(css,/pointer-events:\s*none/g);
  assert.doesNotMatch(css,/\.spacetime-(?:track-label|track-rail|year-axis|century-line)\b/);
  assert.doesNotMatch(css,/!important|@import|@font-face|--spacetime-(?:axis-width|header-height|camera)|grid-template-columns/);
  for(const text of ["s.id='vis2-05-watermark-injected'","document.querySelector('#vis2-05-watermark-injected')?.remove()","removeAttribute('data-vis2-05-watermark')","removeAttribute('data-vis2-05-watermark-year')","removeAttribute('data-vis2-05-watermark-era')","default:\"REJECT\""])
    assert.ok(js.includes(text),"Missing clean off/rejection guard: "+text);
});
test("Two distinct matching scene families and three supported zooms must be sampled",()=>{
  assert.ok(js.includes('["boundary","dense"]'));
  for(const s of ["390,768,1440,1600","1000%","1500%","ATLAS_VIS2_05_PRODUCTION_AB_CAPTURE_PASS"])
    assert.ok(js.includes(s),"Missing capture coverage: "+s);
  assert.ok(js.includes("JSON.stringify(before.labels)===JSON.stringify(after.labels)"));
  assert.ok(js.includes("JSON.stringify(before.scroll)===JSON.stringify(after.scroll)"));
});
