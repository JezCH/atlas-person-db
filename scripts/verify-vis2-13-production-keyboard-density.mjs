import fs from "node:fs";
import path from "node:path";

const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const result={schema:"atlas-vis2-13-keyboard-density/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const wait=t=>new Promise(resolve=>setTimeout(resolve,t));
function check(ok,message,details=null){if(!ok){const e=new Error(message);e.details=details;throw e;}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
 async start(){await new Promise((yes,no)=>{if(this.ws.readyState===WebSocket.OPEN)return yes();this.ws.addEventListener("open",yes,{once:true});this.ws.addEventListener("error",no,{once:true});});this.ws.addEventListener("message",event=>{const x=JSON.parse(String(event.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result||{});});}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close();}catch{}}
}
async function evalJS(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expression,timeout=60000){const st=Date.now();while(Date.now()-st<timeout){try{if(await evalJS(c,expression))return;}catch{}await wait(260);}throw Error("Timeout: "+expression);}
async function shot(c,name){const s=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});check(s.data,"Screenshot absent",{name});fs.writeFileSync(path.join(OUT,name),Buffer.from(s.data,"base64"));result.screenshots.push(name);}
const config={
 persons:{ready:".person-register-entry",target:".person-register-entry",count:".person-register-entry"},
 polities:{ready:"#atlasPolityMount .polity-browser-card",target:"#atlasPolityMount .polity-browser-card > summary",count:"#atlasPolityMount .polity-browser-card"},
 dashboard:{ready:"#atlasDashboardMount .dashboard-kpi",target:"#atlasDashboardMount #atlasDashboardRefresh",count:"#atlasDashboardMount .dashboard-kpi"},
 spacetime:{ready:"#personSpacetimeMount .spacetime-frame",target:"#personSpacetimeMount #spacetimeCameraZoomIn",count:"#personSpacetimeMount .spacetime-track-label"}
};
async function scenario(c,domain,physicalWidth,zoom){
 const cssWidth=Math.round(physicalWidth/zoom),mobile=cssWidth<=760;
 await c.call("Emulation.setDeviceMetricsOverride",{width:cssWidth,height:physicalWidth===390?844:1000,deviceScaleFactor:zoom,mobile});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await c.call("Page.navigate",{url:"about:blank"});
 await until(c,"document.readyState==='complete'",10000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)",45000);
 const route="(()=>{const nav=window.ATLAS_MAIN_AUTHORITY_NAV;nav.showDomain("+JSON.stringify(domain)+");return nav.getDomain()==="+JSON.stringify(domain)+";})()";
 check(await evalJS(c,route),"Cannot navigate",{domain,physicalWidth,zoom});
 await until(c,"document.querySelectorAll("+JSON.stringify(config[domain].ready)+").length>0",90000);
 await until(c,"document.fonts.status==='loaded'",25000);
 // Input.dispatchKeyEvent is a real Chromium keyboard event, not synthetic JS
 // KeyboardEvent. Follow it with focusing an existing native/focusable target.
 await c.call("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
 await c.call("Input.dispatchKeyEvent",{type:"keyUp",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
 const selector=config[domain].target;
 const snap=await evalJS(c,"(()=>{const el=document.querySelector("+JSON.stringify(selector)+");if(!el)return null;el.focus({preventScroll:true});el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const style=getComputedStyle(el),r=el.getBoundingClientRect();return {focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,outlineColor:style.outlineColor,rect:[r.x,r.y,r.width,r.height],viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,fonts:document.fonts.status,targetText:el.textContent?.trim().slice(0,90),targetCount:document.querySelectorAll("+JSON.stringify(config[domain].count)+").length,tag:el.tagName,rootScrollWidth:document.body.scrollWidth};})()");
 check(snap&&snap.focused&&snap.focusVisible,"Chromium keyboard focus-visible missing",{domain,physicalWidth,zoom,snap});
 check(snap.outlineStyle!=="none"&&parseFloat(snap.outlineWidth)>=1,"Keyboard focus ring invisible",{domain,physicalWidth,zoom,snap});
 check(snap.targetCount>0&&snap.targetText,"No real data/control at target",{domain,physicalWidth,zoom,snap});
 check(snap.viewport===cssWidth&&snap.scrollWidth<=cssWidth+1,"Responsive horizontal overflow",{domain,physicalWidth,zoom,snap});
 check(snap.rect[2]>0&&snap.rect[3]>0&&snap.rect[0]<cssWidth&&snap.rect[0]+snap.rect[2]>0,"Focused element outside horizontal viewport",{domain,physicalWidth,zoom,snap});
 const name="vis2-13-"+domain+"-physical"+physicalWidth+"-scale"+Math.round(zoom*100)+"-keyboard.png";
 await shot(c,name);
 result.cases.push({domain,physicalWidth,cssWidth,scale:zoom,keyboardFocusVisible:snap.focusVisible,focusRing:snap.outlineWidth,realControl:snap.targetText,recordCount:snap.targetCount,viewportOverflow:false,screenshot:name,status:"PASS"});
 console.log("ATLAS_VIS2_13_KEYBOARD_DENSITY_CASE_PASS",domain,physicalWidth,zoom,"records="+snap.targetCount);
}
async function main(){
 check(/^[a-f0-9]{40}$/.test(SHA),"Expected exact production SHA missing");
 let c;
 try{
  const tabs=await(await fetch(DEBUG+"/json/list")).json(),tab=tabs.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);check(tab,"Chrome CDP tab absent");
  c=new CDP(tab.webSocketDebuggerUrl);await c.start();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const physical of [390,1440])for(const domain of ["persons","polities","dashboard","spacetime"])await scenario(c,domain,physical,1);
  // Browser-zoom equivalent CSS viewport / DPR combinations. Physical pixels
  // remain 1440; 125% => 1152 CSS px, 150% => 960 CSS px.
  for(const zoom of [1.25,1.5])for(const domain of ["persons","polities","dashboard","spacetime"])await scenario(c,domain,1440,zoom);
  result.status="PASS";console.log("ATLAS_VIS2_13_KEYBOARD_DENSITY_PASS",result.cases.length,"captures="+result.screenshots.length);
 }catch(e){result.status="FAIL";result.error=e.message;result.details=e.details||null;console.error("ATLAS_VIS2_13_KEYBOARD_DENSITY_FAIL",e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUT,"vis2-13-keyboard-density.json"),JSON.stringify(result,null,2)+"\n");c?.close();}
}
await main();
