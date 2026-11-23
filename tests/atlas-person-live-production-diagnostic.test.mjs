import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "https://atlas-person-db.vercel.app";
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const pickChrome = () => {
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    try { return execFileSync("which", [name], {encoding:"utf8"}).trim(); }
    catch {}
  }
  return null;
};
async function waitUntil(fn, ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try { const answer = await fn(); if (answer) return answer; } catch {}
    await delay(350);
  }
  return null;
}
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.serial = 0;
    this.errors = [];
  }
  async connect() {
    await new Promise((resolve,reject) => {
      this.ws.addEventListener("open",resolve,{once:true});
      this.ws.addEventListener("error",reject,{once:true});
    });
    this.ws.addEventListener("message",(event)=>{
      let m; try {m=JSON.parse(String(event.data));} catch {return;}
      if (m.method === "Runtime.exceptionThrown") {
        this.errors.push(String(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || "browser exception").slice(0,1200));
      }
      if (!m.id) return;
      const cb = this.pending.get(m.id);
      if (!cb) return;
      this.pending.delete(m.id);
      if (m.error) cb.reject(Error(JSON.stringify(m.error)));
      else cb.resolve(m.result || {});
    });
  }
  call(method,params={}) {
    const id = ++this.serial;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async evaluate(expression) {
    const result = await this.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result?.value;
  }
  close() { try {this.ws.close();} catch {} }
}
const inspect = `(() => {
  const all = s => [...document.querySelectorAll(s)];
  const layout = el => {
    const r = el?.getBoundingClientRect?.(), s = el ? getComputedStyle(el) : null;
    return el ? {display:s.display,visibility:s.visibility,contentVisibility:s.contentVisibility,height:r.height,top:r.top,bottom:r.bottom,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight} : null;
  };
  const groups = all(".person-era-group[data-atlas-era]").map(g => ({
    code:g.dataset.atlasEra,rows:g.querySelectorAll(".person-register-entry").length,
    sample:g.querySelector(".person-register-entry")?.textContent?.trim().slice(0,50),
    layout:layout(g),first:layout(g.querySelector(".person-register-entry")),
    last:layout(g.querySelector(".person-register-entry:last-child"))
  }));
  return {url:location.href,title:document.title,width:innerWidth,
    loaded:!!window.ATLAS_PERSON_MAIN,
    getEraFilter:window.ATLAS_PERSON_MAIN?.getEraFilter?.(),
    getSearchQuery:window.ATLAS_PERSON_MAIN?.getSearchQuery?.(),
    getPolityFilter:window.ATLAS_PERSON_MAIN?.getPolityFilter?.(),
    getDomainFilter:window.ATLAS_PERSON_MAIN?.getDomainFilter?.(),
    getDashboardFilter:window.ATLAS_PERSON_MAIN?.getDashboardFilter?.()?.code || null,
    insertionTrace:window.__atlasInsert || [],
    renderedHtmlLength:document.querySelector(".person-card-grid")?.innerHTML?.length,
    renderedHtmlEnd:document.querySelector(".person-card-grid")?.innerHTML?.slice(-400),
    navSummary:document.querySelector(".person-era-nav-summary")?.textContent,
    bodyHeight:document.body.scrollHeight,htmlHeight:document.documentElement.scrollHeight,
    registerCount:all(".person-register-entry").length,
    directCardCount:all(".person-card-grid > .person-card").length,
    deferredCount:all('[data-person-deferred="true"]').length,
    allGroups:groups,
    select:all(".person-era-period-filter").map(x=>({value:x.value,options:[...x.options].map(o=>({value:o.value,label:o.label}))})),
    list:layout(document.querySelector("#personMainGroups")),
    root:layout(document.querySelector("#personDomainRoot")),
    apiRequests:performance.getEntriesByType("resource").filter(x=>x.name.includes("/api/atlas-person-read")).map(x=>({url:x.name.replace(/\\?.*/, "?..."),ms:Math.round(x.duration),size:x.transferSize}))
  };
})()`;
test("live Production Chrome on Android size shows all eras and can select Information era", {timeout:150000}, async t => {
  const bin=pickChrome();
  assert.ok(bin,"Chrome/Chromium must exist on GitHub Ubuntu runner");
  const dir=mkdtempSync(join(tmpdir(),"atlas-person-diag-"));
  const chrome=spawn(bin,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--remote-allow-origins=*","--remote-debugging-port=0",`--user-data-dir=${dir}`,"about:blank"],{stdio:"ignore"});
  let cdp;
  t.after(()=>{cdp?.close();chrome.kill("SIGKILL");try{rmSync(dir,{recursive:true,force:true});}catch{}});
  const port=await waitUntil(()=>{
    const file=join(dir,"DevToolsActivePort");
    if (!existsSync(file)) return null;
    return Number(readFileSync(file,"utf8").split("\n")[0]);
  },20000);
  assert.ok(port,"headless Chrome failed to expose CDP port");
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const target=tabs.find(x=>x.type==="page");
  assert.ok(target?.webSocketDebuggerUrl,"no Chrome target");
  cdp=new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.call("Runtime.enable");
  await cdp.call("Page.enable");
  await cdp.call("Page.addScriptToEvaluateOnNewDocument", {source:`(() => {
    window.__atlasInsert = [];
    const insert = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function(position, html) {
      const source = String(html);
      const isRoster = source.includes('class="person-group person-group-historical"');
      const deferredMarkup = isRoster ? (source.match(/data-person-deferred="true"/g)||[]).length : 0;
      const result = insert.call(this, position, html);
      if (isRoster) {
        window.__atlasInsert.push({
          htmlLength:source.length, deferredMarkup, completeMarkupCount:(source.match(/class="person-card[^"]*"/g)||[]).length,
          parsedCardCount:document.querySelectorAll(".person-register-entry").length,
          parsedDeferredCount:document.querySelectorAll('[data-person-deferred="true"]').length,
          parentId:this.id, parentChildren:this.children.length
        });
      }
      return result;
    };
  })();`});
  await cdp.call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp.call("Emulation.setTouchEmulationEnabled",{enabled:true});
  await cdp.call("Page.navigate",{url:origin+"/#atlas-persons"});
  const ready=await waitUntil(async()=>{
    return await cdp.evaluate('document.readyState==="complete" && document.querySelector(".person-era-navigator") !== null');
  },45000);
  if (!ready) {
    console.log("ATLAS_LIVE_INIT_ERROR",JSON.stringify({url:await cdp.evaluate("location.href"),errors:cdp.errors}));
  }
  await waitUntil(async()=>await cdp.evaluate('document.querySelectorAll(".person-register-entry").length > 10'),85000);
  await delay(1500);
  const baseline=await cdp.evaluate(inspect);
  console.log("ATLAS_LIVE_MOBILE_BASELINE",JSON.stringify(baseline));
  console.log("ATLAS_LIVE_BROWSER_EXCEPTIONS",JSON.stringify(cdp.errors));
  assert.ok(baseline.loaded,"Person main did not load");
  const rerenderShown=await cdp.evaluate("window.ATLAS_PERSON_MAIN.renderGroups()");
  const rerendered=await cdp.evaluate(inspect);
  console.log("ATLAS_LIVE_RERENDER_RESULT",JSON.stringify({rerenderShown,after:rerendered}));
  await cdp.evaluate('window.ATLAS_PERSON_MAIN.setEraFilter("information")');
  await delay(1200);
  const selected=await cdp.evaluate(inspect);
  console.log("ATLAS_LIVE_INFORMATION_SELECTED",JSON.stringify(selected));
  const returned=await cdp.evaluate('window.ATLAS_PERSON_MAIN.setEraFilter("")');
  const returnedState=await cdp.evaluate(inspect);
  console.log("ATLAS_LIVE_BACK_TO_ALL",JSON.stringify({returned,after:returnedState}));
  assert.equal(baseline.registerCount,2240,"PRODUCTION REGRESSION: full initial roster missing");
  assert.equal(selected.getEraFilter,"information");
  assert.equal(selected.allGroups.length,1);
  assert.equal(selected.allGroups[0].code,"information");
  assert.ok(selected.registerCount>0);
  assert.ok(selected.allGroups[0].layout.height>0);
});