import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = name => fs.readFileSync(new URL(`../${name}`,import.meta.url),"utf8");

test("P5 Person Register remains a dense table: inset memorial hairlines do not count as cards",()=>{
  const verifier=read("scripts/verify-ui-v10-production-visual.mjs");
  const register=read("atlas-person-monumental-register.css");
  assert.match(register,/\.person-monumental-register \.person-register-entry \{/);
  assert.match(register,/box-shadow: inset 0 1px 0/);
  assert.match(verifier,/const cssShadow=String\(s\?\.boxShadow\|\|"none"\)/);
  assert.match(verifier,/const hasRaisedShadow=shadowLayers\.some/);
  const start=verifier.indexOf("const cssShadow=String(");
  const end=verifier.indexOf("return radius>0.5 || hasRaisedShadow;",start);
  assert.ok(start>=0&&end>start);
  const parse=new Function("s",verifier.slice(start,end)+"return hasRaisedShadow;");
  assert.equal(parse({boxShadow:"none"}),false);
  assert.equal(parse({boxShadow:"rgba(239, 235, 226, 0.008) 0px 1px 0px 0px inset"}),false);
  assert.equal(parse({boxShadow:"rgba(0, 0, 0, 0.2) 0px 3px 8px"}),true);
  assert.equal(parse({boxShadow:"rgba(255, 255, 255, .02) 0px 1px 0px inset, rgba(0, 0, 0, .2) 0px 3px 8px"}),true);
  assert.equal(parse({boxShadow:"rgba(255, 255, 255, .02) 0px 1px 0px inset, rgba(0, 0, 0, .2) 0px -1px 0px inset"}),false);
  assert.match(verifier,/return radius>0\.5 \|\| hasRaisedShadow/);
  assert.match(verifier,/desktopMain\.cardLikeCount===0/);
  assert.match(verifier,/mobileMain\.cardLikeCount===0/);
});

test("P5 Dashboard screenshots show the genuine top-of-page hierarchy after drilldown",()=>{
  const source=read("scripts/verify-dashboard-production-acceptance.mjs");
  for (const file of ["dashboard-desktop.png","dashboard-mobile.png"]) {
    const at=source.indexOf(`screenshot(client, "${file}")`);
    assert.ok(at>0);
    assert.ok(source.slice(at-300,at).includes("window.scrollTo(0,0)"),file);
  }
});

test("P5 Production Chrome acceptance now captures canonical Polity at desktop and mobile",()=>{
  const source=read("scripts/verify-polity-production-visual.mjs");
  const workflow=read(".github/workflows/atlas-spacetime-production-visual.yml");
  assert.match(source,/#atlas-polities/);
  assert.match(source,/polity-desktop-top\.png/);
  assert.match(source,/polity-desktop-open\.png/);
  assert.match(source,/polity-mobile-top\.png/);
  assert.match(source,/polity-mobile-open\.png/);
  assert.match(source,/Polity mobile document overflow/);
  assert.match(source,/Polity open disclosure failed/);
  assert.match(workflow,/node scripts\/verify-polity-production-visual\.mjs/);
});
