import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=(name)=>fs.readFileSync(new URL(`../${name}`,import.meta.url),"utf8");
const snippet=(source,name,next)=>source.slice(source.indexOf(name),source.indexOf(next,source.indexOf(name)));

test("Production visual checkers reject actual bright surfaces without pinning a historical RGB shade",()=>{
  const dash=read("scripts/verify-dashboard-production-acceptance.mjs");
  const person=read("scripts/verify-ui-v10-production-visual.mjs");
  const d=snippet(dash,"function isDeepGraphiteSurface(value)","function digest(buffer)");
  const p=snippet(person,"function isDeepGraphiteSurface(value)","function relativeLuminance(rgb)");
  assert.ok(d.includes("alpha>=.94"));
  assert.ok(p.includes("alpha>=.94"));
  const dContext=vm.createContext({});
  vm.runInContext(d+";this.check=isDeepGraphiteSurface;",dContext);
  const pContext=vm.createContext({});
  vm.runInContext(p+";this.check=isDeepGraphiteSurface;",pContext);
  for(const checker of [dContext.check,pContext.check]){
    assert.equal(checker("rgb(25, 29, 33)"),true);
    assert.equal(checker("rgb(23, 27, 30)"),true);
    assert.equal(checker("rgba(18, 21, 24, 0.96)"),true);
    assert.equal(checker("rgba(18, 21, 24, 0.97)"),true);
    assert.equal(checker("rgb(255, 255, 255)"),false);
    assert.equal(checker("rgb(170, 170, 170)"),false);
    assert.equal(checker("rgba(18, 21, 24, 0.5)"),false);
    assert.equal(checker("transparent"),false);
  }
  assert.match(dash,/Dashboard KPI regressed to a bright surface/);
  assert.match(person,/Person era navigator regressed to a bright surface/);
});
