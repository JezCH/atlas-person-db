import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-spacetime-marginalia-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("VIS2-06 is a single opt-in Spacetime-only stylesheet after VIS2-04",()=>{
 const href="atlas-person-spacetime-marginalia-v2.css?v=20261009-vis2-06-instrument-v1";
 assert.equal(html.split(href).length-1,1);
 assert.ok(html.indexOf(href)>html.indexOf("atlas-person-spacetime-precision-ticks-v2.css"));
 assert.match(css,/--atlas-vis2-06-instrument-active:\s*1\s*;/);
});
test("VIS2-06 has seven scoped paint declarations and no geometry, content, focus or interactions",()=>{
 const stripped=css.replace(/\/\*[\s\S]*?\*\//g,"");
 const rules=[...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.equal(rules.length,8);
 assert.equal(rules[0][1].trim(),":root");
 const targets=rules.slice(1);
 assert.equal(targets.length,7);
 for(const [,selector,body] of targets){
  const parts=selector.split(",").map(x=>x.trim()).filter(Boolean);
  for(const part of parts){
   assert.ok(part.startsWith('#personSpacetimeMount[data-spacetime-tools="instrument-v7"] '),"Unscoped rule "+part);
   assert.match(part,/\.spacetime-(?:camera output|status-row|status-primary|mini|sticky-inspector|inspector-person)/);
  }
  const decl=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(x=>x[1]);
  assert.ok(decl.length>0);
  for(const property of decl)assert.ok(["color","text-shadow","background-image"].includes(property),"Forbidden geometry property "+property);
 }
 assert.doesNotMatch(stripped,/(?:font-size|line-height|font-family|letter-spacing|width|height|padding|margin|border|display|position|transform|opacity|z-index|content)\s*:/);
 assert.doesNotMatch(stripped, /(?:!important|@media|@font-face|::before|::after|\.spacetime-canvas|\.spacetime-track-label|\.spacetime-year-axis|\.spacetime-region-head)/);
});
test("No semantic rail/selected/warning color ownership overridden",()=>{
 const body=css.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.doesNotMatch(body,/--spacetime-person-domain|--atlas-domain|spacetime-integrity-status|\.is-selected|spacetime-minimap-viewport|spacetime-minimap-selected/);
});
