// VIS3-06-P: READ-ONLY actual Production DOM A/B/C design comparison.
// Browser-only stylesheet injection; NEVER modifies GitHub runtime, APIs, or DB.
// Not a deployment/release or an approval to change the Spacetime UI.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
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
      const a=JSON.parse(String(ev.data));
      if(!a.id){if(a.method==='Fetch.requestPaused')this.handleFetch?.(a.params);return;}
      const p=this.pending.get(a.id);
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

// P2 extension: foreground actual Production-person visualization, not just empty top-of-world.
function populatedMetrics() {
  const root=document.querySelector('#personSpacetimeMount'), scroll=root?.querySelector('.spacetime-scroll');
  if(!scroll)return null;
  const vr=scroll.getBoundingClientRect();
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
  const visible=e=>{
    const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return r.width>0&&r.height>0&&parseFloat(s.opacity)>0.02&&r.right>vr.left+24&&
      r.left<vr.right-6&&r.bottom>vr.top+48&&r.top<vr.bottom-8;
  };
  const labels=[...root.querySelectorAll('.spacetime-track-label')].filter(visible);
  const rails=[...root.querySelectorAll('.spacetime-track-rail')].filter(visible);
  const overlaps=[];
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=rect(labels[i]),b=rect(labels[j]);
    const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x));
    const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
    if(w>.5&&h>.5)overlaps.push({
      nameA:labels[i].textContent?.trim().slice(0,70),
      nameB:labels[j].textContent?.trim().slice(0,70),
      area:Math.round(w*h*100)/100
    });
  }
  const inspector=root.querySelector('#spacetimeInspector');
  return {visibleLabelCount:labels.length,visibleRailCount:rails.length,
    labelNames:labels.slice(0,8).map(e=>e.textContent?.trim()),
    visibleLabelBounds:labels.slice(0,12).map(e=>({person:e.dataset.spacetimePerson,rect:rect(e)})),
    visibleLabelOverlapCount:overlaps.length,visibleLabelOverlaps:overlaps.slice(0,12),
    domLabelCount:root.querySelectorAll('.spacetime-track-label').length,
    domRailCount:root.querySelectorAll('.spacetime-track-rail').length,
    deferredCount:Number(root.querySelector('#spacetimeDeferredLabelCount')?.textContent||'0'),
    inspectorSelected:Boolean(inspector&&!inspector.classList.contains('is-empty')),
    inspectorTitle:inspector?.querySelector('.spacetime-inspector-person strong')?.textContent?.trim()||null,
    inspectorActivities:root.querySelectorAll('[data-spacetime-inspector-activity]').length,
    scrollLeft:Math.round(scroll.scrollLeft),
    scrollTop:Math.round(scroll.scrollTop),
    scrollHeight:Math.round(scroll.scrollHeight),
    scrollWidth:Math.round(scroll.scrollWidth)
  };
}
async function focusRealProductionPerson(c){
  const accepted=await evaluate(c,"(()=>{const input=document.querySelector('#spacetimeSearch');if(!input)return false;input.value='a';input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
  assert(accepted,'Search input unavailable');
  await until(c,"document.querySelectorAll('[data-spacetime-search-result]').length>0",30000);
  const first=await evaluate(c,"(()=>{const b=document.querySelector('[data-spacetime-search-result]');if(!b)return null;const v={label:b.textContent?.trim().slice(0,120),personId:b.dataset.spacetimeSearchResult};b.click();return v;})()");
  assert(first?.personId,'Real Production Person search result missing');
  await until(c,"Boolean(document.querySelector('#spacetimeInspector:not(.is-empty)'))",20000);
  await sleep(500);
  await evaluate(c,"(()=>{const input=document.querySelector('#spacetimeSearch');if(!input)return false;input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
  await until(c,"document.querySelectorAll('.spacetime-track-label').length>0",25000);
  await evaluate(c,"document.querySelector('#spacetimeClearPerson')?.click()");
  await until(c,"Boolean(document.querySelector('#spacetimeInspector.is-empty'))",12000);
  await sleep(250);
  return first;
}
async function scanPopulatedEra(c,width){
  const initial=await evaluate(c,'('+populatedMetrics.toString()+')()');
  assert(initial,'No populated World viewport');
  let best={metric:initial,score:initial.visibleLabelCount*100+initial.visibleRailCount,src:'focused-real-person'};
  const yRatios=[0.22,0.46,0.65,0.79,0.87,0.93,0.97];
  const xRatios=[0.06,0.23,0.42,0.60,0.79,0.96];
  let sampled=0;
  for(const y of yRatios){
    for(const x of xRatios){
      await evaluate(c,"(()=>{const s=document.querySelector('#personSpacetimeMount .spacetime-scroll');s.scrollLeft=Math.round((s.scrollWidth-s.clientWidth)*"+x+");s.scrollTop=Math.round((s.scrollHeight-s.clientHeight)*"+y+");return true;})()");
      await sleep(115);
      const m=await evaluate(c,'('+populatedMetrics.toString()+')()');
      sampled++;
      const score=m.visibleLabelCount*100+m.visibleRailCount;
      if(score>best.score)best={metric:m,score,src:'sample-grid',y,x};
    }
  }
  await evaluate(c,"(()=>{const s=document.querySelector('#personSpacetimeMount .spacetime-scroll');s.scrollLeft="+best.metric.scrollLeft+";s.scrollTop="+best.metric.scrollTop+";return true;})()");
  await sleep(400);
  const landed=await evaluate(c,'('+populatedMetrics.toString()+')()');
  const minLabels=width===390?1:3;
  assert(landed.visibleLabelCount>=minLabels,'No real populated-era viewport reached required density',{
    width,minLabels,initial,best,landed,sampled});
  return {width,searchFocusedInitial:initial.visibleLabelCount,bestSource:best.src,
    scannedPositions:sampled,landed};
}
async function selectVisibleProductionLabel(c){
  const selection=await evaluate(c,"(()=>{const s=document.querySelector('#personSpacetimeMount .spacetime-scroll');if(!s)return null;const r=s.getBoundingClientRect();const items=[...document.querySelectorAll('#personSpacetimeMount .spacetime-track-label')].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.right>r.left+24&&q.left<r.right-6&&q.bottom>r.top+48&&q.top<r.bottom-8});if(!items.length)return null;const b=items[0],v={personId:b.dataset.spacetimePerson,label:b.textContent?.trim()};b.click();return v;})()");
  assert(selection?.personId,'Visible actual Person label is not clickable');
  await until(c,"Boolean(document.querySelector('#spacetimeInspector:not(.is-empty)'))",20000);
  await sleep(350);
  return selection;
}
async function comparePopulatedScene(c,width,scene,context){
  const startIndex=report.case_results.length;
  let baseline=null;
  for(const variant of ['A','B','C']){
    const a=await evaluate(c,'('+browserApply.toString()+')('+JSON.stringify(variant)+')');
    assert(a?.ok,'Real toolbar unavailable');
    await sleep(180);
    const snapshot=await evaluate(c,'('+browserSnapshot.toString()+')()');
    const populated=await evaluate(c,'('+populatedMetrics.toString()+')()');
    assert(populated.visibleLabelCount>0,'Empty scene; zero-label comparison disallowed',{width,scene,variant,populated});
    if(variant==='A')baseline={snapshot,populated};
    else{
      assertProtected(baseline.snapshot,snapshot,width,variant,scene);
      assert(same(baseline.populated,populated),'Real visible Person/inspector/label topology changed',{
        width,scene,variant,baseline:baseline.populated,after:populated});
    }
    const result={width,scene,variant,zoom:snapshot.zoom,realDOM:true,
      visiblePersonLabelDOM:populated.visibleLabelCount,visiblePersonRailDOM:populated.visibleRailCount,
      labelOverlapBaseline:populated.visibleLabelOverlapCount,inspectorSelected:populated.inspectorSelected,
      inspectorActivities:populated.inspectorActivities,
      realMacroregionCount:snapshot.macroregions.length,yearTickDOM:snapshot.yearTickCount,
      ornamentVisible:snapshot.ornament.active,overlayControlArea:snapshot.ornament.overlapArea,
      candidateResult:variant==='A'?'CURRENT_BASELINE':snapshot.ornament.overlapArea?'REJECT_OVERLAP':snapshot.ornament.active?'SAFE_TO_REVIEW':'HIDDEN_NOT_APPLICABLE'};
    report.case_results.push(result);
    await screenshot(c,'vis3-06-'+scene+'-'+width+'-'+variant.toLowerCase()+'.png');
    console.log('VIS3_06_P2_DENSE_CASE '+JSON.stringify(result));
  }
  assert(report.case_results.length===startIndex+3,'Incomplete A/B/C scene');
  report.populated_scenes.push({width,scene,context,baseline:baseline.populated});
}

// VIS3-06-P3: new B2 plate remains in TEST runner; never emitted to Production JS/CSS.
const B2_ASSET='experiments/vis3-06/b2-observatory-toolrail-plate.svg';
const svg=fs.readFileSync(B2_ASSET,'utf8');
assert(svg.includes('viewBox="0 0 184 32"')&&!/javascript:|<script/i.test(svg),'Unexpected B2 research asset');
const B2_URI='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
function applyB2(encodedSvg){
 const root=document.querySelector('#personSpacetimeMount');
 const rail=root?.querySelector('.spacetime-toolbar');
 const controls=rail?.querySelector('.spacetime-controls');
 const legend=rail?.querySelector('.spacetime-precision-legend');
 if(!root||!rail||!controls||!legend)return {ok:false};
 let el=document.querySelector('#atlasVis306B2Style');
 if(!el){
  el=document.createElement('style');el.id='atlasVis306B2Style';
  el.textContent=[
   '#personSpacetimeMount[data-vis3-06-preview="B2"] .spacetime-toolbar{position:relative;isolation:isolate}',
   '#personSpacetimeMount[data-vis3-06-preview="B2"] .spacetime-toolbar::before{content:"";position:absolute;top:5px;left:var(--atlas-vis3-b2-left,0px);width:184px;height:32px;pointer-events:none;z-index:0;display:var(--atlas-vis3-b2-visible,none);background-image:url("'+encodedSvg+'");background-size:184px 32px;background-repeat:no-repeat;opacity:.88}',
   '@media(max-width:900px){#personSpacetimeMount[data-vis3-06-preview="B2"] .spacetime-toolbar::before{display:none!important}}',
   '@media(prefers-reduced-motion:reduce){#personSpacetimeMount[data-vis3-06-preview="B2"] .spacetime-toolbar::before{animation:none!important;transition:none!important}}'
  ].join('\n');
  document.head.appendChild(el);
 }
 const r=rail.getBoundingClientRect(),c=controls.getBoundingClientRect(),l=legend.getBoundingClientRect();
 const legendVisible=getComputedStyle(legend).display!=='none'&&l.width>0;
 const left=c.right+12,right=legendVisible?l.left-12:r.right-12;
 const gap=Math.max(0,right-left);
 const available=innerWidth>900&&gap>=184+24&&r.height>=34;
 rail.style.setProperty('--atlas-vis3-b2-left',String(Math.round((left+right-184)/2-r.left))+'px');
 rail.style.setProperty('--atlas-vis3-b2-visible',available?'block':'none');
 root.setAttribute('data-vis3-06-preview','B2');
 return {ok:true,gap:Math.round(gap*100)/100,visibleExpected:available,frameWidth:184,frameHeight:32};
}
async function compareB2(c,width,scene,context){
 const first=report.case_results.length;
 let baseline=null;
 for(const variant of ['A','B','B2']){
   const applied=variant==='B2'
     ?await evaluate(c,'('+applyB2.toString()+')('+JSON.stringify(B2_URI)+')')
     :await evaluate(c,'('+browserApply.toString()+')('+JSON.stringify(variant)+')');
   assert(applied?.ok,'No usable real tool rail',{width,scene,variant,applied});
   await sleep(160);
   const snapshot=await evaluate(c,'('+browserSnapshot.toString()+')()');
   const people=await evaluate(c,'('+populatedMetrics.toString()+')()');
   assert(people.visibleLabelCount>0,'P3 refuses empty Person viewport',{width,scene,variant});
   if(variant==='A')baseline={snapshot,people};
   else {
     assertProtected(baseline.snapshot,snapshot,width,variant,scene);
     assert(same(baseline.people,people),'Visible real Person/inspector changed under B2 ornament',{width,scene,variant,before:baseline.people,after:people});
     assert(!snapshot.ornament.overlapArea,'Decorative B/B2 control overlay',{width,scene,variant,area:snapshot.ornament.overlapArea});
     if(variant==='B2'&&applied.visibleExpected)assert(snapshot.ornament.active,'B2 plate unexpectedly hidden',{width,scene});
   }
   // All 3 variants preserve the identical Production route, labels, scroll, zoom, and real Person geometry.
   const caze={width,scene,variant,zoom:snapshot.zoom,
     visiblePersonLabels:people.visibleLabelCount,visiblePersonRails:people.visibleRailCount,
     visibleLabelOverlaps:people.visibleLabelOverlapCount,
     personInspectorSelected:people.inspectorSelected,selectedActivityCount:people.inspectorActivities,
     years:snapshot.yearTickCount,macroregions:snapshot.macroregions.length,
     toolGap:applied.gap,ornamentVisible:snapshot.ornament.active,
     ornamentRect:snapshot.ornament.rect,
     interactionOverlapArea:snapshot.ornament.overlapArea,
     noSourceChanges:true};
   report.case_results.push(caze);
   await screenshot(c,'vis3-06-p3-'+scene+'-'+width+'-'+variant.toLowerCase()+'.png');
   console.log('VIS3_06_P3_B2_REAL_DATA_CASE '+JSON.stringify(caze));
 }
 assert(report.case_results.length===first+3,'Expected all three B2 comparisons');
 report.populated_scenes.push({width,scene,baselineLabelCount:baseline.people.visibleLabelCount,
   baselineInspector:baseline.people.inspectorSelected,context});
}

// Native zoom preflight (NOT CDP Emulation.setDeviceMetricsOverride / DPR proxy).
// The GUI shortcut is physically sent to a genuine headed Chromium X11 window.
function actualZoom(){
 return {
  dpr:Math.round(window.devicePixelRatio*1000)/1000,
  cssWidth:window.innerWidth,cssHeight:window.innerHeight,
  screenWidth:window.screen.width,
  visualScale:window.visualViewport?.scale||null,
  displayInner:window.document.documentElement.clientWidth
 };
}
function findChromeWindow(){
 const p=execFileSync('xdotool',['search','--onlyvisible','--class','chrome'],{encoding:'utf8'}).trim();
 assert(p,'X11 native Chrome window not found');
 const wins=p.split('\n').filter(Boolean);
 const win=wins[0];
 execFileSync('xdotool',['windowactivate','--sync',win],{encoding:'utf8'});
 return win;
}
async function advanceRealNativeZoom(c,target){
 let values=[];
 const win=findChromeWindow();
 for(let attempt=0;attempt<8;attempt++){
  let current=await evaluate(c,'('+actualZoom.toString()+')()');
  values.push({attempt,dpr:current.dpr,width:current.cssWidth});
  if(Math.abs(current.dpr-target)<0.012) return {target,nativeConfirmed:current,attempts:values,windowId:win};
  assert(current.dpr < target-0.012,'Overshot native page zoom target or unexpected DPR',{target,current,values});
  execFileSync('xdotool',['key','--clearmodifiers','--window',win,'ctrl+equal'],{encoding:'utf8'});
  await sleep(500);
 }
 const final=await evaluate(c,'('+actualZoom.toString()+')()');
 assert(Math.abs(final.dpr-target)<0.012,'Chrome native Ctrl+equal zoom was NOT verified; do not treat as native',{target,final,values});
 return {target,nativeConfirmed:final,attempts:values,windowId:win};
}
async function enterProduction(c){
 await c.call('Emulation.clearDeviceMetricsOverride');
 await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.call('Page.navigate',{url:ORIGIN+'/#atlas-spacetime'});
 await until(c,'Boolean(document.querySelector("#personSpacetimeMount .spacetime-toolbar .spacetime-controls")) && document.querySelectorAll("#personSpacetimeMount .spacetime-year-axis span").length>0',90000);
 await until(c,'document.fonts.status==="loaded"',30000);
 await sleep(350);
 const native=await evaluate(c,'('+actualZoom.toString()+')()');
 assert(Math.abs(native.dpr-1)<.012,'Headful Chrome native 100% baseline not established',{native});
 assert(native.cssWidth>1000&&native.cssWidth<1700,'Unexpected physical browser window width',{native});
 return native;
}
function extraControls(){
 const root=document.querySelector('#personSpacetimeMount'),toolbar=root?.querySelector('.spacetime-toolbar');
 const legend=root?.querySelector('details.spacetime-precision-legend');
 const pseudo=toolbar&&getComputedStyle(toolbar,'::before');
 const tr=toolbar?.getBoundingClientRect();
 const active=Boolean(pseudo?.content!=='none'&&pseudo?.display!=='none'&&Number(pseudo?.opacity||0)>0);
 const decor=active?{left:tr.left+parseFloat(pseudo.left),top:tr.top+parseFloat(pseudo.top),
  right:tr.left+parseFloat(pseudo.left)+parseFloat(pseudo.width),bottom:tr.top+parseFloat(pseudo.top)+parseFloat(pseudo.height)}:null;
 const onScreen=e=>{let v=e.getBoundingClientRect(),s=getComputedStyle(e);return v.width>0&&v.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
 const controls=[...toolbar.querySelectorAll('button,input,summary')].filter(onScreen);
 const descriptions=[...legend.querySelectorAll('p,li,small,strong')].filter(onScreen);
 const overlap=(r,e)=>{if(!r)return 0;let b=e.getBoundingClientRect();
  return Math.max(0,Math.min(r.right,b.right)-Math.max(r.left,b.left))*Math.max(0,Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top))};
 return {legendOpen:Boolean(legend.open),legendText:legend.innerText.trim(),
  visibleCtrlRects:controls.map(e=>[e.id||e.tagName,[e.getBoundingClientRect().x,e.getBoundingClientRect().y,e.getBoundingClientRect().width,e.getBoundingClientRect().height].map(x=>Math.round(x*100)/100)]),
  overlapControl:Math.round(100*controls.reduce((a,e)=>a+overlap(decor,e),0))/100,
  overlapText:Math.round(100*descriptions.reduce((a,e)=>a+overlap(decor,e),0))/100,
  ornamentPointer:active?pseudo.pointerEvents:null,
  ornamentVisible:active};
}
async function compareNative(c,target,context){
 let baseline;
 const scene=Math.round(target*100)+'pct-selected-legend';
 for(const variant of ['A','B2']){
  const x=variant==='A'?
   await evaluate(c,'('+browserApply.toString()+')("A")'):
   await evaluate(c,'('+applyB2.toString()+')('+JSON.stringify(B2_URI)+')');
  assert(x?.ok,'Live Production toolbar not found',{target,variant});
  await sleep(200);
  const zoom=await evaluate(c,'('+actualZoom.toString()+')()');
  const snap=await evaluate(c,'('+browserSnapshot.toString()+')()');
  const people=await evaluate(c,'('+populatedMetrics.toString()+')()');
  const ctl=await evaluate(c,'('+extraControls.toString()+')()');
  assert(Math.abs(zoom.dpr-target)<.012,'Native zoom ratio not proven in given visual comparison',{target,variant,zoom});
  assert(people?.visibleLabelCount>0,'Actual Person virtualized viewport empty',{target,variant,people});
  assert(people.inspectorSelected,'Real Person inspector not retained',{target,variant});
  assert(ctl.legendOpen,'Real visible Legend details not open',{target,variant});
  assert(snap.macroregions.length===9,'Nine actual macroregions missing',{target,variant,regions:snap.macroregions});
  if(variant==='A')baseline={zoom,snap,people,ctl};
  else{
   assertProtected(baseline.snap,snap,snap.width,variant,scene);
   assert(same(baseline.zoom,zoom),'Changing B2 changed native zoom layout',{target});
   assert(same(baseline.people,people),'Changing B2 changed real Person/Inspector',{target});
   for(const key of ['legendOpen','legendText','visibleCtrlRects'])
     assert(same(baseline.ctl[key],ctl[key]),'B2 altered real Legend/controls '+key,{target,after:ctl[key]});
   assert(ctl.overlapControl===0 && ctl.overlapText===0,'B2 intrudes on actual controls or readable legend',{target,ctl});
   assert(!snap.ornament.overlapArea,'B2 intersects known controls',{target,area:snap.ornament.overlapArea});
   if(ctl.ornamentVisible)assert(ctl.ornamentPointer==='none','B2 captured events',{target});
  }
  const rec={targetPercent:target*100,variant,scene,nativeZoom:zoom,
    actualVisiblePersonLabels:people.visibleLabelCount,
    actualPersonRailCount:people.visibleRailCount,realInspectorActivities:people.inspectorActivities,
    toolGap:x.gap,decorativeVisible:ctl.ornamentVisible,
    legendTextLength:ctl.legendText.length,
    overlapControlsPx2:ctl.overlapControl,overlapLegendPx2:ctl.overlapText,
    yearTicks:snap.yearTickCount,macroregions:snap.macroregions.length,
    personOverlap:people.visibleLabelOverlapCount,docWidth:snap.docWidth,
    status:variant==='A'?'ACTUAL_NATIVE_BASELINE':'REAL_NATIVE_CSS_ONLY_B2_GEOMETRY_PASS'};
  report.case_results.push(rec);
  console.log('VIS3_06_R2_NATIVE_ZOOM_CASE '+JSON.stringify(rec));
  await screenshot(c,'vis3-06-r2-native-'+scene+'-'+variant.toLowerCase()+'.png');
 }
}

// R4 browser-only minimal-proposed-fix preflight. Never changes app files.
function installR4PrototypeTestPatch(){
 const mount=document.querySelector('#personSpacetimeMount');
 const prop=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
 if(!mount||!prop?.set||!prop?.get)return {ok:false,reason:'cannot instrument native setter'};
 if(Object.prototype.hasOwnProperty.call(mount,'innerHTML'))return {ok:false,reason:'already wrapped'};
 const selectors=['.spacetime-precision-legend','.spacetime-status-more'];
 const audit={writes:0,restores:[],lastSource:null};
 Object.defineProperty(mount,'innerHTML',{
  configurable:true,enumerable:true,
  get(){return prop.get.call(this)},
  set(markup){
   const isTimeline=typeof markup==='string'&&markup.includes('spacetime-toolbar')&&markup.includes('spacetime-status-row');
   const before=isTimeline?selectors.map(s=>this.querySelector(s)?.open??false):[];
   prop.set.call(this,markup);
   if(isTimeline){
    const after=[];
    for(let i=0;i<selectors.length;i++){
     const el=this.querySelector(selectors[i]);
     if(el)el.open=before[i];
     after.push(Boolean(el?.open));
    }
    audit.writes++;audit.restores.push({before,after});
   }
  }
 });
 window.__atlasR4BrowserOnlyFixAudit=audit;
 return {ok:true,selectors,initial:selectors.map(s=>Boolean(mount.querySelector(s)?.open))};
}
function getR4State(){
 const root=document.querySelector('#personSpacetimeMount');
 const a=root?.querySelector('details.spacetime-precision-legend');
 const b=root?.querySelector('details.spacetime-status-more');
 const scroll=root?.querySelector('.spacetime-scroll');
 const inspector=root?.querySelector('#spacetimeInspector');
 const active=document.activeElement;
 const track=[...root.querySelectorAll('.spacetime-track-label')].filter(e=>{
  const x=e.getBoundingClientRect(),v=scroll.getBoundingClientRect();
  return x.width>0&&x.height>0&&x.right>v.left+24&&x.left<v.right-6&&x.bottom>v.top+48&&x.top<v.bottom-8;
 });
 return {dpr:Math.round(devicePixelRatio*1000)/1000,width:innerWidth,legendOpen:Boolean(a?.open),
  statusOpen:Boolean(b?.open),legendText:a?.textContent?.trim().slice(0,240)||null,
  statusText:b?.textContent?.trim().slice(0,240)||null,
  inspectorSelected:Boolean(inspector&&!inspector.classList.contains('is-empty')),
  activities:root.querySelectorAll('[data-spacetime-inspector-activity]').length,
  realVisibleLabels:track.length,
  regions:root.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band').length,
  years:root.querySelectorAll('.spacetime-year-axis span').length,
  appZoom:root.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim(),
  scrollWidth:scroll?.scrollWidth,scrollHeight:scroll?.scrollHeight,
  focusTag:active?.tagName,focusText:active?.textContent?.trim().slice(0,40),
  patchWrites:window.__atlasR4BrowserOnlyFixAudit?.writes||0,
  patchRestores:window.__atlasR4BrowserOnlyFixAudit?.restores?.slice(-8)||[]};
}
async function zoomDownR4(c,target){
 const win=findChromeWindow();
 for(let i=0;i<7;i++){
  const q=await evaluate(c,'('+actualZoom.toString()+')()');
  if(Math.abs(q.dpr-target)<.012)return q;
  assert(q.dpr>target+.012,'Zoom down target already overshot',{target,q});
  execFileSync('xdotool',['key','--clearmodifiers','--window',win,'ctrl+minus'],{encoding:'utf8'});
  await sleep(450);
 }
 const last=await evaluate(c,'('+actualZoom.toString()+')()');
 assert(Math.abs(last.dpr-target)<.012,'Actual Chrome native zoom down not achieved',{target,last});
 return last;
}
async function auditR4(c,tag,expectedZoom,open){
 let state=await evaluate(c,'('+getR4State.toString()+')()');
 assert(Math.abs(state.dpr-expectedZoom)<.012,'Chrome is not at target native zoom',{tag,expectedZoom,state});
 assert(state.legendOpen===open&&state.statusOpen===open,'Browser-only fix failed to restore user open/closed choice',{tag,open,state});
 assert(state.inspectorSelected&&state.activities>0,'Real inspector/activities unavailable',{tag,state});
 assert(state.regions===9&&state.years>0,'Real historical axes unavailable',{tag,state});
 if(!state.realVisibleLabels){
  await scanPopulatedEra(c,1440);
  state=await evaluate(c,'('+getR4State.toString()+')()');
  assert(state.legendOpen===open&&state.statusOpen===open,'State changed during real Person retarget',{tag,state});
 }
 assert(state.realVisibleLabels>0,'No actual visible Person labels',{tag,state});
 report.case_results.push({tag,expectedZoom,expectedOpen:open,state});
 await screenshot(c,'vis3-06-r4-'+tag+'.png');
 console.log('VIS3_06_R4_REAL_NATIVE_CASE '+JSON.stringify({tag,zoom:state.dpr,width:state.width,
  legendOpen:state.legendOpen,statusOpen:state.statusOpen,patchWrites:state.patchWrites,
  patchRestores:state.patchRestores.slice(-2),actualLabels:state.realVisibleLabels,
  selected:state.inspectorSelected,activityCount:state.activities,regions:state.regions,
  years:state.years,appZoom:state.appZoom}));
}

// R5: browser-only summary focus/open-state preservation. No app JS/CSS edits.
function r5Snapshot(){
 const mount=document.querySelector('#personSpacetimeMount');
 const precision=mount?.querySelector('details.spacetime-precision-legend');
 const status=mount?.querySelector('details.spacetime-status-more');
 const active=document.activeElement;
 const state=window.__atlasR5TemporaryFocusPatch;
 const focusTarget=active===precision?.querySelector('summary')?'precision':
   active===status?.querySelector('summary')?'status':'other';
 const scroll=mount?.querySelector('.spacetime-scroll');
 const vr=scroll?.getBoundingClientRect();
 const labels=[...(mount?.querySelectorAll('.spacetime-track-label')||[])].filter(e=>{
  const b=e.getBoundingClientRect();
  return vr&&b.width>0&&b.height>0&&b.right>vr.left+24&&b.left<vr.right-6&&b.bottom>vr.top+48&&b.top<vr.bottom-8;
 });
 const rect=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();
  return [r.left,r.top,r.width,r.height].map(v=>Math.round(v*100)/100)};
 return {dpr:Math.round(devicePixelRatio*1000)/1000,cssWidth:innerWidth,
   precisionOpen:Boolean(precision?.open),statusOpen:Boolean(status?.open),
   precisionSummary:precision?.querySelector('summary')?.textContent?.trim(),
   statusSummary:status?.querySelector('summary')?.textContent?.trim(),
   focusTarget,focusTag:active?.tagName||null,focusVisible:Boolean(active?.matches(':focus-visible')),
   focusRect:rect(active),
   personSelected:Boolean(mount?.querySelector('#spacetimeInspector:not(.is-empty)')),
   activityCount:mount?.querySelectorAll('[data-spacetime-inspector-activity]').length||0,
   personCount:labels.length,yearTicks:mount?.querySelectorAll('.spacetime-year-axis span').length||0,
   regions:mount?.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band').length||0,
   appZoom:mount?.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim(),
   patchWrites:state?.writes??0,patchRestores:state?.restores?.slice(-5)||[],
   docWidth:document.documentElement.scrollWidth,
   landmark:rect(precision?.querySelector('summary'))};
}
function installR5FocusPatch(){
 const mount=document.querySelector('#personSpacetimeMount');
 const prop=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
 if(!mount||!prop?.set||!prop?.get||Object.prototype.hasOwnProperty.call(mount,'innerHTML'))
  return {ok:false};
 const selectors=['details.spacetime-precision-legend','details.spacetime-status-more'];
 const summaries=selectors.map(q=>q+' > summary');
 const audit={writes:0,restores:[]};
 Object.defineProperty(mount,'innerHTML',{
  configurable:true,enumerable:true,
  get(){return prop.get.call(this)},
  set(markup){
   const timeline=typeof markup==='string'&&markup.includes('spacetime-toolbar')&&markup.includes('spacetime-status-row');
   const previousOpen=timeline?selectors.map(s=>Boolean(this.querySelector(s)?.open)):null;
   const focused=timeline?summaries.find(s=>this.querySelector(s)===document.activeElement)||null:null;
   prop.set.call(this,markup);
   if(timeline){
    const after=[];
    selectors.forEach((s,i)=>{
     const el=this.querySelector(s);if(el)el.open=previousOpen[i];
     after.push(Boolean(el?.open));
    });
    let focusRestored=false;
    if(focused){
     const replacement=this.querySelector(focused);
     if(replacement){replacement.focus({preventScroll:true});focusRestored=document.activeElement===replacement;}
    }
    audit.writes++;
    audit.restores.push({previousOpen,after,focused,focusRestored});
   }
  }
 });
 window.__atlasR5TemporaryFocusPatch=audit;
 return {ok:true,selectors,summaries};
}
async function cdptab(c){
 await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
 await c.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
 await sleep(85);
}
async function cdpenter(c){
 // Chrome DevTools keyboard synthesis requires the character event on Linux
 // in addition to a rawKeyDown and keyUp for native <summary> activation.
 const original=await evaluate(c,"(()=>{const e=document.activeElement;if(e?.tagName!=='SUMMARY')return null;return {open:e.parentElement.open,text:e.textContent.trim()};})()");
 assert(original,'No browser-keyboard-focused native summary for Enter');
 const args={key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13};
 await c.call('Input.dispatchKeyEvent',{type:'rawKeyDown',...args});
 await c.call('Input.dispatchKeyEvent',{type:'char',...args,text:'\r',unmodifiedText:'\r'});
 await c.call('Input.dispatchKeyEvent',{type:'keyUp',...args});
 await sleep(160);
 let after=await evaluate(c,"(()=>{const e=document.activeElement;return e?.tagName==='SUMMARY'?e.parentElement.open:null;})()");
 if(after===original.open){
  // Native HTML summary also supports Space activation. Use the actual CDP
  // raw key/char sequence, never artificially set details.open in this stage.
  const sp={key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32};
  await c.call('Input.dispatchKeyEvent',{type:'rawKeyDown',...sp});
  await c.call('Input.dispatchKeyEvent',{type:'char',...sp,text:' ',unmodifiedText:' '});
  await c.call('Input.dispatchKeyEvent',{type:'keyUp',...sp});
  await sleep(160);
  after=await evaluate(c,"(()=>{const e=document.activeElement;return e?.tagName==='SUMMARY'?e.parentElement.open:null;})()");
  report.keyboard_activation_fallbacks=(report.keyboard_activation_fallbacks||0)+1;
 }
 assert(after!==original.open&&after!==null,'CDP real keyboard Enter and Space sequences did not activate native summary',{original,after});
}
async function tabToSummary(c,name){
 assert(name==='precision'||name==='status','Unsupported target');
 // Move by true browser Tab from an actual search input, not element.focus() on the summary.
 const seed=await evaluate(c,"(()=>{const e=document.querySelector('#spacetimeSearch');if(!e)return false;e.focus();return document.activeElement===e;})()");
 assert(seed,'Real search input is not focusable');
 const visits=[];
 for(let i=0;i<22;i++){
  await cdptab(c);
  const st=await evaluate(c,'('+r5Snapshot.toString()+')()');
  visits.push({target:st.focusTarget,tag:st.focusTag,visible:st.focusVisible});
  if(st.focusTarget===name){
   assert(st.focusVisible,'Browser keyboard Tab reached summary without :focus-visible',{name,visits});
   report.keyboard_paths.push({name,visits});
   return st;
  }
 }
 throw Object.assign(new Error('Real Tab sequence never reached summary '+name),{details:visits});
}
async function sampleR5(c,tag,zoom,focus,precisionOpen,statusOpen){
 let s=await evaluate(c,'('+r5Snapshot.toString()+')()');
 assert(Math.abs(s.dpr-zoom)<.012,'Wrong real native browser scale',{tag,zoom,s});
 assert(s.precisionOpen===precisionOpen&&s.statusOpen===statusOpen,'User open/close state lost',{tag,s,precisionOpen,statusOpen});
 assert(s.focusTarget===focus&&s.focusVisible,'Real keyboard focus or ring not retained',{tag,focus,s});
 assert(s.personSelected&&s.activityCount>0,'Production Person selection lost',{tag,s});
 assert(s.regions===9&&s.yearTicks>0&&s.appZoom==='500%','Historical camera/axis invariant failed',{tag,s});
 // Real Person virtualization may briefly show no labels at a native width change.
 if(!s.personCount){
  await scanPopulatedEra(c,1440);
  s=await evaluate(c,'('+r5Snapshot.toString()+')()');
  assert(s.focusTarget===focus&&s.focusVisible,'Focus lost during real data scroll-only reacquisition',{tag,s});
 }
 assert(s.personCount>0,'Real production historical Person labels unavailable',{tag,s});
 report.cases.push({tag,nativeZoom:zoom,state:s});
 await screenshot(c,'vis3-06-r5-'+tag+'.png');
 console.log('VIS3_06_R5_KEYBOARD_CASE '+JSON.stringify({
   tag,dpr:s.dpr,width:s.cssWidth,focus:s.focusTarget,focusVisible:s.focusVisible,
   open:[s.precisionOpen,s.statusOpen],writes:s.patchWrites,
   lastRestore:s.patchRestores.at(-1)||null,persons:s.personCount,
   activity:s.activityCount,regions:s.regions,years:s.yearTicks}));
}

async function sampleR6(c,tag,zoom,focus,precisionOpen,statusOpen){
 let st=await evaluate(c,'('+r5Snapshot.toString()+')()');
 assert(Math.abs(st.dpr-zoom)<.012,'Not actual native Chrome zoom',{tag,zoom,st});
 assert(st.precisionOpen===precisionOpen&&st.statusOpen===statusOpen,'User disclosure states lost in ACTUAL app source',{tag,expected:[precisionOpen,statusOpen],st});
 assert(st.focusTarget===focus&&st.focusVisible,'Summary keyboard focus lost in ACTUAL app source',{tag,focus,st});
 assert(st.personSelected&&st.activityCount>0,'Real Person Inspector/Activity lost',{tag,st});
 assert(st.regions===9&&st.yearTicks>0&&st.appZoom==='500%','Historical invariants failed',{tag,st});
 if(!st.personCount){
   await scanPopulatedEra(c,1440);
   st=await evaluate(c,'('+r5Snapshot.toString()+')()');
   assert(st.focusTarget===focus&&st.focusVisible,'Focus lost on historical viewport reacquisition',{tag,st});
 }
 assert(st.personCount>0,'No real visible Person labels',{tag,st});
 report.cases.push({tag,zoom,st});
 await screenshot(c,'vis3-06-r6-actual-source-'+tag+'.png');
 console.log('VIS3_06_R6_ACTUAL_SOURCE_CASE '+JSON.stringify({
  tag,dpr:st.dpr,width:st.cssWidth,focus:st.focusTarget,ring:st.focusVisible,
  open:[st.precisionOpen,st.statusOpen],realLabels:st.personCount,
  activities:st.activityCount,regions:st.regions,years:st.yearTicks,
  appZoom:st.appZoom,sourceFulfillCount:report.sourceProof.fulfilled}));
}

// R7: actual R6 application source, native browser zoom through desktop-to-mobile boundary.
// No browser DOM patch; only the real app module is substituted once via CDP Fetch.
function r7PresentationSnapshot(getR5){
 const basic=getR5();
 const root=document.querySelector('#personSpacetimeMount');
 const frame=root?.querySelector('.spacetime-frame');
 const scroller=root?.querySelector('.spacetime-scroll');
 const bounds=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(v=>Math.round(v*100)/100)};
 const selectors=['#spacetimeSearch','#spacetimeCameraZoomOut','#spacetimeCameraZoomIn',
 '#spacetimeCameraZoomReset','details.spacetime-precision-legend > summary',
 'details.spacetime-status-more > summary'];
 const buttons=selectors.map(selector=>{const e=root?.querySelector(selector);const b=bounds(e);
  const style=e?getComputedStyle(e):null;
  return {selector,present:Boolean(e),rect:b,display:style?.display||null,
    offscreen:b?b[0]<-2||b[2]>innerWidth+2||b[1]<-2||b[3]>innerHeight+2:null};
 });
 const precision=root?.querySelector('details.spacetime-precision-legend');
 const status=root?.querySelector('details.spacetime-status-more');
 const focusRect=bounds(document.activeElement);
 return {...basic,
   mountedWidth:root?.clientWidth||null,
   presentation:frame?.dataset.spacetimePresentation||null,
   frameAxisWidth:Number.parseFloat(frame?.style.getPropertyValue('--spacetime-axis-width')||'0'),
   frameHeaderHeight:Number.parseFloat(frame?.style.getPropertyValue('--spacetime-header-height')||'0'),
   documentOverflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth),
   timelineScrollWidth:scroller?.scrollWidth||null,
   timelineClientWidth:scroller?.clientWidth||null,
   toolbarRects:buttons,
   focusInViewport:focusRect?focusRect[0]>=-2&&focusRect[2]<=innerWidth+2&&focusRect[1]>=-2&&focusRect[3]<=innerHeight+2:false,
   statusExpandedRect:bounds(status),
   precisionExpandedRect:bounds(precision),
   precisionCSSDisplay:precision?getComputedStyle(precision).display:null,
   statusCSSDisplay:status?getComputedStyle(status).display:null,
   precisionKeyboardAvailable:Boolean(precision&&getComputedStyle(precision).display!=='none' &&
      precision.querySelector('summary')?.getBoundingClientRect().width>0),
   cssMobile:matchMedia('(max-width: 760px)').matches,
   responsiveBreakpointMismatch:(frame?.dataset.spacetimePresentation==='mobile')!==matchMedia('(max-width: 760px)').matches,
   pageResponsiveMobileAtMeasuredWidth:frame?.dataset.spacetimePresentation==='mobile' && root?.clientWidth<=760,
 };
}
async function r7Sample(c,tag,zoom,target,legend,status){
 const expr='('+r7PresentationSnapshot.toString()+')('+r5Snapshot.toString()+')';
 let st=await evaluate(c,expr);
 assert(Math.abs(st.dpr-zoom)<.012,'Chrome native DPR not at requested level',{tag,zoom,st});
 assert(st.precisionOpen===legend&&st.statusOpen===status,'Disclosure changed against explicit user open/close choice',{tag,st,legend,status});
 assert(st.focusTarget===target&&st.focusVisible,'Keyboard SUMMARY focus or ring lost at responsive transition',{tag,target,st});
 assert(st.personSelected&&st.activityCount>0,'Production Person Inspector activity dropped',{tag,st});
 assert(st.regions===9&&st.yearTicks>0&&st.appZoom==='500%','Timeline historical invariants missing',{tag,st});
 assert(st.focusInViewport,'Focused summary not visually inside actual native CSS viewport',{tag,st});
 // The responsive breakpoint is defined by mount.clientWidth <= 760, NOT by
 // window.innerWidth and NOT by a fixed Chrome native zoom threshold.
 const expectedMobile=st.mountedWidth<=760;
 assert((st.presentation==='mobile')===expectedMobile,'DOM does not obey measured mounted viewport <=760px presentation rule',{tag,expectedMobile,st});
 assert(st.frameAxisWidth===(expectedMobile?80:140),'Responsive year/era axis contract altered',{tag,expectedMobile,st});
 // CSS uses top-level @media(max-width:760px), while JS mobile camera presentation
 // uses the narrower mount.clientWidth<=760. Chrome 175% can therefore render a
 // mobile internal timeline with a still visible, keyboard-reachable precision legend.
 assert(st.precisionKeyboardAvailable===!st.cssMobile,
  'Precision legend visibility does not match actual CSS media query',{tag,cssMobile:st.cssMobile,display:st.precisionCSSDisplay,st});
 if(st.responsiveBreakpointMismatch)report.warnings.push({tag,kind:'CSS_VS_CAMERA_BREAKPOINT_MISMATCH',nativeZoom:zoom,
   cssWidth:st.cssWidth,mountWidth:st.mountedWidth,cssMobile:st.cssMobile,cameraMobile:expectedMobile});
 if(zoom>=1.75)assert(expectedMobile,'Physical Chrome 1440px environment expected breakpoint to be passed at >=175%',{tag,st});
 if(zoom<=1.5)assert(!expectedMobile,'Physical Chrome 1440px environment expected desktop <=150%',{tag,st});
 if(!st.personCount){
   await scanPopulatedEra(c,1440);
   st=await evaluate(c,expr);
   assert(st.focusTarget===target&&st.focusVisible,'Keyboard SUMMARY focus lost during real virtualized Person reentry',{tag,st});
 }
 assert(st.personCount>0,'No actual historical labels in active viewport',{tag,st});
 const rectProblems=st.toolbarRects.filter(x=>x.present&&x.rect&&x.offscreen);
 if(rectProblems.length)report.warnings.push({tag,kind:'BOUNDING_RECT_OFFSCREEN_INSPECTION_REQUIRED',rectProblems});
 if(st.documentOverflowX>2)report.warnings.push({tag,kind:'DOCUMENT_HORIZONTAL_SCROLL',overflowPx:st.documentOverflowX});
 report.cases.push({tag,st});
 await screenshot(c,'vis3-06-r7-native-'+tag+'.png');
 console.log('VIS3_06_R7_NATIVE_RESPONSIVE_CASE '+JSON.stringify({
   tag,dpr:st.dpr,width:st.cssWidth,mount:st.mountedWidth,
   presentation:st.presentation,axis:st.frameAxisWidth,head:st.frameHeaderHeight,
   focus:st.focusTarget,ring:st.focusVisible,focusOnScreen:st.focusInViewport,
   opens:[st.precisionOpen,st.statusOpen],labels:st.personCount,
   activities:st.activityCount,yearTicks:st.yearTicks,regions:st.regions,
   bodyOverflow:st.documentOverflowX,offscreenRects:rectProblems.length,
   precisionDisplay:st.precisionCSSDisplay,precisionKeyboardAvailable:st.precisionKeyboardAvailable,
   cssMobile:st.cssMobile,breakpointMismatch:st.responsiveBreakpointMismatch}));
}

