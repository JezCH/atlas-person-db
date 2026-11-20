import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("atlas-ui-mobile-v8.css");
const html=read("index.html");
const chrome=read("scripts/verify-ui-v10-production-visual.mjs");
const detail=css.slice(css.indexOf("/* A real portrait leads;"));
const styles=detail.slice(0,detail.indexOf("@media (max-width: 520px)"));

function size(selector){
  const start=styles.indexOf(selector+" {");
  assert.ok(start>=0,"Missing mobile Chronicle owner: "+selector);
  const body=styles.slice(start,styles.indexOf("}",start)+1);
  const m=body.match(/font-size:\s*([\d.]+)px/);
  assert.ok(m,"Missing absolute font size for "+selector);
  return Number(m[1]);
}

test("Actual 390px Chronicle owner makes status, dates and description readable",()=>{
  assert.ok(size(".person-detail-status")>=11.5);
  assert.ok(size(".person-detail-canonical")>=12);
  assert.ok(size(".person-detail-era")>=13);
  assert.ok(size(".person-chronicle-section .person-description p")>=13);
  assert.match(html,/atlas-ui-mobile-v8\.css\?v=[^"]+&detailText=20261120-readable-person-chronicle-v1/);
});

test("Existing Production Chrome accepts both real portrait and compact no-portrait states",()=>{
  assert.match(chrome,/if\(mobileDetail\.hasPortrait\)\{/);
  assert.match(chrome,/mobileDetail\.portraitRect\?\.height<=45/);
  assert.match(chrome,/mobileDetail\.identityRect\?\.top<mobileDetail\.portraitRect\.top/);
  assert.match(chrome,/mobileDetail\.portraitStatusVisible/);
  assert.match(chrome,/statusFontPx>=11\.5/);
  assert.match(chrome,/descriptionFontPx>=13/);
});

test("Real comparison focus is checked before the smoke itself scrolls the result",()=>{
  const i=chrome.indexOf("const completedFocus=await evaluateUi07");
  const j=chrome.indexOf("const close=document.querySelector(\".person-detail-overlay-close\")",i);
  assert.ok(i>0&&j>i);
  assert.match(chrome.slice(i,j),/document\.activeElement\?\.id/);
  assert.match(chrome.slice(i,j),/completedFocus\.activeId==="personComparePanel"/);
  assert.match(chrome.slice(i,j),/panelTabindex==="-1"/);
  assert.match(chrome,/return \{selected,completedFocus,view,closePassed:closed\};/);
  assert.doesNotMatch(chrome.slice(i,j),/\.scrollIntoView\(/);
});
