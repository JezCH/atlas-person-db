import fs from "node:fs";
import path from "node:path";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-06-production-instrument/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,message,details){if(!ok){const e=new Error(message);e.details=details||null;throw e;}}
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
  async ready(){await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});this.ws.addEventListener("message",e=>{const x=JSON.parse(String(e.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(new Error(x.error.message)):p.resolve(x.result||{});});}
  call(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function ev(c,expr){const r=await c.call("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||"CDP exception");return r.result?.value;}
async function until(c,expr,max=60000){const t=Date.now();while(Date.now()-t<max){try{if(await ev(c,expr))return;}catch{}await sleep(250);}throw Error("Timeout: "+expr);}
function state(){
  const sel={
    shell:"#personSpacetimeMount",toolbar:".spacetime-toolbar",readout:".spacetime-camera output",telemetry:".spacetime-status-row",primaryNumber:".spacetime-status-row > .spacetime-status-primary b",
    minimap:".spacetime-minimap",minimapHead:".spacetime-minimap-head",minimapTitle:".spacetime-minimap-head strong",minimapHelp:".spacetime-minimap-head span",
    minimapSurface:"#spacetimeMinimapSurface",minimapViewport:"#spacetimeMinimapViewport",minimapStatus:".spacetime-minimap-status",inspector:"#spacetimeInspector",
    emptyInspector:"#spacetimeInspector.is-empty strong",selectedInspector:"#spacetimeInspector:not(.is-empty) .spacetime-inspector-person > small",frame:".spacetime-frame",yearAxis:".spacetime-year-axis",canvas:".spacetime-canvas"
  };
  const rect=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100);};
  const elements=Object.fromEntries(Object.entries(sel).map(([name,css])=>{const e=document.querySelector(css);if(!e)return [name,null];const s=getComputedStyle(e);return [name,{rect:rect(e),text:e.textContent?.trim().slice(0,120),color:s.color,shadow:s.textShadow,image:s.backgroundImage,visible:s.display!=="none"}];}));
  const scroll=document.querySelector(".spacetime-scroll"),scr=scroll?{x:scroll.scrollLeft,y:scroll.scrollTop,w:scroll.scrollWidth,h:scroll.scrollHeight}:null;
  const labels=[...document.querySelectorAll(".spacetime-track-label")].slice(0,24).map(e=>({text:e.textContent?.trim(),rect:rect(e)}));
  const root=getComputedStyle(document.documentElement);
  return {marker:root.getPropertyValue("--atlas-vis2-06-instrument-active").trim(),width:innerWidth,docWidth:document.documentElement.scrollWidth,windowScrollY:window.scrollY,
    zoom:document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim(),yearCount:document.querySelectorAll(".spacetime-year-axis span").length,
    selected:!Boolean(document.querySelector("#spacetimeInspector.is-empty")),elements,scroll:scr,labels,
    minimapCanvasPixels:{width:document.querySelector("#spacetimeMinimapCanvas")?.width,height:document.querySelector("#spacetimeMinimapCanvas")?.height}};
}
async function toggle(c,disabled){
  const expr="(async()=>{const l=document.querySelector('link[href*=\"atlas-person-spacetime-marginalia-v2.css\"]');if(!l)return false;l.disabled="+disabled+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
  assert(await ev(c,expr),"VIS2-06 stylesheet link missing");
  await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-06-instrument-active').trim()==='"+(disabled?"":"1")+"'",30000);
}
async function shot(c,name){const x=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});assert(x.data,"Empty PNG: "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(x.data,"base64"));report.screenshots.push(name);}
const sameRect=(a,b)=>a?.length===b?.length&&a.every((v,i)=>Math.abs(v-b[i])<=.05);
async function pair(c,width,selection){
  await until(c,"Boolean(document.querySelector('link[href*=\"atlas-person-spacetime-marginalia-v2.css\"]')?.sheet)",30000);
  await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-06-instrument-active').trim()==='1'",30000);
  await ev(c,"(()=>{const e=document.querySelector("+JSON.stringify(selection==="selected"?"#spacetimeInspector":".spacetime-minimap")+");e?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});return true;})()");
  await sleep(400);
  await toggle(c,true);
  const before=await ev(c,"("+state.toString()+")()");
  const capture=width===390||width===1600;
  if(capture)await shot(c,"vis2-06-off-"+selection+"-"+width+".png");
  await toggle(c,false);
  const after=await ev(c,"("+state.toString()+")()");
  if(capture)await shot(c,"vis2-06-on-"+selection+"-"+width+".png");
  for(const key of ["width","docWidth","windowScrollY","zoom","yearCount","selected"])
    assert(before[key]===after[key],"Responsive state changed "+key,{width,selection,key,a:before[key],b:after[key]});
  assert(before.marker===""&&after.marker==="1","VIS2-06 activation not applied");
  assert(after.width===width&&after.docWidth<=width+1,"Viewport / overflow invariant",{width,docWidth:after.docWidth});
  assert(JSON.stringify(before.scroll)===JSON.stringify(after.scroll),"Camera/scroll mutated",{width,selection});
  assert(JSON.stringify(before.labels)===JSON.stringify(after.labels),"Person virtual label positions changed",{width,selection});
  assert(JSON.stringify(before.minimapCanvasPixels)===JSON.stringify(after.minimapCanvasPixels),"Minimap canvas resolution changed");
  for(const [name,a] of Object.entries(before.elements)){const b=after.elements[name];assert(Boolean(a)===Boolean(b),"DOM owner changed "+name,{width,selection});
    if(!a)continue;assert(sameRect(a.rect,b.rect)&&a.text===b.text&&a.visible===b.visible,"Tool geometry/content changed "+name,{width,selection,a,b});
  }
  const targetNames=["readout","primaryNumber","telemetry","minimapTitle","minimapHelp","minimapStatus",selection==="selected"?"selectedInspector":"emptyInspector"];
  for(const name of targetNames){
    const a=before.elements[name],b=after.elements[name];assert(a&&b,"Missing instrument marginalia DOM "+name,{width,selection});
    assert(a.color!==b.color||a.shadow!==b.shadow||a.image!==b.image,"Style did not paint "+name,{width,selection,a,b});
  }
  for(const name of ["minimapViewport","minimapSurface","frame","canvas","yearAxis"]){
    assert(before.elements[name].color===after.elements[name].color&&before.elements[name].image===after.elements[name].image,"Protected map/camera owner restyled "+name,{width,selection});
  }
  report.cases.push({width,height:width===390?844:1000,selection,zoom:after.zoom,personLabels:after.labels.length,yearTicks:after.yearCount,status:"PASS",paint:{readout:after.elements.readout.color,telemetry:after.elements.primaryNumber.color,minimapHelp:after.elements.minimapHelp.color,inspector:after.elements[selection==="selected"?"selectedInspector":"emptyInspector"].color}});
  console.log("ATLAS_VIS2_06_INSTRUMENT_GEOMETRY_PASS "+width+" selection="+selection+" labels="+after.labels.length);
}
async function start(c,width){
  await c.call("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await c.call("Page.navigate",{url:"about:blank"});await until(c,"document.readyState==='complete'",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/#atlas-spacetime"});
  await until(c,"Boolean(document.querySelector('#spacetimeMinimapSurface'))&&document.querySelectorAll('.spacetime-year-axis span').length>0",90000);
  await until(c,"document.fonts.status==='loaded'",30000);
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='500%'",20000);
  await sleep(500);
}
async function select(c){
  assert(await ev(c,"(()=>{const e=document.querySelector('#spacetimeSearch');if(!e)return false;e.value='a';e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"),"Search input missing");
  await until(c,"document.querySelectorAll('[data-spacetime-search-result]').length>0",30000);
  await ev(c,"(()=>{document.querySelector('[data-spacetime-search-result]')?.click();return true;})()");
  await until(c,"Boolean(document.querySelector('#spacetimeInspector:not(.is-empty) .spacetime-inspector-person > small'))",30000);
  await sleep(350);
}
async function main(){
 assert(/^[0-9a-f]{40}$/.test(SHA),"Exact deployed SHA required");
 let c;
 try{
  const a=await(await fetch(DEBUG+"/json/list")).json(),page=a.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
  assert(page,"No Chrome CDP page");c=new CDP(page.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const width of [390,768,1440,1600]){await start(c,width);await pair(c,width,"empty");await select(c);await pair(c,width,"selected");}
  report.status="PASS";console.log("ATLAS_VIS2_06_PRODUCTION_INSTRUMENT_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length);
 }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_06_PRODUCTION_INSTRUMENT_FAIL",e);}
 finally{fs.writeFileSync(path.join(OUT,"vis2-06-production-instrument.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
