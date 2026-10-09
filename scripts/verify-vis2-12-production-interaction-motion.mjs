import fs from "node:fs";
import path from "node:path";

const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const CDP_URL=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const SHEET="atlas-vis2-12-interaction-motion.css";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-12-interaction-reduced-motion/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(ok,message,details=null){if(!ok){const e=new Error(message);e.details=details;throw e;}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.seq=0;this.waiting=new Map();}
 async ready(){await new Promise((ok,no)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",no,{once:true});});this.ws.addEventListener("message",event=>{const p=JSON.parse(String(event.data)),w=this.waiting.get(p.id);if(!w)return;this.waiting.delete(p.id);p.error?w.reject(new Error(p.error.message)):w.resolve(p.result||{});});}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.seq;this.waiting.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close();}catch{}}
}
async function evalJS(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expression,timeout=75000){const st=Date.now();while(Date.now()-st<timeout){try{if(await evalJS(c,expression))return;}catch{}await pause(250);}throw Error("Timeout: "+expression);}
async function image(c,name){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});check(r.data,"Screenshot data missing",{name});fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);}
function snapshot(domain){
 const samples={
  persons:[".person-register-entry",".person-era-polity-filter",".person-era-relation-filter",".person-era-jump"],
  polities:["#atlasPolityMount .polity-browser-card > summary","#atlasPolityMount .polity-browser-filters button","#atlasPolityMount .polity-browser-controls input","#atlasPolityReviewMount .polity-review-filter"],
  dashboard:["#atlasDashboardMount .dashboard-kpi-action","#atlasDashboardMount .dashboard-polity-row","#atlasDashboardMount #atlasDashboardRefresh","#atlasDashboardMount .dashboard-panel-head"],
  spacetime:["#personSpacetimeMount .spacetime-region-head-layer","#personSpacetimeMount .spacetime-era-axis","#personSpacetimeMount .spacetime-camera button","#personSpacetimeMount .spacetime-controls input"]
 };
 const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100);};
 const values=Object.fromEntries(samples[domain].map(s=>{const e=document.querySelector(s);if(!e)return [s,null];const st=getComputedStyle(e);return [s,{rect:rect(e),text:e.textContent?.trim().slice(0,110)||"",font:st.fontFamily,fontSize:st.fontSize,color:st.color,backgroundColor:st.backgroundColor,borderColor:st.borderColor,display:st.display,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,transitionDuration:st.transitionDuration,animationDuration:st.animationDuration,animationName:st.animationName}];}));
 const root=document.querySelector(domain==="persons"?"#personMainView":domain==="polities"?"#atlasPolityMount":domain==="dashboard"?"#atlasDashboardMount":"#personSpacetimeMount");
 return {width:innerWidth,docWidth:document.documentElement.scrollWidth,domain,marker:getComputedStyle(document.documentElement).getPropertyValue("--atlas-vis2-12-interaction-active").trim(),mediaReduced:matchMedia("(prefers-reduced-motion: reduce)").matches,
  rootText:root?.textContent?.replace(/\s+/g," ").trim().slice(0,520)||"",rootRect:root?rect(root):null,rootScrollWidth:root?.scrollWidth||0,
  personRows:document.querySelectorAll(".person-register-entry").length,
  polityRows:document.querySelectorAll("#atlasPolityMount .polity-browser-card").length,
  dashboardKpis:document.querySelectorAll("#atlasDashboardMount .dashboard-kpi").length,
  spacetimeTracks:document.querySelectorAll("#personSpacetimeMount .spacetime-track-label").length,
  samples:values};
}
async function emu(c,width,reduced){
 await c.call("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<=760});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:reduced?"reduce":"no-preference"}]});
}
async function toggle(c,disabled){
 const selector='link[href*="'+SHEET+'"]';
 const expression="(async()=>{const el=document.querySelector("+JSON.stringify(selector)+");if(!el)return false;el.disabled="+disabled+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
 check(await evalJS(c,expression),"VIS2-12 stylesheet not loaded");
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-12-interaction-active').trim()==='"+(disabled?"":"1")+"'",12000);
}
async function navigate(c,width,domain){
 await emu(c,width,true);
 await c.call("Page.navigate",{url:"about:blank"});
 await until(c,"document.readyState==='complete'",10000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain && document.querySelector('link[href*="+SHEET+"]')?.sheet)",40000);
 check(await evalJS(c,"(()=>{const nav=window.ATLAS_MAIN_AUTHORITY_NAV;nav.showDomain("+JSON.stringify(domain)+");return nav.getDomain()==="+JSON.stringify(domain)+";})()"),"Cannot activate domain",{domain,width});
 const ready={persons:".person-register-entry",polities:"#atlasPolityMount .polity-browser-card",dashboard:"#atlasDashboardMount .dashboard-kpi",spacetime:"#personSpacetimeMount .spacetime-frame"}[domain];
 await until(c,"document.querySelectorAll("+JSON.stringify(ready)+").length>0",90000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await pause(350);
}
function invariant(a,b,domain,width){
 for(const key of ["width","docWidth","domain","mediaReduced","rootText","rootRect","rootScrollWidth","personRows","polityRows","dashboardKpis","spacetimeTracks"])
  check(JSON.stringify(a[key])===JSON.stringify(b[key]),"Unexpected UI content/geometry change "+key,{domain,width,before:a[key],after:b[key]});
 check(a.docWidth<=width+1&&b.docWidth<=width+1,"New horizontal overflow",{domain,width,a:a.docWidth,b:b.docWidth});
 let found=0;
 for(const [name,from] of Object.entries(a.samples)){
  const to=b.samples[name];check(Boolean(from)===Boolean(to),"Sample presence shifted",{domain,width,name});
  if(!from)continue;found++;
  for(const prop of ["rect","text","font","fontSize","color","backgroundColor","borderColor","display","scrollWidth","scrollHeight"])
   check(JSON.stringify(from[prop])===JSON.stringify(to[prop]),"Visual semantic/geometry drift "+name+"."+prop,{domain,width,before:from[prop],after:to[prop]});
 }
 check(found>=1,"No existing domain samples",{domain,width});
 return found;
}
function zeroDuration(value){return value.split(",").every(x=>Math.abs(parseFloat(x.trim())||0)<0.00001);}
async function run(c,width,domain){
 await navigate(c,width,domain);
 await toggle(c,true);
 const before=await evalJS(c,"("+snapshot.toString()+")("+JSON.stringify(domain)+")");
 if([390,1440].includes(width))await image(c,"vis2-12-A-reduced-off-"+width+"-"+domain+".png");
 await toggle(c,false);
 const after=await evalJS(c,"("+snapshot.toString()+")("+JSON.stringify(domain)+")");
 if([390,1440].includes(width))await image(c,"vis2-12-B-reduced-on-"+width+"-"+domain+".png");
 check(before.marker===""&&after.marker==="1","CSS activation mismatch",{width,domain});
 check(before.mediaReduced&&after.mediaReduced,"Reduced motion simulation missing",{width,domain});
 const sampled=invariant(before,after,domain,width);
 let inspected=0;
 for(const [name,element] of Object.entries(after.samples))if(element){inspected++;check(zeroDuration(element.transitionDuration),"Reduced motion transition persists",{width,domain,name,duration:element.transitionDuration});check(element.animationName==="none"||zeroDuration(element.animationDuration),"Reduced motion animation persists",{width,domain,name,animation:element.animationName,duration:element.animationDuration});}
 // With user preference off, the new finishing sheet must NOT override existing
 // component motion. Compare exactly the same live DOM after a toggle.
 await emu(c,width,false);
 const normalOn=await evalJS(c,"("+snapshot.toString()+")("+JSON.stringify(domain)+")");
 await toggle(c,true);
 const normalOff=await evalJS(c,"("+snapshot.toString()+")("+JSON.stringify(domain)+")");
 check(normalOn.mediaReduced===false&&normalOff.mediaReduced===false,"Normal motion preference incorrect",{width,domain});
 invariant(normalOn,normalOff,domain,width);
 for(const [name,v] of Object.entries(normalOn.samples)){const other=normalOff.samples[name];if(v&&other)for(const prop of ["transitionDuration","animationName","animationDuration"])check(v[prop]===other[prop],"Normal motion changed "+name+"."+prop,{width,domain,from:v[prop],to:other[prop]});}
 report.cases.push({width,domain,sampled,inspected,status:"PASS"});
 console.log("ATLAS_VIS2_12_PRODUCTION_CASE_PASS",width,domain,"samples="+sampled);
}
async function main(){
 check(/^[a-f0-9]{40}$/.test(SHA),"Exact Production SHA missing");
 let c;
 try{
  const tabs=await(await fetch(CDP_URL+"/json/list")).json();
  const page=tabs.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);check(page,"No Chrome tab");
  c=new CDP(page.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const width of [390,1440])for(const domain of ["persons","polities","dashboard","spacetime"])await run(c,width,domain);
  report.status="PASS";console.log("ATLAS_VIS2_12_PRODUCTION_INTERACTION_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length);
 }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;console.error("ATLAS_VIS2_12_PRODUCTION_FAIL",e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUT,"vis2-12-production-interaction-motion.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
