/* VIS3-05T-D read-only live Production comparison.
 * One fresh HTML document per viewport, then only the exact branch CSS
 * declarations are injected. No API, DB, HTML or Production files edited.
 */
import fs from 'node:fs';
import path from 'node:path';
const ORIGIN=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const OUT='artifacts/vis3-05t-d-browser';
const dc=fs.readFileSync('atlas-dashboard-monumental-v11.css','utf8');
const mc=fs.readFileSync('atlas-ui-mobile-v8.css','utf8');
const idx=dc.indexOf('/* VIS3-05T-D');
if(idx<0)throw Error('Required dashboard CSS patch missing');
const dashboardPatch=dc.slice(idx);
const mobilePatch=mc.match(/\.mobile-appbar-title small\s*\{[^}]*font-size:\s*10px;[^}]*\}/)?.[0];
if(!mobilePatch)throw Error('Required mobile label CSS missing');
fs.mkdirSync(OUT,{recursive:true});
const report={schema:'atlas-vis3-05t-d-chrome/v1',status:'PENDING',target:'live Production same DOM, PR CSS injected only locally',head:process.env.GITHUB_HEAD_SHA,origin:ORIGIN,cases:[],shots:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function must(ok,message,extra){if(!ok){const e=Error(message);e.extra=extra;throw e;}}
class CDP{
 constructor(ws){this.ws=new WebSocket(ws);this.next=0;this.pending=new Map();}
 async start(){await new Promise((y,n)=>{if(this.ws.readyState===WebSocket.OPEN)return y();this.ws.addEventListener('open',y,{once:true});this.ws.addEventListener('error',n,{once:true});});this.ws.addEventListener('message',e=>{const o=JSON.parse(String(e.data)),p=this.pending.get(o.id);if(!p)return;this.pending.delete(o.id);o.error?p.n(Error(o.error.message)):p.y(o.result||{});});}
 call(method,params={}){return new Promise((y,n)=>{let id=++this.next;this.pending.set(id,{y,n});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close()}catch{}}
}
async function js(c,s){const r=await c.call('Runtime.evaluate',{expression:s,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'browser error');return r.result?.value;}
async function until(c,s,ms=90000){const start=Date.now();while(Date.now()-start<ms){try{if(await js(c,s))return;}catch{}await pause(300);}throw Error('Timed out '+s);}
function metrics(){
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 const all=s=>[...document.querySelectorAll(s)];
 const cards=all('#atlasDashboardMount .dashboard-kpi').map(e=>{
  const small=e.querySelector('small'),large=e.querySelector('strong'),detail=e.querySelector('span');
  const cs=small&&getComputedStyle(small),ds=detail&&getComputedStyle(detail);
  const main=rect(large),info=rect(detail),title=rect(small),card=rect(e);
  return {node:e.tagName,text:e.textContent.trim(),small:small?.textContent?.trim(),value:large?.textContent?.trim(),detail:detail?.textContent?.trim(),
    smallFont:cs?.fontSize,detailFont:ds?.fontSize,smallColor:cs?.color,detailColor:ds?.color,
    card,title,main,info,overflow:detail?detail.scrollHeight>detail.clientHeight+1||detail.scrollWidth>detail.clientWidth+1:false};
 });
 const app=document.querySelector('.mobile-appbar'),menu=document.querySelector('#mobileMenuButton'),caption=document.querySelector('.mobile-appbar-title small');
 const men=rect(menu),hit=men&&men.y>=0&&men.bottom<=innerHeight?document.elementFromPoint(men.x+men.w/2,men.y+men.h/2):null;
 const hero=document.querySelector('.dashboard-hero'),heading=document.querySelector('.dashboard-ledger-heading');
 return {width:innerWidth,docWidth:document.documentElement.scrollWidth,cards,hero:rect(hero),heading:rect(heading),
   appbar:rect(app),menu:men,menuHit:!men||hit===menu||menu?.contains(hit),
   title:document.querySelector('.mobile-appbar-title strong')?.textContent?.trim(),subtitle:caption?.textContent?.trim(),subtitleSize:caption?getComputedStyle(caption).fontSize:null,
   navDomain:window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain()};
}
async function shot(c,n){const b=(await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;must(b,'screenshot empty',{n});const file=path.join(OUT,n);fs.writeFileSync(file,Buffer.from(b,'base64'));report.shots.push({name:n,bytes:Buffer.byteLength(b,'base64')});}
function near(a,b,epsilon=.85){return a&&b&&Math.abs(a-b)<=epsilon;}
async function runOne(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=600});
 await c.call('Page.navigate',{url:ORIGIN+'/?vis3_05t_d_width='+width+'#atlas-dashboard'});
 await until(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)');
 await js(c,"window.ATLAS_MAIN_AUTHORITY_NAV.showDomain('dashboard')");
 await until(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6",120000);
 await until(c,"document.fonts.status==='loaded'",25000);
 await pause(250);
 const before=await js(c,'('+metrics.toString()+')()');
 await shot(c,'A-before-'+width+'.png');
 const injected=await js(c,"(()=>{const st=document.createElement('style');st.id='vis3-05t-d-local';st.textContent="+JSON.stringify(dashboardPatch+'\n'+mobilePatch)+";document.head.append(st);return st.sheet?.cssRules.length>1;})()");
 must(injected,'stylesheet injection failed',{width});
 await pause(350);
 const after=await js(c,'('+metrics.toString()+')()');
 await shot(c,'B-after-'+width+'.png');
 must(before.cards.length===6&&after.cards.length===6,'KPI count changed',{width});
 for(let i=0;i<6;i++){
  const a=before.cards[i],b=after.cards[i];
  must(a.text===b.text&&a.value===b.value&&a.detail===b.detail,'KPI factual text changed',{width,i,a:a.text,b:b.text});
  must(near(a.card.x,b.card.x)&&near(a.card.y,b.card.y),'Card top/left moved',{width,i,old:a.card,new:b.card});
  must(!b.overflow,'KPI supporting text clipped',{width,i,b});
  must(b.info.y>=b.main.bottom-1,'Description overlapped main KPI figure',{width,i,main:b.main,info:b.info});
  must(b.title.bottom<=b.main.y+1,'KPI label overlaps figure',{width,i,title:b.title,main:b.main});
  must(parseFloat(b.smallFont)>=10&&parseFloat(b.detailFont)>=10,'Support type below 10px',{width,i,small:b.smallFont,detail:b.detailFont});
 }
 must(after.docWidth<=Math.max(width,before.docWidth)+1,'New horizontal overflow',{width,before:before.docWidth,after:after.docWidth});
 must(before.navDomain==='dashboard'&&after.navDomain==='dashboard','Navigation changed',{width});
 if(width<=760){
  must(before.subtitle==='ATLAS 편집'&&after.subtitle==='ATLAS 편집'&&after.title===before.title,'Mobile copy changed',{width});
  must(near(before.appbar.h,after.appbar.h)&&near(after.appbar.h,58),'58px appbar grew',{width,before:before.appbar,after:after.appbar});
  must(parseFloat(after.subtitleSize)>=10,'Subtitle not readable',{width,after:after.subtitleSize});
  must(before.menuHit&&after.menuHit,'Mobile menu button obstructed',{width});
  must(near(before.menu.w,after.menu.w)&&near(before.menu.h,after.menu.h),'Mobile menu geometry changed',{width});
 }
 report.cases.push({width,height,status:'PASS',before,after});
 console.log('VIS3_05T_D_CHROME_PASS '+width+' KPI=6 firstHeight='+before.cards[0].card.h+'->'+after.cards[0].card.h);
}
let browser;
try{
 const tabs=await(await fetch('http://127.0.0.1:9227/json/list')).json(),page=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);must(page,'Chrome no page');
 browser=new CDP(page.webSocketDebuggerUrl);await browser.start();await browser.call('Page.enable');await browser.call('Runtime.enable');
 for(const [width,height] of [[390,844],[600,940],[768,1050],[1440,1080],[1600,1080]])await runOne(browser,width,height);
 report.status='PASS';console.log('VIS3_05T_D_ALL_CHROME_PASS '+report.cases.length+' cases');
}catch(e){report.status='FAIL';report.error=e.message;report.details=e.extra||null;process.exitCode=1;console.error('VIS3_05T_D_CHROME_FAIL',e.message,JSON.stringify(e.extra||{}));}
finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');browser?.close();}
