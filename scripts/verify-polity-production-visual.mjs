import fs from "node:fs";
import path from "node:path";

// Public read-only Production visual inspection. No writes, auth or test data.
const ORIGIN=process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app";
const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const EXPECTED=process.env.ATLAS_EXPECTED_RUNTIME_SHA||"";
const DESKTOP={width:1440,height:900,deviceScaleFactor:1,mobile:false};
const MOBILE={width:390,height:844,deviceScaleFactor:1,mobile:true};
fs.mkdirSync(OUT,{recursive:true});
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(value,message,details){if(!value){const e=new Error(message);e.details=details;throw e;}}
function deepGraphite(color){
  const m=String(color||"").match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if(!m)return false;
  return m.slice(1,4).every(v=>Number.isFinite(+v)&&+v<=70&&+v>=0)&&(m[4]==null||(+m[4]>=.94));
}
class Cdp {
  constructor(url){this.ws=new WebSocket(url);this.pending=new Map();this.next=1;}
  async ready(){
    await new Promise((resolve,reject)=>{
      if(this.ws.readyState===WebSocket.OPEN){resolve();return;}
      this.ws.addEventListener("open",resolve,{once:true});
      this.ws.addEventListener("error",reject,{once:true});
    });
    this.ws.addEventListener("message",event=>{
      const m=JSON.parse(String(event.data));
      const pending=this.pending.get(m.id);
      if(!pending)return;
      this.pending.delete(m.id);
      if(m.error)pending.reject(new Error(m.error.message));
      else pending.resolve(m.result||{});
    });
  }
  call(method,params={}){
    const id=this.next++;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){this.ws.close();}
}
async function evaluate(c,expression){
  const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error("Production DOM evaluation failed: "+JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function ready(c,what,timeout=45000){
  const begin=Date.now();
  while(Date.now()-begin<timeout){
    const v=await evaluate(c,what);
    if(v)return v;
    await sleep(400);
  }
  throw new Error("Polity Production DOM did not become ready: "+what);
}
async function screenshot(c,name){
  const png=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  fs.writeFileSync(path.join(OUT,name),Buffer.from(png.data,"base64"));
}
async function openPolity(c,viewport){
  await c.call("Emulation.setDeviceMetricsOverride",viewport);
  await c.call("Page.navigate",{url:ORIGIN.replace(/\/$/,"")+"/#atlas-polities"});
  await ready(c,"Boolean(document.querySelector('.polity-browser-card>summary'))");
  await ready(c,"document.fonts.status === 'loaded'");
  await sleep(350);
}
const readState=`(()=>{
  const q=s=>document.querySelector(s);
  const card=q('.polity-browser-card');
  const summary=card?.querySelector('summary');
  const list=[...document.querySelectorAll('.polity-browser-card')];
  const rect=card?.getBoundingClientRect();
  const style=card?getComputedStyle(card):null;
  const sstyle=summary?getComputedStyle(summary):null;
  return {
    width:innerWidth, document_width:document.documentElement.scrollWidth,
    cards:list.length, card_open:Boolean(card?.open),
    card_rect:rect?{left:rect.left,right:rect.right,width:rect.width}:null,
    surface_color:style?.backgroundColor||null,
    summary_color:sstyle?.color||null,
    border_radius:style?.borderRadius||null,
    title_visible:Boolean(card?.querySelector('.polity-browser-title strong')),
    active_route:location.hash
  };
})()`;
async function main(){
  const report={schema:"atlas-premium-polity-production-visual/v1",sha:EXPECTED,url:ORIGIN,checked_at:new Date().toISOString(),status:"PENDING",screenshots:[]};
  let client;
  try{
    const info=await (await fetch(DEBUG+"/json/list")).json();
    const page=info.find(p=>p.type==="page"&&p.webSocketDebuggerUrl);
    assert(page,"Chrome page debugger missing",info);
    client=new Cdp(page.webSocketDebuggerUrl);
    await client.ready();
    await client.call("Page.enable");await client.call("Runtime.enable");
    await client.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    await openPolity(client,DESKTOP);
    const desktop=await evaluate(client,readState);
    assert(desktop.cards>0&&desktop.title_visible,"Polity cards missing",desktop);
    assert(deepGraphite(desktop.surface_color),"Polity escaped graphite surface",desktop);
    assert(desktop.document_width<=DESKTOP.width+1,"Polity desktop document overflow",desktop);
    await evaluate(client,"window.scrollTo(0,0)");
    await screenshot(client,"polity-desktop-top.png");
    await evaluate(client,"(()=>{const c=document.querySelector('.polity-browser-card');c.open=true;c.scrollIntoView({block:'center'});return true;})()");
    await sleep(180);
    const desktopOpen=await evaluate(client,readState);
    assert(desktopOpen.card_open,"Polity open disclosure failed",desktopOpen);
    await screenshot(client,"polity-desktop-open.png");
    await openPolity(client,MOBILE);
    const mobile=await evaluate(client,readState);
    assert(mobile.cards>0,"Polity cards missing on mobile",mobile);
    assert(mobile.document_width<=MOBILE.width+1,"Polity mobile document overflow",mobile);
    assert(deepGraphite(mobile.surface_color),"Polity mobile lost graphite surface",mobile);
    await evaluate(client,"window.scrollTo(0,0)");
    await screenshot(client,"polity-mobile-top.png");
    await evaluate(client,"(()=>{const c=document.querySelector('.polity-browser-card');c.open=true;c.scrollIntoView({block:'center'});return true;})()");
    await sleep(180);
    const mobileOpen=await evaluate(client,readState);
    assert(mobileOpen.card_open,"Polity mobile disclosure cannot open",mobileOpen);
    assert(mobileOpen.card_rect?.width<=MOBILE.width+1,"Polity mobile card exceeds screen",mobileOpen);
    await screenshot(client,"polity-mobile-open.png");
    report.desktop=desktop;report.desktop_open=desktopOpen;report.mobile=mobile;report.mobile_open=mobileOpen;
    report.screenshots=["polity-desktop-top.png","polity-desktop-open.png","polity-mobile-top.png","polity-mobile-open.png"];
    report.status="PASS";console.log("ATLAS_PREMIUM_POLITY_PRODUCTION_VISUAL_PASS");
  }catch(e){
    report.status="FAIL";report.error=e.message;report.details=e.details||null;
    console.error("ATLAS_PREMIUM_POLITY_PRODUCTION_VISUAL_FAIL",e);
    process.exitCode=1;
  }finally{
    fs.writeFileSync(path.join(OUT,"polity-production-visual.json"),JSON.stringify(report,null,2));
    client?.close();
  }
}
await main();
