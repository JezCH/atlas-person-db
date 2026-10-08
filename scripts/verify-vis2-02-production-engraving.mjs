import fs from "node:fs";
import path from "node:path";

const CDP=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-02-production-engraving/v1",expected_sha:SHA,checked_at:new Date().toISOString(),cases:[],screenshots:[],status:"PENDING"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,message,data){if(!ok){const e=new Error(message);e.details=data;throw e;}}
class CDPClient{
  constructor(url){this.ws=new WebSocket(url);this.id=1;this.pending=new Map();}
  async ready(){
    await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});
    this.ws.addEventListener("message",e=>{const r=JSON.parse(String(e.data)),p=this.pending.get(r.id);if(!p)return;this.pending.delete(r.id);r.error?p.reject(new Error(r.error.message)):p.resolve(r.result||{});});
  }
  call(method,params={}){const id=this.id++;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function evaluate(c,expression){
  const r=await c.call("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||"JS evaluation failed");
  return r.result?.value;
}
async function waitFor(c,expression,timeout=60000){
  const begin=Date.now();while(Date.now()-begin<timeout){try{if(await evaluate(c,expression))return;}catch{}await sleep(250);}
  throw new Error("Timed out waiting for "+expression);
}
async function screenshot(c,name){
  const png=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  assert(png?.data,"Missing screenshot "+name);
  fs.writeFileSync(path.join(OUT,name),Buffer.from(png.data,"base64"));
  report.screenshots.push(name);
}
function snapshot(){
  const selectors=[".topbar",".mobile-appbar",".brand",".mobile-brand",".person-main-toolbar.card",".authority-shell-head.card"];
  const components=Object.fromEntries(selectors.map(selector=>{
    const el=document.querySelector(selector);if(!el)return [selector,null];
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return [selector,{visible:r.width>0&&r.height>0&&s.display!=="none",rect:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100),border:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],shadow:s.boxShadow}];
  }));
  return {width:innerWidth,height:innerHeight,document_width:document.documentElement.scrollWidth,
    rows:document.querySelectorAll(".person-register-entry").length,
    link_enabled:!document.querySelector('link[href*="atlas-ui-precision-engraving-v2.css"]')?.disabled,
    components};
}
async function toggle(c,disable){
  const statement="(async()=>{const el=document.querySelector('link[href*=\"atlas-ui-precision-engraving-v2.css\"]');if(!el)return false;el.disabled="+String(disable)+";await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true;})()";
  assert(await evaluate(c,statement),"VIS2-02 stylesheet missing");
}
async function inspect(c,width,height){
  await c.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Page.navigate",{url:"about:blank"});
  await waitFor(c,"document.readyState==='complete'",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/"});
  await waitFor(c,"document.querySelectorAll('.person-register-entry').length>0",90000);
  await waitFor(c,"document.fonts.status==='loaded'",15000);
  await waitFor(c,"Boolean(document.querySelector('link[href*=\"atlas-ui-precision-engraving-v2.css\"]'))",10000);
  await sleep(350);
  await toggle(c,true);
  const before=await evaluate(c,"("+snapshot.toString()+")()");
  if(width===390||width===1440)await screenshot(c,"vis2-02-without-engraving-"+width+".png");
  await toggle(c,false);
  const after=await evaluate(c,"("+snapshot.toString()+")()");
  if(width===390||width===1440)await screenshot(c,"vis2-02-with-engraving-"+width+".png");
  assert(before.width===width&&after.width===width&&before.height===height&&after.height===height,"Viewport changed",{before,after});
  assert(before.rows>0&&before.rows===after.rows,"Person table changed",{before,after});
  assert(before.document_width<=width+1&&after.document_width<=width+1,"Page horizontal overflow",{before,after});
  assert(!before.link_enabled&&after.link_enabled,"Stylesheet toggling not active",{before,after});
  const required=width<=760?[".mobile-appbar",".person-main-toolbar.card"]:[".topbar",".brand",".person-main-toolbar.card"];
  for(const key of required){
    const x=before.components[key],y=after.components[key];
    assert(x?.visible&&y?.visible,"Missing visible target: "+key,{x,y});
    assert(x.rect.every((v,i)=>Math.abs(v-y.rect[i])<=.05),"Target geometry changed: "+key,{x,y});
    assert(x.border.join("/")===y.border.join("/"),"Border width changed: "+key,{x,y});
    assert(x.shadow!==y.shadow,"No computed engraving effect: "+key,{x,y});
  }
  report.cases.push({width,height,required,before,after,status:"PASS"});
  console.log("ATLAS_VIS2_02_ENGRAVING_GEOMETRY_PASS "+width+"x"+height);
}
async function main(){
  assert(/^[a-f0-9]{40}$/.test(SHA),"Exact SHA required",SHA);
  let c;
  try{
    const tabs=await(await fetch(CDP+"/json/list")).json();
    const page=tabs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    assert(page,"CDP browser unavailable",tabs);
    c=new CDPClient(page.webSocketDebuggerUrl);await c.ready();
    await c.call("Page.enable");await c.call("Runtime.enable");
    await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    for(const [w,h] of [[390,844],[768,1000],[1440,1000],[1600,1000]])await inspect(c,w,h);
    report.status="PASS";
    console.log("ATLAS_VIS2_02_PRODUCTION_ENGRAVING_PASS");
  }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_02_PRODUCTION_ENGRAVING_FAIL",e);}
  finally{fs.writeFileSync(path.join(OUT,"vis2-02-production-engraving.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
