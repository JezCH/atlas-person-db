/* VIS3-05R-E: real Production read-only, exact source SHA, visual ON/OFF Chrome.
 * This diagnostic never posts app data, changes the server or mutates repository UI.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const EXPECTED=(process.env.ATLAS_EXPECTED_RUNTIME_SHA||'').trim();
const CDP=process.env.ATLAS_CDP_URL||'http://127.0.0.1:9224';
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||'artifacts/vis3-05r-e-production';
const ASSETS=['index.html','atlas-ui-phase3-ornaments.css','atlas-dashboard.js','assets/ui-ornaments/atlas-compass-rosette.svg','assets/ui-ornaments/atlas-corner-filigree.svg'];
fs.mkdirSync(OUT,{recursive:true});
const report={schema:'atlas-vis3-05r-e-production-visual/v1',expected_sha:EXPECTED,origin:ORIGIN,method:'exact deployed asset parity + real Chrome same-DOM data & ornament ON/OFF + responsive effective-viewport proxy',status:'PENDING',checked_at:new Date().toISOString(),assets:[],cases:[],screenshots:[]};
const sleep=n=>new Promise(r=>setTimeout(r,n));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function verify(ok,msg,ctx={}){if(!ok){const e=Error(msg);e.ctx=ctx;throw e;}}
async function sourceParity(){
 verify(/^[0-9a-f]{40}$/i.test(EXPECTED),'Expected SHA missing');
 for(const asset of ASSETS){
  const u=new URL('/'+asset,ORIGIN);u.searchParams.set('atlas_vis3_acceptance',EXPECTED);
  const git='https://raw.githubusercontent.com/JezCH/atlas-person-db/'+EXPECTED+'/'+asset;
  const [prod,src]=await Promise.all([fetch(u,{cache:'no-store'}),fetch(git,{cache:'no-store'})]);
  verify(prod.ok&&src.ok,'Production or Git source HTTP not OK',{asset,prod:prod.status,src:src.status});
  const [a,b]=await Promise.all([prod.arrayBuffer(),src.arrayBuffer()]);
  const x=Buffer.from(a),y=Buffer.from(b);
  report.assets.push({asset,bytes:x.length,production_sha256:sha(x),github_sha256:sha(y),equal:x.equals(y)});
  verify(x.equals(y),'Production source is not requested exact SHA',{asset});
 }
 const idx=await (await fetch(ORIGIN+'/index.html?atlas_vis3='+EXPECTED)).text();
 const css=await (await fetch(ORIGIN+'/atlas-ui-phase3-ornaments.css?atlas_vis3='+EXPECTED)).text();
 verify(idx.includes('vis3-05r-mixed-v1')&&css.includes('/* VIS3-05R-D — restrained mixed'),'Actual deployed mixed rules missing');
}
class Browser{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();}
 async ready(){
  await new Promise((yes,no)=>{if(this.ws.readyState===WebSocket.OPEN)return yes();this.ws.addEventListener('open',yes,{once:true});this.ws.addEventListener('error',no,{once:true});});
  this.ws.addEventListener('message',e=>{const obj=JSON.parse(String(e.data)),p=this.pending.get(obj.id);if(!p)return;this.pending.delete(obj.id);obj.error?p.no(Error(obj.error.message)):p.yes(obj.result||{});});
 }
 call(method,params={}){return new Promise((yes,no)=>{const id=++this.id;this.pending.set(id,{yes,no});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close()}catch{}}
}
async function js(c,code){const x=await c.call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text||'browser js');return x.result?.value;}
async function until(c,code,ms=75000){const start=Date.now();while(Date.now()-start<ms){try{if(await js(c,code))return;}catch{}await sleep(300);}throw Error('Timeout waiting for '+code);}
async function photo(c,name){
 const z=(await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
 verify(z,'Screenshot empty',{name});const buf=Buffer.from(z,'base64');fs.writeFileSync(path.join(OUT,name),buf);
 const row={name,bytes:buf.length,sha256:sha(buf)};report.screenshots.push(row);return row;
}
function state(){
 const one=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const root=one('#atlasDashboardMount .dashboard-control-center');
 const hero=one('#atlasDashboardMount .dashboard-frontispiece');
 const h=one('#dashboardKpiHeading');
 const refresh=one('#atlasDashboardRefresh');
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10);};
 const boxes={hero:box(hero),title:box(one('.dashboard-frontispiece h2')),description:box(one('.dashboard-frontispiece p:not(.eyebrow)')),refresh:box(refresh),kpiHeading:box(h),firstKpi:box(one('#atlasDashboardMount .dashboard-kpi')),firstPanel:box(one('#atlasDashboardMount .dashboard-panel'))};
 const styles=(el,pseudo)=>{try{return getComputedStyle(el,pseudo).opacity}catch{return null}};
 const rect=refresh?.getBoundingClientRect();
 const target=rect&&rect.top>=0&&rect.bottom<=innerHeight?document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2):null;
 return {cssWidth:innerWidth,docWidth:document.documentElement.scrollWidth,rootWidth:root?.scrollWidth||0,text:root?.textContent?.replace(/\s+/g,' ').trim()||'',
  kpis:all('#atlasDashboardMount .dashboard-kpi').map(e=>e.textContent?.trim()),
  nButtons:all('#atlasDashboardMount button').length,
  positions:boxes,hitRefresh:target===refresh||refresh?.contains(target),
  pseudo:{hero:styles(hero,'::after'),corner:styles(hero,'::before'),heading:styles(h,'::before'),diamond:styles(h,'::after')},
  pageScrollHeight:document.documentElement.scrollHeight};
}
const closeBox=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<=.8);
async function take(c,{label,width,height,scale=1,mobile=false}){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:scale,mobile});
 await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.call('Page.navigate',{url:ORIGIN+'/#atlas-dashboard'});
 await until(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)',60000);
 verify(await js(c,"(()=>{const n=window.ATLAS_MAIN_AUTHORITY_NAV;n.showDomain('dashboard');return n.getDomain()==='dashboard';})()"),'Dashboard navigation not active',{label});
 await until(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 await until(c,"document.fonts.status==='loaded'",30000);
 await sleep(350);
 const yes=await js(c,'('+state.toString()+')()');
 const onImage=await photo(c,'ON-'+label+'.png');
 verify(await js(c,"(()=>{const r=document.querySelector('#atlasDashboardMount .dashboard-control-center');if(!r)return false;r.setAttribute('data-atlas-ornament','off');return true;})()"),'Cannot toggle ornament OFF');
 await sleep(220);
 const no=await js(c,'('+state.toString()+')()');
 const offImage=await photo(c,'OFF-'+label+'.png');
 verify(yes.kpis.length===6&&JSON.stringify(yes.kpis)===JSON.stringify(no.kpis),'KPI changed when toggle',{label});
 verify(yes.text===no.text&&yes.nButtons===no.nButtons,'App DOM changed when toggle',{label});
 verify(yes.docWidth<=width+1&&no.docWidth<=width+1,'Horizontal overflow',{label,width,docOn:yes.docWidth,docOff:no.docWidth});
 for(const key of ['hero','title','description','refresh','kpiHeading','firstKpi','firstPanel'])
  verify(closeBox(yes.positions[key],no.positions[key]),'Geometry changed when ornament toggled',{label,key,on:yes.positions[key],off:no.positions[key]});
 verify(yes.hitRefresh&&no.hitRefresh,'Refresh button center is obscured by ornament',{label,yes:yes.hitRefresh,no:no.hitRefresh});
 for(const name of ['hero','corner','heading','diamond']){
  verify(Number(no.pseudo[name])===0,'Ornament did not opt out '+name,{label,off:no.pseudo});
 }
 verify(Number(yes.pseudo.heading)>0,'No real production KPI ledger plate',{label});
 verify(Number(yes.pseudo.hero)===(width<=600?0:Number(yes.pseudo.hero)),'Unexpected mobile hero opacity',{label,on:yes.pseudo});
 verify(onImage.sha256!==offImage.sha256,'Ornament ON/OFF screenshots identical',{label});
 report.cases.push({label,width,height,scale,mode:scale===1?'literal CSS viewport':'effective desktop layout-width proxy, NOT native Chrome zoom',status:'PASS',kpiCount:yes.kpis.length,positions:yes.positions,opacity_on:yes.pseudo,opacity_off:no.pseudo,docWidth:yes.docWidth,images:[onImage.name,offImage.name]});
 console.log('VIS3_05R_E_PRODUCTION_CASE_PASS '+label+' actualKPIs='+yes.kpis.length);
}
let browser;
try{
 await sourceParity();
 const tabs=await(await fetch(CDP+'/json/list')).json();
 const tab=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 verify(tab,'No Chrome CDP page');
 browser=new Browser(tab.webSocketDebuggerUrl);await browser.ready();await browser.call('Page.enable');await browser.call('Runtime.enable');
 for(const test of [
  {label:'390',width:390,height:844,mobile:true},
  {label:'768',width:768,height:1000},
  {label:'1440',width:1440,height:1100},
  {label:'1600',width:1600,height:1100},
  {label:'1440-at-125-layout',width:1152,height:880,scale:1.25},
  {label:'1440-at-150-layout',width:960,height:734,scale:1.5}
 ])await take(browser,test);
 report.status='PASS';console.log('VIS3_05R_E_PRODUCTION_ACCEPTANCE_PASS '+report.cases.length+' screen configurations; '+report.assets.length+' exact assets');
}catch(error){
 report.status='FAIL';report.error=error.message;report.details=error.ctx||null;process.exitCode=1;
 console.error('VIS3_05R_E_PRODUCTION_FAIL',error.message,JSON.stringify(report.details));
}finally{fs.writeFileSync(path.join(OUT,'vis3-05r-e-production.json'),JSON.stringify(report,null,2)+'\n');browser?.close();}
