import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync(new URL("../atlas-polity-review-workbench.css",import.meta.url),"utf8");
const nav=fs.readFileSync(new URL("../atlas-main-authority-nav.js",import.meta.url),"utf8");

function rule(selector){
  const lines=css.split("\n");
  const line=lines.find((item)=>item.startsWith(selector+"{")&&item.includes("font-size:"));
  assert.ok(line,"Missing factual Polity dossier typography selector: "+selector);
  return line;
}

test("Polity dossier factual names, designations, years and citations use readable type",()=>{
  const factual=[
    ".polity-dossier-overview small",
    ".polity-dossier-section-head small",
    ".polity-dossier-section-head h4",
    ".polity-dossier-section-head p",
    ".polity-dossier-identity small",
    ".polity-dossier-name-list small",
    ".polity-dossier-designations strong",
    ".polity-dossier-designations small",
    ".polity-dossier-designations article>span",
    ".polity-dossier-person>header strong",
    ".polity-dossier-person>header small",
    ".polity-dossier-person>header>span",
    ".polity-dossier-person li b",
    ".polity-dossier-person li span",
    ".polity-dossier-sources strong"
  ];
  for(const selector of factual){
    const found=rule(selector).match(/font-size:([\d.]+)px/);
    assert.ok(found,"No numeric type size for "+selector);
    assert.ok(Number(found[1])>=10,"Undersized factual text "+selector+": "+found[1]+"px");
  }
});

test("Polity metadata uses the existing readable secondary color instead of faint muted ink",()=>{
  for(const selector of [
    ".polity-dossier-overview small",
    ".polity-dossier-section-head p",
    ".polity-dossier-identity small",
    ".polity-dossier-designations small",
    ".polity-dossier-person>header small"
  ]){
    assert.match(rule(selector),/color:var\(--atlas-text-secondary\)/,"Muted factual Polity label: "+selector);
  }
});

test("Existing mobile dossier columns and source/people renderers remain linked",()=>{
  assert.ok(css.includes("@media(max-width:520px){.polity-dossier-overview,.polity-dossier-identity{grid-template-columns:1fr}"));
  assert.ok(css.includes("@media(max-width:700px){.polity-dossier-section-head{display:grid}"));
  assert.ok(css.includes(".polity-dossier-sources a:focus-visible"));
  assert.match(nav,/atlas-polity-review-workbench\.css\?v=20261118-polity-direct-sources-v1&ui=20261119-dossier-readability-v1/);
  assert.match(nav,/atlas-polity-dossier-view\.js\?v=20261118-polity-direct-sources-v1/);
});
