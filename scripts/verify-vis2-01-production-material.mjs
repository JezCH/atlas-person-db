import fs from "node:fs";
import path from "node:path";

const EXPECTED=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const CDP=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const report={schema:"atlas-vis2-01-production-material/v1",expected_sha:EXPECTED,checked_at:new Date().toISOString(),samples:[],status:"PENDING"};
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,message,details){if(!ok){const e=new Error(message);e.details=details;throw e;}}
class CDPClient{
  constructor(url){this.ws=new WebSocket(url);this.pending=new Map();this.n=0;}
  async start(){
    await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});
    this.ws.addEventListener("message",e=>{const m=JSON.parse(String(e.data)),p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result||{});});
  }
  call(method,params={}){let id=++this.n;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function evaluate(client,expression){
  const r=await client.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result?.value;
}
async function waitFor(client,expression,timeout=80000){
  const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(client,expression))return;}catch{}await sleep(200);}throw new Error("Timeout: "+expression);
}
const color=hex=>{
  const rgb=hex.match(/[a-f0-9]{2}/ig)?.map(x=>parseInt(x,16));
  return rgb?"rgb("+rgb.join(", ")+")":null;
};
async function inspect(client,width,height){
  const device={width,height,deviceScaleFactor:1,mobile:width<=760};
  await client.call("Emulation.setDeviceMetricsOverride",device);
  await client.call("Page.navigate",{url:"about:blank"});
  await waitFor(client,"document.readyState==='complete'",10000);
  await client.call("Page.navigate",{url:ORIGIN+"/"});
  await waitFor(client,"document.querySelectorAll('.person-register-entry').length>0");
  await waitFor(client,"document.fonts.status==='loaded'",15000);
  const result=await evaluate(client,`(()=>{
    const one=s=>document.querySelector(s), sty=el=>getComputedStyle(el);
    const body=document.body;
    const wrapper=document.createElement("div");
    wrapper.className="person-main-actions";
    wrapper.style.cssText="position:fixed;pointer-events:none;visibility:hidden;top:-100px;left:-100px";
    const button=document.createElement("button");
    button.className="btn btn-primary";
    button.textContent="M3 probe";
    wrapper.appendChild(button);
    body.appendChild(wrapper);
    const panel=one(".person-main-toolbar.card");
    const m2=document.createElement("button");
    m2.className="btn";
    m2.textContent="M2 probe";
    wrapper.appendChild(m2);
    const sample={
      viewport:{width:innerWidth,height:innerHeight,document_width:document.documentElement.scrollWidth},
      m0:sty(one(".workspace-shell")).backgroundColor,
      m0deep:sty(one(".sidebar")).backgroundColor,
      m1:panel?sty(panel).backgroundColor:null,
      m2:sty(m2).backgroundColor,
      m3:sty(button).backgroundColor,
      m3_background_image:sty(button).backgroundImage,
      m3_border:sty(button).borderTopColor,
      title:document.title,
      register_rows:document.querySelectorAll(".person-register-entry").length,
      primary_outline_color:getComputedStyle(button).color
    };
    wrapper.remove();
    return sample;
  })()`);
  const expected={m0:"#121518",m0deep:"#0e1114",m1:"#191d21",m2:"#20252a",m3:"#262c31"};
  assert(result.viewport.width===width&&result.viewport.height===height,"Wrong viewport",result);
  assert(result.viewport.document_width<=width+1,"Unexpected horizontal overflow",result);
  assert(result.register_rows>0,"Person table is not populated",result);
  for(const [key,hex] of Object.entries(expected))assert(result[key]===color(hex),"Material role "+key+" mismatch",result);
  assert(result.m3_background_image!=="none","M3 lacks restrained sheen layer",result);
  report.samples.push(result);
  console.log("ATLAS_VIS2_01_MATERIAL "+width+"x"+height+" "+JSON.stringify({m0:result.m0,m1:result.m1,m2:result.m2,m3:result.m3}));
}
async function main(){
  assert(/^[a-f0-9]{40}$/.test(EXPECTED),"Exact SHA gate is required",EXPECTED);
  let c;
  try{
    const tabs=await(await fetch(CDP+"/json/list")).json();
    const tab=tabs.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    assert(tab,"Missing Chrome debugger",tabs);
    c=new CDPClient(tab.webSocketDebuggerUrl);await c.start();
    await c.call("Page.enable");await c.call("Runtime.enable");
    for(const [width,height] of [[390,844],[768,1000],[1440,1000],[1600,1000]])await inspect(c,width,height);
    report.status="PASS";
    console.log("ATLAS_VIS2_01_PRODUCTION_MATERIAL_PASS");
  }catch(e){
    report.status="FAIL";report.error=e.message;report.details=e.details||null;
    console.error("ATLAS_VIS2_01_PRODUCTION_MATERIAL_FAIL",e);
    process.exitCode=1;
  }finally{
    fs.writeFileSync(path.join(OUT,"vis2-01-production-material.json"),JSON.stringify(report,null,2)+"\n");
    c?.close();
  }
}
await main();
