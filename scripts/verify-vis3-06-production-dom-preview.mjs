// VIS3-06-P: READ-ONLY actual Production DOM A/B/C design comparison.
// Browser-only stylesheet injection; NEVER modifies GitHub runtime, APIs, or DB.
// Not a deployment/release or an approval to change the Spacetime UI.
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const DEBUG=process.env.ATLAS_CDP_URL||'http://127.0.0.1:9222';
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||'artifacts/vis3-06-production-dom-preview';
const widths=[390,768,1000,1440,1600];
fs.mkdirSync(OUT,{recursive:true});
const report={schema:'atlas-vis3-06-production-dom-preview/v1',origin:ORIGIN,
  mode:'ephemeral same-Production-DOM CSS A/B/C; NOT a release or user approval',
  status:'PENDING',case_results:[],screenshots:[],warnings:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(x,message,details){if(!x){const e=new Error(message);e.details=details||null;throw e;}}

class CDP {
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
  async ready(){
    await new Promise((resolve,reject)=>{
      if(this.ws.readyState===WebSocket.OPEN)return resolve();
      this.ws.addEventListener('open',resolve,{once:true});
      this.ws.addEventListener('error',reject,{once:true});
    });
    this.ws.addEventListener('message',ev=>{
      const a=JSON.parse(String(ev.data)),p=this.pending.get(a.id);
      if(!p)return;
      this.pending.delete(a.id);
      a.error?p.reject(new Error(a.error.message)):p.resolve(a.result||{});
    });
  }
  call(method,params={}){
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){try{this.ws.close();}catch{}}
}
async function evaluate(c,expression){
  const r=await c.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'CDP exception');
  return r.result?.value;
}
async function until(c,expression,ms=70000){
  const end=Date.now()+ms;
  while(Date.now()<end){try{if(await evaluate(c,expression))return;}catch{}await sleep(250);}
  throw new Error('Timed out: '+expression);
}
function browserApply(variant){
  const root=document.querySelector('#personSpacetimeMount');
  const toolbar=root?.querySelector('.spacetime-toolbar');
  const controls=toolbar?.querySelector('.spacetime-controls');
  const legend=toolbar?.querySelector('.spacetime-precision-legend');
  if(!root||!toolbar||!controls||!legend)return {ok:false,reason:'real toolbar missing'};
  let style=document.querySelector('#atlasVis306PreviewStyle');
  if(!style){
    style=document.createElement('style');
    style.id='atlasVis306PreviewStyle';
    style.textContent=[
      '#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar,',
      '#personSpacetimeMount[data-vis3-06-preview="C"] .spacetime-toolbar {position:relative;isolation:isolate}',
      '#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::before,',
      '#personSpacetimeMount[data-vis3-06-preview="C"] .spacetime-toolbar::before {content:"";position:absolute;top:1px;left:var(--vis3-06-preview-left,0px);pointer-events:none;z-index:0;display:var(--vis3-06-preview-display,none);background-repeat:no-repeat}',
      '#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::before {width:44px;height:25px;opacity:.74;background-image:radial-gradient(circle at 50% 106%,transparent 16px,rgba(192,174,136,.54) 16.5px,rgba(192,174,136,.54) 17px,transparent 17.5px),radial-gradient(circle at 50% 106%,transparent 22px,rgba(192,174,136,.19) 22.3px,rgba(192,174,136,.19) 23px,transparent 23.5px)}',
      '#personSpacetimeMount[data-vis3-06-preview="C"] .spacetime-toolbar::before {width:32px;height:19px;opacity:.50;background-image:radial-gradient(circle at 50% 105%,transparent 12px,rgba(192,174,136,.45) 12.5px,rgba(192,174,136,.45) 13px,transparent 13.5px)}',
      '#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::after {content:"";position:absolute;top:10px;left:calc(var(--vis3-06-preview-left,0px) + 13px);width:18px;height:4px;pointer-events:none;display:var(--vis3-06-preview-display,none);opacity:.52;background:repeating-linear-gradient(90deg,rgba(192,174,136,.58) 0px,rgba(192,174,136,.58) 1px,transparent 1px,transparent 7px)}',
      '@media(max-width:900px){#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::before,#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::after,#personSpacetimeMount[data-vis3-06-preview="C"] .spacetime-toolbar::before{display:none!important}}',
      '@media(prefers-reduced-motion:reduce){#personSpacetimeMount[data-vis3-06-preview="B"] .spacetime-toolbar::before,#personSpacetimeMount[data-vis3-06-preview="C"] .spacetime-toolbar::before{transition:none!important;animation:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }
  const cr=controls.getBoundingClientRect(),lr=legend.getBoundingClientRect(),tr=toolbar.getBoundingClientRect();
  const visibleLegend=getComputedStyle(legend).display!=='none'&&lr.width>0;
  const gapLeft=cr.right+8,gapRight=visibleLegend?lr.left-8:tr.right-8;
  const gap=Math.max(0,gapRight-gapLeft);
  const size=variant==='C'?32:44;
  const enough=window.innerWidth>900&&gap>=size+16;
  toolbar.style.setProperty('--vis3-06-preview-left',Math.round((gapLeft+gapRight-size)/2-tr.left)+'px');
  toolbar.style.setProperty('--vis3-06-preview-display',enough?'block':'none');
  root.dataset.vis306Preview=variant; // note: attribute name differs from CSS, set below explicitly
  root.setAttribute('data-vis3-06-preview',variant);
  return {ok:true,variant,gap:Math.round(gap*100)/100,ornament_expected:variant!=='A'&&enough,
    controlsRight:Math.round(cr.right*100)/100,legendLeft:Math.round(lr.left*100)/100};
}
function browserSnapshot(){
  const root=document.querySelector('#personSpacetimeMount');
  const toolbar=root?.querySelector('.spacetime-toolbar');
  const fields=['#spacetimeSearch','#spacetimeCameraZoomOut','#spacetimeCameraZoomValue',
    '#spacetimeCameraZoomIn','#spacetimeCameraZoomReset','.spacetime-precision-legend > summary'];
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(z=>Math.round(z*100)/100);};
  const elements=fields.map(s=>{const e=root?.querySelector(s);return {selector:s,rect:rect(e),value:e?.value||null,text:e?.textContent?.trim().slice(0,80)||null,
    visible:e?getComputedStyle(e).display!=='none':false};});
  const canvas=root?.querySelector('.spacetime-canvas');
  const frame=root?.querySelector('.spacetime-frame');
  const axes=[...root.querySelectorAll('.spacetime-year-axis span')].slice(0,15).map(e=>({text:e.textContent?.trim(),rect:rect(e)}));
  const labels=[...root.querySelectorAll('.spacetime-track-label')].slice(0,15).map(e=>({text:e.textContent?.trim(),rect:rect(e)}));
  const regions=[...root.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band')].map(e=>e.getAttribute('data-spacetime-band'));
  const scroll=root?.querySelector('.spacetime-scroll');
  const pseudo=toolbar?getComputedStyle(toolbar,'::before'):null,toolrect=toolbar?.getBoundingClientRect();
  const active=!!pseudo&&pseudo.content!=='none'&&pseudo.display!=='none'&&pseudo.opacity!=='0';
  const pseudoRect=active?[toolrect.left+parseFloat(pseudo.left),toolrect.top+parseFloat(pseudo.top),
    parseFloat(pseudo.width),parseFloat(pseudo.height)].map(z=>Math.round(z*100)/100):null;
  function overlap(a,b){if(!a||!b)return 0;return Math.round(Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*
    Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]))*100)/100;}
  return {width:innerWidth,docWidth:document.documentElement.scrollWidth,route:location.href,
    variant:root?.getAttribute('data-vis3-06-preview')||'A',
    zoom:root?.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim(),
    toolbar:rect(toolbar),elements,yearTickCount:root.querySelectorAll('.spacetime-year-axis span').length,
    axes,macroregions:regions,labels,
    trackCount:root.querySelectorAll('.spacetime-track-label').length,
    canvasRect:rect(canvas),frameRect:rect(frame),
    scroll:scroll?{left:scroll.scrollLeft,top:scroll.scrollTop,width:scroll.scrollWidth,height:scroll.scrollHeight}:null,
    focusableCount:root.querySelectorAll('button,input,details>summary,[tabindex]').length,
    ornament:{active,rect:pseudoRect,pointerEvents:pseudo?.pointerEvents||null,
      overlapArea:elements.reduce((sum,e)=>sum+overlap(pseudoRect,e.rect),0)}};
}
async function screenshot(c,name){
  const r=await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  assert(r.data,'Missing screenshot for '+name);
  fs.writeFileSync(path.join(OUT,name),Buffer.from(r.data,'base64'));
  report.screenshots.push(name);
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function assertProtected(before,after,width,variant,scene){
  for(const key of ['width','docWidth','zoom','toolbar','elements','yearTickCount',
    'axes','macroregions','labels','trackCount','canvasRect','frameRect','scroll','focusableCount']){
    assert(same(before[key],after[key]),'Protected actual-DOM value changed: '+key,
      {width,variant,scene,before:before[key],after:after[key]});
  }
  assert(after.docWidth<=before.docWidth+1,'New document-level overflow',{width,variant,
    originalWidth:before.docWidth,afterWidth:after.docWidth});
  if(after.ornament.active){
    assert(after.ornament.pointerEvents==='none','Decor acquired pointer capture',{width,variant});
  }
}
async function runScene(c,width,scene){
  const baselines={};
  const pics=[];
  for(const variant of ['A','B','C']){
    const applied=await evaluate(c,'('+browserApply.toString()+')('+JSON.stringify(variant)+')');
    assert(applied?.ok,'Actual Spacetime toolbar unavailable',{width,scene,applied});
    await sleep(150);
    const snapshot=await evaluate(c,'('+browserSnapshot.toString()+')()');
    if(variant==='A')baselines.A=snapshot;
    else assertProtected(baselines.A,snapshot,width,variant,scene);
    const caseResult={width,scene,variant,zoom:snapshot.zoom,
      realDOM:true,personLabelDOM:snapshot.trackCount,realMacroregionCount:snapshot.macroregions.length,
      yearTickDOM:snapshot.yearTickCount,
      toolbar:snapshot.toolbar,documentWidth:snapshot.docWidth,
      freeToolGap:applied.gap,ornamentVisible:snapshot.ornament.active,
      overlayControlArea:snapshot.ornament.overlapArea,
      candidateResult:snapshot.ornament.overlapArea?'REJECT_OVERLAP':snapshot.ornament.active?'SAFE_TO_REVIEW':'HIDDEN_NOT_APPLICABLE'};
    if(variant==='A')caseResult.candidateResult='CURRENT_BASELINE';
    if(snapshot.ornament.overlapArea>0)report.warnings.push({width,scene,variant,reason:'ornament/control overlap',pixels2:snapshot.ornament.overlapArea});
    if(variant!=='A'&&applied.ornament_expected&&!snapshot.ornament.active)
      report.warnings.push({width,scene,variant,reason:'ornament unexpectedly invisible'});
    report.case_results.push(caseResult);
    const shot='vis3-06-'+scene+'-'+width+'-'+variant.toLowerCase()+'.png';
    await screenshot(c,shot);
    pics.push(shot);
    console.log('VIS3_06_PRODUCTION_DOM_CASE '+JSON.stringify(caseResult));
  }
  return pics;
}
async function start(c,width){
  await c.call('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width<=760});
  await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await c.call('Page.navigate',{url:'about:blank'});
  await until(c,'document.readyState==="complete"',10000);
  await c.call('Page.navigate',{url:ORIGIN+'/#atlas-spacetime'});
  await until(c,'Boolean(document.querySelector("#personSpacetimeMount .spacetime-toolbar .spacetime-controls")) && document.querySelectorAll("#personSpacetimeMount .spacetime-year-axis span").length>0',90000);
  await until(c,'document.fonts.status==="loaded"',30000);
  await sleep(400);
}
async function main(){
 let c;
 try{
  const data=await(await fetch(DEBUG+'/json/list')).json();
  const target=data.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
  assert(target,'No Chrome CDP page');
  c=new CDP(target.webSocketDebuggerUrl);await c.ready();
  await c.call('Page.enable');await c.call('Runtime.enable');
  for(const width of widths){
    await start(c,width);
    await runScene(c,width,'default');
    if(width===1440){
      for(let i=0;i<6;i++){
        const current=await evaluate(c,'document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()');
        if(current==='1500%')break;
        const clicked=await evaluate(c,'(()=>{const b=document.querySelector("#spacetimeCameraZoomIn");if(!b||b.disabled)return false;b.click();return true;})()');
        if(!clicked)break;
        await sleep(650);
      }
      await until(c,'document.querySelector("#spacetimeCameraZoomValue")?.textContent?.trim()==="1500%"',22000);
      await sleep(500);
      await runScene(c,width,'max-zoom');
    }
  }
  report.status='PASS_MEASURED_NOT_APPROVED';
  console.log('VIS3_06_REAL_PRODUCTION_DOM_PREVIEW_PASS '+JSON.stringify({
    scenes:report.case_results.length/3,cases:report.case_results.length,
    screenshots:report.screenshots.length,warningCount:report.warnings.length}));
 }catch(e){
  report.status='FAIL';
  report.error=e.message;report.details=e.details||null;
  process.exitCode=1;console.error('VIS3_06_REAL_PRODUCTION_DOM_PREVIEW_FAIL',e);
 }finally{
  fs.writeFileSync(path.join(OUT,'vis3-06-production-dom-preview.json'),JSON.stringify(report,null,2)+'\n');
  c?.close();
 }
}
await main();
