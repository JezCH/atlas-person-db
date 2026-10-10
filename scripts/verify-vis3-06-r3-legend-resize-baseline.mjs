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

// R3 strictly observes currently deployed A; no B2 injection and no Production writes.
function mountR3Observers(){
 const root=document.querySelector('#personSpacetimeMount');
 const detail=root?.querySelector('details.spacetime-precision-legend');
 if(!root||!detail)return {ok:false};
 let node=detail;const state={node,history:[],replacementCount:0,resizeCount:0,toggleCount:0};
 const add=(event)=>{const current=root.querySelector('details.spacetime-precision-legend');
   state.history.push({event,dpr:Math.round(devicePixelRatio*1000)/1000,
     cssWidth:innerWidth,open:Boolean(current?.open),sameNode:current===node,oldConnected:node.isConnected});
   if(state.history.length>100)state.history.shift();
   if(current&&current!==node){state.replacementCount++;node=current;}
 };
 const observer=new MutationObserver(()=>{const cur=root.querySelector('details.spacetime-precision-legend');
   if(cur&&cur!==node)add('legend-node-replaced');});
 observer.observe(root,{childList:true,subtree:true});
 root.addEventListener('toggle',e=>{if(e.target.matches('details.spacetime-precision-legend')){
   state.toggleCount++;add('native-toggle-event');}},true);
 window.addEventListener('resize',()=>{state.resizeCount++;add('window-resize');});
 window.__atlasR3={state,observer,initialNode:detail};
 add('observer-installed');
 return {ok:true,open:detail.open,dpr:devicePixelRatio};
}
function r3State(){
 const root=document.querySelector('#personSpacetimeMount');
 const d=root?.querySelector('details.spacetime-precision-legend');
 if(!root||!d)return {ok:false};
 const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();
   return [b.x,b.y,b.width,b.height].map(q=>Math.round(q*100)/100);};
 const area=(a,b)=>{if(!a||!b)return 0;
   const w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]));
   const h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
   return Math.round(w*h*100)/100;};
 const isVis=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();
   return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;};
 const ownText=e=>[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
 const legendTexts=[...d.querySelectorAll('p,li,small,strong,span')].filter(e=>isVis(e)&&ownText(e).length>1)
    .map(e=>({txt:ownText(e).slice(0,70),rect:r(e)})).filter(q=>q.rect);
 const outside=[...root.querySelectorAll('p,small,strong,span,label,output')]
   .filter(e=>!d.contains(e)&&!e.closest('.spacetime-scroll')&&isVis(e)&&ownText(e).length>1)
   .map(e=>({el:e,txt:ownText(e).slice(0,75),rect:r(e)}))
   .filter(v=>v.rect&&v.rect[1]>=50&&v.rect[1]<360);
 const occlusions=[];
 for(const t of legendTexts)for(const o of outside){
   const a=area(t.rect,o.rect);if(a<1)continue;
   const left=Math.max(t.rect[0],o.rect[0]),right=Math.min(t.rect[0]+t.rect[2],o.rect[0]+o.rect[2]);
   const topY=Math.max(t.rect[1],o.rect[1]),bottomY=Math.min(t.rect[1]+t.rect[3],o.rect[1]+o.rect[3]);
   const cx=(left+right)/2,cy=(topY+bottomY)/2;
   const top=document.elementFromPoint(cx,cy);
   occlusions.push({legendText:t.txt,underText:o.txt,overlapPx2:a,
      topInLegend:Boolean(top&&d.contains(top)),topTag:top?.tagName||null});
 }
 occlusions.sort((a,b)=>b.overlapPx2-a.overlapPx2);
 const tracker=window.__atlasR3;
 const status=root.querySelector('#spacetimeDeferredLabelCount')?.parentElement;
 const b=d.getBoundingClientRect();
 return {ok:true,native:{dpr:Math.round(devicePixelRatio*1000)/1000,width:innerWidth,height:innerHeight,
    visualScale:visualViewport?.scale||null},
   detail:{open:d.open,rect:r(d),summaryRect:r(d.querySelector('summary')),summaryText:d.querySelector('summary')?.innerText.trim(),
    computed:{position:getComputedStyle(d).position,zIndex:getComputedStyle(d).zIndex,overflow:getComputedStyle(d).overflow}},
   status:{rect:r(status),text:status?.textContent?.trim().slice(0,140)||null,overlapWithWholeDetails:area(r(status),r(d))},
   events:tracker?{history:tracker.state.history.slice(-15),initialNodeSame:tracker.initialNode===d,
     initialNodeConnected:tracker.initialNode.isConnected,resizeCount:tracker.state.resizeCount,
     toggleCount:tracker.state.toggleCount,replacementCount:tracker.state.replacementCount}:null,
   overlappingTextPairs:occlusions.slice(0,14),overlappingPairCount:occlusions.length,
   visibleLegendText:legendTexts.map(x=>x.txt).slice(0,10),externallyVisibleStatusText:outside.map(x=>x.txt).slice(0,10),
   actualMacroregions:root.querySelectorAll('.spacetime-region-head-layer.is-macro .spacetime-region-head-band').length,
   personInspectorSelected:Boolean(root.querySelector('#spacetimeInspector:not(.is-empty)')),
   computedScrollbarWidth:document.documentElement.scrollWidth,
   viewportBounds:r(root),rootScroll:{x:root.querySelector('.spacetime-scroll')?.scrollLeft||0,y:root.querySelector('.spacetime-scroll')?.scrollTop||0}
 };
}
async function captureR3(c,tag,target,expectedOpen){
 const state=await evaluate(c,'('+r3State.toString()+')()');
 const labels=await evaluate(c,'('+populatedMetrics.toString()+')()');
 assert(state?.ok && Math.abs(state.native.dpr-target)<.012,'Not actual native zoom',{tag,target,state});
 assert(state.detail.open===expectedOpen,'Unexpected actual Production legend state',{tag,expectedOpen,observed:state.detail.open});
 assert(state.personInspectorSelected && labels?.visibleLabelCount>0,'No selected real Person labels',{tag,state,labels});
 assert(state.actualMacroregions===9,'Expected all nine historical regions',{tag,count:state.actualMacroregions});
 const result={tag,expectedPercent:target*100,actual:state,visiblePeople:labels.visibleLabelCount,
   visibleRailCount:labels.visibleRailCount,realActivities:labels.inspectorActivities};
 report.observations.push(result);
 await screenshot(c,'vis3-06-r3-'+tag+'.png');
 console.log('VIS3_06_R3_BASELINE_OBSERVATION '+JSON.stringify({
   tag,expectedPercent:result.expectedPercent,dpr:state.native.dpr,width:state.native.width,
   open:state.detail.open,initialNodeSame:state.events?.initialNodeSame,
   oldConnected:state.events?.initialNodeConnected,replacementCount:state.events?.replacementCount,
   events:state.events?.history.slice(-5),textCollisions:state.overlappingTextPairs.slice(0,5),
   visiblePeople:result.visiblePeople,activities:result.realActivities}));
 return state;
}
async function main(){
 let c;report.schema='atlas-vis3-06-r3-native-zoom-baseline-ux-audit/v1';
 report.mode='Production A only; native GUI Chrome real X11 keyboard; audit, never deploy';
 report.observations=[];report.screenshots=[];report.warnings=[];report.status='PENDING';
 try{
  const tabs=await(await fetch(DEBUG+'/json/list')).json();
  const page=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
  assert(page,'Desktop CDP unavailable');c=new CDP(page.webSocketDebuggerUrl);
  await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
  await enterProduction(c);
  await focusRealProductionPerson(c);await scanPopulatedEra(c,1440);await selectVisibleProductionLabel(c);
  const variant=await evaluate(c,'('+browserApply.toString()+')("A")');
  assert(variant?.ok,'Production A baseline unavailable');
  const opened=await evaluate(c,"(()=>{const d=document.querySelector('#personSpacetimeMount details.spacetime-precision-legend');if(!d)return null;if(!d.open)d.querySelector('summary').click();return d.open;})()");
  assert(opened,'Could not open native legend');
  const installed=await evaluate(c,'('+mountR3Observers.toString()+')()');
  assert(installed.ok,'Could not install read-only DOM observers');
  await captureR3(c,'100-open',1,true);
  for(const target of [1.25,1.5]){
    const changed=await advanceRealNativeZoom(c,target);
    report.shortcutPaths=report.shortcutPaths||[];report.shortcutPaths.push(changed);
    await sleep(700);
    const after=await evaluate(c,'('+r3State.toString()+')()');
    assert(after.ok && Math.abs(after.native.dpr-target)<.012,'Native Chrome target not reached',{target,after});
    report.zoomTransitions=report.zoomTransitions||[];
    report.zoomTransitions.push({target,openBeforeReopen:after.detail.open,
      initialNodeSame:after.events.initialNodeSame,oldNodeConnected:after.events.initialNodeConnected,
      replacementCount:after.events.replacementCount,events:after.events.history});
    await captureR3(c,Math.round(target*100)+'-immediately-after-native-zoom',target,after.detail.open);
    if(!after.detail.open){
      const reopened=await evaluate(c,"(()=>{const d=document.querySelector('#personSpacetimeMount details.spacetime-precision-legend');d.querySelector('summary').click();return d.open;})()");
      assert(reopened,'Failed clicking real summary to reopen',{target});
      await sleep(150);
    }
    await captureR3(c,Math.round(target*100)+'-reopened',target,true);
  }
  report.status='AUDIT_COMPLETE_NATIVE_GUI_BASELINE_NOT_DEPLOYED';
  console.log('VIS3_06_R3_BASELINE_AUDIT_COMPLETE '+JSON.stringify({samples:report.observations.length,
    screenshots:report.screenshots.length,
    transitions:report.zoomTransitions.map(t=>({percent:t.target*100,open:t.openBeforeReopen,
      nodeSame:t.initialNodeSame,replaced:t.replacementCount})),
    textOverlap:report.observations.map(t=>({tag:t.tag,count:t.actual.overlappingPairCount,
      top:t.actual.overlappingTextPairs.slice(0,2)}))}));
 }catch(e){
  report.status='FAIL';report.error=e.message;report.details=e.details||null;
  console.error('VIS3_06_R3_BASELINE_AUDIT_FAIL',e);
  process.exitCode=1;
 }finally{
  fs.writeFileSync(path.join(OUT,'vis3-06-r3-native-baseline-audit.json'),JSON.stringify(report,null,2)+'\n');
  c?.close();
 }
}
await main();
