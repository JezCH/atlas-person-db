import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const ORIGIN='https://atlas-person-db.vercel.app', OUT='artifacts/vis3-05t-d';
fs.mkdirSync(OUT,{recursive:true});
const take=(name,mark)=>{const x=fs.readFileSync(name,'utf8');const i=x.indexOf(mark);if(i<0)throw Error('Missing CSS delta '+name);return x.slice(i)};
const cssK=take('atlas-dashboard-monumental-v11.css','/* VIS3-05T-D — KPI'),cssM=take('atlas-ui-mobile-v8.css','/* VIS3-05T-D — readable');
const result={schema:'atlas-vis3-05t-d-kpi-mobile-chrome/v1',mode:'Production DOM before/after local exact branch CSS; not branch deployment',status:'PENDING',source:process.env.GITHUB_HEAD_SHA,cases:[],screenshots:[]};
const sleep=x=>new Promise(r=>setTimeout(r,x));
function check(x,msg,detail){if(!x){const e=Error(msg);e.detail=detail;throw e}}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.p=new Map();this.id=0}
 async open(){await new Promise((r,e)=>{if(this.ws.readyState===WebSocket.OPEN)return r();this.ws.addEventListener('open',r,{once:true});this.ws.addEventListener('error',e,{once:true})});this.ws.addEventListener('message',evt=>{const x=JSON.parse(String(evt.data)),v=this.p.get(x.id);if(!v)return;this.p.delete(x.id);x.error?v.e(Error(x.error.message)):v.r(x.result||{})})}
 call(method,params={}){return new Promise((r,e)=>{const id=++this.id;this.p.set(id,{r,e});this.ws.send(JSON.stringify({id,method,params}))})}
 close(){try{this.ws.close()}catch{}}
}
async function evaluate(c,s){const x=await c.call('Runtime.evaluate',{expression:s,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);return x.result?.value}
async function wait(c,s,max=85000){const t=Date.now();while(Date.now()-t<max){try{if(await evaluate(c,s))return}catch{}await sleep(300)}throw Error('Wait timeout '+s)}
function snapshot(){
 const q=s=>document.querySelector(s),many=s=>[...document.querySelectorAll(s)];
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10)};
 const tiles=many('#atlasDashboardMount .dashboard-kpi').map(e=>{
  const small=e.querySelector('small'),strong=e.querySelector('strong'),span=e.querySelector('span');
  const style=x=>x?getComputedStyle(x):null;
  const titleStyle=style(small),detailStyle=style(span);
  return {text:e.textContent.trim(),value:strong?.textContent.trim(),detail:span?.textContent.trim(),label:small?.textContent.trim(),
   card:rect(e),number:rect(strong),labelBox:rect(small),detailBox:rect(span),captionSize:titleStyle?.fontSize,detailSize:detailStyle?.fontSize,
   detailOverflow:span?span.scrollWidth>span.clientWidth+1||span.scrollHeight>span.clientHeight+1:false};
 });
 const app=q('.mobile-appbar'),sub=q('.mobile-appbar-title small'),primary=q('.mobile-appbar-title strong'),menu=q('#mobileMenuButton');
 const menuR=menu?.getBoundingClientRect(),center=menuR?document.elementFromPoint(menuR.left+menuR.width/2,menuR.top+menuR.height/2):null;
 return {vw:innerWidth,docW:document.documentElement.scrollWidth,kpis:tiles,
 hero:rect(q('#atlasDashboardMount .dashboard-frontispiece')),heroTitle:rect(q('#atlasDashboardMount .dashboard-frontispiece h2')),
 ledger:rect(q('#dashboardKpiHeading')),firstPanel:rect(q('#atlasDashboardMount .dashboard-panel')),
 appbar:rect(app),appbarTitle:rect(primary),appbarSub:rect(sub),appbarSubFont:sub?getComputedStyle(sub).fontSize:null,
 appbarSubColor:sub?getComputedStyle(sub).color:null,menu:rect(menu),menuHit:center===menu||menu?.contains(center)};
}
async function photo(c,name){const b=Buffer.from((await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data,'base64');check(b.length>1500,'Empty PNG',{name});fs.writeFileSync(path.join(OUT,name),b);result.screenshots.push({name,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length})}
const same=(a,b,t=1)=>a&&b&&a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=t);
async function run(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=760});
 await c.call('Page.navigate',{url:ORIGIN+'/?vis3_05t_d='+width+'#atlas-dashboard'});
 await wait(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)');
 await evaluate(c,"window.ATLAS_MAIN_AUTHORITY_NAV.showDomain('dashboard')");
 await wait(c,"document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length===6");
 await wait(c,"Boolean(document.querySelector('link[href*=\"atlas-dashboard-monumental-v11.css\"]')?.sheet)");
 await wait(c,"document.fonts.status==='loaded'",30000);
 await sleep(350);
 const before=await evaluate(c,'('+snapshot.toString()+')()');await photo(c,'A-current-'+width+'.png');
 const injected=await evaluate(c,"(()=>{let s=document.createElement('style');s.id='atlas-vis3-05t-d-local-test';s.textContent="+JSON.stringify(cssK+"\n"+cssM)+";document.head.appendChild(s);return !!s.sheet;})()");
 check(injected,'Local CSS insertion failed',{width});await sleep(450);
 const after=await evaluate(c,'('+snapshot.toString()+')()');await photo(c,'B-legible-'+width+'.png');
 check(before.kpis.length===6&&after.kpis.length===6,'Six KPIs missing',{width});
 for(let i=0;i<6;i++){
  const a=before.kpis[i],b=after.kpis[i];
  check(a.text===b.text&&a.value===b.value&&a.detail===b.detail&&a.label===b.label,'Original KPI facts modified',{width,i});
  check(b.captionSize==='10px'&&b.detailSize==='10px','KPI print not 10px',{width,i,cap:b.captionSize,desc:b.detailSize});
  check(!b.detailOverflow,'KPI detail overflow/clipped',{width,i,label:b.label,detail:b.detail,geom:b.detailBox});
  check(same(a.number,b.number,1.1),'KPI big number moved/resized',{width,i,a:a.number,b:b.number});
  check(b.card[2]===a.card[2],'KPI card width changed',{width,i,a:a.card,b:b.card});
 }
 check(same(before.hero,after.hero)&&same(before.heroTitle,after.heroTitle)&&same(before.ledger,after.ledger),'Hero/title/ledger geometries moved',{width});
 check(after.docW<=Math.max(width,before.docW)+1,'New horizontal overflow',{width,before:before.docW,after:after.docW});
 check(after.firstPanel[1]-before.firstPanel[1]<=32,'KPI expansion moves panels too far',{width,a:before.firstPanel,b:after.firstPanel});
 if(width<=760){
  check(before.appbar&&after.appbar&&same(before.appbar,after.appbar)&&same(before.menu,after.menu),'Mobile bar/menu geometry shifted',{width});
  check(after.appbarSubFont==='10px','Secondary title still tiny',{width,got:after.appbarSubFont});
  check(after.menuHit,'Mobile menu center obscured',{width});
  check(after.appbarSub[1]+after.appbarSub[3]<=after.appbar[1]+after.appbar[3]+1,'Subtitle flows outside appbar',{width});
 }
 result.cases.push({width,height,status:'PASS',before,after});
 console.log('VIS3_05T_D_CHROME_PASS '+width+' cards=6 panelShift='+(after.firstPanel[1]-before.firstPanel[1]));
}
let chrome;
try{
 const t=await(await fetch('http://127.0.0.1:9224/json/list')).json(),page=t.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 check(page,'No Chrome tab');chrome=new CDP(page.webSocketDebuggerUrl);await chrome.open();await chrome.call('Page.enable');await chrome.call('Runtime.enable');
 for(const [w,h] of [[390,844],[768,1000],[1440,1000],[1600,1100]])await run(chrome,w,h);
 result.status='PASS';console.log('VIS3_05T_D_BROWSER_PASS 4 viewports');
}catch(e){result.status='FAIL';result.error=e.message;result.detail=e.detail||null;process.exitCode=1;console.error('VIS3_05T_D_BROWSER_FAIL',e.message,JSON.stringify(result.detail||{}));}
finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(result,null,2)+'\n');chrome?.close()}
