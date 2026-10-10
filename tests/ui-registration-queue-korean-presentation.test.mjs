import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");

async function renderQueue({rows,search="",missingStore=false,failedRequest=false}={}) {
  const elements=new Map();
  const element=(selector)=>{
    if(!elements.has(selector))elements.set(selector,{
      innerHTML:"",textContent:"",dataset:{},value:"",disabled:false,checked:false,addEventListener(){}
    });
    return elements.get(selector);
  };
  const root={isConnected:true,innerHTML:"",querySelector:element};
  element("#registrationQueueSearch").value=search;
  const win={
    ATLAS_PERSON_DOMAIN_REGISTRY:{LABELS:{military:"군사",commerce:"경제·상업"}},
    ATLAS_CLIENT_DATA_STORE:missingStore ? null : {async loadPersons(){return {persons:[],summary:{total:0}};}},
    addEventListener(){}
  };
  const queue={ok:true,summary:{pending_count:(rows||[]).length},candidates:rows||[]};
  const signals={ok:true,rows:[],available_count:0,threshold_counts:{},snapshot:null};
  const context={
    window:win,console:{error(){},warn(){}},
    fetch:async (url)=>failedRequest
      ? {ok:false,status:503,json:async()=>({ok:false,code:"DATABASE_UNAVAILABLE"})}
      : {ok:true,status:200,json:async()=>url.includes("registration-queue")?queue:signals},
    setInterval(){return 1;},clearInterval(){},Date,Map,Set,Number,String,Array,Promise,encodeURIComponent
  };
  vm.runInNewContext(src,context,{filename:"atlas-registration-review.js"});
  win.ATLAS_REGISTRATION_REVIEW.mount(root);
  for(let i=0;i<30;i++)await Promise.resolve();
  return {body:element("#registrationQueueBody").innerHTML,status:element("#registrationReviewStatus").textContent};
}

test("registration queue translates field values without replacing machine codes",async()=>{
  const {body}=await renderQueue({rows:[{candidate_id:"id1",name:"Example",representative_domain:"military",legacy_priority:"SS",review_state:"APPROVED",origin:"reviewed_intake"}]});
  for(const s of [">군사<",">SS<",">승인됨<",">검토를 거쳐 접수<"])assert.ok(body.includes(s),s);
  assert.doesNotMatch(body,/>(military|APPROVED|reviewed_intake)</);
});

test("search accepts Korean domain label while retaining original raw-code search",async()=>{
  const rows=[{candidate_id:"id1",name:"Example",representative_domain:"military",review_state:"IN_REVIEW"},{candidate_id:"id2",name:"Other",representative_domain:"commerce",review_state:"APPROVED"}];
  const localized=await renderQueue({search:"군사",rows});
  assert.match(localized.body,/Example/);assert.doesNotMatch(localized.body,/Other/);
  const raw=await renderQueue({search:"military",rows});
  assert.match(raw.body,/Example/);assert.doesNotMatch(raw.body,/Other/);
});

test("unknown values display Korean unresolved labels, without inventing translations",async()=>{
  const {body}=await renderQueue({rows:[{candidate_id:"id1",name:"Example",representative_domain:"new_code",priority:"CUSTOM",review_state:"NEW_REVIEW_STATE",origin:"undocumented_source"}]});
  for(const s of ["분야 확인 필요","등급 확인 필요","검토 상태 확인 필요","출처 확인 필요"])assert.ok(body.includes(s),s);
  for(const s of ["new_code","CUSTOM","NEW_REVIEW_STATE","undocumented_source"])assert.ok(!body.includes(s),s);
});

test("API failure and missing data store surface safe Korean errors",async()=>{
  const bad=await renderQueue({failedRequest:true});
  assert.match(bad.status,/갱신 실패.*다시 시도해 주세요/);
  assert.doesNotMatch(bad.status,/DATABASE_UNAVAILABLE|HTTP|Person Runtime store unavailable/);
  const missing=await renderQueue({missingStore:true});
  assert.match(missing.status,/갱신 실패/);
  assert.doesNotMatch(missing.status,/Person Runtime store unavailable/);
});

test("localization preserves request and internal state contracts",()=>{
  for(const key of ["row?.candidate_id","row?.review_state","row?.representative_domain","row?.origin","mode=discovery","data-min-channels","getJson(QUEUE_URL)","getJson(signalQuery("])assert.ok(src.includes(key),key);
  assert.match(src,/<th>기존 등급<\/th>/);
  assert.doesNotMatch(src,/<th>legacy 우선순위<\/th>/);
});
