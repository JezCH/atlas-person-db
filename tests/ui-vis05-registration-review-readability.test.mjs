import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("atlas-registration-review.css");
const js=read("atlas-registration-review.js");
const navigation=read("atlas-main-authority-nav.js");

test("VIS-05 registration mobile keeps five real metrics in a readable compact grid",()=>{
  assert.match(css,/\.registration-review-stat span\{font-size:12px;/);
  assert.match(css,/\.registration-review-stat small\{font-size:11\.5px;/);
  assert.match(css,/\.registration-review-table th\{[^\n]*font-size:11px;/);
  assert.match(css,/\.registration-review-table time\{[^\n]*font-size:11\.5px\}/);
  assert.match(css,/\.registration-review-queue-head input\{[^\n]*min-height:44px;[^\n]*font-size:16px/);
  assert.match(css,/@media\(max-width:420px\)\{\.registration-review-stats\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\.registration-review-stat:last-child\{grid-column:1\/-1\}\}/);
  // Mobile data labels remain visible and table headers are visually clipped,
  // not display:none, so assistive technology keeps the real <th> relationships.
  assert.match(css,/\.registration-review-queue-table thead\{position:absolute;[^}]*clip-path:inset\(50%\)/);
  assert.doesNotMatch(css,/\.registration-review-queue-table thead\{display:none\}/);
  assert.match(css,/\.registration-review-queue-table td::before\{[^}]*font-size:12px/);
  assert.match(css,/\.registration-review-head-actions \.btn\{min-height:44px\}/);
  assert.match(navigation,/atlas-registration-review\.css\?[^"]*vis05=readable-mobile-review-v1/);
  assert.match(navigation,/atlas-registration-review\.js\?[^"]*vis05=queue-search-feedback-v1/);
});

function createView(candidates){
  const inputs={};
  const els={
    "#registrationQueueBody":{innerHTML:""},
    "#registrationQueueSearch":{value:"",addEventListener:(name,fn)=>{inputs[name]=fn;}},
    "#registrationQueueMatchCount":{textContent:"결과 불러오는 중"},
    "#registrationReviewStatus":{textContent:"",dataset:{state:"loading"}},
    "#registrationReviewRefresh":{disabled:false,addEventListener(){}},
    "#registrationRegisteredStats":{innerHTML:""}
  };
  const root={isConnected:true,innerHTML:"",querySelector:(selector)=>els[selector]||null};
  const context={
    window:{
      ATLAS_CLIENT_DATA_STORE:{loadPersons:async()=>({ok:true,summary:{total:1},persons:[{historicity:"historical",activity_count:1}]})},
      ATLAS_PERSON_DOMAIN_REGISTRY:{LABELS:{science:"과학",culture:"문화"}},
      addEventListener(){}
    },
    fetch:async()=>({ok:true,json:async()=>({ok:true,summary:{pending_count:candidates.length},candidates})}),
    setInterval:()=>123,clearInterval(){},
    console:{error(){}}
  };
  vm.runInNewContext(js,context,{filename:"atlas-registration-review.js"});
  context.window.ATLAS_REGISTRATION_REVIEW.mount(root);
  return {els,inputs,root,drain:()=>new Promise(resolve=>setImmediate(resolve))};
}

test("VIS-05 actual queue filter distinguishes no matches from genuinely empty queue",async()=>{
  const candidates=[
    {name:"Ada",representative_domain:"science",priority:"SSS",review_state:"PENDING",origin:"reviewed_intake",candidate_id:"a"},
    {name:"Artemis",representative_domain:"culture",priority:"A",review_state:"HOLD",origin:"reviewed_intake",candidate_id:"b"}
  ];
  const view=createView(candidates);
  await view.drain();
  assert.match(view.els["#registrationQueueBody"].innerHTML,/Ada/);
  assert.match(view.els["#registrationQueueBody"].innerHTML,/Artemis/);
  assert.equal(view.els["#registrationQueueMatchCount"].textContent,"등록대기열 2건");
  assert.match(view.root.innerHTML,/role="status" aria-live="polite" aria-atomic="true"/);

  view.els["#registrationQueueSearch"].value="존재하지 않는 검색어";
  view.inputs.input();
  assert.match(view.els["#registrationQueueBody"].innerHTML,/검색 조건과 일치하는 등록대기 후보가 없습니다/);
  assert.doesNotMatch(view.els["#registrationQueueBody"].innerHTML,/현재 등록대기 후보가 없습니다/);
  assert.equal(view.els["#registrationQueueMatchCount"].textContent,"검색 결과 0건 · 전체 2건");

  view.els["#registrationQueueSearch"].value="과학";
  view.inputs.input();
  assert.match(view.els["#registrationQueueBody"].innerHTML,/Ada/);
  assert.doesNotMatch(view.els["#registrationQueueBody"].innerHTML,/Artemis/);
  assert.equal(view.els["#registrationQueueMatchCount"].textContent,"검색 결과 1건 · 전체 2건");

  const empty=createView([]);
  await empty.drain();
  assert.match(empty.els["#registrationQueueBody"].innerHTML,/현재 등록대기 후보가 없습니다/);
  assert.equal(empty.els["#registrationQueueMatchCount"].textContent,"등록대기열 0건");
});
