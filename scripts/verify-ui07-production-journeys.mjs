import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const URL_ORIGIN = process.env.ATLAS_PRODUCTION_ORIGIN || "https://atlas-person-db.vercel.app";
const SHA = String(process.env.ATLAS_EXPECTED_RUNTIME_SHA || "").trim();
const CDP = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9222";
const DIR = process.env.ATLAS_VISUAL_OUT_DIR || "artifacts/spacetime-visual-acceptance";
const DESKTOP = { width:1600, height:1000, deviceScaleFactor:1, mobile:false };
const MOBILE = { width:390, height:844, deviceScaleFactor:1, mobile:true };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve,ms));

class Client {
  constructor(endpoint){ this.endpoint=endpoint; this.serial=0; this.pending=new Map(); }
  async connect(){
    this.ws=new WebSocket(this.endpoint);
    await new Promise((resolve,reject)=>{
      this.ws.addEventListener("open",resolve,{once:true});
      this.ws.addEventListener("error",reject,{once:true});
    });
    this.ws.addEventListener("message",(ev)=>{
      const msg=JSON.parse(String(ev.data));
      const pending=this.pending.get(msg.id);
      if(!pending)return;
      this.pending.delete(msg.id);
      if(msg.error)pending.reject(new Error(msg.error.message||JSON.stringify(msg.error)));
      else pending.resolve(msg.result||{});
    });
  }
  call(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.serial;
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){try{this.ws?.close()}catch{}}
}

