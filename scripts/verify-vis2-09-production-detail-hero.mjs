import fs from "node:fs";
import path from "node:path";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const CDP_URL=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-09-production-detail-hero/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[],portraitLookup:{checked:0,result:"NOT_RUN"}};
const sleep=n=>new Promise(r=>setTimeout(r,n));
function check(condition,message,details){if(!condition){const e=new Error(message);e.details=details||null;throw e;}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.n=0;this.waiting=new Map();}
 async ready(){await new Promise((ok,no)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",no,{once:true});});this.ws.addEventListener("message",e=>{const x=JSON.parse(String(e.data)),w=this.waiting.get(x.id);if(!w)return;this.waiting.delete(x.id);x.error?w.reject(new Error(x.error.message)):w.resolve(x.result||{});});}
 call(method,params={}){const id=++this.n;return new Promise((resolve,reject)=>{this.waiting.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close();}catch{}}
}
async function evaluate(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expr,limit=60000){const t=Date.now();while(Date.now()-t<limit){try{if(await evaluate(c,expr))return;}catch{}await sleep(230);}throw Error("Timeout: "+expr);}
async function screenshot(c,name){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});check(r.data,"Missing screenshot "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);}
function state(){
 const selectors={panel:"#personMainDetail",hero:"#personMainDetail .person-chronicle-hero",portrait:"#personMainDetail .person-detail-portrait",identity:"#personMainDetail .person-chronicle-identity",eyebrow:"#personMainDetail .person-chronicle-identity .eyebrow",title:"#personMainDetail .person-chronicle-identity h2",canonical:"#personMainDetail .person-detail-canonical",era:"#personMainDetail .person-detail-era",domain:"#personMainDetail .person-detail-domain",status:"#personMainDetail .person-detail-status",section:"#personMainDetail .person-chronicle-section",activity:"#personMainDetail .person-chronicle-activity",source:"#personMainDetail .person-source-item"};
 const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100);};
 const snap=e=>{if(!e)return null;const s=getComputedStyle(e);return {rect:rect(e),text:e.textContent?.trim().slice(0,500),scrollHeight:e.scrollHeight,scrollWidth:e.scrollWidth,color:s.color,backgroundImage:s.backgroundImage,boxShadow:s.boxShadow,display:s.display,font:s.fontFamily};};
 const result=Object.fromEntries(Object.entries(selectors).map(([name,selector])=>[name,snap(document.querySelector(selector))]));
 const panel=document.querySelector("#personMainDetail"),portrait=document.querySelector("#personMainDetail .person-detail-portrait");
 const img=document.querySelector("#personMainDetail [data-person-portrait-image]");
 return {marker:getComputedStyle(document.documentElement).getPropertyValue("--atlas-vis2-09-hero-active").trim(),width:innerWidth,docWidth:document.documentElement.scrollWidth,
  panelHidden:Boolean(panel?.hidden),panelScrollTop:panel?.scrollTop||0,domain:panel?.dataset.representativeDomain||"",
  genuinePortrait:Boolean(portrait?.classList.contains("has-portrait")),imageSource:img?.getAttribute("src")||null,imageAlt:img?.getAttribute("alt")||null,
  activityCount:document.querySelectorAll("#personMainDetail .person-chronicle-activity").length,sourceCount:document.querySelectorAll("#personMainDetail .person-source-item").length,
  mainRowCount:document.querySelectorAll(".person-register-entry").length,mainPortraitCount:document.querySelectorAll("#personMainView .person-main-groups .person-detail-portrait").length,
  elements:result};
}
const sameRect=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=.05);
async function toggle(c,disabled){
 const exp="(async()=>{const l=document.querySelector('link[href*=\"atlas-person-detail-hero-frame-v2.css\"]');if(!l)return false;l.disabled="+disabled+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
 check(await evaluate(c,exp),"VIS2-09 stylesheet unavailable");
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-09-hero-active').trim()==='"+(disabled?"":"1")+"'",10000);
}
async function start(c,width){
 await c.call("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<=760});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await c.call("Page.navigate",{url:"about:blank"});await until(c,"document.readyState==='complete'",10000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"document.querySelectorAll('.person-register-entry').length>0",90000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await until(c,"Boolean(document.querySelector('link[href*=\"atlas-person-detail-hero-frame-v2.css\"]')?.sheet)",30000);
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-09-hero-active').trim()==='1'",10000);
 await sleep(260);
}
async function openPerson(c,kind,id){
 const result=await evaluate(c,"(()=>{const rows=[...document.querySelectorAll('.person-register-entry')];let row=null;const kind="+JSON.stringify(kind)+",id="+JSON.stringify(id||"")+";if(id)row=rows.find(r=>r.dataset.personId===id);else if(kind==='multi')row=rows.find(r=>r.classList.contains('has-multiple-activities'));else row=rows[0];if(!row)return null;const name=row.querySelector('.person-table-identity > strong')?.textContent?.trim()||'';row.click();return {id:row.dataset.personId||null,name,multi:row.classList.contains('has-multiple-activities')};})()");
 check(result?.id&&result.name,"Actual source Person row missing",{kind,result});
 await until(c,"Boolean(document.querySelector('#personMainDetail:not([hidden]) .person-chronicle-hero .person-detail-portrait'))",45000);
 await until(c,"document.querySelector('#personMainDetail .person-chronicle-identity h2')?.textContent?.trim()==="+JSON.stringify(result.name),20000);
 await sleep(480);
 return result;
}
async function caseAB(c,width,kind,id){
 const person=await openPerson(c,kind,id);
 await toggle(c,true);
 const before=await evaluate(c,"("+state.toString()+")()");
 const name=width+"-"+kind;
 const capture=[390,1440].includes(width);
 if(capture)await screenshot(c,"vis2-09-A-default-"+name+".png");
 await toggle(c,false);
 const after=await evaluate(c,"("+state.toString()+")()");
 if(capture)await screenshot(c,"vis2-09-B-refined-"+name+".png");
 check(before.marker===""&&after.marker==="1","VIS2-09 activation failed",{width,kind});
 for(const k of ["width","docWidth","panelHidden","panelScrollTop","domain","genuinePortrait","imageSource","imageAlt","activityCount","sourceCount","mainRowCount","mainPortraitCount"])
  check(JSON.stringify(before[k])===JSON.stringify(after[k]),"Historical/detail state changed "+k,{width,kind,before:before[k],after:after[k]});
 check(before.docWidth<=width+1&&after.docWidth<=width+1,"Page overflow",{width,kind,docWidth:after.docWidth});
 check(!before.panelHidden&&before.elements.title?.text===person.name,"Wrong Person displayed",{width,kind,person,actual:before.elements.title?.text});
 check(before.mainPortraitCount===0,"No portraits on Person main register",{width,kind});
 if(kind==="multi")check(before.activityCount>=2,"Multiple-Activity Person scenario not verified",{width,person,activityCount:before.activityCount});
 if(kind==="portrait")check(before.genuinePortrait&&before.imageSource,"Genuine portrait required",{width,person});
 if(kind!=="portrait")report.portraitLookup.firstVisibleClass??=(before.genuinePortrait?"has-portrait":"no-portrait");
 for(const [k,a] of Object.entries(before.elements)){const b=after.elements[k];check(Boolean(a)===Boolean(b),"Detail DOM element presence changed "+k,{width,kind});if(!a)continue;
  check(sameRect(a.rect,b.rect)&&a.text===b.text&&a.scrollHeight===b.scrollHeight&&a.scrollWidth===b.scrollWidth&&a.display===b.display&&a.font===b.font,
   "Detail typography, content or layout changed "+k,{width,kind,a,b});}
 for(const k of ["hero","portrait","eyebrow"]){const a=before.elements[k],b=after.elements[k];check(a&&b,"Required actual Detail node missing "+k,{width,kind});check(a.color!==b.color||a.backgroundImage!==b.backgroundImage||a.boxShadow!==b.boxShadow,"VIS2-09 paint not active "+k,{width,kind});}
 for(const k of ["canonical","status"]){const a=before.elements[k],b=after.elements[k];if(a&&b)check(a.color!==b.color,"VIS2-09 marginal inscription not painted "+k,{width,kind});}
 for(const k of ["title","era","domain"]){const a=before.elements[k],b=after.elements[k];if(a&&b)check(a.color===b.color,"Person title/date/domain semantic foreground changed "+k,{width,kind});}
 report.cases.push({width,kind,person_id:person.id,person_name:person.name,activityCount:after.activityCount,sourceCount:after.sourceCount,portrait:after.genuinePortrait?"GENUINE_PRESENT":"GENUINE_ABSENT",status:"PASS"});
 console.log("ATLAS_VIS2_09_HERO_GEOMETRY_PASS "+width+" "+kind+" portrait="+after.genuinePortrait+" activities="+after.activityCount);
}
async function findStoredPortrait(c){
 const found=await evaluate(c,"(async()=>{const reader=window.ATLAS_PERSON_BROWSER_READER;if(!reader?.readPortrait)return {checked:0,result:'READER_MISSING'};const rows=[...document.querySelectorAll('.person-register-entry')].slice(0,32);let checked=0;for(let start=0;start<rows.length;start+=4){const batch=rows.slice(start,start+4);const values=await Promise.all(batch.map(async row=>{try{const item=await reader.readPortrait(row.dataset.personId);return item?.portrait?.asset_url?row.dataset.personId:null;}catch{return null;}}));checked+=batch.length;const hit=values.find(Boolean);if(hit)return {checked,result:'FOUND',id:hit};}return {checked,result:'NO_STORED_PORTRAIT_IN_SAMPLE'};})()");
 report.portraitLookup=found||{checked:0,result:"LOOKUP_FAILED"};return found?.result==="FOUND"?found.id:null;
}
async function main(){
 check(/^[a-f0-9]{40}$/.test(SHA),"Exact Production SHA missing");
 let c;
 try{
  const tabs=await(await fetch(CDP_URL+"/json/list")).json(),tab=tabs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
  check(tab,"No Chrome tab available");c=new CDP(tab.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const w of [390,768,1440,1600]){
    await start(c,w);
    await caseAB(c,w,"default");
    if([390,1440].includes(w))await caseAB(c,w,"multi");
    if(w===1440){const id=await findStoredPortrait(c);if(id)await caseAB(c,w,"portrait",id);}
  }
  report.status="PASS";console.log("ATLAS_VIS2_09_PRODUCTION_HERO_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length+" portrait_sample="+report.portraitLookup.result);
 }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;console.error("ATLAS_VIS2_09_PRODUCTION_HERO_FAIL",e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUT,"vis2-09-production-detail-hero.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
