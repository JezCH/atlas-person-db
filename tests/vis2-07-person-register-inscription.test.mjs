import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-register-inscription-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("VIS2-07 is a uniquely linked late opt-in stylesheet",()=>{
 const href="atlas-person-register-inscription-v2.css?v=20261009-vis2-07-register-v1";
 assert.equal(html.split(href).length-1,1);
 assert.ok(html.indexOf(href)>html.indexOf("atlas-person-spacetime-marginalia-v2.css"));
 assert.match(css,/--atlas-vis2-07-register-active:\s*1\s*;/);
});
test("VIS2-07 only styles existing Person header, metadata and Activity subrow paint",()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
 const rules=[...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.equal(rules.length,11);
 assert.equal(rules[0][1].trim(),":root");
 for(const [,selector,body] of rules.slice(1)){
  const name=selector.trim();
  assert.ok(name.startsWith(".person-card-grid.person-table-grid.person-monumental-register "),"Out of register "+name);
  assert.match(name,/\.person-(?:table-head|era-band-range|table-identity|table-status-inline|table-activities)/);
  const declarations=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(x=>x[1]);
  assert.ok(declarations.length);
  for(const property of declarations)assert.ok(["color","background-image","border-bottom-color"].includes(property),"Forbidden geometry/style "+property);
 }
 assert.doesNotMatch(clean,/(?:font-size|font-family|line-height|letter-spacing|width|height|grid-|padding|margin|display|position|transform|opacity|content|background-color|box-shadow|text-shadow|outline)\s*:/);
 assert.doesNotMatch(clean,/(?:\.is-selected|:hover|:focus|:active|data-representative-domain|person-domain|person-main-name-link|\.spacetime-|\.polity-|!important|::before|::after|@media)/);
});
test("VIS2-07 does not add a field, role, selector, button, new border or change year formatting",()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.doesNotMatch(clean,/--atlas-register-person-columns|--person-data-columns|--person-activity-columns|font-variant|border-width|border-left|border-top|border-right/);
});
