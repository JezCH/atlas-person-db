import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("atlas-person-monumental-register.css");
const main=read("index.html");
const qa=read("scripts/verify-ui-v10-production-visual.mjs");
const start=css.indexOf("/* Ordinary desktop rows retain compact scan density");
const end=css.indexOf("/* Mid-width keeps the factual header",start);
assert.ok(start>0&&end>start,"Desktop typography must belong to the existing large-screen register scope");
const desktop=css.slice(start,end);

test("VIS-01 desktop Person hierarchy exposes registered names, Polity, Role and chronology at readable sizes",()=>{
  assert.match(desktop,/@media \(min-width: 1101px\)/);
  assert.match(desktop,/\.person-table-identity > strong \{\s*font-size: 17px/);
  assert.match(desktop,/\.person-register-range \{\s*font-size: 12px/);
  assert.match(desktop,/\.person-card-activity-head b \{\s*font-size: 12\.5px/);
  assert.match(desktop,/\.person-card-activity-role,\s*\.person-monumental-register \.person-table-activities \.person-card-activity-period \{[\s\S]*?font-size: 12px/);
  assert.match(desktop,/\.person-relation-badge \{\s*font-size: 11px/);
  assert.match(desktop,/\.person-card-activity > small \{\s*font-size: 11px/);
  assert.match(desktop,/\.person-table-head \.person-table-head-cell,[\s\S]*?font-size: 11px/);
  assert.match(desktop,/\.person-register-entry:not\(\.has-multiple-activities\) \{\s*padding-block: 2px/);
  assert.doesNotMatch(desktop,/display:\s*none|text-overflow:\s*ellipsis|transform:\s*scale\(|overflow-x:\s*hidden/);
});

test("VIS-01 desktop factual text cannot bleed past columns or replace history with presentation",()=>{
  assert.match(desktop,/min-width: 0;\s*font-size: 12px;\s*line-height: 1\.4;\s*white-space: normal;\s*overflow-wrap: anywhere/);
  assert.match(css,/@media \(max-width: 760px\)[\s\S]*?font-size: 16\.5px/);
  assert.match(css,/@media \(max-width: 760px\)[\s\S]*?font-size: 12\.5px/);
  assert.match(css,/data-representative-domain="governance"/);
  assert.doesNotMatch(desktop,/grid-template-columns:|grid-template-areas:|--atlas-register-person-columns|--person-activity-columns/);
});

test("VIS-01 desktop registers are measured on 1600px real Chrome rather than inferred from CSS",()=>{
  assert.match(qa,/desktopTypographySamples:mobileTypographySamples/);
  assert.match(qa,/desktopMain\.desktopTypographySamples\?\.length>=5/);
  assert.match(qa,/item\.namePx>=17/);
  assert.match(qa,/item\.polityPx>=12\.5/);
  assert.match(qa,/item\.rolePx>=12/);
  assert.match(qa,/item\.rangePx>=12/);
  assert.match(qa,/item\.periodPx>=12/);
  assert.match(qa,/desktopMain\.ordinaryMedianHeight<=56/);
  assert.match(qa,/desktopNameContrast>=4\.5/);
  assert.match(qa,/mobileMain\.mobileTypographySamples/);
  assert.match(main,/atlas-person-monumental-register\.css\?v=[^"]+&desktop=20261120-ui01-readable-facts-v1/);
});