function r8SourceLegendAudit(){
 const mount=document.querySelector('#personSpacetimeMount');
 const legend=mount?.querySelector('details.spacetime-precision-legend');
 const status=mount?.querySelector('details.spacetime-status-more');
 const concepts=['공간 배치 정밀도','하위 권역 범위','광역 권역 범위','점선은 배치 정밀도 범위',
   '장소','하위 권역','광역 권역'];
 const isExposed=(node)=>{
  for(let el=node.parentElement;el;el=el.parentElement){
   const cs=getComputedStyle(el);
   if(cs.display==='none'||cs.visibility==='hidden'||el.getAttribute('aria-hidden')==='true'||el.hasAttribute('inert'))return false;
  }
  return true;
 };
 const walker=document.createTreeWalker(mount,NodeFilter.SHOW_TEXT);
 const found=concepts.map(term=>({term,anyDOM:0,nonLegendDOM:0,
   exposedInRoot:0,exposedOutsideLegend:0,otherExposedExamples:[]}));
 let n,checked=0;
 while((n=walker.nextNode())){
  const val=n.textContent.trim();if(!val)continue;checked++;
  const matched=found.filter(item=>val.includes(item.term));
  if(!matched.length)continue; // Avoid expensive computed-style walk for unrelated historical texts.
  const inLegend=Boolean(n.parentElement.closest('details.spacetime-precision-legend'));
  const exposed=isExposed(n);
  for(const item of matched){
   item.anyDOM++;if(!inLegend)item.nonLegendDOM++;
   if(exposed){item.exposedInRoot++;if(!inLegend){
     item.exposedOutsideLegend++;
     if(item.otherExposedExamples.length<3)item.otherExposedExamples.push({
      text:val.slice(0,100),owner:n.parentElement.closest('[id],section,details,article')?.id ||
       n.parentElement.closest('[class]')?.className?.toString().slice(0,100)||'unknown'
     });
   }}
  }
 }
 const uncertainty=[...mount.querySelectorAll('button.spacetime-spatial-uncertainty[aria-label]')];
 const ariaPrecision=uncertainty.filter(e=>e.getAttribute('aria-label')?.includes('정밀도 범위'));
 const availableAriaPrecision=ariaPrecision.filter(e=>isExposed({parentElement:e}));
 const disclaimer=mount.querySelector('.spacetime-inspector-disclaimer');
 return {uncertaintyAriaButtons:uncertainty.length,ariaPrecisionButtons:ariaPrecision.length,
   exposedAriaPrecisionButtons:availableAriaPrecision.length,
   sampleAriaPrecision:availableAriaPrecision.slice(0,3).map(e=>e.getAttribute('aria-label')),
   inspectorDisclaimerText:disclaimer?.textContent?.trim()||null,
   inspectorDisclaimerExposed:Boolean(disclaimer&&isExposed({parentElement:disclaimer})),
   legendPresent:!!legend,legendOpen:Boolean(legend?.open),
  legendDisplay:legend?getComputedStyle(legend).display:null,
  legendContent:legend?.textContent?.trim().slice(0,550)||null,
  statusDisplay:status?getComputedStyle(status).display:null,
  statusOpen:Boolean(status?.open),allLeafTexts:checked,
  concepts:found};
}
async function r8Sample(c,tag,zoom){
 const snap='('+r7PresentationSnapshot.toString()+')('+r5Snapshot.toString()+')';
 let st=await evaluate(c,snap);
 assert(Math.abs(st.dpr-zoom)<.012,'Chrome page native zoom not at target',{tag,zoom,st});
 assert(st.focusTarget==='status'&&st.focusVisible,'Visible mobile status keyboard focus lost',{tag,st});
 assert(st.precisionOpen===true&&st.statusOpen===true,'Previously user-opened disclosures lost',{tag,st});
 assert(st.regions===9&&st.yearTicks>0&&st.appZoom==='500%','Historical timeline invariants lost',{tag,st});
 assert(st.personSelected&&st.activityCount>0,'Real selected Person Inspector activity absent',{tag,st});
 const expectation=zoom>=2;
 assert(st.cssMobile===expectation,'Browser CSS media not as expected',{tag,st});
 assert(st.precisionKeyboardAvailable===!expectation,'Legend visibility mismatch for native CSS breakpoint',{tag,st});
 if(!st.personCount){
  await scanPopulatedEra(c,1440);
  st=await evaluate(c,snap);
  assert(st.focusTarget==='status'&&st.focusVisible,'Retargeting real historical timeline lost status summary focus',{tag,st});
 }
 if(!st.personCount)report.warnings.push({tag,code:'ZERO_VISIBLE_LABELS_AFTER_REAL_ERA_REACQUISITION',warningOnly:true});
 if(st.documentOverflowX>2)report.warnings.push({tag,code:'DOCUMENT_HORIZONTAL_OVERFLOW',px:st.documentOverflowX});
 if(!st.focusInViewport)report.warnings.push({tag,code:'FOCUSED_STATUS_SUMMARY_OUTSIDE_NATIVE_VIEWPORT',focus:st.focusRect});
 const legend=await evaluate(c,'('+r8SourceLegendAudit.toString()+')()');
 if(expectation&&legend.concepts.filter(q=>q.term==='공간 배치 정밀도'||q.term==='하위 권역 범위'||q.term==='광역 권역 범위').every(q=>q.exposedOutsideLegend===0))
  report.warnings.push({tag,code:'NO_EXACT_PRECISION_LEGEND_DESCRIPTION_EXPOSED_OUTSIDE_HIDDEN_DETAILS_IN_SPACETIME_MOUNT'});
 const caseRow={tag,zoom,st,legend};
 report.cases.push(caseRow);
 await screenshot(c,'vis3-06-r8-native-'+tag+'.png');
 console.log('VIS3_06_R8_NATIVE_400_CASE '+JSON.stringify({
  tag,nativeDpr:st.dpr,cssWidth:st.cssWidth,mountWidth:st.mountedWidth,
  cameraLayout:st.presentation,cssMobile:st.cssMobile,
  statusFocused:st.focusTarget,ring:st.focusVisible,focusOnScreen:st.focusInViewport,
  hiddenPrecision:!st.precisionKeyboardAvailable,legendState:st.precisionOpen,
  statusState:st.statusOpen,regions:st.regions,ticks:st.yearTicks,
  persons:st.personCount,activities:st.activityCount,documentOverflow:st.documentOverflowX,
  alternativeAriaPrecision:legend.exposedAriaPrecisionButtons,disclaimerShown:legend.inspectorDisclaimerExposed,
  conceptExposure:legend.concepts.map(q=>[q.term,q.exposedOutsideLegend,q.nonLegendDOM])
 }));
}

