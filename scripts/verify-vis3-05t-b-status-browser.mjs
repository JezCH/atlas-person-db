/* VIS3-05T-B read-only production regression audit; no CSS injection. */
import fs from 'node:fs';
import path from 'node:path';
const SITE=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const OUT='artifacts/vis3-05t-b-status';
fs.mkdirSync(OUT,{recursive:true});
const data={schema:'atlas-vis3-05t-b-live-status-audit/v2',branch:process.env.GITHUB_HEAD_SHA,status:'PENDING',method:'unmodified real Production Chrome, Dashboard→Persons→Dashboard',views:[],screenshots:[]};
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
 await c.call('Page.navigate',{url:SITE+'/#atlas-dashboard'});
 await wait(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)');
 await wait(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 const dashboard=await route(c,'dashboard');await screenshot(c,'dashboard-'+width+'.png');
 const persons=await route(c,'persons');await screenshot(c,'persons-'+width+'.png');
 const again=await route(c,'dashboard');
 ensure(dashboard.hidden===true&&dashboard.display==='none','Dashboard status unexpectedly visible',{width,dashboard});
 ensure(persons.hidden===false&&persons.display!=='none','Persons status missing',{width,persons});
 ensure(again.hidden===true&&again.display==='none','Dashboard return state incorrect',{width,again});
 ensure(dashboard.kpis===6&&again.kpis===6,'Dashboard KPI number changed',{width,dashboard,again});
 ensure(dashboard.docWidth<=width+1&&again.docWidth<=width+1,'document horizontal overflow',{width});
 data.views.push({width,height,status:'PASS',dashboard,persons,returnToDashboard:again});
 console.log('VIS3_05T_B_LIVE_STATUS_PASS width='+width+' dashboard='+dashboard.display+' persons='+persons.display);
}
let c;
try{
 const pages=await(await fetch('http://127.0.0.1:9225/json/list')).json();const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);ensure(page,'Chrome missing');
 c=new CDP(page.webSocketDebuggerUrl);await c.ready();await c.call('Page.enable');await c.call('Runtime.enable');
 await viewport(c,390,844);await viewport(c,1440,1100);
 data.status='PASS';console.log('VIS3_05T_B_READ_ONLY_CHROME_PASS');
}catch(e){data.status='FAIL';data.error=e.message;data.details=e.details||null;console.error('VIS3_05T_B_READ_ONLY_CHROME_FAIL',e.message,JSON.stringify(e.details||{}));process.exitCode=1;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(data,null,2)+'\n');c?.close()}
