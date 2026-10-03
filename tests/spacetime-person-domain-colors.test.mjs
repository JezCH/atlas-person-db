import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root=path.resolve(new URL("..",import.meta.url).pathname);
const CODES=Object.freeze(["governance","military","science","technology","commerce","culture","religion","exploration"]);

function loadModule(){
  const source=fs.readFileSync(path.join(root,"atlas-person-spacetime-domain-colors.js"),"utf8");
  const window={ATLAS_PERSON_DOMAIN_REGISTRY:Object.freeze({DEFINITIONS:CODES.map((code)=>({code})),CODES})};
  vm.runInNewContext(source,{window,console,Object,String,Set,Map},{filename:"atlas-person-spacetime-domain-colors.js"});
  return window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS;
}
test("spacetime semantics cover exactly v2 codes",()=>{const m=loadModule();assert.deepEqual(Array.from(m.CODES),Array.from(CODES));assert.equal(m.CODES.includes("knowledge"),false);});
test("spacetime CSS uses v2 palette variables only",()=>{const css=fs.readFileSync(path.join(root,"atlas-person-spacetime-domain-colors.css"),"utf8");for(const code of CODES)assert.match(css,new RegExp(`var\\(--atlas-person-domain-${code}`));assert.doesNotMatch(css,/atlas-person-domain-knowledge/);});
test("surface owner cache-busts both v2 palette assets",()=>{const owner=fs.readFileSync(path.join(root,"atlas-domain-surface-owner.js"),"utf8");assert.match(owner,/atlas-person-domain-palette\.css\?v=20261004-person-domain-v2/);assert.match(owner,/atlas-person-spacetime-domain-colors\.css\?v=20261004-person-domain-v2/);});
