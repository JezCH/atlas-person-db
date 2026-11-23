import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PRODUCTION = "https://atlas-person-db.vercel.app/";
const SORT_SOURCE = readFileSync(new URL("../atlas-person-header-sorting.js",import.meta.url),"utf8");
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const chromeBin = () => {
  for(const binary of ["google-chrome","chromium","chromium-browser"]){
    try {return execFileSync("which",[binary],{encoding:"utf8"}).trim();}catch{}
  }
  return null;
};
async function until(fn,timeout){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{const result=await fn();if(result)return result;}catch{}
    await delay(300);
  }
  return null;
}
class Cdp {
  constructor(url,source) {
    this.ws=new WebSocket(url);
    this.source=source;
    this.nextId=1;
    this.pending=new Map();
    this.replaced=0;
    this.exceptions=[];
  }
  async connect(){
    await new Promise((ok,bad)=>{
      this.ws.addEventListener("open",ok,{once:true});
      this.ws.addEventListener("error",bad,{once:true});
    });
    this.ws.addEventListener("message",(evt)=>{
      let msg;try{msg=JSON.parse(String(evt.data));}catch{return;}
      if(msg.method==="Fetch.requestPaused"){
        this.replaced++;
        this.call("Fetch.fulfillRequest",{
          requestId:msg.params.requestId,
          responseCode:200,
          responseHeaders:[{name:"Content-Type",value:"application/javascript; charset=utf-8"}],
          body:Buffer.from(this.source,"utf8").toString("base64")
        }).catch(error=>this.exceptions.push("intercept "+String(error)));
        return;
      }
      if(msg.method==="Runtime.exceptionThrown"){
        this.exceptions.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text||"runtime exception");
      }
      const cb=this.pending.get(msg.id);
      if(!cb)return;
      this.pending.delete(msg.id);
      if(msg.error)cb.reject(Error(JSON.stringify(msg.error)));
      else cb.resolve(msg.result||{});
    });
  }
  call(method,params={}){
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async evaluate(expression){
    const result=await this.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result?.value;
  }
  close(){try{this.ws.close();}catch{}}
}
const snapshot = `(() => {
  const all=(q)=>[...document.querySelectorAll(q)];
  return {
    full:all(".person-era-rows > .person-card").length,
    deferred:all('[data-person-deferred="true"]').length,
    eraGroups:all(".person-era-group[data-atlas-era]").map(g=>({
      code:g.dataset.atlasEra,rows:g.querySelectorAll(".person-era-rows > .person-card").length,
      height:Math.round(g.getBoundingClientRect().height)
    })),
    eraTabs:all(".person-era-jump").map(e=>e.dataset.era),
    periodSelect:!!document.querySelector(".person-era-period-filter"),
    nav:!!document.querySelector(".person-era-navigator"),
    summary:document.querySelector(".person-era-nav-summary")?.textContent||""
  };
})()`;
test("UI01 actual 390px Chrome retains all 2240 Persons and original horizontal era navigation with corrected sorter", {timeout:120000},async t=>{
  const binary=chromeBin();
  assert.ok(binary,"Chrome must exist on CI runner");
  const dir=mkdtempSync(join(tmpdir(),"atlas-era-sort-live-"));
  const child=spawn(binary,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--remote-allow-origins=*","--remote-debugging-port=0",`--user-data-dir=${dir}`,"about:blank"],{stdio:"ignore"});
  let cdp;
  t.after(()=>{cdp?.close();child.kill("SIGKILL");try{rmSync(dir,{recursive:true,force:true});}catch{}});
  const port=await until(()=>{
    const f=join(dir,"DevToolsActivePort");
    return existsSync(f)?Number(readFileSync(f,"utf8").split("\n")[0]):null;
  },20000);
  assert.ok(port,"Chrome failed to expose CDP port");
  const targets=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const target=targets.find(x=>x.type==="page");
  assert.ok(target?.webSocketDebuggerUrl);
  cdp=new Cdp(target.webSocketDebuggerUrl,SORT_SOURCE);
  await cdp.connect();
  await cdp.call("Runtime.enable");
  await cdp.call("Page.enable");
  await cdp.call("Fetch.enable",{patterns:[{urlPattern:"*atlas-person-header-sorting.js*",requestStage:"Request"}]});
  await cdp.call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp.call("Emulation.setTouchEmulationEnabled",{enabled:true});
  await cdp.call("Page.navigate",{url:PRODUCTION+"#atlas-persons"});
  const ready=await until(()=>cdp.evaluate("document.readyState === 'complete' && document.querySelector('.person-era-navigator') != null"),45000);
  assert.ok(ready,"Person era navigator failed to load");
  const success=await until(async()=>{
    const state=await cdp.evaluate(snapshot);
    return state.full>=2240?state:null;
  },85000);
  const observed=success||await cdp.evaluate(snapshot);
  console.log("ATLAS_PERSON_REAL_CHROME_AFTER_SORT_FIX",JSON.stringify({
    ...observed,scriptOverrides:cdp.replaced,exceptions:cdp.exceptions.slice(0,4)
  }));
  assert.ok(cdp.replaced>=1,"sorting module request was not intercepted");
  assert.equal(observed.full,2240,"corrected sorter must retain the full Person register");
  assert.ok(observed.deferred>2100,"all deferred Person identities must remain in DOM");
  for(const era of ["early-civilization","ancient","classical","early-medieval","late-medieval","early-modern","industrial-imperial","world-wars","cold-war","information","unknown"]){
    assert.ok(observed.eraGroups.some(g=>g.code===era&&g.rows>0&&g.height>0),era+" era is missing or collapsed");
    assert.ok(observed.eraTabs.includes(era),era+" era tab is missing");
  }
  // The injected test still loads the PRE-FIX Production navigation, whose
  // temporary epoch dropdown is removed only when this PR reaches Production.
  const localNavigation=readFileSync(new URL("../atlas-person-era-navigation.js",import.meta.url),"utf8");
  assert.doesNotMatch(localNavigation,/person-era-period-filter/, "fix branch must restore original horizontal era navigation");
  assert.doesNotMatch(localNavigation,/ERA_FILTER_EVENT/, "top epoch filter must be fully removed");
});