// R9: determine why keyboard focus is partly off-screen at native Chrome 400%.
function r9FocusGeometry(){
 const mount=document.querySelector('#personSpacetimeMount');
 const summary=mount?.querySelector('details.spacetime-status-more > summary');
 const precision=mount?.querySelector('details.spacetime-precision-legend > summary');
 const active=document.activeElement;
 const rect=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();
  return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
 };
 const r=rect(summary);
 const x=Math.min(innerWidth-2,Math.max(1,(r?.left+r?.right)/2||0));
 const y=Math.min(innerHeight-2,Math.max(1,(r?.top+r?.bottom)/2||0));
 const hit=document.elementFromPoint(x,y);
 const css=(e)=>{const c=getComputedStyle(e);return {
  overflowX:c.overflowX,overflowY:c.overflowY,position:c.position,
  display:c.display,visibility:c.visibility,transform:c.transform,
  scrollBehavior:c.scrollBehavior,overscrollBehaviorY:c.overscrollBehaviorY,
  clipPath:c.clipPath,pointerEvents:c.pointerEvents
 }};
 const parents=[];let e=summary;
 for(let depth=0;e&&depth<24;depth++,e=e.parentElement){
  parents.push({depth,tag:e.tagName,id:e.id||'',className:typeof e.className==='string'?e.className.slice(0,150):'',
   style:css(e),rect:rect(e),scrollTop:e.scrollTop,scrollLeft:e.scrollLeft,
   scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,
   verticalScrollable:e.scrollHeight>e.clientHeight+2});
 }
 const root=document.scrollingElement;
 return {dpr:devicePixelRatio,viewport:{innerWidth,innerHeight,
   visual:{width:visualViewport?.width,height:visualViewport?.height,
    offsetTop:visualViewport?.offsetTop,scale:visualViewport?.scale},
   documentClient:document.documentElement.clientHeight,
   windowScrollY:scrollY,windowScrollX:scrollX,
   documentScrollTop:root?.scrollTop,documentScrollHeight:root?.scrollHeight,
   documentClientHeight:root?.clientHeight},
  summaryRect:r,precisionRect:rect(precision),
  summaryFocused:active===summary,focusVisible:Boolean(summary?.matches(':focus-visible')),
  entireSummaryInViewport:Boolean(r&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth),
  partlyVisible:Boolean(r&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth),
  bottomOverflowPx:r?Math.max(0,r.bottom-innerHeight):null,
  topOverflowPx:r?Math.max(0,-r.top):null,
  hitTest:{x,y,tag:hit?.tagName||null,className:typeof hit?.className==='string'?hit.className.slice(0,120):'',
   hitsSummary:Boolean(hit&&(hit===summary||summary?.contains(hit)))},
  parents,
  actualPersonSelected:Boolean(mount?.querySelector('#spacetimeInspector:not(.is-empty)')),
  inspectorActivities:mount?.querySelectorAll('[data-spacetime-inspector-activity]').length||0,
  nineRegions:mount?.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band').length||0,
  timelineTicks:mount?.querySelectorAll('.spacetime-year-axis span').length||0,
  cameraValue:mount?.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim(),
  legendHidden:getComputedStyle(mount.querySelector('details.spacetime-precision-legend')).display==='none',
  statusOpen:Boolean(mount?.querySelector('details.spacetime-status-more')?.open)};
}
async function r9Snapshot(c,tag){
 const state=await evaluate(c,'('+r9FocusGeometry.toString()+')()');
 assert(state.nineRegions===9&&state.inspectorActivities>0&&state.actualPersonSelected,
  'Actual historian person/region content unavailable',{tag,state});
 assert(state.summaryFocused&&state.focusVisible,'Genuine summary keyboard focus absent',{tag,state});
 assert(state.cameraValue==='500%'&&state.timelineTicks>0,
  'App camera/year axis historical invariant failed',{tag,state});
 report.snapshots.push({tag,...state});
 await screenshot(c,'vis3-06-r9-'+tag+'.png');
 console.log('VIS3_06_R9_FOCUS_GEOMETRY '+JSON.stringify({
  tag,dpr:state.dpr,viewport:state.viewport.innerHeight,scrollY:state.viewport.windowScrollY,
  statusRect:state.summaryRect,overflowBottom:state.bottomOverflowPx,
  entirelyVisible:state.entireSummaryInViewport,partlyVisible:state.partlyVisible,
  scrollAncestors:state.parents.filter(x=>x.verticalScrollable).map(x=>({
    depth:x.depth,className:x.className,overflow:x.style.overflowY,
    scrollTop:x.scrollTop,client:x.clientHeight,scroll:x.scrollHeight})),
  focusVisible:state.focusVisible,hitTest:state.hitTest,
  regions:state.nineRegions,activities:state.inspectorActivities}));
 return state;
}
async function main(){
 let c;report.schema='vis3-06-r9-native-400-summary-geometry-scroll-restoration/v1';
 report.status='PENDING';report.snapshots=[];report.screenshots=[];report.warnings=[];report.keyboard_paths=[];
 report.sourceProof={paused:0,fulfilled:0,urls:[],errors:[]};
 report.mode='Actual R6 source via CDP Fetch; native headful Chrome 100->400; inspect ancestor scroll/rect; browser-only scrollIntoView diagnostic; no app source/CSS edits';
 const code=fs.readFileSync('atlas-person-spacetime-view.js','utf8');
 assert(code.includes('precisionLegendWasOpen')&&code.includes('snapshot.summary === "precision"'),
  'Wrong actual R6 draft source');
 try{
  const pages=await(await fetch(DEBUG+'/json/list')).json();
  const page=pages.find(q=>q.type==='page'&&q.webSocketDebuggerUrl);
  assert(page,'No headful Chrome tab');c=new CDP(page.webSocketDebuggerUrl);
  await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
  c.handleFetch=async x=>{
   report.sourceProof.paused++;report.sourceProof.urls.push(x.request.url);
   try{
    assert(x.request.url.includes('atlas-person-spacetime-view.js'),'Interception limited to one actual module');
    await c.call('Fetch.fulfillRequest',{requestId:x.requestId,responseCode:200,
      responseHeaders:[{name:'Content-Type',value:'application/javascript; charset=utf-8'},
       {name:'Cache-Control',value:'no-store'}],
      body:Buffer.from(code,'utf8').toString('base64')});
    report.sourceProof.fulfilled++;
   }catch(e){report.sourceProof.errors.push(e.message);
    try{await c.call('Fetch.failRequest',{requestId:x.requestId,errorReason:'Failed'});}catch{}}
  };
  await c.call('Fetch.enable',{patterns:[{urlPattern:'*atlas-person-spacetime-view.js*',requestStage:'Request'}]});
  await enterProduction(c);
  assert(report.sourceProof.fulfilled===1,'Did not intercept real draft module EXACTLY ONCE',{proof:report.sourceProof});
  await focusRealProductionPerson(c);await scanPopulatedEra(c,1440);await selectVisibleProductionLabel(c);
  await tabToSummary(c,'status');await cdpenter(c);
  await r9Snapshot(c,'100-status-open-focus');
  for(const [level,name] of [[2,'200-native'],[3,'300-native'],[4,'400-before-scroll']]){
   await advanceRealNativeZoom(c,level);await sleep(550);
   await r9Snapshot(c,name);
  }
  // Single temporary browser interaction on the user's focused summary. Test actual
  // scrollability and clip recovery; never install setter shim or modify CSS/source.
  const scrollResult=await evaluate(c,"(()=>{const e=document.querySelector('details.spacetime-status-more > summary');const r=e.getBoundingClientRect();e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return {requested:true,priorTop:r.top,priorBottom:r.bottom};})()");
  await sleep(350);
  const after=await r9Snapshot(c,'400-after-native-scroll-into-view');
  report.scrollTest={scrollResult,scrollSucceeded:after.entireSummaryInViewport,
    ancestorMovement:report.snapshots.at(-2).parents.map((p,i)=>{
      const q=after.parents[i];return {node:p.className||p.tag,delta:(q?.scrollTop||0)-p.scrollTop};
    }).filter(x=>x.delta!==0),
    windowScrollDelta:after.viewport.windowScrollY-report.snapshots.at(-2).viewport.windowScrollY};
  // CSS fractional pixel rounding can leave ~0.25px under the viewport after
  // scrollIntoView(nearest). Check whether extra real document scrolling recovers it.
  if(!after.entireSummaryInViewport){
   const direct=await evaluate(c,"(()=>{const before=scrollY;scrollBy({top:12,left:0,behavior:'instant'});return {before,after:scrollY};})()");
   await sleep(220);
   const recovered=await r9Snapshot(c,'400-after-extra-document-scroll');
   report.scrollTest.extraScroll={direct,recovered:recovered.entireSummaryInViewport,
    remainingBottomOverflowPx:recovered.bottomOverflowPx};
  }
  // Test genuine Enter after scrolling; preserve original user's open selection.
  await cdpenter(c);
  const closed=await r9Snapshot(c,'400-user-closed-after-scroll');
  assert(closed.statusOpen===false,'Real keyboard Enter did not close status after scroll');
  await cdpenter(c);
  const reopened=await r9Snapshot(c,'400-user-reopened-after-scroll');
  assert(reopened.statusOpen===true,'Real keyboard Enter did not reopen status after scroll');
  await zoomDownR4(c,2);await sleep(350);
  await r9Snapshot(c,'200-native-return');
  await zoomDownR4(c,1);await sleep(400);
  await r9Snapshot(c,'100-native-return');
  assert(report.sourceProof.fulfilled===1,'Source override changed',{proof:report.sourceProof});
  if(!report.scrollTest.scrollSucceeded)report.warnings.push({kind:'SCROLL_INTO_VIEW_SUBPIXEL_BOTTOM_REMAINDER',extraScroll:report.scrollTest.extraScroll});
  if(report.snapshots.find(x=>x.tag==='400-before-scroll')?.bottomOverflowPx>0)
    report.warnings.push({kind:'NATIVE_400_FOCUS_PARTIALLY_BELOW_VIEWPORT_CONFIRMED'});
  report.status='PASS_ROOT_CAUSE_GEOMETRY_CAPTURED_NO_RUNTIME_DEPLOY';
  console.log('VIS3_06_R9_ROOT_CAUSE_DIAGNOSTIC_PASS '+JSON.stringify({
    cases:report.snapshots.length,sourceLoads:report.sourceProof.fulfilled,
    before:report.snapshots.find(x=>x.tag==='400-before-scroll')?.summaryRect,
    after:report.snapshots.find(x=>x.tag==='400-after-native-scroll-into-view')?.summaryRect,
    scroll:report.scrollTest,warnings:report.warnings}));
 }catch(e){
  report.status='FAIL';report.error=e.message;report.details=e.details||null;process.exitCode=1;
  console.error('VIS3_06_R9_ROOT_CAUSE_DIAGNOSTIC_FAIL',e);
 }finally{
  if(c){try{await c.call('Fetch.disable');}catch{}c.close();}
  fs.writeFileSync(path.join(OUT,'vis3-06-r9-native-focus-scroll-root-cause.json'),JSON.stringify(report,null,2)+'\n');
 }
}
await main();