async function evaluate(c,fn,...args){
  const expression="("+fn.toString()+")("+args.map((x)=>JSON.stringify(x)).join(",")+")";
  const v=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(v.exceptionDetails)throw new Error(v.exceptionDetails.exception?.description||v.exceptionDetails.text||"Chrome evaluation failed");
  return v.result?.value;
}
async function until(c,fn,timeout=45000,...args){
  const start=Date.now();
  while(Date.now()-start<timeout){
    try{const v=await evaluate(c,fn,...args);if(v)return v}catch{}
    await pause(220);
  }
  throw new Error("Timed out waiting for real browser condition: "+fn.toString().slice(0,280));
}
async function shot(c,name){
  const result=await c.call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  assert.ok(result.data,"Production screenshot unavailable: "+name);
  fs.writeFileSync(path.join(DIR,name),Buffer.from(result.data,"base64"));
}
async function navigate(c,viewport,hash=""){
  await c.call("Emulation.setDeviceMetricsOverride",viewport);
  await c.call("Page.navigate",{url:"about:blank"});
  await until(c,()=>document.readyState==="complete",12000);
  await c.call("Page.navigate",{url:URL_ORIGIN+"/"+hash});
  await until(c,()=>document.readyState==="complete",45000);
}
async function findAndAdd(c,query){
  const selected=await evaluate(c,(term)=>{
    const api=window.ATLAS_PERSON_MAIN;
    if(!api)return {error:"no Person main API"};
    api.setSearchQuery(term);
    const rows=[...document.querySelectorAll(".person-register-entry[data-person-id]")];
    if(!rows.length)return {error:"Person search returned no results: "+term};
    const exact=rows.find((r)=>String(r.querySelector(".person-main-name-link")?.textContent||"").toLowerCase()
      .includes(term.toLowerCase()));
    const row=exact||rows[0];
    row.click();
    return {id:row.dataset.personId,count:rows.length,term};
  },query);
  assert.ok(selected?.id,JSON.stringify(selected));
  await until(c,()=>{
    const button=document.querySelector("#personMainDetail [data-person-compare-add]");
    return button&&button.dataset.personCompareAdd===window.ATLAS_PERSON_MAIN?.getSelectedPersonId()&&
      Boolean(document.querySelector("#personMainDetail .person-chronicle-hero"));
  },45000);
  const outcome=await evaluate(c,()=>{
    const button=document.querySelector("#personMainDetail [data-person-compare-add]");
    const name=document.querySelector("#personMainDetail .person-chronicle-identity h2")?.textContent?.trim();
    const actual=button?.dataset.personCompareAdd||null;
    const activityCount=document.querySelectorAll("#personMainDetail .person-activity-list .person-activity-card").length;
    button?.click();
    return {id:actual,name,activityCount,pressed:button?.getAttribute("aria-pressed")};
  });
  assert.equal(outcome.id,selected.id,"Selected Person changed while opening comparison");
  assert.equal(outcome.pressed,"true","Clicking Person comparison control must select the Person");
  return outcome;
}
async function verifyPersonPair(c,label){
  await navigate(c,label==="mobile"?MOBILE:DESKTOP);
  await until(c,()=>document.querySelectorAll(".person-register-entry").length>100,90000);
  const first=await findAndAdd(c,"James Baldwin");
  const second=await findAndAdd(c,"Ernest Hemingway");
  assert.notEqual(first.id,second.id,"Compare only distinct registered Persons");
  await until(c,()=>document.querySelectorAll("#personComparePanel .atlas-compare-person").length===2 &&
    document.querySelectorAll("#personComparePanel .atlas-compare-period-analysis").length===1 &&
    !document.querySelector("#personComparePanel [role=alert]"),65000);
  const inspection=await evaluate(c,()=>{
    window.ATLAS_PERSON_MAIN?.clearSelection?.();
    const panel=document.querySelector("#personComparePanel");
    panel?.scrollIntoView({block:"start",inline:"nearest"});
    const people=[...panel.querySelectorAll(".atlas-compare-person")].map((el)=>({
      name:el.querySelector("h4")?.textContent,
      activityCount:el.querySelectorAll(".atlas-compare-activity").length,
      evidenceCount:el.querySelectorAll(".atlas-compare-source-details").length
    }));
    const amounts=[...panel.querySelectorAll(".atlas-compare-overlap-counts span")].map((el)=>
      Number.parseInt(el.querySelector("strong")?.textContent||"",10));
    const a=panel.querySelectorAll(".atlas-compare-person")[0]?.getBoundingClientRect();
    const b=panel.querySelectorAll(".atlas-compare-person")[1]?.getBoundingClientRect();
    const p=panel.getBoundingClientRect();
    return {
      href:location.href, viewport:innerWidth, documentWidth:document.body.scrollWidth,
      panelWidth:Number(p.width.toFixed(2)), panelScrollWidth:panel.scrollWidth,
      columns:people, amounts, displayedPairs:panel.querySelector(".atlas-compare-period-analysis header > span")?.textContent?.trim(),
      secondBelowFirst:b.top>=a.bottom-1, columnsSideBySide:b.left>=a.right-2&&Math.abs(a.top-b.top)<2,
      sourceLinks:panel.querySelectorAll(".atlas-compare-sources a[href^='https:'],.atlas-compare-sources a[href^='http:']").length,
      error:panel.querySelector("[role=alert]")?.textContent||null,
      closeButton:Boolean(panel.querySelector("[data-compare-close]"))
    };
  });
  assert.deepEqual(inspection.columns.map(x=>x.activityCount),[1,1],
    "Live Baldwin/Hemingway comparison must contain the two actual registered Activities");
  assert.equal(inspection.amounts.length,4);
  assert.equal(inspection.amounts.reduce((a,b)=>a+b,0),1,"Source-graded Activity pair count must conserve all pairs");
  assert.ok(inspection.sourceLinks>=1,"Registered historical evidence link missing");
  assert.ok(inspection.closeButton,"Comparison must be dismissible");
  assert.ok(inspection.panelScrollWidth<=inspection.panelWidth+2,"Comparison panel content spills horizontally");
  assert.ok(inspection.documentWidth<=inspection.viewport+1,"Comparison creates document horizontal overflow");
  if(label==="mobile")assert.ok(inspection.secondBelowFirst,"390px comparison must stack people vertically");
  else assert.ok(inspection.columnsSideBySide,"1600px comparison must present two columns");
  await pause(170);
  await shot(c,"ui07-person-comparison-"+label+".png");
  const dismissed=await evaluate(c,()=>{
    document.querySelector("#personComparePanel [data-compare-close]")?.click();
    return document.querySelector("#personComparePanel")?.hidden===true;
  });
  assert.ok(dismissed,"Comparison close button did not restore person register");
  return {first,second,inspection};
}
async function openSpacetimeYear(c,year){
  const formReady=await until(c,()=>Boolean(document.querySelector("#spacetimeMeanwhileYearForm")),90000);
  assert.ok(formReady);
  await evaluate(c,(value)=>{
    const input=document.querySelector("#spacetimeMeanwhileYearInput");
    input.value=String(value);
    document.querySelector("#spacetimeMeanwhileYearForm").requestSubmit();
  },year);
  await until(c,()=>{
    const form=document.querySelector("#spacetimeMeanwhileYearForm");
    const panel=document.querySelector(".spacetime-meanwhile");
    return Boolean(form&&panel&&!panel.classList.contains("is-empty")&&form.querySelector("input")?.value);
  },60000);
  await pause(300);
  return evaluate(c,()=>({
    count:document.querySelectorAll("[data-spacetime-meanwhile-person]").length,
    year:document.querySelector("#spacetimeMeanwhileYearInput")?.value
  }));
}
async function verifySpacetimeJourney(c){
  await navigate(c,DESKTOP,"#atlas-spacetime");
  await until(c,()=>Boolean(document.querySelector("#spacetimeMeanwhileYearForm")&&
    window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState),90000);
  let selectedYear=null,selectedCount=0;
  for(const year of [1592,1900,1950,1800]){
    const probe=await openSpacetimeYear(c,year);
    if(probe.count>=2){selectedYear=year;selectedCount=probe.count;break}
  }
  assert.ok(selectedYear!=null,"No verified two-Person historical moment found in tested years");
  const first=await evaluate(c,()=>{
    const el=document.querySelector("[data-spacetime-meanwhile-person]");
    const id=el?.dataset.spacetimeMeanwhilePerson;
    el?.click();
    return id||null;
  });
  assert.ok(first,"No verified Person to select from Meanwhile");
  await until(c,()=>Boolean(document.querySelector("#spacetimeInspector .spacetime-inspector-person")&&
    document.querySelectorAll("[data-spacetime-meanwhile-compare]").length),45000);
  const before=await evaluate(c,()=>({
    hash:location.hash,
    year:document.querySelector("#spacetimeMeanwhileYearInput")?.value,
    cameraX:document.querySelector(".spacetime-scroll")?.scrollLeft,
    cameraY:document.querySelector(".spacetime-scroll")?.scrollTop,
    query:document.querySelector("#spacetimeSearch")?.value,
    compareCount:document.querySelectorAll("[data-spacetime-meanwhile-compare]").length,
    person:window.ATLAS_PERSON_SPACETIME_VIEW.captureExplorationState()?.selectedPersonId
  }));
  assert.ok(before.compareCount>=1,"A selected active Person should enable a verified different-Person comparison");
  await shot(c,"ui07-meanwhile-before-comparison.png");
  const nextId=await evaluate(c,()=>{
    const el=document.querySelector("[data-spacetime-meanwhile-compare]");
    const id=el?.dataset.spacetimeMeanwhileCompare||null;
    el?.click();
    return id;
  });
  assert.ok(nextId&&nextId!==first,"Comparison recipient must be a second verified Person");
  await until(c,()=>window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain()==="persons"&&
    document.querySelectorAll("#personComparePanel .atlas-compare-person").length===2&&
    Boolean(document.querySelector("#personComparePanel [data-compare-return-spacetime]")),65000);
  const comparison=await evaluate(c,()=>({
    hash:location.hash,
    names:[...document.querySelectorAll("#personComparePanel .atlas-compare-person h4")].map(x=>x.textContent),
    activities:document.querySelectorAll("#personComparePanel .atlas-compare-activity").length,
    returnHash:window.ATLAS_MAIN_AUTHORITY_NAV.getExplorationReturnHash(),
    headerButton:Boolean(document.querySelector("#personComparePanel [data-compare-return-spacetime]")),
    hasError:Boolean(document.querySelector("#personComparePanel [role=alert]"))
  }));
  assert.ok(comparison.headerButton&&!comparison.hasError,"Spacetime comparison must display both real Person records");
  assert.ok(comparison.returnHash?.startsWith("#atlas-spacetime"),"Spacetime return route missing");
  await evaluate(c,()=>document.querySelector("#personComparePanel")?.scrollIntoView({block:"start"}));
  await shot(c,"ui07-spacetime-person-comparison.png");
  const history = await c.call("Page.getNavigationHistory");
  const previous = history.entries[history.currentIndex - 1];
  assert.ok(previous, "Comparison must create a browser history entry");
  assert.equal(new URL(previous.url).hash, before.hash,
    "The previous browser history entry must point to the original explorer route");
  await c.call("Page.navigateToHistoryEntry", { entryId: previous.id });
  await until(c,(year)=>window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain()==="spacetime"&&
    Boolean(document.querySelector(".spacetime-frame"))&&
    document.querySelector("#spacetimeMeanwhileYearInput")?.value===String(year),90000,selectedYear);
  await pause(450);
  const after=await evaluate(c,()=>({
    hash:location.hash,year:document.querySelector("#spacetimeMeanwhileYearInput")?.value,
    cameraX:document.querySelector(".spacetime-scroll")?.scrollLeft,
    cameraY:document.querySelector(".spacetime-scroll")?.scrollTop,
    query:document.querySelector("#spacetimeSearch")?.value
  }));
  assert.equal(after.hash,before.hash,"Browser Back must restore original Spacetime Person route");
  assert.equal(after.year,String(selectedYear),"Browser Back must restore historic year");
  assert.equal(after.query,before.query,"Browser Back must preserve explorer search");
  assert.ok(Math.abs(after.cameraX-before.cameraX)<35&&Math.abs(after.cameraY-before.cameraY)<35,
    "Browser Back must restore historical camera anchor (within rendering tolerance)");
  const activity=await evaluate(c,()=>{
    const button=document.querySelector("#spacetimeInspector [data-spacetime-inspector-activity]");
    const id=button?.dataset.spacetimeInspectorActivity||null;
    button?.click();
    return id;
  });
  assert.ok(activity,"Selected Person Activity controls missing");
  await until(c,()=>Boolean(document.querySelector("#spacetimeReturnToActivity")&&
    document.querySelector("#spacetimeInspector [data-spacetime-inspector-activity][aria-pressed=true]")),60000);
  const activityBefore=await evaluate(c,()=>({
    hash:location.hash,
    year:document.querySelector("#spacetimeMeanwhileYearInput")?.value,
    person:window.ATLAS_PERSON_SPACETIME_VIEW.captureExplorationState()?.selectedPersonId,
    region:[...document.querySelectorAll("[data-spacetime-meanwhile-region][aria-pressed=true]")]
      .map(x=>x.dataset.spacetimeMeanwhileRegion)
  }));
  const others=await evaluate(c,(personId)=>[...document.querySelectorAll("[data-spacetime-meanwhile-person]")]
    .map(x=>x.dataset.spacetimeMeanwhilePerson).filter(x=>x!==personId).length,first);
  assert.ok(others > 0, "Activity return must be exercised after visiting a different Person");
  {
    await evaluate(c,(personId)=>{
      [...document.querySelectorAll("[data-spacetime-meanwhile-person]")]
        .find(x=>x.dataset.spacetimeMeanwhilePerson!==personId)?.click();
    },first);
    await until(c,(personId)=>window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.()?.selectedPersonId &&
      window.ATLAS_PERSON_SPACETIME_VIEW.captureExplorationState().selectedPersonId!==personId,30000,first);
  }
  await evaluate(c,()=>document.querySelector("#spacetimeReturnToActivity")?.click());
  await until(c,(personId)=>window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.()?.selectedPersonId===personId&&
    Boolean(document.querySelector("#spacetimeReturnToActivity")),60000,first);
  const activityAfter=await evaluate(c,()=>({
    hash:location.hash,year:document.querySelector("#spacetimeMeanwhileYearInput")?.value,
    person:window.ATLAS_PERSON_SPACETIME_VIEW.captureExplorationState()?.selectedPersonId
  }));
  assert.equal(activityAfter.year,activityBefore.year,"Activity return must restore its verified historical moment");
  assert.equal(activityAfter.person,first,"Activity return must restore its Person");
  await shot(c,"ui06b-activity-origin-return.png");
  return {selectedYear,selectedCount,personA:first,personB:nextId,before,comparison,after,activity,activityBefore,activityAfter};
}
async function main(){
  assert.match(SHA,/^[0-9a-f]{40}$/i,"Production expected commit required");
  fs.mkdirSync(DIR,{recursive:true});
  const list=await (await fetch(CDP+"/json/list")).json();
  const target=list.find(x=>x.type==="page")||list[0];
  assert.ok(target?.webSocketDebuggerUrl,"Chrome CDP page not available");
  const c=new Client(target.webSocketDebuggerUrl);
  await c.connect();
  await c.call("Page.enable");
  await c.call("Runtime.enable");
  const report={schema:"atlas-ui07-ui06b-production-real-journey/v1",sha:SHA,
    origin:URL_ORIGIN,checkedAt:new Date().toISOString(),status:"IN_PROGRESS"};
  try{
    report.desktop=await verifyPersonPair(c,"desktop");
    report.mobile=await verifyPersonPair(c,"mobile");
    report.spacetime=await verifySpacetimeJourney(c);
    report.status="PASS";
    console.log("ATLAS_UI07_UI06B_PRODUCTION_REAL_JOURNEY_PASS");
  }catch(error){
    report.status="FAIL";
    report.error=String(error?.stack||error);
    console.error("ATLAS_UI07_UI06B_PRODUCTION_REAL_JOURNEY_FAIL",report.error);
    try{await shot(c,"ui07-journey-failure.png")}catch{}
    process.exitCode=1;
  }finally{
    fs.writeFileSync(path.join(DIR,"ui07-ui06b-real-journey.json"),JSON.stringify(report,null,2)+"\n");
    c.close();
  }
}
main().catch((error)=>{console.error(error);process.exitCode=1});
