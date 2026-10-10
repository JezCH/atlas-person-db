/* VIS3-05R-D: current Production read-only browser A/B. The D
 * presentation is only injected in this local Chrome tab, never deployed. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const PORT=process.env.ATLAS_CDP_URL||'http://127.0.0.1:9224';
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||'artifacts/vis3-05r-d-browser';
const SHA=process.env.ATLAS_BRANCH_SHA||'unverified';
const src=fs.readFileSync('atlas-ui-phase3-ornaments.css','utf8');
const marker='/* VIS3-05R-D — restrained mixed';
const idx=src.indexOf(marker);
if(idx<0)throw Error('Missing selected D stylesheet');
const delta=src.slice(idx);
fs.mkdirSync(OUT,{recursive:true});
const wait=n=>new Promise(r=>setTimeout(r,n));
const report={schema:'atlas-vis3-05r-d-browser/v1',branch_sha:SHA,origin:ORIGIN,method:'Production same DOM + branch CSS and h3 attribute injected locally',status:'PENDING',cases:[],shots:[]};
function ok(test,msg,details){if(!test){const e=Error(msg);e.details=details;throw e;}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
 async ready(){
  await new Promise((res,rej)=>{if(this.ws.readyState===WebSocket.OPEN)return res();this.ws.addEventListener('open',res,{once:true});this.ws.addEventListener('error',rej,{once:true});});
  this.ws.addEventListener('message',e=>{const x=JSON.parse(String(e.data)),p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result||{});});
 }
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close()}catch{}}
}
async function evalJS(c,expr){const r=await c.call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||r.exceptionDetails.exception?.description||'JS failed');return r.result?.value;}
async function until(c,expr,timeout=90000){const start=Date.now();while(Date.now()-start<timeout){try{if(await evalJS(c,expr))return;}catch{}await wait(300);}throw Error('Waited too long: '+expr);}
async function capture(c,file){const r=await c.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});ok(r.data,'No screenshot',{file});const bytes=Buffer.from(r.data,'base64');fs.writeFileSync(path.join(OUT,file),bytes);const obj={name:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};report.shots.push(obj);return obj;}
function state(){
 const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const box=e=>{if(!e)return null;const x=e.getBoundingClientRect();return [x.x,x.y,x.width,x.height].map(n=>Math.round(n*10)/10);};
 const hero=q('#atlasDashboardMount .dashboard-frontispiece'),h3=q('#dashboardKpiHeading'),meta=q('#atlasDashboardMount .dashboard-ledger-heading>span');
 return {width:innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
  text:q('#atlasDashboardMount .dashboard-control-center')?.textContent?.replace(/\s+/g,' ').trim(),
  kpis:all('#atlasDashboardMount .dashboard-kpi').map(x=>x.textContent.trim()),
  nButtons:all('#atlasDashboardMount button').length,
  boxes:Object.fromEntries(Object.entries({hero,title:q('#atlasDashboardMount .dashboard-frontispiece h2'),refresh:q('#atlasDashboardRefresh'),firstKpi:q('#atlasDashboardMount .dashboard-kpi'),firstPanel:q('#atlasDashboardMount .dashboard-panel'),heading:h3,metadata:meta}).map(([k,v])=>[k,box(v)])),
  opacity:{hero:Number(getComputedStyle(hero,'::after').opacity),ledger:Number(getComputedStyle(h3,'::before').opacity)},
  labelCollision:(()=>{if(!h3||!meta)return true;const a=h3.getBoundingClientRect(),b=meta.getBoundingClientRect();return a.right+14>b.left&&a.bottom>b.top&&b.bottom>a.top;})()
 };
}
const sameBox=(a,b)=>Boolean(a&&b&&a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<.6));
async function caseWidth(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<760});
 await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.call('Page.navigate',{url:ORIGIN+'/#atlas-dashboard'});
 await until(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)',65000);
 ok(await evalJS(c,"(()=>{const nav=window.ATLAS_MAIN_AUTHORITY_NAV;nav.showDomain('dashboard');return nav.getDomain()==='dashboard';})()"),'Dashboard not active',{width});
 await until(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 await until(c,"document.fonts.status==='loaded'",35000);
 await wait(450);
 const a=await evalJS(c,'('+state.toString()+')()');
 const aShot=await capture(c,'A-current-'+width+'.png');
 ok(await evalJS(c,"(()=>{const h=document.getElementById('dashboardKpiHeading');if(!h)return false;h.setAttribute('data-atlas-o-decor','');const s=document.createElement('style');s.id='atlas-vis3-05r-d-test';s.textContent="+JSON.stringify(delta)+";document.head.append(s);return true;})()"),'H3 markup injection failed',{width});
 await wait(400);
 const b=await evalJS(c,'('+state.toString()+')()');
 const bShot=await capture(c,'D-mixed-'+width+'.png');
 ok(a.kpis.length===6&&b.kpis.length===6,'Six KPIs missing',{width,counts:[a.kpis.length,b.kpis.length]});
 ok(a.text===b.text&&JSON.stringify(a.kpis)===JSON.stringify(b.kpis),'Production source data changed in A/B',{width});
 ok(a.nButtons===b.nButtons,'Button count changed',{width});
 ok(b.docWidth<=Math.max(a.docWidth,width)+1&&b.bodyWidth<=Math.max(a.bodyWidth,width)+1,'D variant creates horizontal overflow',{width,aDoc:a.docWidth,bDoc:b.docWidth});
 for(const name of ['hero','title','refresh','firstKpi','firstPanel'])ok(sameBox(a.boxes[name],b.boxes[name]),'D shifted content '+name,{width,a:a.boxes[name],b:b.boxes[name]});
 ok(!b.labelCollision,'D title plate collides with summary metadata',{width,heading:b.boxes.heading,meta:b.boxes.metadata});
 ok(aShot.sha256!==bShot.sha256,'No visual delta in real browser',{width});
 ok(width<=600?b.opacity.hero===0:b.opacity.hero>0,'Unexpected hero ornament opacity',{width,opacity:b.opacity.hero});
 ok(b.opacity.ledger>0,'Missing ledger ornament',{width,opacity:b.opacity.ledger});
 report.cases.push({width,height,status:'PASS',sameKPIs:true,noAddedOverflow:true,original:a,mixed:b,files:[aShot.name,bShot.name]});
 console.log('VIS3_05R_D_CHROME_PASS '+width+'px (6 real KPIs, no added overflow, same controls/data)');
}
let c;
try{
 const tabs=await(await fetch(PORT+'/json/list')).json(),tab=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 ok(tab,'Chrome CDP page missing');
 c=new CDP(tab.webSocketDebuggerUrl);await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
 for(const [w,h] of [[390,844],[768,1000],[1440,1100],[1600,1100]])await caseWidth(c,w,h);
 report.status='PASS';console.log('VIS3_05R_D_REAL_CHROME_COMPARE_PASS screenshots='+report.shots.length);
}catch(e){report.status='FAIL';report.error=e.message;report.details=e.details||null;process.exitCode=1;console.error('VIS3_05R_D_REAL_CHROME_FAIL',e.message,JSON.stringify(e.details||{}));}
finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');c?.close();}
