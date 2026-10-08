import fs from "node:fs";
import path from "node:path";

const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-08-production-register-interaction/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function need(ok,message,details){if(!ok){const e=new Error(message);e.details=details||null;throw e;}}
class Chrome{
 constructor(url){this.ws=new WebSocket(url);this.pending=new Map();this.id=0;}
 async ready(){await new Promise((ok,bad)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",bad,{once:true});});this.ws.addEventListener("message",e=>{const x=JSON.parse(String(e.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(new Error(x.error.message)):p.resolve(x.result||{});});}
 call(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close();}catch{}}
}
async function ev(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expr,limit=60000){const t=Date.now();while(Date.now()-t<limit){try{if(await ev(c,expr))return;}catch{}await sleep(240);}throw Error("Timeout "+expr);}
async function toggle(c,off){
 const expr="(async()=>{const el=document.querySelector('link[href*=\"atlas-person-register-selection-focus-v2.css\"]');if(!el)return false;el.disabled="+off+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
 need(await ev(c,expr),"VIS2-08 CSS link absent");
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-08-register-interaction-active').trim()==='"+(off?"":"1")+"'",22000);
}
async function shot(c,name){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});need(r.data,"Screenshot empty "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);}
function snap(){
 const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100);};
 const list=[...document.querySelectorAll(".person-monumental-register .person-register-entry")];
 const row=list.find(e=>e.dataset.personId===document.documentElement.dataset.vis208Person);
 const name=row?.querySelector(".person-table-identity > strong"),link=row?.querySelector(".person-main-name-link");
 const cs=e=>e?getComputedStyle(e):null;
 const style=cs(row),nameStyle=cs(name),linkStyle=cs(link);
 const selected=row?getComputedStyle(row,"::after"):null;
 const domain=row?getComputedStyle(row,"::before"):null;
 const arr=list.slice(0,80).map(e=>({id:e.dataset.personId,domain:e.dataset.representativeDomain||"",text:e.querySelector(".person-table-identity > strong")?.textContent?.trim(),date:e.querySelector(".person-register-range")?.textContent?.trim(),selected:e.classList.contains("is-selected"),
   rect:rect(e),scrollHeight:e.scrollHeight,scrollWidth:e.scrollWidth,ink:cs(e.querySelector(".person-table-identity > strong"))?.color,
   linkInk:cs(e.querySelector(".person-main-name-link"))?.color,
   domainColor:getComputedStyle(e,"::before").backgroundColor,
   activities:e.querySelectorAll(".person-card-activity").length}));
 return {width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,windowScroll:window.scrollY,
   marker:getComputedStyle(document.documentElement).getPropertyValue("--atlas-vis2-08-register-interaction-active").trim(),
   rows:list.length,groupCount:document.querySelectorAll(".person-monumental-register .person-era-group").length,
   sort:document.querySelector(".person-monumental-register")?.dataset.personSortOrder||"",
   focusType:document.activeElement===row?"row":document.activeElement===link?"link":"other",
   rowFocusVisible:Boolean(row?.matches(":focus-visible")),linkFocusVisible:Boolean(link?.matches(":focus-visible")),
   rowSelected:Boolean(row?.classList.contains("is-selected")),selectedCount:list.filter(x=>x.classList.contains("is-selected")).length,
   row:{rect:rect(row),text:row?.textContent?.trim().slice(0,300),scrollHeight:row?.scrollHeight,scrollWidth:row?.scrollWidth,background:style?.backgroundImage,backgroundColor:style?.backgroundColor,shadow:style?.boxShadow,outline:style?.outline,outlineColor:style?.outlineColor,outlineWidth:style?.outlineWidth},
   name:{rect:rect(name),ink:nameStyle?.color,scrollHeight:name?.scrollHeight},
   link:{rect:rect(link),ink:linkStyle?.color,outline:linkStyle?.outline,outlineStyle:linkStyle?.outlineStyle,outlineColor:linkStyle?.outlineColor},
   selectedRule:{opacity:selected?.opacity,background:selected?.backgroundColor,shadow:selected?.boxShadow,transform:selected?.transform},
   semanticRule:{background:domain?.backgroundColor,width:domain?.width,height:domain?.height,opacity:domain?.opacity},sample:arr};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function prepare(c,mode){
 const target=await ev(c,"(()=>{const row=[...document.querySelectorAll('.person-register-entry[data-representative-domain]')].find(e=>e.querySelector('.person-main-name-link'));if(!row)return null;document.documentElement.dataset.vis208Person=row.dataset.personId||'';row.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});document.activeElement?.blur?.();for(const e of document.querySelectorAll('.person-register-entry.is-selected'))e.classList.remove('is-selected');row.classList.toggle('is-selected',"+JSON.stringify(["selected","selected-focus"].includes(mode))+");return {id:row.dataset.personId,domain:row.dataset.representativeDomain,linked:!!row.querySelector('.person-main-name-link')};})()");
 need(target?.id&&target?.domain&&target.linked,"Missing real domain-colored row + reference link for "+mode,{target});await sleep(120);
 if(mode==="focus-row"||mode==="focus-link"||mode==="selected-focus"){
   await c.call("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
   await c.call("Input.dispatchKeyEvent",{type:"keyUp",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
   const expr="(()=>{const row=[...document.querySelectorAll('.person-register-entry')].find(e=>e.dataset.personId===document.documentElement.dataset.vis208Person);const t="+JSON.stringify(mode==="focus-link")+"?row.querySelector('.person-main-name-link'):row;t?.focus({preventScroll:true});return {type:document.activeElement===t,keyboard:t?.matches(':focus-visible')};})()";
   const focused=await ev(c,expr);need(focused?.type&&focused?.keyboard,"Keyboard focus heuristic not real",{mode,focused});
 }
 await sleep(120);return target;
}
function verify(a,b,width,mode){
 need(a.marker===""&&b.marker==="1","Opt-in marker failed",{width,mode});
 for(const key of ["width","height","docWidth","windowScroll","rows","groupCount","sort","focusType","rowFocusVisible","linkFocusVisible","rowSelected","selectedCount"]){
  need(a[key]===b[key],"DOM/interaction state drift "+key,{width,mode,before:a[key],after:b[key]});
 }
 need(a.rows>0&&a.docWidth<=width+1,"Unexpected width overflow or empty register",{width,mode,a:a.docWidth,rows:a.rows});
 need(same(a.sample,b.sample),"First eighty Person row domain inks, text, metrics or Activity count moved",{width,mode});
 for(const key of ["rect","text","scrollWidth","scrollHeight","background","backgroundColor"]){
  need(same(a.row[key],b.row[key]),"Selected Person row underlying geometry/content/domain wash changed "+key,{width,mode,a:a.row[key],b:b.row[key]});
 }
 for(const key of ["rect","ink","scrollHeight"])need(same(a.name[key],b.name[key]),"Historical Person ink/geometry changed "+key,{width,mode});
 for(const key of ["rect","ink"])need(same(a.link[key],b.link[key]),"Domain-colored reference link geometry/ink changed "+key,{width,mode});
 need(same(a.semanticRule,b.semanticRule),"Existing eight-domain semantic rail restyled",{width,mode});
 for(const key of ["opacity","background","transform"])need(a.selectedRule[key]===b.selectedRule[key],"Existing neutral selected rail geometry/presence altered",{width,mode,key});
 if(mode==="selected"||mode==="selected-focus"){
  need(a.rowSelected&&b.rowSelected&&a.selectedRule.opacity==="1","Selected state/neutral rail missing",{width,mode});
  need(a.selectedRule.shadow!==b.selectedRule.shadow,"Selected one-pixel rail finish not refined",{width,mode});
 }
 if(mode==="selected"||mode==="focus-row"||mode==="focus-link"||mode==="selected-focus"){
  need(a.row.shadow!==b.row.shadow,"Actual optical row treatment unchanged",{width,mode,shadow:a.row.shadow});
 }
 if(mode==="focus-row"||mode==="selected-focus"){
  need(a.rowFocusVisible&&b.rowFocusVisible,"Keyboard row focus-visible lost",{width,mode});
  need(a.row.outlineColor!==b.row.outlineColor,"Row keyboard focus outline not emphasized",{width,mode});
 }
 if(mode==="focus-link"){
  need(a.linkFocusVisible&&b.linkFocusVisible,"Keyboard reference link focus lost",{width,mode});
  need(a.link.outline!==b.link.outline&&b.link.outlineStyle==="solid","Focused link outline not visible",{width,mode,a:a.link,b:b.link});
 }
}
async function pair(c,width,mode){
 const person=await prepare(c,mode);
 await toggle(c,true);const before=await ev(c,"("+snap.toString()+")()");
 if(width===390||width===1440)await shot(c,"vis2-08-off-"+width+"-"+mode+".png");
 await toggle(c,false);const after=await ev(c,"("+snap.toString()+")()");
 if(width===390||width===1440)await shot(c,"vis2-08-on-"+width+"-"+mode+".png");
 verify(before,after,width,mode);
 report.cases.push({width,mode,person_id:person.id,domain:person.domain,rows:after.rows,sampled:after.sample.length,
  selection:after.rowSelected,focus:after.focusType,keyboardFocus:after.rowFocusVisible||after.linkFocusVisible,
  colors:{name:after.name.ink,link:after.link.ink,domainRail:after.semanticRule.background},status:"PASS"});
 console.log("ATLAS_VIS2_08_REGISTER_INTERACTION_PASS "+width+" mode="+mode+" domain="+person.domain+" sampled="+after.sample.length);
}
async function start(c,width){
 await c.call("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<=760});
 await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await c.call("Page.navigate",{url:"about:blank"});await until(c,"document.readyState==='complete'",10000);
 await c.call("Page.navigate",{url:ORIGIN+"/"});
 await until(c,"document.querySelectorAll('.person-register-entry[data-representative-domain] .person-main-name-link').length>0",90000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await until(c,"Boolean(document.querySelector('link[href*=\"atlas-person-register-selection-focus-v2.css\"]')?.sheet)",18000);
 await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-08-register-interaction-active').trim()==='1'",12000);
 await sleep(350);
}
async function main(){
 need(/^[0-9a-f]{40}$/.test(SHA),"Expected Production SHA required");
 let c;
 try{
  const pages=await(await fetch(DEBUG+"/json/list")).json(),page=pages.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
  need(page,"CDP tab missing");c=new Chrome(page.webSocketDebuggerUrl);await c.ready();await c.call("Page.enable");await c.call("Runtime.enable");
  for(const w of [390,768,1440,1600]){
   await start(c,w);
   for(const mode of ["selected","focus-row","focus-link","selected-focus"])await pair(c,w,mode);
  }
  report.status="PASS";console.log("ATLAS_VIS2_08_PRODUCTION_REGISTER_INTERACTION_PASS cases="+report.cases.length+" screenshots="+report.screenshots.length);
 }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_08_PRODUCTION_REGISTER_INTERACTION_FAIL",e);}
 finally{fs.writeFileSync(path.join(OUT,"vis2-08-production-register-interaction.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
