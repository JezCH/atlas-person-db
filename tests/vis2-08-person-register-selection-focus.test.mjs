import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-register-selection-focus-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
const rules=[...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
test("VIS2-08 is one self-contained late Person-register-only opt-in",()=>{
 const href="atlas-person-register-selection-focus-v2.css?v=20261009-vis2-08-interaction-v1";
 assert.equal(html.split(href).length-1,1);
 assert.ok(html.indexOf(href)>html.indexOf("atlas-person-register-inscription-v2.css"));
 assert.match(css,/--atlas-vis2-08-register-interaction-active:\s*1\s*;/);
 assert.equal(rules.length,6);
});
test("Selection and focus cannot recolor semantic name ink or alter row geometry",()=>{
 for(const [,selector,body] of rules.slice(1)){
   const x=selector.trim();
   assert.ok(x.startsWith(".person-card-grid.person-table-grid.person-monumental-register "),"Unscoped rule "+x);
   assert.ok(/\.is-selected|:focus-visible/.test(x),"Not selected/focused "+x);
   const props=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(x=>x[1]);
   for(const p of props)assert.ok(["box-shadow","outline","outline-color","outline-offset"].includes(p),"Geometry/ink mutation "+p);
 }
 assert.doesNotMatch(clean,/[\s{;](?:height|width|min-width|min-height|max-height|padding|margin|position|display|transform|opacity|font-|line-height|letter-spacing|color|background|border|grid-|content|z-index)\s*:/);
 assert.doesNotMatch(clean,/--atlas-person-domain|--person-register-domain|data-representative-domain|\.person-table-identity|\.person-table-range|\.person-card-activity|\.spacetime-|\.polity-|!important|@media|@font-face/);
});
test("Existing neutral selected ::after and true keyboard focus are the only visual targets",()=>{
 assert.ok(css.includes(".person-register-entry.is-selected::after"));
 assert.ok(css.includes(".person-register-entry:focus-visible"));
 assert.ok(css.includes(".person-register-entry:has(.person-main-name-link:focus-visible)"));
 assert.ok(css.includes(".person-main-name-link:focus-visible"));
 assert.doesNotMatch(clean,/:hover|:active|::before|@keyframes|animation/);
});
