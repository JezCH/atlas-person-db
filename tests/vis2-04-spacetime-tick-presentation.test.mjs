import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync(new URL("../atlas-person-spacetime-precision-ticks-v2.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("VIS2-04 is one late opt-in time-axis-only layer",()=>{
  const href="atlas-person-spacetime-precision-ticks-v2.css?v=20261009-vis2-04-ticks-v1";
  assert.equal(html.split(href).length-1,1);
  assert.ok(html.indexOf(href)>html.indexOf("atlas-ui-mixed-script-typography-v2.css"));
  assert.match(css,/--atlas-vis2-04-tick-active:\s*1\s*;/);
});
test("VIS2-04 changes ONLY existing year labels, major notches and century guides",()=>{
  const stripped=css.replace(/\/\*[\s\S]*?\*\//g,"");
  const matches=[...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].slice(1);
  assert.equal(matches.length,5);
  for(const [,selector,body] of matches){
    assert.match(selector,/\.spacetime-frame\[data-spacetime-visual="chronology-v6"\]\[data-spacetime-zoom\]/);
    assert.match(selector,/\.spacetime-(?:year-axis|century-line)/);
    const properties=[...body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/gm)].map(x=>x[1]);
    assert.ok(properties.length>0);
    for(const key of properties)assert.ok(["color","background-image","box-shadow","opacity"].includes(key),"VIS2-04 geometry-affecting property "+key);
  }
  for(const name of ["span:not(.is-major)","span.is-major","span.is-major::before",".spacetime-century-line:not(.is-major)",".spacetime-century-line.is-major"])
    assert.ok(stripped.includes(name),name);
  assert.doesNotMatch(stripped,/font-|line-height|letter-spacing|width\s*:|height\s*:|top\s*:|left\s*:|right\s*:|bottom\s*:|border\s*:|grid-template|transform\s*:|position\s*:|padding\s*:|margin\s*:|filter\s*:|z-index\s*:|content\s*:|!important/);
  assert.doesNotMatch(stripped,/\.spacetime-(?:track-label|era-boundary|region-head|region-line|canvas|scroll)|\.person-register-entry|--spacetime-camera/);
});
