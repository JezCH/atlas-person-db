import fs from "node:fs";
import path from "node:path";
const CDP_URL=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-07-production-register/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function insist(x,m,d){if(!x){const e=new Error(m);e.details=d||null;throw e;}}
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.pending=new Map();this.n=0;}
  async ready(){await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});this.ws.addEventListener("message",e=>{const x=JSON.parse(String(e.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(new Error(x.error.message)):p.resolve(x.result||{});});}
  call(method,params={}){const id=++this.n;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function ev(c,expr){const r=await c.call("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expr,timeout=60000){const start=Date.now();while(Date.now()-start<timeout){try{if(await ev(c,expr))return;}catch{}await sleep(230);}throw Error("Timeout "+expr);}
async function toggle(c,disabled){
 const expr="(async()=>{const s=document.querySelector('link[href*=\"atlas-person-register-inscription-v2.css\"]');if(!s)return false;s.disabled="+disabled+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
 insist(await ev(c,expr),"VIS2-07 stylesheet not found");
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-07-register-active').trim()==='"+(disabled?"":"1")+"'",25000);
}
async function screenshot(c,name){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});insist(r.data,"Missing screenshot "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);}
function snapshot(){
 const q=s=>document.querySelector(s),nodes=s=>[...document.querySelectorAll(s)];
 const rect=e=>{const r=e?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100):null;};
 const m=e=>{if(!e)return null;const cs=getComputedStyle(e);return {rect:rect(e),text:e.textContent?.trim().slice(0,200),scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,color:cs.color,paint:cs.backgroundImage,rule:cs.borderBottomColor,columns:cs.gridTemplateColumns,visibility:cs.visibility,display:cs.display};};
 const rows=nodes(".person-monumental-register .person-register-entry");
 const capped=rows.slice(0,80);
 const head=q(".person-monumental-register > .person-table-head");
 const sample=Object.fromEntries(Object.entries({
  header:".person-monumental-register > .person-table-head",headerCell:".person-monumental-register > .person-table-head .person-table-head-cell:not(.is-sort-active)",
  headerTitle:".person-monumental-register > .person-table-head .person-table-head-title",eraRange:".person-monumental-register .person-era-band-range",
  canonical:".person-monumental-register .person-table-identity > .person-card-canonical",status:".person-monumental-register .person-table-status-inline",
  role:".person-monumental-register .person-table-activities .person-card-activity-role",
  period:".person-monumental-register .person-table-activities .person-card-activity-period",
  small:".person-monumental-register .person-table-activities .person-card-activity > small",
  activity:".person-monumental-register .person-table-activities .person-card-activity",
  personName:".person-monumental-register .person-table-identity > strong",
  year:".person-monumental-register .person-register-range",
  domainRail:".person-monumental-register .person-register-entry",
  eraBand:".person-monumental-register .person-era-band"
 }).map(([key,selector])=>[key,m(q(selector))]));
 const fields=capped.map(e=>({row:m(e),name:m(e.querySelector(".person-table-identity > strong")),year:m(e.querySelector(".person-register-range")),activityCount:e.querySelectorAll(".person-card-activity").length,firstActivity:m(e.querySelector(".person-card-activity")),domain:e.dataset.representativeDomain||null,selected:e.classList.contains("is-selected")}));
 return {width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,windowY:window.scrollY,
  marker:getComputedStyle(document.documentElement).getPropertyValue("--atlas-vis2-07-register-active").trim(),
  rows:rows.length,groupCount:nodes(".person-monumental-register .person-era-group").length,
  fieldCount:head?.querySelectorAll(":scope > .person-table-head-cell").length||0,
  sort:q(".person-monumental-register")?.dataset.personSortOrder||"",
  names:rows.slice(0,8).map(e=>e.querySelector(".person-table-identity > strong")?.textContent.trim()),
  fields,sample,headerText:head?.textContent.trim().slice(0,300)};
}
function sameBox(a,b){return a&&b&&a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<=.05);}
async function compare(c,width,mode){
 await until(c,"Boolean(document.querySelector('link[href*=\"atlas-person-register-inscription-v2.css\"]')?.sheet)",20000);
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-07-register-active').trim()==='1'",20000);
 await toggle(c,true);
 const before=await ev(c,"("+snapshot.toString()+")()");
 const capture=width===390&&mode==="default"||width===1440&&["default","filtered","sorted","long-name"].includes(mode);
 const suffix=width+"-"+mode;
 if(capture)await screenshot(c,"vis2-07-off-"+suffix+".png");
 await toggle(c,false);
 const after=await ev(c,"("+snapshot.toString()+")()");
 if(capture)await screenshot(c,"vis2-07-on-"+suffix+".png");
 insist(before.marker===""&&after.marker==="1","CSS opt-in failed",{width,mode});
 for(const key of ["width","height","docWidth","windowY","rows","groupCount","fieldCount","sort","headerText"])
  insist(before[key]===after[key],"Register structure drift "+key,{width,mode,a:before[key],b:after[key]});
 insist(before.rows>0&&before.docWidth<=width+1,"Page overflow or empty Person rows",{width,mode,rows:before.rows,docWidth:before.docWidth});
 insist(JSON.stringify(before.names)===JSON.stringify(after.names),"Sort/filter results changed",{width,mode});
 insist(before.fields.length===after.fields.length&&before.fields.length>0,"Register rows missing",{width,mode});
 const compareNode=(a,b,key,i)=>{
  insist(Boolean(a)===Boolean(b),"Node presence changed "+key,{width,mode,i});
  if(!a)return;
  for(const prop of ["rect","text","scrollWidth","scrollHeight","columns","visibility","display"]){
   if(prop==="rect")insist(sameBox(a.rect,b.rect),"Node rectangle drift",{width,mode,key,i,a,b});
   else insist(a[prop]===b[prop],"Node content or metric drift "+prop,{width,mode,key,i,a,b});
  }
 };
 for(let i=0;i<before.fields.length;i++){
  const a=before.fields[i],b=after.fields[i];
  insist(a.activityCount===b.activityCount&&a.domain===b.domain&&a.selected===b.selected,"Activity/domain selection changed",{width,mode,i});
  for(const k of ["row","name","year","firstActivity"])compareNode(a[k],b[k],k,i);
  for(const k of ["name","year"])insist(a[k]?.color===b[k]?.color,"Domain name or chronology primary ink recolored",{width,mode,i,k});
 }
 for(const k of Object.keys(before.sample))compareNode(before.sample[k],after.sample[k],k);
 for(const k of ["header","headerCell","headerTitle","eraRange","canonical","status","role","period","small","activity"]){
  const a=before.sample[k],b=after.sample[k];if(!a||!b)continue;
  insist(a.color!==b.color||a.paint!==b.paint||a.rule!==b.rule,"No intended register inscription change: "+k,{width,mode,k,a,b});
 }
 insist(before.sample.domainRail?.paint===after.sample.domainRail?.paint&&before.sample.domainRail?.color===after.sample.domainRail?.color,"Domain rail owner changed",{width,mode});
 report.cases.push({width,mode,status:"PASS",rows:after.rows,headCells:after.fieldCount,eraGroups:after.groupCount,rowsChecked:after.fields.length,sort:after.sort,firstName:after.names[0],paint:{header:after.sample.header?.paint,role:after.sample.role?.color,period:after.sample.period?.color}});
 console.log("ATLAS_VIS2_07_REGISTER_GEOMETRY_PASS "+width+" mode="+mode+" rows="+after.rows+" sampled="+after.fields.length);
}
async function route(c,w){
 await c.call("Emulation.setDeviceMetricsOverride",{width:w,height:w===390?844:1000,deviceScaleFactor:1,mobile:w<=760});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await c.call("Page.navigate",{url:"about:blank"});await until(c,"document.readyState==='complete'",10000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"document.querySelectorAll('.person-register-entry').length>0",90000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await until(c,"Boolean(document.querySelector('.person-monumental-register > .person-table-head'))",25000);
 await sleep(380);
}
async function filtered(c){
 const result=await ev(c,"(()=>{const e=[...document.querySelectorAll('.person-register-entry')].find(x=>x.dataset.representativeDomain);const code=e?.dataset.representativeDomain;if(!code||!window.ATLAS_PERSON_MAIN?.setDomainFilter)return null;window.ATLAS_PERSON_MAIN.setDomainFilter(code);return code;})()");
 insist(result,"Could not apply real Person domain filter");
 await until(c,"document.querySelectorAll('.person-register-entry').length>0",20000);await sleep(320);return result;
}
async function sorted(c){
 insist(await ev(c,"(()=>{if(!window.ATLAS_PERSON_HEADER_SORTING?.setSortOrder)return false;window.ATLAS_PERSON_HEADER_SORTING.setSortOrder('person-asc');return true;})()"),"Person name sorting unavailable");
 await until(c,"document.querySelector('.person-monumental-register')?.dataset.personSortOrder==='person-asc'",15000);await sleep(330);
}
async function longName(c){
 const d=await ev(c,"(()=>{const rows=[...document.querySelectorAll('.person-register-entry')];const scored=rows.slice(0,400).map(e=>({e,text:e.querySelector('.person-table-identity > strong')?.textContent?.trim()||''})).filter(x=>x.text.length>=9).sort((a,b)=>b.text.length-a.text.length);const x=scored[0];if(!x)return null;x.e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});return x.text;})()");
 insist(d,"No long Person name found in actual register");await sleep(320);return d;
}
async function main(){
 insist(/^[a-f0-9]{40}$/.test(SHA),"Exact Production SHA required");
 let c;
 try{
  const tabs=await(await fetch(CDP_URL+"/json/list")).json(),tab=tabs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
  insist(tab,"Chrome CDP tab missing");c=new CDP(tab.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const w of [390,768,1440,1600]){
   await route(c,w);await compare(c,w,"default");
   if(w===768||w===1440){
    await filtered(c);await compare(c,w,"filtered");
    await ev(c,"(()=>{window.ATLAS_PERSON_MAIN?.setDomainFilter?.('');return true;})()");
    await until(c,"document.querySelectorAll('.person-register-entry').length>80",30000);
    await sleep(240);
   }
   if(w===1440){
    await sorted(c);await compare(c,w,"sorted");
    await ev(c,"(()=>{window.ATLAS_PERSON_HEADER_SORTING?.setSortOrder?.('start-asc');return true;})()");
    await sleep(260);
    await longName(c);await compare(c,w,"long-name");
   }
  }
  report.status="PASS";console.log("ATLAS_VIS2_07_PRODUCTION_REGISTER_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length);
 }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_07_PRODUCTION_REGISTER_FAIL",e);}
 finally{fs.writeFileSync(path.join(OUT,"vis2-07-production-register.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
