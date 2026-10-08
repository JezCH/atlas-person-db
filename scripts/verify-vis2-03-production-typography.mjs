import fs from "node:fs";
import path from "node:path";

const CDP=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-03-production-typography/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,message,details){if(!ok){const error=new Error(message);error.details=details;throw error;}}
class Chrome{
  constructor(url){this.ws=new WebSocket(url);this.n=0;this.pending=new Map();}
  async ready(){
    await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});
    this.ws.addEventListener("message",e=>{const msg=JSON.parse(String(e.data)),entry=this.pending.get(msg.id);if(!entry)return;this.pending.delete(msg.id);msg.error?entry.reject(new Error(msg.error.message)):entry.resolve(msg.result||{});});
  }
  call(method,params={}){const id=++this.n;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function evaluate(c,expression){
  const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||"CDP evaluate failed");
  return r.result?.value;
}
async function waitFor(c,expr,limit=75000){
  const start=Date.now();while(Date.now()-start<limit){try{if(await evaluate(c,expr))return;}catch{}await sleep(230);}
  throw new Error("Timeout: "+expr);
}
async function toggle(c,disabled){
  const exp="(async()=>{const l=document.querySelector('link[href*=\"atlas-ui-mixed-script-typography-v2.css\"]');if(!l)return false;l.disabled="+String(disabled)+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
  assert(await evaluate(c,exp),"VIS2-03 link missing");
  await waitFor(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-03-type-active').trim()==='"+(disabled?"":"1")+"'",25000);
}
function snapshot(){
  const rect=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100);};
  const rowList=[...document.querySelectorAll(".person-monumental-register .person-register-entry")].slice(0,80);
  const els=[...document.querySelectorAll(".person-monumental-register .person-table-identity > strong")].slice(0,80);
  const nums=[...document.querySelectorAll(".person-monumental-register .person-register-range")].slice(0,80);
  const head=document.querySelector(".person-monumental-register > .person-table-head");
  const clip=el=>el?{rect:rect(el),scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,clientHeight:el.clientHeight,text:el.textContent?.trim().slice(0,120),kerning:getComputedStyle(el).fontKerning,eastAsian:getComputedStyle(el).fontVariantEastAsian,numeric:getComputedStyle(el).fontVariantNumeric}:null;
  const rowMetrics=rowList.map(el=>({rect:rect(el),scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth}));
  const nameMetrics=els.map(clip);
  const numMetrics=nums.map(clip);
  const root=getComputedStyle(document.documentElement);
  return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
    marker:root.getPropertyValue("--atlas-vis2-03-type-active").trim(),
    rows:rowList.length,allRows:document.querySelectorAll(".person-register-entry").length,
    rowMetrics,nameMetrics,numMetrics,header:clip(head)};
}
async function shot(c,name){
  const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  assert(r.data,"Screenshot empty "+name);
  fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);
}
const same=(a,b,tol=.05)=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<=tol);
async function inspect(c,width,height){
  await c.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Page.navigate",{url:"about:blank"});
  await waitFor(c,"document.readyState==='complete'",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/"});
  await waitFor(c,"document.querySelectorAll('.person-register-entry').length>0",90000);
  await waitFor(c,"document.fonts.status==='loaded'",20000);
  await waitFor(c,"Boolean(document.querySelector('link[href*=\"atlas-ui-mixed-script-typography-v2.css\"]')?.sheet)",15000);
  await waitFor(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-03-type-active').trim()==='1'",10000);
  await toggle(c,true);
  const before=await evaluate(c,"("+snapshot.toString()+")()");
  if([390,1440].includes(width))await shot(c,"vis2-03-before-"+width+".png");
  await toggle(c,false);
  const after=await evaluate(c,"("+snapshot.toString()+")()");
  if([390,1440].includes(width))await shot(c,"vis2-03-after-"+width+".png");
  assert(before.rows>0&&before.rows===after.rows&&before.allRows===after.allRows,"Person register cardinality changed",{before:before.rows,after:after.rows});
  assert(before.marker===""&&after.marker==="1","Visual opt-in marker did not toggle",{before:before.marker,after:after.marker});
  assert(before.documentWidth<=width+1&&after.documentWidth<=width+1,"Document width overflow",{before:before.documentWidth,after:after.documentWidth});
  assert(before.rowMetrics.length===after.rowMetrics.length,"Visible sampled row count changed");
  for(let i=0;i<before.rowMetrics.length;i++){
    const a=before.rowMetrics[i],b=after.rowMetrics[i];
    assert(same(a.rect,b.rect),"Person register row box drift", {width,i,a,b});
    assert(a.scrollHeight===b.scrollHeight,"Person row text wrapped vertically",{width,i,a,b});
  }
  for(let [name,records] of [["name",before.nameMetrics],["number",before.numMetrics]]){
    const others=name==="name"?after.nameMetrics:after.numMetrics;
    assert(records.length===others.length,"Changed text sample count "+name);
    for(let i=0;i<records.length;i++){
      const a=records[i],b=others[i];
      assert(a.text===b.text,"Changed text content "+name,{width,i});
      assert(same(a.rect,b.rect),"Text cell box drift "+name,{width,i,a,b});
      assert(a.scrollHeight===b.scrollHeight,"Text reflow "+name,{width,i,a,b});
    }
  }
  for(const el of after.nameMetrics)assert(el.kerning==="normal"&&el.eastAsian==="normal","Mixed script identity shaping missing",{width,el});
  for(const el of after.numMetrics)assert(el.numeric.includes("tabular-nums")&&el.numeric.includes("lining-nums"),"Lining tabular year missing",{width,el});
  report.cases.push({viewport:{width,height},status:"PASS",rows_checked:before.rows,names_checked:before.nameMetrics.length,years_checked:before.numMetrics.length,head_rect:after.header?.rect,examples:after.nameMetrics.slice(0,8).map(x=>x.text)});
  console.log("ATLAS_VIS2_03_TYPOGRAPHY_WIDTH_PASS "+width+"x"+height+" rows="+before.rows+" names="+before.nameMetrics.length+" years="+before.numMetrics.length);
}
async function main(){
  assert(/^[0-9a-f]{40}$/.test(SHA),"Exact Production SHA gate required",SHA);
  let c;
  try{
    const pages=await(await fetch(CDP+"/json/list")).json(),tab=pages.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    assert(tab,"CDP page missing",pages);
    c=new Chrome(tab.webSocketDebuggerUrl);await c.ready();
    await c.call("Page.enable");await c.call("Runtime.enable");
    await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    for(const [w,h] of [[390,844],[768,1000],[1440,1000],[1600,1000]])await inspect(c,w,h);
    report.status="PASS";
    console.log("ATLAS_VIS2_03_PRODUCTION_TYPOGRAPHY_PASS");
  }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_03_PRODUCTION_TYPOGRAPHY_FAIL",e);}
  finally{fs.writeFileSync(path.join(OUT,"vis2-03-production-typography.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
