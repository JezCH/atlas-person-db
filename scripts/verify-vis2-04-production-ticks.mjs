import fs from "node:fs";
import path from "node:path";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const DEBUG=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-04-production-ticks/v1",expected_sha:SHA,status:"PENDING",cases:[],screenshots:[]};
const sleep=t=>new Promise(r=>setTimeout(r,t));
function insist(value,message,data){if(!value){const e=new Error(message);e.details=data;throw e;}}
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.n=0;this.pending=new Map();}
  async ready(){await new Promise((ok,fail)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener("open",ok,{once:true});this.ws.addEventListener("error",fail,{once:true});});
    this.ws.addEventListener("message",e=>{const v=JSON.parse(String(e.data)),p=this.pending.get(v.id);if(!p)return;this.pending.delete(v.id);v.error?p.reject(new Error(v.error.message)):p.resolve(v.result||{});});}
  call(method,params={}){const id=++this.n;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function run(c,expression){
  const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||"CDP evaluation failed");
  return r.result?.value;
}
async function until(c,expression,timeout=60000){
  const begin=Date.now();while(Date.now()-begin<timeout){try{if(await run(c,expression))return;}catch{}await sleep(240);}
  throw new Error("Timed out: "+expression);
}
function snapshot(){
  const q=s=>document.querySelector(s);
  const metric=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent?.trim().slice(0,100),major:e.classList.contains("is-major"),top:e.style.top,rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100),height:s.height,color:s.color,opacity:s.opacity,image:s.backgroundImage};};
  const years=[...document.querySelectorAll(".spacetime-year-axis span")];
  const guides=[...document.querySelectorAll(".spacetime-century-line")];
  const axes=[".spacetime-frame",".spacetime-scroll",".spacetime-time-axis",".spacetime-era-axis",".spacetime-year-axis",".spacetime-canvas"];
  const frames=Object.fromEntries(axes.map(sel=>[sel,metric(q(sel))]));
  const labels=[...document.querySelectorAll(".spacetime-track-label")].slice(0,28).map(metric);
  const root=getComputedStyle(document.documentElement),firstMajor=q(".spacetime-year-axis span.is-major");
  const notch=firstMajor?getComputedStyle(firstMajor,"::before"):null;
  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,marker:root.getPropertyValue("--atlas-vis2-04-tick-active").trim(),
    stage:q(".spacetime-year-axis")?.dataset.axisStage,zoom:q("#spacetimeCameraZoomValue")?.textContent?.trim(),
    yearCount:years.length,guideCount:guides.length,yearMajor:years.filter(x=>x.classList.contains("is-major")).length,
    guidesMajor:guides.filter(x=>x.classList.contains("is-major")).length,years:years.slice(0,170).map(metric),guides:guides.slice(0,170).map(metric),
    frames,labels,notch:notch?{width:notch.width,height:notch.height,background:notch.backgroundImage,shadow:notch.boxShadow}:null};
}
async function toggle(c,disabled){
  const expression="(async()=>{const l=document.querySelector('link[href*=\"atlas-person-spacetime-precision-ticks-v2.css\"]');if(!l)return false;l.disabled="+String(disabled)+";await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()";
  insist(await run(c,expression),"VIS2-04 stylesheet link missing");
  await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-04-tick-active').trim()==='"+(disabled?"":"1")+"'",25000);
}
async function screenshot(c,name){
  const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});
  insist(r.data,"Screenshot not returned "+name);fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,"base64"));report.screenshots.push(name);
}
function sameRect(x,y){return x&&y&&x.length===y.length&&x.every((v,i)=>Math.abs(v-y[i])<=.05);}
async function verify(c,width,zoom){
  await until(c,"Boolean(document.querySelector('link[href*=\"atlas-person-spacetime-precision-ticks-v2.css\"]')?.sheet)",30000);
  await until(c,"getComputedStyle(document.documentElement).getPropertyValue('--atlas-vis2-04-tick-active').trim()==='1'",30000);
  await toggle(c,true);
  const before=await run(c,"("+snapshot.toString()+")()");
  const capture=width===1600||width===390;
  if(capture)await screenshot(c,"vis2-04-ticks-off-"+zoom+"-"+width+".png");
  await toggle(c,false);
  const after=await run(c,"("+snapshot.toString()+")()");
  if(capture)await screenshot(c,"vis2-04-ticks-on-"+zoom+"-"+width+".png");
  insist(before.viewport===width&&after.viewport===width,"Viewport drift",{width});
  insist(before.documentWidth<=width+1&&after.documentWidth<=width+1,"Document overflow",{width});
  insist(before.marker===""&&after.marker==="1","VIS2-04 CSS toggle inactive",{before:before.marker,after:after.marker});
  insist(before.zoom===zoom&&after.zoom===zoom&&before.stage===after.stage,"Zoom/tick stage changed",{width,before:before.zoom,after:after.zoom});
  insist(before.yearCount>0&&before.guideCount===before.yearCount&&before.yearCount===after.yearCount&&before.guideCount===after.guideCount,"Tick count changed",{width,zoom});
  insist(before.yearMajor===after.yearMajor&&before.guidesMajor===after.guidesMajor&&before.yearMajor>0&&before.yearMajor<before.yearCount,"Major/minor tick classification changed",{width,zoom});
  for(const group of ["years","guides"]){
    insist(before[group].length===after[group].length,"Tick sample changed "+group);
    for(let i=0;i<before[group].length;i++){
      const x=before[group][i],y=after[group][i];
      insist(x.top===y.top&&x.text===y.text&&x.major===y.major&&sameRect(x.rect,y.rect)&&x.height===y.height,"Year/guide geometry drift",{width,zoom,group,i,x,y});
    }
  }
  for(const [key,x] of Object.entries(before.frames)){
    const y=after.frames[key];insist(sameRect(x?.rect,y?.rect)&&x.height===y.height,"World/axis geometry drift",{width,zoom,key,x,y});
  }
  insist(before.labels.length===after.labels.length,"Label sample count changed",{width,zoom});
  for(let i=0;i<before.labels.length;i++)insist(before.labels[i].text===after.labels[i].text&&sameRect(before.labels[i].rect,after.labels[i].rect),"Person label moved",{width,zoom,i});
  insist(before.notch?.width===after.notch?.width&&before.notch?.height===after.notch?.height,"Major notch resized",{width,zoom});
  const first=(arr,m)=>arr.find(x=>x.major===m);
  const yMinor=first(before.years,false),yMinorAfter=first(after.years,false),yMajor=first(before.years,true),yMajorAfter=first(after.years,true);
  const minor=first(before.guides,false),minorAfter=first(after.guides,false),major=first(before.guides,true),majorAfter=first(after.guides,true);
  insist(yMinor?.color!==yMinorAfter?.color&&yMajor?.color!==yMajorAfter?.color,"Label hierarchy not applied",{width,zoom,yMinor,yMinorAfter,yMajor,yMajorAfter});
  insist(minor?.opacity!==minorAfter?.opacity&&minor?.image!==minorAfter?.image&&major?.image!==majorAfter?.image,"Major/minor guides not styled",{width,zoom,minor,minorAfter,major,majorAfter});
  insist(before.notch?.background!==after.notch?.background,"Notch finish not applied",{width,zoom});
  report.cases.push({width,zoom,stage:after.stage,year_count:after.yearCount,major_years:after.yearMajor,guide_count:after.guideCount,labels_sampled:after.labels.length,status:"PASS",style:{minor_label:yMinorAfter.color,major_label:yMajorAfter.color,minor_opacity:minorAfter.opacity}});
  console.log("ATLAS_VIS2_04_TICK_GEOMETRY_PASS "+width+" zoom="+zoom+" ticks="+after.yearCount+" major="+after.yearMajor);
}
async function start(c,width){
  const height=width===390?844:1000;
  await c.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await c.call("Page.navigate",{url:"about:blank"});
  await until(c,"document.readyState==='complete'",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/#atlas-spacetime"});
  await until(c,"document.querySelectorAll('.spacetime-year-axis span').length>0",90000);
  await until(c,"document.fonts.status==='loaded'",30000);
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='500%'",20000);
  await sleep(550);
}
async function zoom1000(c){
  const exp="(()=>{const s=document.querySelector('.spacetime-scroll');if(!s||!window.PointerEvent)return false;const r=s.getBoundingClientRect(),x=Math.max(r.left+110,Math.min(r.right-150,r.left+r.width/2)),y=Math.max(r.top+90,Math.min(r.bottom-100,r.top+r.height/2));const fire=(type,id,px)=>s.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:px,clientY:y,isPrimary:id===101}));fire('pointerdown',101,x-40);fire('pointerdown',102,x+40);fire('pointermove',102,x+120);return true;})()";
  insist(await run(c,exp),"Zoom gesture unavailable");
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='1000%'",16000);
  await run(c,"(()=>{const s=document.querySelector('.spacetime-scroll');for(const id of [101,102])s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:id,clientX:100,clientY:100}));return true;})()");
  await sleep(500);
}
async function zoom1500(c){
  for(let i=0;i<2;i++){insist(await run(c,"(()=>{const b=document.querySelector('#spacetimeCameraZoomIn');if(!b)return false;b.click();return true;})()"),"Zoom button missing");await sleep(270);}
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='1500%'",18000);await sleep(350);
}
async function main(){
  insist(/^[0-9a-f]{40}$/.test(SHA),"Exact Production SHA gate required");
  let c;
  try{
    const list=await(await fetch(DEBUG+"/json/list")).json(),page=list.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    insist(page,"Chrome CDP tab missing");
    c=new CDP(page.webSocketDebuggerUrl);await c.ready();
    await c.call("Page.enable");await c.call("Runtime.enable");
    for(const w of [390,768,1440,1600]){
      await start(c,w);await verify(c,w,"500%");
      if(w===1600){await zoom1000(c);await verify(c,w,"1000%");await zoom1500(c);await verify(c,w,"1500%");}
    }
    report.status="PASS";console.log("ATLAS_VIS2_04_PRODUCTION_TICKS_PASS");
  }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error("ATLAS_VIS2_04_PRODUCTION_TICKS_FAIL",e);}
  finally{fs.writeFileSync(path.join(OUT,"vis2-04-production-ticks.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
