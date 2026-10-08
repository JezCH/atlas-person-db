import fs from "node:fs";
import path from "node:path";
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||"https://atlas-person-db.vercel.app").replace(/\/$/,"");
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const CDP_URL=process.env.ATLAS_CDP_URL||"http://127.0.0.1:9222";
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const CANDIDATE=fs.readFileSync(new URL("../experiments/vis2-05-monumental-watermark-candidate.css",import.meta.url),"utf8");
fs.mkdirSync(OUT,{recursive:true});
const report={schema:"atlas-vis2-05-non-shipping-watermark-ab/v1",expected_sha:SHA,production_candidate_shipped:false,default:"REJECT",status:"PENDING",scenes:[],screenshots:[]};
const sleep=t=>new Promise(r=>setTimeout(r,t));
function must(v,m,d){if(!v){const e=new Error(m);e.details=d||null;throw e;}}
class Chrome{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
  async start(){await new Promise((yes,no)=>{if(this.ws.readyState===WebSocket.OPEN)return yes();this.ws.addEventListener("open",yes,{once:true});this.ws.addEventListener("error",no,{once:true});});this.ws.addEventListener("message",e=>{const x=JSON.parse(String(e.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(new Error(x.error.message)):p.resolve(x.result||{});});}
  call(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws.close();}catch{}}
}
async function ev(c,expression){const r=await c.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function until(c,expr,t=50000){const start=Date.now();while(Date.now()-start<t){try{if(await ev(c,expr))return;}catch{}await sleep(230);}throw Error("Timeout: "+expr);}
async function shot(c,file){const r=await c.call("Page.captureScreenshot",{format:"png",fromSurface:true,captureBeyondViewport:false});must(r.data,"Missing screenshot "+file);fs.writeFileSync(path.join(OUT,file),Buffer.from(r.data,"base64"));report.screenshots.push(file);}
async function route(c,width){
  const height=width===390?844:1000;
  await c.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<=760});
  await c.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await c.call("Page.navigate",{url:"about:blank"});await until(c,"document.readyState==='complete'",10000);
  await c.call("Page.navigate",{url:ORIGIN+"/#atlas-spacetime"});
  await until(c,"Boolean(document.querySelector('.spacetime-canvas'))",90000);
  await until(c,"document.fonts.status==='loaded'",30000);
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='500%'",25000);
  await until(c,"!document.querySelector('style#vis2-05-watermark-injected')",5000);
  // Use canonical verified search/selection/clear sequence to initialize virtual labels.
  const done=await ev(c,"(()=>{const s=document.querySelector('#spacetimeSearch');if(!s)return false;s.value='a';s.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
  must(done,"Spacetime search missing");
  await until(c,"document.querySelectorAll('[data-spacetime-search-result]').length>0",30000);
  await ev(c,"(()=>{document.querySelector('[data-spacetime-search-result]')?.click();return true;})()");
  await until(c,"Boolean(document.querySelector('#spacetimeInspector:not(.is-empty)'))",30000);
  await ev(c,"(()=>{const s=document.querySelector('#spacetimeSearch');s.value='';s.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
  await until(c,"document.querySelectorAll('.spacetime-track-label').length>0",30000);
  await ev(c,"(()=>{document.querySelector('#spacetimeClearPerson')?.click();return true;})()");
  await until(c,"Boolean(document.querySelector('#spacetimeInspector.is-empty'))",14000);
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='500%'",15000);
  await sleep(350);
}
async function zoom1000(c){
  const exp="(()=>{const s=document.querySelector('.spacetime-scroll');if(!s||!window.PointerEvent)return false;const r=s.getBoundingClientRect(),x=Math.max(r.left+110,Math.min(r.right-150,r.left+r.width/2)),y=Math.max(r.top+90,Math.min(r.bottom-100,r.top+r.height/2));const fire=(type,id,px)=>s.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:px,clientY:y,isPrimary:id===101}));fire('pointerdown',101,x-40);fire('pointerdown',102,x+40);fire('pointermove',102,x+120);return true;})()";
  must(await ev(c,exp),"Pinch gesture unavailable");await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='1000%'",17000);
  await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll');for(const id of [101,102])s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:id,clientX:100,clientY:100}));return true;})()");
  await sleep(350);
}
async function zoom1500(c){
  for(let i=0;i<2;i++){must(await ev(c,"(()=>{const b=document.querySelector('#spacetimeCameraZoomIn');if(!b)return false;b.click();return true;})()"),"Zoom-in missing");await sleep(250);}
  await until(c,"document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim()==='1500%'",17000);
}
async function chooseScene(c,mode){
  const prep=await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll'),f=document.querySelector('.spacetime-frame'),axis=parseFloat(getComputedStyle(f).getPropertyValue('--spacetime-axis-width'))||140;const bands=[...document.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band')];const target=bands.find(x=>/동아시아|East Asia/i.test(x.textContent||''))||bands[0];if(!s||!target)return null;const cx=parseFloat(target.style.left)+parseFloat(target.style.width)/2;const x=Math.max(0,axis+cx-s.clientWidth/2);s.scrollLeft=x;s.dispatchEvent(new Event('scroll',{bubbles:true}));return {scrollWidth:s.scrollWidth,scrollHeight:s.scrollHeight,clientWidth:s.clientWidth,clientHeight:s.clientHeight,worldWidth:document.querySelector('.spacetime-canvas')?.getBoundingClientRect().width,region:target.textContent?.trim(),scrollLeft:x};})()");
  must(prep,"No Spacetime macroregion baseline",prep);
  if(mode==="boundary"){
    const r=await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll'),b=[...document.querySelectorAll('.spacetime-era-boundary')].filter(x=>x.querySelector('b')?.textContent?.trim()).map(x=>({y:parseFloat(x.style.top),label:x.querySelector('b').textContent.trim()})).filter(x=>Number.isFinite(x.y)&&x.y>s.clientHeight&&x.y<s.scrollHeight-s.clientHeight).sort((a,b)=>a.y-b.y);if(!b.length)return null;const pick=b[Math.floor(b.length/2)];s.scrollTop=Math.max(0,pick.y-s.clientHeight*.48);s.dispatchEvent(new Event('scroll',{bubbles:true}));return {boundary_year_y:pick.y,era:pick.label,scrollTop:s.scrollTop};})()");
    must(r,"No centered era boundary",{mode,prep});await sleep(460);return {...prep,...r};
  }
  // Search actual real scroll positions for the densest VISIBLE Person-label frame.
  let best={count:-1,scrollTop:0};
  for(const ratio of [.08,.16,.24,.32,.4,.48,.56,.64,.72,.80,.88]){
    await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll');s.scrollTop=Math.round((s.scrollHeight-s.clientHeight)*"+ratio+");s.dispatchEvent(new Event('scroll',{bubbles:true}));return true;})()");
    await sleep(340);
    const found=await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll'),r=s.getBoundingClientRect(),axis=parseFloat(getComputedStyle(document.querySelector('.spacetime-frame')).getPropertyValue('--spacetime-axis-width'))||140;const labels=[...document.querySelectorAll('.spacetime-track-label')].filter(el=>{const x=el.getBoundingClientRect();return x.width>0&&x.height>0&&x.top>=r.top+35&&x.bottom<=r.bottom&&x.right>=r.left+axis&&x.left<=r.right;});return {count:labels.length,scrollTop:s.scrollTop};})()");
    if(found.count>best.count)best=found;
  }
  must(best.count>0,"Dense-frame scenario lacks visible Person labels",{best,prep});
  await ev(c,"(()=>{const s=document.querySelector('.spacetime-scroll');s.scrollTop="+best.scrollTop+";s.dispatchEvent(new Event('scroll',{bubbles:true}));return true;})()");
  await sleep(550);return {...prep,...best};
}
function state(){
  const q=s=>document.querySelector(s),s=q(".spacetime-scroll"),canvas=q(".spacetime-canvas"),frame=q(".spacetime-frame");
  const r=e=>{if(!e)return null;const v=e.getBoundingClientRect();return [v.x,v.y,v.width,v.height].map(x=>Math.round(x*100)/100);};
  const labels=[...document.querySelectorAll(".spacetime-track-label")],eras=[...document.querySelectorAll(".spacetime-era-boundary")];
  const years=[...document.querySelectorAll(".spacetime-year-axis span")];
  const pick=labels.slice(0,90).map(x=>({name:x.textContent?.trim().slice(0,80),rect:r(x)}));
  const first=q(".spacetime-canvas[data-vis2-05-watermark-year]");
  return {width:innerWidth,docWidth:document.documentElement.scrollWidth,zoom:q("#spacetimeCameraZoomValue")?.textContent?.trim(),stage:q(".spacetime-year-axis")?.dataset.axisStage,
    scroll:{left:s.scrollLeft,top:s.scrollTop,height:s.scrollHeight,width:s.scrollWidth,clientWidth:s.clientWidth,clientHeight:s.clientHeight},
    frame:r(frame),canvas:r(canvas),yearCount:years.length,eraCount:eras.length,labelCount:labels.length,
    yearSample:years.slice(0,100).map(x=>({label:x.textContent?.trim(),top:x.style.top})),
    labels:pick,styleLoaded:Boolean(q("#vis2-05-watermark-injected")),watermarkYear:first?.getAttribute("data-vis2-05-watermark-year"),
    pseudo:first?getComputedStyle(first,"::before").content:null};
}
async function prepareLabel(c,mode){
  const expression="(()=>{const f=document.querySelector('.spacetime-frame'),c=document.querySelector('.spacetime-canvas'),s=document.querySelector('.spacetime-scroll');if(!f||!c||!s)return null;const cr=c.getBoundingClientRect(),sr=s.getBoundingClientRect(),axis=parseFloat(getComputedStyle(f).getPropertyValue('--spacetime-axis-width'))||140;const t=[...document.querySelectorAll('.spacetime-year-axis span.is-major')];if(!t.length)return null;const center=sr.top+sr.height*.5;const y=t.sort((a,b)=>Math.abs(a.getBoundingClientRect().y-center)-Math.abs(b.getBoundingClientRect().y-center))[0];const x=s.scrollLeft+(s.clientWidth-axis)*.52;const year=y.textContent.trim();f.setAttribute('data-vis2-05-watermark','experiment');c.setAttribute('data-vis2-05-watermark-year',year);c.style.setProperty('--vis2-05-x',x+'px');c.style.setProperty('--vis2-05-y',y.style.top);let era=null;if("+JSON.stringify("boundary")+"==="+JSON.stringify(mode)+"){const a=[...document.querySelectorAll('.spacetime-era-boundary')];const b=a.sort((a,b)=>Math.abs(a.getBoundingClientRect().top-center)-Math.abs(b.getBoundingClientRect().top-center))[0];if(b){era=b.querySelector('b')?.textContent?.trim()||null;if(era){b.setAttribute('data-vis2-05-watermark-era',era);b.style.setProperty('--vis2-05-era-x',x+'px');}}}return {year,era,x,y:y.style.top};})()";
  const d=await ev(c,expression);must(d?.year,"No canonical year label for watermark",{mode,d});return d;
}
async function evaluateScene(c,width,mode,zoom){
  await chooseScene(c,mode);
  const label=await prepareLabel(c,mode);
  const before=await ev(c,"("+state.toString()+")()");
  must(!before.styleLoaded&&(!before.pseudo||["none","normal"].includes(before.pseudo)),"Watermark unexpectedly active in default Production",{width,mode,zoom,pseudo:before.pseudo});
  must(before.zoom===zoom,"Zoom mismatch before A/B",{width,mode,zoom:before.zoom});
  const suffix=width+"-"+zoom.replace("%","pct")+"-"+mode;
  await shot(c,"vis2-05-A-default-"+suffix+".png");
  const injection="(()=>{if(document.querySelector('#vis2-05-watermark-injected'))return false;const s=document.createElement('style');s.id='vis2-05-watermark-injected';s.textContent="+JSON.stringify(CANDIDATE)+";document.head.append(s);return true;})()";
  must(await ev(c,injection),"Cannot insert candidate experiment style");
  await until(c,"Boolean(document.querySelector('#vis2-05-watermark-injected'))",6000);
  await sleep(160);
  const after=await ev(c,"("+state.toString()+")()");
  await shot(c,"vis2-05-B-experiment-"+suffix+".png");
  must(after.styleLoaded&&after.pseudo?.includes(label.year),"Watermark CSS not activated",{width,mode,label,after:after.pseudo});
  const scalar=["width","docWidth","zoom","stage","yearCount","eraCount","labelCount"];
  for(const k of scalar)must(before[k]===after[k],"A/B scalar changed "+k,{width,mode,before:before[k],after:after[k]});
  for(const k of ["frame","canvas"])must(JSON.stringify(before[k])===JSON.stringify(after[k]),"World viewport rectangle moved",{width,mode,k,before:before[k],after:after[k]});
  must(JSON.stringify(before.scroll)===JSON.stringify(after.scroll),"World camera/scroll changed",{width,mode,before:before.scroll,after:after.scroll});
  must(JSON.stringify(before.yearSample)===JSON.stringify(after.yearSample),"Historical year nodes moved",{width,mode});
  must(JSON.stringify(before.labels)===JSON.stringify(after.labels),"Virtualized Person labels moved",{width,mode});
  must(before.docWidth<=width+1,"Baseline document overflow",{width,mode});
  await ev(c,"(()=>{document.querySelector('#vis2-05-watermark-injected')?.remove();document.querySelector('.spacetime-frame')?.removeAttribute('data-vis2-05-watermark');document.querySelector('.spacetime-canvas')?.removeAttribute('data-vis2-05-watermark-year');document.querySelector('.spacetime-canvas')?.style.removeProperty('--vis2-05-x');document.querySelector('.spacetime-canvas')?.style.removeProperty('--vis2-05-y');for(const e of document.querySelectorAll('[data-vis2-05-watermark-era]')){e.removeAttribute('data-vis2-05-watermark-era');e.style.removeProperty('--vis2-05-era-x');}return true;})()");
  // Default OFF acceptance is a strict after-test assertion.
  must(!await ev(c,"Boolean(document.querySelector('#vis2-05-watermark-injected'))"),"Experiment was not removed");
  report.scenes.push({viewport:width,zoom,mode,year:label.year,era:label.era,PersonLabels:before.labelCount,yearTicks:before.yearCount,scroll:before.scroll,geometry:"UNCHANGED",candidate:"TEMPORARILY_RENDERED",productionDefault:"OFF",status:"PASS"});
  console.log("ATLAS_VIS2_05_AB_GEOMETRY_PASS "+suffix+" year="+label.year+" labels="+before.labelCount);
}
async function main(){
  must(/^[a-f0-9]{40}$/.test(SHA),"Exact Production SHA required");
  let c;
  try{
    const list=await(await fetch(CDP_URL+"/json/list")).json(),tab=list.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
    must(tab,"Chrome CDP page missing");c=new Chrome(tab.webSocketDebuggerUrl);await c.start();await c.call("Page.enable");await c.call("Runtime.enable");
    for(const w of [390,768,1440,1600]){
      await route(c,w);
      for(const mode of ["boundary","dense"])await evaluateScene(c,w,mode,"500%");
      if(w===1600){
        await zoom1000(c);for(const mode of ["boundary","dense"])await evaluateScene(c,w,mode,"1000%");
        await zoom1500(c);for(const mode of ["boundary","dense"])await evaluateScene(c,w,mode,"1500%");
      }
    }
    report.status="CAPTURED_PENDING_VISUAL_REJECTION_REVIEW";
    console.log("ATLAS_VIS2_05_PRODUCTION_AB_CAPTURE_PASS scenes="+report.scenes.length+" screenshots="+report.screenshots.length+" default=OFF");
  }catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;console.error("ATLAS_VIS2_05_PRODUCTION_AB_CAPTURE_FAIL",e);process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,"vis2-05-watermark-ab.json"),JSON.stringify(report,null,2)+"\n");c?.close();}
}
await main();
