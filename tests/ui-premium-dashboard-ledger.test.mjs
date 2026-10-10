import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("DASH-LUX1 enhances an archival control center without changing dashboard or Person geometry",()=>{
  const css=read("atlas-dashboard-monumental-v11.css");
  const nav=read("atlas-main-authority-nav.js");
  const start=css.indexOf("/* DASH-LUX1 — Precision-ledger premium finish.");
  const end=css.indexOf("@media (prefers-reduced-motion: reduce)",start);
  assert.ok(start>=0&&end>start);
  const finish=css.slice(start,end);
  for(const name of [".dashboard-hero h2",".dashboard-kpi strong",".dashboard-panel-head",".dashboard-progress-track"])assert.ok(finish.includes(name),name);
  for(const token of ["--atlas-material-sheen-strong","--atlas-material-edge-dark-strong","--atlas-text-strong","--atlas-material-hairline-soft"])assert.ok(finish.includes(`var(${token})`),token);
  assert.doesNotMatch(finish,/(?:^|\n)\s*(?:width|height|padding|margin|gap|font-size|line-height|grid-template-columns|grid-template-rows|position|left|right|top|bottom|transform)\s*:/);
  assert.doesNotMatch(finish,/@keyframes|animation:|!important|data-domain=|\.person-register-entry|\.person-table/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(nav,/atlas-dashboard-monumental-v11\.css\?v=20261010-vis3-05t-d-kpi-caption-v1/);
});
