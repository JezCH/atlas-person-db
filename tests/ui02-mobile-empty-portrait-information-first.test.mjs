import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=source("atlas-person-chronicle-detail.css");
const html=source("index.html");
const person=source("atlas-person-main.js");
const mobile=css.slice(css.indexOf("/* MOBILE-DETAIL-P0 — Compact missing portrait"));
const block=mobile.slice(0,mobile.indexOf("/* Cross-domain historical exploration:"));

test("Mobile Person dossier renders recorded history before a compact missing-portrait status",()=>{
  assert.match(person,/class="person-detail-portrait\$\{href \? " has-portrait" : ""\}"/);
  assert.match(person,/class="person-chronicle-identity"/);
  assert.match(block,/@media \(max-width: 760px\)/);
  assert.match(block,/\.person-chronicle-identity\s*\{\s*order:\s*1;/);
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\)\s*\{[\s\S]*?order:\s*2;/);
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\)\s*\{[\s\S]*?aspect-ratio:\s*auto;/);
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\)\s+\.person-detail-portrait-state\s*\{[\s\S]*?display:\s*inline-block;/);
});

test("Empty portrait background is hidden without hiding real, evidence-linked portraits",()=>{
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\) > \.person-detail-portrait-background/);
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\) > \.person-detail-portrait-neutral/);
  assert.match(block,/\.person-detail-portrait:not\(\.has-portrait\)::before\s*\{\s*content:\s*none;/);
  assert.doesNotMatch(block,/display:\s*none[^;]*;[\s\S]*?\.person-detail-portrait\.has-portrait/);
  assert.match(css,/\.person-chronicle-hero \.person-detail-portrait\.has-portrait\s*\{/);
  assert.match(person,/data-person-portrait-image/);
});

test("Versioned stylesheet is actually served and no canonical record semantics changed",()=>{
  assert.match(html,/atlas-person-chronicle-detail\.css\?v=[^"]+&mobileDetail=20261120-empty-portrait-info-first-v1/);
  assert.match(person,/\$\{Array\.isArray\(person\.activities\)/);
  assert.match(person,/\$\{sourceListHtml\(person\.sources\)\}/);
});
