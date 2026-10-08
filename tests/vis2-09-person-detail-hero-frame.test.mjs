import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-detail-hero-frame-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const source=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
const verifier=fs.readFileSync(new URL("../scripts/verify-vis2-09-production-detail-hero.mjs",import.meta.url),"utf8");

test("VIS2-09 alone loads after VIS2-08 and keeps real portrait conditional",()=>{
 const link="atlas-person-detail-hero-frame-v2.css?v=20261009-vis2-09-hero-v1";
 assert.equal(html.split(link).length-1,1);
 assert.ok(html.indexOf(link)>html.indexOf("atlas-person-register-selection-focus-v2.css"));
 assert.match(css,/--atlas-vis2-09-hero-active:\s*1/);
 assert.match(css,/\.person-detail-portrait\.has-portrait/);
 assert.match(css,/\.person-detail-portrait:not\(\.has-portrait\)/);
 assert.match(source,/person-detail-portrait\$\{href \? " has-portrait"/);
});
test("VIS2-09 is paint-only scoped to existing biography hero; no invented portrait",()=>{
 const noComments=css.replace(/\/\*[\s\S]*?\*\//g,"");
 const blocks=[...noComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.equal(blocks.length,7); // root + 6 existing selectors
 assert.equal(blocks[0][1].trim(),":root");
 for(const [,selector,body] of blocks.slice(1)){
  assert.ok(selector.trim().startsWith("#personMainDetail.person-main-detail .person-chronicle-"),selector);
  const props=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(x=>x[1]);
  assert.ok(props.length>0);
  for(const name of props) assert.ok(["background-image","box-shadow","color"].includes(name),"Disallowed geometry or function: "+name);
 }
 assert.doesNotMatch(noComments,/(?:width|height|margin|padding|grid-template|gap|position|z-index|transform|font|line-height|letter-spacing|content|opacity|display|border-width|background-size|animation|transition)\s*:/);
 assert.doesNotMatch(noComments,/url\(|@font-face|@keyframes|::before|::after|!important|data-representative-domain|person-register-entry|person-table-/);
});

test("VIS2-09 genuine portrait A/B waits for actual decoded pixels",()=>{
 assert.match(verifier,/img\.complete&&img\.naturalWidth>0&&img\.naturalHeight>0/);
 assert.match(verifier,/imageComplete/);
 assert.match(verifier,/imageNaturalWidth/);
 assert.match(verifier,/imageNaturalHeight/);
 assert.match(verifier,/Genuine portrait pixels must be loaded before A\/B capture/);
});
