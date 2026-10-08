import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/* VIS2-00 read-only Chrome baseline. Existing exact-SHA gate runs before this script.
 * Screenshots capture real Production data; this script does NOT modify the app or DB.
 */
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const EXPECTED=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"").trim();
const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-phase-ii-vis2-00-baseline/v1",expected_sha:EXPECTED,origin:ORIGIN,created_at:new Date().toISOString(),status:"PENDING",captures:[],checks:[]};
function insist(value,message,details){if(!value){const e=new Error(message);e.details=details||null;throw e;}}
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.n=1;this.pending=new Map();}
  async open(){
    await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});
    this.ws.addEventListener("message",e=>{const p=JSON.parse(String(e.data));const c=this.pending.get(p.id);if(!c)return;this.pending.delete(p.id);if(p.error)c.fail(new Error(p.error.message));else c.ok(p.result||{});});
  }
  call(method,params={}){const id=this.n++;return new Promise((ok,fail)=>{this.pending.set(id,{ok,fail});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function evaluate(c,fn){
  const expression="("+fn.toString()+")()";
  const r=await c.call("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||"Chrome evaluation failed");
  return r.result?.value;
}
async function until(c,fn,ms=40000){
  const start=Date.now();let last;
  while(Date.now()-start<ms){try{last=await evaluate(c,fn);if(last)return last;}catch{}await sleep(240);}
  throw new Error("VIS2 DOM state timeout: "+fn.toString().slice(0,160)+" last="+JSON.stringify(last));
}
async function route(c,hash,width,height){
  await c.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await c.call("Page.navigate",{url:"about:blank"});
  await until(c,()=>document.readyState==="complete",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/"+hash});
  await until(c,()=>document.readyState==="complete",45000);
  await until(c,()=>document.fonts.status==="loaded",30000);
  await sleep(400);
}
async function capture(c,name,kind,extra={}){
  const state=await evaluate(c,()=>{
    const q=s=>document.querySelector(s);
    const rect=el=>{const r=el?.getBoundingClientRect?.();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
    const rows=[...document.querySelectorAll(".person-register-entry")];
    const scroll=q(".spacetime-scroll");
    const labels=[...document.querySelectorAll(".spacetime-track-label")];
    const selected=rows.find(x=>x.classList.contains("is-selected"));
    return {
      href:location.href,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      document_width:document.documentElement.scrollWidth,
      body_width:document.body.scrollWidth,fonts:document.fonts.status,
      persons:rows.length,person_row_rect:rect(rows[0]),
      selected_person:selected?.dataset.personId||null,
      visible_person_fields:q(".person-table-head")?.textContent?.trim().slice(0,280)||null,
      detail_visible:Boolean(q("#personMainDetail:not([hidden])")),
      detail_ready:Boolean(q("#personMainDetail:not([hidden]) .person-chronicle-hero")),
      detail_identity:(q("#personMainDetail .person-chronicle-identity")?.textContent||"").trim().slice(0,150),
      polity_count:document.querySelectorAll(".polity-browser-card").length,
      polity_open_count:document.querySelectorAll(".polity-browser-card[open]").length,
      dashboard_kpi_count:document.querySelectorAll(".dashboard-kpi").length,
      zoom:q("#spacetimeCameraZoomValue")?.textContent?.trim()||null,
      scroll_spacetime:scroll?{left:scroll.scrollLeft,top:scroll.scrollTop,client_width:scroll.clientWidth,scroll_width:scroll.scrollWidth}:null,
      visible_label_count:labels.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>=0&&r.left<=innerWidth&&r.bottom>=0&&r.top<=innerHeight}).length,
      label_sample:labels.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>=0&&r.left<=innerWidth&&r.bottom>=0&&r.top<=innerHeight}).slice(0,32).map(el=>({id:el.dataset.spacetimePerson||null,text:el.textContent?.trim().slice(0,64),rect:rect(el)})),
      macro_bands:[...document.querySelectorAll(".spacetime-region-head-layer.is-macro .spacetime-region-head-band")].map(el=>({name:el.textContent?.trim(),left:el.style.left,width:el.style.width})),
      focus_outline:q(":focus-visible")?getComputedStyle(q(":focus-visible")).outlineStyle:null
    };
  });
  insist(state.viewport.width===extra.width,"Viewport drift in baseline",state);
  insist(state.fonts==="loaded","Fonts not stable at screenshot capture",state);
  if(kind==="person-detail")insist(state.detail_ready&&state.detail_identity,"Person Detail content did not finish loading",state);
  insist(state.document_width<=state.viewport.width+1,"Document horizontal overflow at baseline",state);
  const png=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  insist(Boolean(png.data),"Missing Production screenshot: "+name);
  const bytes=Buffer.from(png.data,"base64");
  fs.writeFileSync(path.join(OUT,name),bytes);
  report.captures.push({name,kind,...extra,state,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
  console.log("VIS2_BASELINE_CAPTURE "+name+" "+state.viewport.width+"x"+state.viewport.height+" zoom="+(state.zoom||"-")+" bytes="+bytes.length);
}
async function person(c,width){
  const height=width===390?844:width===768?1000:1000;
  await route(c,"",width,height);
  await until(c,()=>document.querySelectorAll(".person-register-entry").length>0,90000);
  await capture(c,"vis2-person-main-"+width+".png","person-main",{width,mode:"default"});
  if(width===768||width===1440){
    const filter=await evaluate(c,()=>{
      const row=[...document.querySelectorAll(".person-register-entry")].find(e=>e.dataset.representativeDomain);
      const code=row?.dataset.representativeDomain;
      if(!code||!window.ATLAS_PERSON_MAIN?.setDomainFilter)return null;
      window.ATLAS_PERSON_MAIN.setDomainFilter(code);
      return code;
    });
    if(filter){
      await sleep(300);
      await capture(c,"vis2-person-filter-"+width+".png","person-main",{width,mode:"domain-filter",domain:filter});
      await evaluate(c,()=>{window.ATLAS_PERSON_MAIN?.setDomainFilter?.("");return true;});
    }
    await evaluate(c,()=>{document.querySelector(".person-register-entry .person-main-name-link")?.click();return true;});
    await until(c,()=>Boolean(document.querySelector("#personMainDetail:not([hidden]) .person-chronicle-hero")),35000);
    await until(c,()=>document.querySelector("#personMainDetail .person-chronicle-identity")?.textContent?.trim().length>0,15000);
    await sleep(300); // let async detail typography/portrait settle before baseline shot
    await capture(c,"vis2-person-detail-"+width+".png","person-detail",{width,mode:"selected-detail"});
  }
}
async function polity(c,width){
  const height=width===390?844:width===768?1000:900;
  await route(c,"#atlas-polities",width,height);
  await until(c,()=>document.querySelectorAll(".polity-browser-card>summary").length>0,60000);
  await capture(c,"vis2-polity-list-"+width+".png","polity",{width,mode:"list"});
  if(width===768||width===1440){
    await evaluate(c,()=>{const x=document.querySelector(".polity-browser-card");if(x){x.open=true;x.scrollIntoView({block:"center"});}return true;});
    await sleep(200);
    await capture(c,"vis2-polity-open-"+width+".png","polity",{width,mode:"open"});
  }
}
async function dashboard(c,width){
  const height=width===390?844:width===768?1000:1100;
  await route(c,"#atlas-dashboard",width,height);
  await until(c,()=>document.querySelectorAll(".dashboard-kpi").length>=6,70000);
  await capture(c,"vis2-dashboard-top-"+width+".png","dashboard",{width,mode:"top"});
  if(width===768||width===1440){
    await evaluate(c,()=>{window.scrollTo(0,Math.min(850,document.body.scrollHeight-innerHeight));return true;});
    await sleep(200);
    await capture(c,"vis2-dashboard-scrolled-"+width+".png","dashboard",{width,mode:"scroll"});
  }
}
async function spacetimeReady(c,width){
  const height=width===390?844:width===768?1000:1000;
  await route(c,"#atlas-spacetime",width,height);
  await until(c,()=>Boolean(document.querySelector("#personSpacetimeMount .spacetime-frame")),90000);
  await until(c,()=>document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()==="500%",30000);
  const found=await evaluate(c,()=>{
    const el=document.querySelector("#spacetimeSearch");
    if(!el)return false;
    el.value="a";el.dispatchEvent(new Event("input",{bubbles:true}));
    return true;
  });
  insist(found,"Cannot enter Spacetime search");
  await until(c,()=>document.querySelectorAll("[data-spacetime-search-result]").length>0,30000);
  await evaluate(c,()=>{document.querySelector("[data-spacetime-search-result]")?.click();return true;});
  await until(c,()=>Boolean(document.querySelector("#spacetimeInspector:not(.is-empty)")),30000);
  await sleep(700);
  // Mirror the already-proven Production verifier's focus sequence:
  // clear search, allow the unfiltered viewport to settle, then clear selection.
  // Clearing selection/resetting the camera before this settle can jump to an
  // empty historical interval with no virtualized labels.
  await evaluate(c,()=>{
    const el=document.querySelector("#spacetimeSearch");
    if(el){el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));}
    return true;
  });
  await until(c,()=>document.querySelectorAll(".spacetime-track-label").length>0,30000);
  await evaluate(c,()=>{document.querySelector("#spacetimeClearPerson")?.click();return true;});
  await until(c,()=>Boolean(document.querySelector("#spacetimeInspector.is-empty")),10000);
  await until(c,()=>document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()==="500%",12000);
  await sleep(400);
}
async function focusRegion(c,needle){
  const match=await evaluate(c,()=>{
    const scroll=document.querySelector(".spacetime-scroll");
    const candidates=[...document.querySelectorAll(".spacetime-region-head-layer.is-macro .spacetime-region-head-band")].map(el=>({name:el.textContent?.trim()||"",left:parseFloat(el.style.left),width:parseFloat(el.style.width)}));
    return {candidates,scrollWidth:scroll?.scrollWidth||0,clientWidth:scroll?.clientWidth||0};
  });
  const wanted=match.candidates.find(x=>needle==="east-asia"?/동아시아|East Asia/i.test(x.name):/유럽|Europe/i.test(x.name));
  if(!wanted)return {found:false,region:needle,available:match.candidates.map(x=>x.name)};
  const target=Math.max(0,wanted.left+wanted.width/2-match.clientWidth/2);
  const x=await evaluate(c,()=>{const s=document.querySelector(".spacetime-scroll");if(!s)return null;return {left:s.scrollLeft,width:s.clientWidth};});
  await c.call("Runtime.evaluate",{expression:"(()=>{const s=document.querySelector('.spacetime-scroll');s.scrollLeft="+target+";s.dispatchEvent(new Event('scroll',{bubbles:true}));return true;})()",returnByValue:true});
  await sleep(650);
  return {found:true,region:needle,label:wanted.name,target,previous:x?.left};
}
async function setZoom1000(c){
  const started=await evaluate(c,()=>{
    const s=document.querySelector(".spacetime-scroll");
    if(!s||!window.PointerEvent)return false;
    const r=s.getBoundingClientRect();
    const x=Math.max(r.left+110,Math.min(r.right-150,r.left+r.width/2));
    const y=Math.max(r.top+90,Math.min(r.bottom-100,r.top+r.height/2));
    const fire=(type,id,px)=>s.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:"touch",pointerId:id,clientX:px,clientY:y,isPrimary:id===101}));
    fire("pointerdown",101,x-40);
    fire("pointerdown",102,x+40);
    fire("pointermove",102,x+120);
    return true;
  });
  insist(started,"Synthetic two-pointer gesture not available");
  await until(c,()=>document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()==="1000%",15000);
  await evaluate(c,()=>{
    const s=document.querySelector(".spacetime-scroll");
    if(!s)return false;
    for(const id of [101,102])s.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerType:"touch",pointerId:id,clientX:100,clientY:100}));
    return true;
  });
  await sleep(350);
}
async function spacetime(c,width){
  await spacetimeReady(c,width);
  if(width===1600){
    for(const region of ["east-asia","europe"]){
      const focus=await focusRegion(c,region);
      report.checks.push({width,zoom:"500%",region:focus});
      insist(focus.found,"Macroregion unavailable: "+region,focus);
      await capture(c,"vis2-spacetime-"+region+"-500-"+width+".png","spacetime",{width,zoom:"500%",region});
    }
    await setZoom1000(c);
    for(const region of ["east-asia","europe"]){
      const focus=await focusRegion(c,region);
      insist(focus.found,"Macroregion unavailable at 1000%: "+region,focus);
      await capture(c,"vis2-spacetime-"+region+"-1000-"+width+".png","spacetime",{width,zoom:"1000%",region});
    }
    for(let i=0;i<2;i++){await evaluate(c,()=>{document.querySelector("#spacetimeCameraZoomIn")?.click();return true;});await sleep(250);}
    await until(c,()=>document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()==="1500%",15000);
    for(const region of ["east-asia","europe"]){
      const focus=await focusRegion(c,region);
      insist(focus.found,"Macroregion unavailable at 1500%: "+region,focus);
      await capture(c,"vis2-spacetime-"+region+"-1500-"+width+".png","spacetime",{width,zoom:"1500%",region});
    }
  }else{
    await capture(c,"vis2-spacetime-default-"+width+".png","spacetime",{width,zoom:"500%",mode:"default"});
  }
}
async function main(){
  insist(/^[0-9a-f]{40}$/.test(EXPECTED),"Expected SHA missing: run via exact-SHA Production workflow");
  let c;
  try{
    const list=await(await fetch(DEBUG+"/json/list")).json();
    const page=list.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    insist(page,"Chrome debugging page not found",list);
    c=new CDP(page.webSocketDebuggerUrl);await c.open();
    await c.call("Page.enable");await c.call("Runtime.enable");
    for(const width of [390,768,1440,1600])await person(c,width);
    for(const width of [390,768,1440,1600])await polity(c,width);
    for(const width of [390,768,1440,1600])await dashboard(c,width);
    for(const width of [390,768,1440,1600])await spacetime(c,width);
    report.status="CAPTURED_PENDING_HUMAN_REVIEW";
    console.log("ATLAS_VIS2_00_BASELINE_CAPTURE_PASS captures="+report.captures.length+" expected_sha="+EXPECTED);
  }catch(e){
    report.status="FAIL";
    report.error=e.message||String(e);
    report.details=e.details||null;
    console.error("ATLAS_VIS2_00_BASELINE_CAPTURE_FAIL",report.error,JSON.stringify(report.details));
    process.exitCode=1;
  }finally{
    fs.writeFileSync(path.join(OUT,"vis2-00-baseline.json"),JSON.stringify(report,null,2)+"\n");
    c?.close();
  }
}
await main();
