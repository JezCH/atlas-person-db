import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-ui-precision-engraving-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("VIS2-02 has one late opt-in stylesheet after V9 material",()=>{
  const previous='atlas-ui-motion-material-v9.css?v=20261007-controls-m2-luminance-v1';
  const added='atlas-ui-precision-engraving-v2.css?v=20261008-vis2-02-precision-engraving-v2';
  assert.ok(html.includes(previous));
  assert.equal(html.split(added).length,2,"CSS link must occur exactly once");
  assert.ok(html.indexOf(added)>html.indexOf(previous),"V9 material must settle before VIS2-02");
});
test("VIS2-02 reuses Phase I materials, not a new gold palette",()=>{
  assert.match(css,/--atlas-engraving-light:\s*var\(--atlas-material-sheen-strong\)/);
  assert.match(css,/--atlas-engraving-cut:\s*var\(--atlas-material-edge-dark\)/);
  assert.match(css,/\.main-area\s*>\s*\.topbar,[\s\S]*?body\s*>\s*\.mobile-appbar\s*\{/);
  assert.match(css,/\.brand,[\s\S]*?\.mobile-brand\s*\{/);
  assert.match(css,/\.person-main-toolbar\.card,[\s\S]*?\.authority-shell-head\.card\s*\{/);
  assert.ok((css.match(/box-shadow\s*:/g)||[]).length===3);
});
test("VIS2-02 adds no box geometry, fake pseudo nodes, semantic rails or camera rules",()=>{
  const declaration=css.replace(/\/\*[\s\S]*?\*\//g,"");
  for(const banned of [
    /(?:^|[;{]\s*)(?:border(?:-(?:top|bottom|left|right|width))?|padding|margin|width|height|top|left|right|bottom|transform|position|display|grid-template-columns|font-size|line-height|box-sizing)\s*:/m,
    /::before|::after/,
    /\.spacetime-|\.person-register-entry|--atlas-person-domain-|--spacetime-/,
    /#[0-9a-fA-F]{3,8}\b/,
    /@keyframes|animation\s*:|transition\s*:|!important/
  ]) assert.doesNotMatch(declaration,banned);
  assert.equal((declaration.match(/\.topbar\b/g)||[]).length,1);
});
