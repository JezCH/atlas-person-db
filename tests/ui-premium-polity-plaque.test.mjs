import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=(name)=>fs.readFileSync(new URL(`../${name}`,import.meta.url),"utf8");

test("POLITY-LUX1 extends only the canonical polity/dossier material, never Person rows",()=>{
  const css=read("atlas-polity-review-workbench.css");
  const nav=read("atlas-main-authority-nav.js");
  const i=css.indexOf("/* POLITY-LUX1 — Canonical polity");
  assert.ok(i>=0);
  const finish=css.slice(i);
  for(const name of [".polity-browser-card", ".polity-browser-card[open]>summary",".polity-dossier-overview>div",".polity-browser-title strong"]) assert.ok(finish.includes(name),name);
  for(const token of ["--atlas-material-sheen-strong","--atlas-material-edge-dark","--atlas-material-wash-selected","--atlas-text-strong"]) assert.ok(finish.includes(`var(${token})`),token);
  assert.doesNotMatch(finish,/(?:^|\n)\s*(?:width|height|padding|margin|gap|font-size|line-height|grid-template-columns|grid-template-rows|position|left|right|top|bottom|transform|opacity)\s*:/);
  assert.doesNotMatch(finish,/\.person-table|\.person-register-entry|@keyframes|animation:|!important/);
  assert.match(nav,/atlas-polity-review-workbench\.css\?v=20261008-polity-lux1-inscription-v1/);
});
