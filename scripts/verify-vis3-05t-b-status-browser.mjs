import fs from 'node:fs';
import path from 'node:path';
const ROOT=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const OUTPUT='artifacts/vis3-05t-b-status';
const css=fs.readFileSync('atlas-ui-visual-foundation.css','utf8');
const rule=css.match(/#connectionStatus\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/)?.[0];
if(!rule)throw Error('The branch is missing expected scoped CSS rule');
fs.mkdirSync(OUTPUT,{recursive:true});
const report={status:'PENDING',branch:process.env.GITHUB_HEAD_SHA,source:'real Production same-DOM before/after locally injected CSS (not deployed PR)',views:[],screenshots:[]};
const pause=n=>new Promise(r=>setTimeout(r,n));
function check(value,msg,context){if(!value){const e=Error(msg);e.context=context;throw e}}
class Chrome{
 constructor(url){this.ws=new WebSocket(url);this.q=new Map();this.id=0}
 async ready(){await new Promise((ok,bad)=>{if(this.ws.readyState===WebSocket.OPEN)return ok();this.ws.addEventListener('open',ok,{once:true});this.ws.addEventListener('error',bad,{once:true})});this.ws.addEventListener('message',ev=>{const x=JSON.parse(String(ev.data)),p=this.q.get(x.id);if(!p)return;this.q.delete(x.id);x.error?p.bad(Error(x.error.message)):p.ok(x.result||{})})}
 call(method,params={}){return new Promise((ok,bad)=>{const id=++this.id;this.q.set(id,{ok,bad});this.ws.send(JSON.stringify({id,method,params}))})}
 close(){try{this.ws.close()}catch{}}
}
async function exec(c,code){const r=await c.call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'browser expression failure');return r.result?.value}
async function waitFor(c,code,timeout=90000){const at=Date.now();while(Date.now()-at<timeout){try{if(await exec(c,code))return;}catch{}await pause(250)}throw Error('timeout '+code)}
function measure(){const e=document.querySelector('#connectionStatus');return {route:window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain(),hidden:e?.hidden,display:e?getComputedStyle(e).display:null,text:e?.textContent?.trim()||'',kpis:document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}}
async function setRoute(c,name){const code="(()=>{const nav=window.ATLAS_MAIN_AUTHORITY_NAV;nav.showDomain("+JSON.stringify(name)+");return nav.getDomain()==="+JSON.stringify(name)+"})()";check(await exec(c,code),'navigation failure',{name});await pause(150);return exec(c,'('+measure.toString()+')()')}
async function photo(c,name){const x=(await c.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true})).data;check(x,'no screenshot');const b=Buffer.from(x,'base64');fs.writeFileSync(path.join(OUTPUT,name),b);report.screenshots.push({name,bytes:b.length})}
async function review(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 await c.call('Page.navigate',{url:ROOT+'/#atlas-dashboard'});
 await waitFor(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)');
 await waitFor(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 const beforeD=await setRoute(c,'dashboard');
 await photo(c,'before-dashboard-'+width+'.png');
 const beforeP=await setRoute(c,'persons');
 const injection="(()=>{const el=document.createElement('style');el.id='vis3-05t-b-local-test';el.textContent="+JSON.stringify(rule)+";document.head.appendChild(el);return !!el.sheet})()";
 check(await exec(c,injection),'cannot install local style');
 const afterD=await setRoute(c,'dashboard');
 await photo(c,'after-dashboard-'+width+'.png');
 const afterP=await setRoute(c,'persons');
 check(beforeD.hidden===true,'before Dashboard should have hidden property',{width,beforeD});
 check(beforeP.hidden===false,'before Persons should remain visible',{width,beforeP});
 check(beforeD.display!=='none','The suspected bug is not reproducible; do not fake success',{width,beforeD});
 check(afterD.hidden===true&&afterD.display==='none','Dashboard status still painted',{width,afterD});
 check(afterP.hidden===false&&afterP.display!=='none','Persons status wrongly hidden',{width,afterP});
 check(beforeD.kpis===6&&afterD.kpis===6,'Dashboard KPI count changed',{width,beforeD,afterD});
 check(beforeD.scrollWidth<=Math.max(width,afterD.scrollWidth)+1&&afterD.scrollWidth<=Math.max(width,beforeD.scrollWidth)+1,'unexpected overflow',{width,beforeD,afterD});
 report.views.push({width,baseline:{dashboard:beforeD,persons:beforeP},corrected:{dashboard:afterD,persons:afterP},status:'PASS'});
 console.log('VIS3_05T_B_CHROME_PASS width='+width+' before='+beforeD.display+' after='+afterD.display+' persons='+afterP.display);
}
let c;
try{
 const tabs=await(await fetch('http://127.0.0.1:9225/json/list')).json();
 const page=tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);check(page,'Chrome page missing');
 c=new Chrome(page.webSocketDebuggerUrl);await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
 await review(c,390,844);await review(c,1440,1100);
 report.status='PASS';console.log('VIS3_05T_B_REAL_CHROME_PASS');
}catch(e){report.status='FAIL';report.error=e.message;report.details=e.context||{};process.exitCode=1;console.error('VIS3_05T_B_REAL_CHROME_FAIL',e.message,JSON.stringify(e.context||{}))}
finally{fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');c?.close()}
