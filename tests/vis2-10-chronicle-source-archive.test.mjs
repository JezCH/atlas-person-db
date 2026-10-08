import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-chronicle-source-archive-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const evidence=fs.readFileSync(new URL("../atlas-person-evidence-view.js",import.meta.url),"utf8");
const main=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
test("VIS2-10 is opt-in and modifies existing chronology/source presentation only",()=>{
 const link="atlas-person-chronicle-source-archive-v2.css?v=20261009-vis2-10-v1";
 assert.equal(html.split(link).length-1,1);
 assert.ok(html.indexOf(link)>html.indexOf("atlas-person-detail-hero-frame-v2.css"));
 assert.match(css,/--atlas-vis2-10-archive-active:\s*1/);
 assert.match(evidence,/person-evidence-inspector/);
 assert.match(main,/person-source-item/);
});
test("VIS2-10 touches only pre-existing detail nodes and paint properties",()=>{
 const blocks=[...css.replace(/\/\*[\s\S]*?\*\//g,"").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.equal(blocks.length,11);
 assert.equal(blocks[0][1].trim(),":root");
 for(const [,selector,body] of blocks.slice(1)){
  assert.ok(selector.trim().startsWith("#personMainDetail.person-main-detail "),selector);
  const props=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(x=>x[1]);
  assert.ok(props.length>0);
  for(const prop of props)assert.ok(["background-image","box-shadow","border-color","border-top-color","border-bottom-color","outline-color","color","text-decoration-color"].includes(prop),prop);
 }
 assert.doesNotMatch(css,/(?:width|height|padding|margin|grid|gap|position|display|font-size|line-height|letter-spacing|content|opacity|transform|transition|animation)\s*:/);
 assert.doesNotMatch(css,/url\(|@font-face|@keyframes|::after|data-representative-domain|person-register-entry|!important/);
});
