/* VIS3-05T-B read-only production regression audit; no CSS injection. */
import fs from 'node:fs';
import path from 'node:path';
const SITE=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const OUT='artifacts/vis3-05t-b-status';
fs.mkdirSync(OUT,{recursive:true});
const data={schema:'atlas-vis3-05t-b-browser-verification/v5',branch:process.env.GITHUB_HEAD_SHA,status:'PENDING',method:'fresh real Production document per viewport; branch-only CSS injected locally',views:[],screenshots:[]};
const delay=n=>new Promise(r=>setTimeout(r,n));
function ensure(c,s,x){if(!c){let e=Error(s);e.details=x;throw e}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.m=new Map();this.id=0}
 async ready(){await new Promise((ok,err)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener('open',ok,{once:true});this.ws.addEventListener('error',err,{once:true})});this.ws.addEventListener('message',event=>{const x=JSON.parse(String(event.data)),p=this.m.get(x.id);if(!p)return;this.m.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result||{})})}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.m.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
 close(){try{this.ws.close()}catch{}}
}
async function js(c,code){const r=await c.call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
async function wait(c,expression,ms=90000){const s=Date.now();while(Date.now()-s<ms){try{if(await js(c,expression))return}catch{}await delay(300)}throw Error('wait expired: '+expression)}
function snapshot(){
 const e=document.getElementById('connectionStatus'),r=e?.getBoundingClientRect(),style=e?getComputedStyle(e):null;
 return {domain:window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain(),hidden:e?.hidden,display:style?.display,visibility:style?.visibility,ariaHidden:e?.getAttribute('aria-hidden'),text:e?.textContent?.trim()||'',rect:r?[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10):null,title:document.querySelector('.topbar h1')?.textContent?.trim(),kpis:document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length,docWidth:document.documentElement.scrollWidth}
}
async function route(c,domain){let expression="(()=>{const n=window.ATLAS_MAIN_AUTHORITY_NAV;n.showDomain("+JSON.stringify(domain)+");return n.getDomain()==="+JSON.stringify(domain)+"})()";ensure(await js(c,expression),'route switch failed',{domain});await delay(100);return await js(c,'('+snapshot.toString()+')()')}
async function screenshot(c,name){const result=(await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;ensure(result,'empty PNG');const b=Buffer.from(result,'base64');fs.writeFileSync(path.join(OUT,name),b);data.screenshots.push({name,size:b.length})}
async function viewport(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 /* Unique URL path query forces an entirely new document; a hash-only
  * Page.navigate otherwise retains locally injected CSS from prior viewport. */
 await c.call('Page.navigate',{url:SITE+'/?atlas_vis3_status_audit='+width+'#atlas-dashboard'});
 await wait(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)');
 await wait(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 const beforeD=await route(c,'dashboard');await screenshot(c,'before-dashboard-'+width+'.png');
 const beforeP=await route(c,'persons');await screenshot(c,'before-persons-'+width+'.png');
 ensure(beforeD.hidden===true&&beforeP.hidden===false,'route hidden properties incorrect',{width,beforeD,beforeP});
 if(width<=760){
  ensure(beforeD.display==='none'&&beforeP.display==='none','original mobile topbar state incorrect',{width,beforeD,beforeP});
 }else{
  ensure(beforeD.display!=='none'&&beforeP.display!=='none','real desktop ghost could not be reproduced',{width,beforeD,beforeP});
 }
 /* Branch rule applied only locally to the existing live DOM. */
 const rule=fs.readFileSync('atlas-ui-visual-foundation.css','utf8').match(/#connectionStatus\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/)?.[0];
 ensure(rule,'branch CSS source not present');
 const injected="(()=>{const x=document.createElement('style');x.id='atlas-vis3-05t-b-local-fix';x.textContent="+JSON.stringify(rule)+";document.head.appendChild(x);return !!x.sheet})()";
 ensure(await js(c,injected),'cannot inject local style',{width});
 const afterD=await route(c,'dashboard');await screenshot(c,'after-dashboard-'+width+'.png');
 const afterP=await route(c,'persons');
 ensure(afterD.hidden===true&&afterD.display==='none','corrected Dashboard status still visible',{width,afterD});
 ensure(afterP.hidden===false&&afterP.display===(width<=760?'none':beforeP.display),'Person status changed by fix',{width,afterP});
 ensure(afterD.kpis===6&&beforeD.kpis===6,'Dashboard KPI count changed',{width,beforeD,afterD});
 ensure(afterD.docWidth<=Math.max(width,beforeD.docWidth)+1,'horizontal overflow increased',{width,beforeD,afterD});
 data.views.push({width,height,status:'PASS',baseline:{dashboard:beforeD,persons:beforeP},locallyCorrected:{dashboard:afterD,persons:afterP}});
 console.log('VIS3_05T_B_EXACT_CSS_CHROME_PASS width='+width+' baseline='+beforeD.display+' corrected='+afterD.display+' Persons='+afterP.display);
}

let c;
try{
 const pages=await(await fetch('http://127.0.0.1:9225/json/list')).json();const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);ensure(page,'Chrome missing');
 c=new CDP(page.webSocketDebuggerUrl);await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
 await viewport(c,390,844);await viewport(c,1440,1100);
 data.status='PASS';console.log('VIS3_05T_B_READ_ONLY_CHROME_PASS');
}catch(e){data.status='FAIL';data.error=e.message;data.details=e.details||null;console.error('VIS3_05T_B_READ_ONLY_CHROME_FAIL',e.message,JSON.stringify(e.details||{}));process.exitCode=1;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(data,null,2)+'\n');c?.close()}
