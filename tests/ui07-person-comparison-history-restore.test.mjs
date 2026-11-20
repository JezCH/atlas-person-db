import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const route = require("../atlas-entity-route.js");
const read = name => fs.readFileSync(new URL("../" + name, import.meta.url),"utf8");
const person = read("atlas-person-main.js");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const C="33333333-3333-4333-8333-333333333333";
const hashB=route.entityHash("persons","person",B);
const start=person.indexOf("  function validHistoryComparison(route, saved) {");
const stop=person.indexOf("  function updateComparisonControls() {",start);
assert.ok(start>=0&&stop>start,"The real Person History functions must exist");

function harness(hash=hashB,historyState={}) {
  const calls=[];
  const window={
    ATLAS_ENTITY_ROUTE:route,
    location:{hash,href:"https://atlas-person-db.vercel.app/"+hash},
    history:{state:historyState,replaceState(next,title,url) {
      assert.equal(title,"");
      assert.equal(url,window.location.href);
      this.state=next;
      calls.push({type:"replace",state:next});
    }}
  };
  const factory=new Function("window","renderComparisonPanel",
    "let comparisonIds=[];\n"+person.slice(start,stop)+
    "\nreturn {setIds(ids){comparisonIds=ids;},ids(){return comparisonIds.slice();},"+
    "persistComparisonHistory,restoreComparisonFromHistory,validHistoryComparison};");
  const api=factory(window,async()=>{calls.push({type:"render"});});
  return {window,calls,api};
}

test("UI-07C complete comparison is bound to canonical Person History without URL pollution",()=>{
  const {window,api,calls}=harness(hashB,{unrelated:"retain"});
  api.setIds([A,B]);
  assert.equal(api.persistComparisonHistory(),true);
  assert.deepEqual(window.history.state.atlasPersonCompareV1,
    {version:1,routeHash:hashB,personIds:[A,B]});
  assert.equal(window.history.state.unrelated,"retain");
  assert.equal(window.location.hash,hashB);
  assert.equal(calls.length,1);
  const reloaded=harness(hashB,window.history.state);
  assert.equal(reloaded.api.restoreComparisonFromHistory(),true);
  assert.deepEqual(reloaded.api.ids(),[A,B]);
  assert.equal(reloaded.calls[0].type,"render");
  assert.equal(reloaded.api.persistComparisonHistory(),true);
  assert.equal(reloaded.calls.filter(x=>x.type==="replace").length,0);
});

test("UI-07C first Person selection survives refresh at its History entry",()=>{
  const {window,api}=harness();
  api.setIds([A]);
  api.persistComparisonHistory();
  const reboot=harness(hashB,window.history.state);
  assert.equal(reboot.api.restoreComparisonFromHistory(),true);
  assert.deepEqual(reboot.api.ids(),[A]);
  assert.match(person,/if \(comparisonIds\.length\) persistComparisonHistory\(\);/);
});

test("UI-07C Back/Forward isolates entries, while close and remove preserve Spacetime return",()=>{
  const returnData={routeHash:route.entityHash("spacetime","person",A),personId:A};
  const {window,api}=harness(hashB,{atlasSpacetimeReturnV1:returnData});
  api.setIds([A,B]);
  api.persistComparisonHistory();
  const saved=window.history.state;
  const hashA=route.entityHash("persons","person",A);
  window.location.hash=hashA;
  window.location.href="https://atlas-person-db.vercel.app/"+hashA;
  window.history.state={atlasSpacetimeReturnV1:returnData};
  assert.equal(api.restoreComparisonFromHistory(),false);
  assert.deepEqual(api.ids(),[]);
  window.location.hash=hashB;
  window.location.href="https://atlas-person-db.vercel.app/"+hashB;
  window.history.state=saved;
  assert.equal(api.restoreComparisonFromHistory(),true);
  assert.deepEqual(api.ids(),[A,B]);
  api.setIds([A]);
  api.persistComparisonHistory();
  assert.deepEqual(window.history.state.atlasPersonCompareV1.personIds,[A]);
  api.setIds([]);
  api.persistComparisonHistory();
  assert.equal("atlasPersonCompareV1" in window.history.state,false);
  assert.deepEqual(window.history.state.atlasSpacetimeReturnV1,returnData);
});

test("UI-07C rejects forged IDs, route mismatch, stale versions and unrelated Spacetime",()=>{
  const {api}=harness(hashB);
  for(const record of [
    {version:2,routeHash:hashB,personIds:[A,B]},
    {version:1,routeHash:"#atlas-persons",personIds:[A,B]},
    {version:1,routeHash:hashB,personIds:[A,A]},
    {version:1,routeHash:hashB,personIds:[A,B,C]},
    {version:1,routeHash:hashB,personIds:["broken",B]},
    {version:1,routeHash:hashB,personIds:[A.toUpperCase(),B]},
    {version:1,routeHash:hashB,personIds:"wrong"},
    null
  ]) assert.equal(api.validHistoryComparison(route.parseHash(hashB),record),null);
  const spacetimeHash=route.entityHash("spacetime","person",A);
  const foreign=harness(spacetimeHash,{atlasPersonCompareV1:{version:1,routeHash:hashB,personIds:[A,B]}});
  assert.equal(foreign.api.restoreComparisonFromHistory(),false);
  assert.deepEqual(foreign.api.ids(),[]);
  assert.equal(foreign.api.persistComparisonHistory(),false);
});

test("UI-07C hooks native route re-entry, async stale guard and versioned Production scripts",()=>{
  assert.match(nav,/window\.ATLAS_PERSON_MAIN\?\.restoreComparisonFromHistory\?\.\(\)/);
  assert.match(person,/function restoreComparisonFromHistory\(\)/);
  assert.match(person,/persistComparisonHistory\(\);\s*if \(!panel\) return;/);
  assert.match(person,/openComparison,\s*restoreComparisonFromHistory,\s*clearSelection/);
  assert.match(person,/serial !== comparisonRequestSerial/);
  assert.match(nav,/atlasSpacetimeReturnV1/);
  assert.match(nav,/history\.back\(\)/);
  assert.match(html,/atlas-person-main\.js\?v=[^"]+&history=20261120-ui07-pair-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&history=20261120-ui07-pair-v1/);
  assert.doesNotMatch(person.slice(start,stop),/localStorage|sessionStorage|fetch\(/);
});
