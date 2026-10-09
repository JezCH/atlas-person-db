import fs from "node:fs";
import path from "node:path";

const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const CDP_URL=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const CSS="atlas-vis2-11-polity-dashboard-archive.css";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-11-production-polity-dashboard/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
function assert(ok,message,context={}){if(!ok){const e=new Error(message);e.context=context;throw e;}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
 async ready(){await new Promise((resolve,reject)=>{if(this.ws.readyState===WebSocket.OPEN)return resolve();this.ws.addEventListener("open",resolve,{once:true});this.ws.addEventListener("error",reject,{once:true});});this.ws.addEventListener("message",event=>{const data=JSON.parse(String(event.data));const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);data.error?pending.reject(new Error(data.error.message)):pending.resolve(data.result||{});});}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close();}catch{}}
}
async function evalJS(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expression,timeout=60000){const start=Date.now();while(Date.now()-start<timeout){try{if(await evalJS(c,expression))return;}catch{}await sleep(250);}throw Error("Timed out "+expression);}
async function shot(c,name){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});assert(r.data,"Screenshot absent "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);}
function state(domain){
 const selectors=domain==="polities"?{
  hero:"#atlasPolityMount .polity-browser-summary",dataset:"#atlasPolityMount .polity-browser-dataset",
  kpi:"#atlasPolityMount .polity-browser-kpis > div",card:"#atlasPolityMount .polity-browser-card",
  summary:"#atlasPolityMount .polity-browser-card > summary",dossier:"#atlasPolityMount .polity-dossier-overview > div",
  section:"#atlasPolityMount .polity-dossier-section-head",title:"#atlasPolityMount .polity-browser-title strong",
  source:"#atlasPolityMount [data-polity-source]"
 }:{
  hero:"#atlasDashboardMount .dashboard-hero",headline:"#atlasDashboardMount .dashboard-hero h2",
  kpi:"#atlasDashboardMount .dashboard-kpi",kpiNumber:"#atlasDashboardMount .dashboard-kpi strong",
  panel:"#atlasDashboardMount .dashboard-panel",panelHead:"#atlasDashboardMount .dashboard-panel-head",
  progress:"#atlasDashboardMount .dashboard-progress-track",swatch:"#atlasDashboardMount .dashboard-domain-swatch",
  polityRow:"#atlasDashboardMount .dashboard-polity-row",sourceDot:"#atlasDashboardMount .dashboard-source-dot"
 };
 const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100);};
 const snap=e=>{if(!e)return null;const s=getComputedStyle(e);return {rect:rect(e),text:e.textContent?.trim().slice(0,260)||"",font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,display:s.display,color:s.color,backgroundColor:s.backgroundColor,borderColor:s.borderColor,backgroundImage:s.backgroundImage,boxShadow:s.boxShadow,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight};};
 const elements=Object.fromEntries(Object.entries(selectors).map(([name,selector])=>[name,snap(document.querySelector(selector))]));
 const root=document.querySelector(domain==="polities"?"#atlasPolityMount .polity-browser-shell":"#atlasDashboardMount .dashboard-control-center");
 return {marker:getComputedStyle(document.documentElement).getPropertyValue("--atlas-vis2-11-archive-active").trim(),domain,width:innerWidth,docWidth:document.documentElement.scrollWidth,rootText:root?.textContent?.replace(/\s+/g," ").trim().slice(0,600)||"",rootScrollHeight:root?.scrollHeight||0,rootScrollWidth:root?.scrollWidth||0,rootRect:root?rect(root):null,
  polityCardCount:document.querySelectorAll("#atlasPolityMount .polity-browser-card").length,
  polityPersonCount:document.querySelectorAll("#atlasPolityMount .polity-dossier-person").length,
  dashboardKpiCount:document.querySelectorAll("#atlasDashboardMount .dashboard-kpi").length,
  dashboardPanelCount:document.querySelectorAll("#atlasDashboardMount .dashboard-panel").length,
  semantics:[...document.querySelectorAll("#atlasDashboardMount .dashboard-domain-swatch,#atlasDashboardMount .dashboard-source-dot")].slice(0,16).map(e=>getComputedStyle(e).backgroundColor),
  elements};
}
async function navigate(c,width){
 await c.call("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<760});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await c.call("Page.navigate",{url:"about:blank"});
 await until(c,"document.readyState==='complete'",12000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain && document.querySelector('.nav-list [data-atlas-domain=polities]') && document.querySelector('.nav-list [data-atlas-domain=dashboard]'))",45000);
}
async function activate(c,domain){
 assert(await evalJS(c,"(()=>{const nav=window.ATLAS_MAIN_AUTHORITY_NAV;if(!nav?.showDomain)return false;nav.showDomain("+JSON.stringify(domain)+");return nav.getDomain()==="+JSON.stringify(domain)+";})()"),"Authority domain activation failed",{domain});
 const ready=domain==="polities"?"#atlasPolityMount .polity-browser-card":"#atlasDashboardMount .dashboard-kpi";
 await until(c,"document.querySelectorAll("+JSON.stringify(ready)+").length>0",90000);
 const fileQuery="link[href*='"+CSS+"']";
 await until(c,"Boolean(document.querySelector("+JSON.stringify(fileQuery)+")?.sheet)",30000);
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-11-archive-active').trim()==='1'",12000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await sleep(400);
 if(domain==="polities"){
  assert(await evalJS(c,"(()=>{const row=document.querySelector('#atlasPolityMount .polity-browser-card');if(!row)return false;row.open=true;return row.open;})()"),"Missing live Polity dossier");
  await sleep(180);
 }
}
async function toggle(c,disabled){
 const selector='link[href*="'+CSS+'"]';
 const exp="(async()=>{const el=document.querySelector("+JSON.stringify(selector)+");if(!el)return false;el.disabled="+disabled+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
 assert(await evalJS(c,exp),"VIS2-11 stylesheet missing");
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-11-archive-active').trim()==='"+(disabled?"":"1")+"'",12000);
}
async function focus(c,domain,view){
 const selector=domain==="polities"?(view==="heading"?"#atlasPolityMount .polity-browser-summary":"#atlasPolityMount .polity-browser-card"):(view==="heading"?"#atlasDashboardMount .dashboard-hero":"#atlasDashboardMount .dashboard-panel-head");
 const code="(()=>{const el=document.querySelector("+JSON.stringify(selector)+");if(!el)return false;el.scrollIntoView({block:'start',behavior:'instant'});const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;})()";
 assert(await evalJS(c,code),"No visible target for screenshot",{domain,view});
 await sleep(180);
}
const comparable=["domain","width","docWidth","rootText","rootScrollHeight","rootScrollWidth","rootRect","polityCardCount","polityPersonCount","dashboardKpiCount","dashboardPanelCount","semantics"];
const sameRect=(a,b)=>a?.length===b?.length&&a.every((v,i)=>Math.abs(v-b[i])<.12);
async function caseAB(c,domain,width){
 await activate(c,domain);
 await toggle(c,true);await focus(c,domain,"heading");
 const before=await evalJS(c,"("+state.toString()+")("+JSON.stringify(domain)+")");
 if([390,1440].includes(width))for(const view of ["heading","detail"]){await focus(c,domain,view);await shot(c,"vis2-11-A-"+domain+"-"+width+"-"+view+".png");}
 await toggle(c,false);await focus(c,domain,"heading");
 const after=await evalJS(c,"("+state.toString()+")("+JSON.stringify(domain)+")");
 if([390,1440].includes(width))for(const view of ["heading","detail"]){await focus(c,domain,view);await shot(c,"vis2-11-B-"+domain+"-"+width+"-"+view+".png");}
 assert(before.marker===""&&after.marker==="1","VIS2-11 activation mismatch",{domain,width,before:before.marker,after:after.marker});
 for(const key of comparable)assert(JSON.stringify(before[key])===JSON.stringify(after[key]),"Historical/navigation geometry changed "+key,{domain,width,before:before[key],after:after[key]});
 assert(before.docWidth<=width+1&&after.docWidth<=width+1,"Page horizontal overflow",{domain,width,docWidth:after.docWidth});
 if(domain==="polities")assert(before.polityCardCount>0,"No live Polity records",{width});
 else assert(before.dashboardKpiCount>0&&before.dashboardPanelCount>0,"No dashboard live panels",{width});
 for(const [key,a] of Object.entries(before.elements)){
  const b=after.elements[key];assert(Boolean(a)===Boolean(b),"DOM presence changed "+key,{domain,width});if(!a)continue;
  for(const k of ["text","font","fontSize","lineHeight","display","scrollWidth","scrollHeight","color","backgroundColor"])
   assert(a[k]===b[k],"Content/semantics changed "+key+"."+k,{domain,width,a:a[k],b:b[k]});
  assert(sameRect(a.rect,b.rect),"Element layout shifted "+key,{domain,width,a:a.rect,b:b.rect});
 }
 const paintKeys=domain==="polities"?["hero","card","summary","dossier"]:["hero","kpi","panelHead","progress"];
 const changed=paintKeys.filter(key=>{const a=before.elements[key],b=after.elements[key];return a&&b&&(a.boxShadow!==b.boxShadow||a.backgroundImage!==b.backgroundImage||a.borderColor!==b.borderColor);});
 assert(changed.length>=2,"Archive paint not observable",{domain,width,paintKeys,changed});
 report.cases.push({domain,width,polityCardCount:after.polityCardCount,dashboardKpiCount:after.dashboardKpiCount,changedPaintElements:changed,status:"PASS"});
 console.log("ATLAS_VIS2_11_PRODUCTION_CASE_PASS",domain,width,changed.join(","));
}
async function main(){
 assert(/^[a-f0-9]{40}$/.test(SHA),"Missing exact Production SHA");
 let c;
 try{
  const tabs=await(await fetch(CDP_URL+"/json/list")).json();
  const tab=tabs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);assert(tab,"No Chrome CDP page");
  c=new CDP(tab.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const width of [390,768,1440,1600]){
   await navigate(c,width);
   await caseAB(c,"polities",width);
   await caseAB(c,"dashboard",width);
  }
  report.status="PASS";console.log("ATLAS_VIS2_11_PRODUCTION_POLITY_DASHBOARD_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length);
 }catch(e){report.status="FAIL";report.error=e.message;report.context=e.context||null;process.exitCode=1;console.error("ATLAS_VIS2_11_PRODUCTION_FAIL",e);}
 finally{fs.writeFileSync(path.join(OUT,"vis2-11-production-polity-dashboard.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
