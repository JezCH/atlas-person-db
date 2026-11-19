import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const route = require("../atlas-entity-route.js");
const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const view=read("atlas-person-spacetime-view.js");
const nav=read("atlas-main-authority-nav.js");
const persons=read("atlas-person-main.js");
const html=read("index.html");
const base=read("atlas-person-spacetime-view.css");
const tools=read("atlas-person-spacetime-instrument-tools.css");
const mobile=read("atlas-person-spacetime-mobile-v8.css");
const personA="11111111-1111-4111-8111-111111111111";
const personB="22222222-2222-4222-8222-222222222222";

test("UI-06B reuses canonical Person and Spacetime UUID routes without adding query semantics",()=>{
  const from=route.entityHash("spacetime","person",personB);
  const to=route.entityHash("persons","person",personB);
  assert.equal(route.parseHash(from).entity_id,personB);
  assert.equal(route.parseHash(to).entity_id,personB);
  assert.equal(route.parseHash(from).domain,"spacetime");
  assert.equal(route.parseHash(to).domain,"persons");
  assert.equal(route.parseHash("#atlas-spacetime/person/not-an-id").entity_id,null);
});

test("UI-06B route bridge opens selected historical record and native Back returns to explorer",()=>{
  const start=nav.indexOf('  window.addEventListener("atlas-spacetime-open-person-record"');
  const end=nav.indexOf('  window.addEventListener("atlas-spacetime-person-selected"',start);
  assert.ok(start>=0 && end>start,"Explicit roundtrip handlers must be present before normal selection routing");
  const handlers=new Map();
  const window={location:{hash:route.entityHash("spacetime","person",personB)},
    addEventListener(name,fn){handlers.set(name,fn);}};
  const callLog=[];
  const history={state:null,back(){callLog.push("back")},replaceState(next){this.state=next;}};
  const factory=new Function("window","routeModel","parseRoute","showEntity","history",
    nav.slice(start,end)+
    '\nreturn {setDomain:(next)=>currentDomain=next, getReturn:()=>explorationReturnHash};');
  // Match the actual authority module's lexical state, not a duplicate URL parser.
  const bridge=new Function("window","routeModel","parseRoute","showEntity","history",
    'let currentDomain="spacetime"; let explorationReturnHash=null;\n'+nav.slice(start,end)+
    '\nreturn {setDomain:(next)=>currentDomain=next,getReturn:()=>explorationReturnHash};'
  )(window,route,route.parseHash,(domain,type,id)=>callLog.push([domain,type,id]),history);
  handlers.get("atlas-spacetime-open-person-record")({detail:{personId:"invalid"}});
  assert.equal(callLog.length,0);
  handlers.get("atlas-spacetime-open-person-record")({detail:{personId:personB}});
  assert.deepEqual(callLog,[["persons","person",personB]]);
  assert.equal(bridge.getReturn(),route.entityHash("spacetime","person",personB));
  bridge.setDomain("persons");
  handlers.get("atlas-person-return-to-exploration")();
  assert.equal(callLog[1],"back");
  assert.equal(bridge.getReturn(),route.entityHash("spacetime","person",personB));
});

test("UI-06B resumes selection, exact historical moment, search and camera without refocusing Person",()=>{
  assert.match(view,/let resumeExplorationAfterDetail = false/);
  assert.match(view,/resumeExplorationAfterDetail = true;\s*window\.dispatchEvent\(new CustomEvent\("atlas-spacetime-open-person-record"/);
  assert.match(view,/const canResumeExploration = \(resumeExplorationAfterDetail && requestedPersonId === selectedPersonId\) \|\| restoredFromHistory;/);
  assert.match(view,/resumeExplorationAfterDetail = false;\s*if \(requestedPersonId && !canResumeExploration\)/);
  assert.match(view,/let query = ""/);
  assert.match(view,/let cameraScrollTop = 0/);
  assert.match(view,/let cameraScrollLeft = 0/);
  assert.match(view,/let meanwhileSelectedOrdinal = null/);
  assert.match(view,/let meanwhileRegionCode = ""/);
  assert.match(view,/window\.ATLAS_ENTITY_ROUTE\?\.normalizeUuid\?\.\(selectedPersonId\)/);
});

test("UI-06B links only active return contexts, supports native button actions and mobile fit",()=>{
  assert.match(persons,/getExplorationReturnHash\?\.\(\) \? '<button type="button" class="person-chronicle-spacetime-link person-chronicle-return-link" data-person-return-spacetime>/);
  assert.match(persons,/CustomEvent\("atlas-person-return-to-exploration"\)/);
  assert.match(nav,/getExplorationReturnHash: \(\) => currentDomain === "persons" \? explorationReturnHash : null/);
  assert.match(view,/id="spacetimeOpenPersonRecord" type="button">인물 상세<\/button>/);
  assert.match(view,/mount\.querySelector\("#spacetimeOpenPersonRecord"\)\?\.addEventListener\("click"/);
  assert.match(base,/spacetime-inspector-actions\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(tools,/\.spacetime-inspector-actions \{\s*grid-template-columns: repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(mobile,/\.spacetime-inspector-actions \{\s*grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=[^"]+&ui06b=roundtrip-v1/);
  assert.match(html,/atlas-person-main\.js\?v=[^"]+&ui06b=roundtrip-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&ui06b=roundtrip-v1/);
});
