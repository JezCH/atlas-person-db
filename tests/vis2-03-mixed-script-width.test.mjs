import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync(new URL("../atlas-ui-mixed-script-typography-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("VIS2-03 is a single opt-in late typography layer",()=>{
  const link="atlas-ui-mixed-script-typography-v2.css?v=20261009-vis2-03-width-safe-v1";
  assert.equal(html.split(link).length-1,1);
  assert.ok(html.indexOf(link)>html.indexOf("atlas-ui-precision-engraving-v2.css"));
});
test("VIS2-03 scopes mixed-script shaping to historical names only",()=>{
  for(const sel of [
    ".person-monumental-register .person-table-identity > strong",
    ".person-chronicle-identity h2",
    ".polity-browser-title strong"
  ])assert.ok(css.includes(sel),"Missing historical name owner: "+sel);
  assert.match(css,/font-kerning: normal;/);
  assert.match(css,/font-variant-east-asian: normal;/);
  assert.match(css,/font-variant-numeric: tabular-nums lining-nums;/);
  for(const sel of [".spacetime-year-axis span",".person-register-range",".dashboard-kpi strong",".polity-browser-card-stats b"])assert.ok(css.includes(sel),"Missing numeric owner: "+sel);
});
test("VIS2-03 cannot resize table, labels, fonts or chronology geometry",()=>{
  const nonComments=css.replace(/\/\*[\s\S]*?\*\//g,"");
  for(const pattern of [
    /(?:^|[;{]\s*)(?:font-size|font-family|line-height|letter-spacing|word-spacing|word-break|overflow-wrap|white-space|width|height|min-width|max-width|min-height|max-height|padding|margin|display|transform|position|top|left|right|bottom|border|box-shadow|grid-template-columns|flex|filter|color|background)\s*:/m,
    /!important|@font-face|@keyframes|::before|::after/,
    /--atlas-person-domain-|--spacetime-(?:axis|camera)|\.spacetime-canvas/
  ])assert.doesNotMatch(nonComments,pattern);
  assert.equal((nonComments.match(/font-variant-numeric:/g)||[]).length,1);
});
