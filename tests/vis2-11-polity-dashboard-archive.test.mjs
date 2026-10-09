import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const css=fs.readFileSync(new URL("atlas-vis2-11-polity-dashboard-archive.css",root),"utf8");
const nav=fs.readFileSync(new URL("atlas-main-authority-nav.js",root),"utf8");
const polity=fs.readFileSync(new URL("atlas-polity-review-workbench.js",root),"utf8");
const dash=fs.readFileSync(new URL("atlas-dashboard.js",root),"utf8");
test("VIS2-11 is a single lazy paint stylesheet for existing Polity and Dashboard",()=>{
 const newLink="atlas-vis2-11-polity-dashboard-archive.css?v=20261009-vis2-11-v1";
 assert.equal(nav.split(newLink).length-1,2);
 assert.match(css,/--atlas-vis2-11-archive-active:\s*1/);
 assert.ok(nav.includes("appendStylesheetOnce"));
 assert.match(polity,/polity-browser-card card/);
 assert.match(polity,/polity-browser-summary card/);
 assert.match(dash,/dashboard-control-center/);
 assert.match(dash,/dashboard-kpi/);
});
test("VIS2-11 is a reversible scoped paint-only change",()=>{
 const blocks=[...css.replace(/\/\*[\s\S]*?\*\//g,"").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.equal(blocks.length,11);
 assert.equal(blocks[0][1].trim(),":root");
 let polityCount=0,dashCount=0;
 for(const [,selector,body] of blocks.slice(1)){
  const sel=selector.trim();
  assert.ok(sel.startsWith(".polity-browser-shell ")||sel.startsWith(".dashboard-control-center "),sel);
  if(sel.startsWith(".polity-browser-shell "))polityCount++;else dashCount++;
  const props=[...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gm)].map(m=>m[1]);
  assert.ok(props.length);
  for(const p of props)assert.ok(["border-color","background-image","box-shadow"].includes(p),p);
 }
 assert.equal(polityCount,6);assert.equal(dashCount,4);
 assert.doesNotMatch(css,/(?:width|height|padding|margin|grid|gap|position|display|font|line-height|letter-spacing|opacity|transform|transition|animation|content|filter|pointer-events|color)\s*:/);
 assert.doesNotMatch(css,/url\(|@font-face|@keyframes|!important|data-representative-domain|person-register-entry|spacetime/);
});
