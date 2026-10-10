/* Read-only ATLAS VIS3-05T-C Chrome design audit.
 * Production before and current PR CSS delta injected locally after;
 * no source edits or network mutations. Distinct document URL per width.
 */
import fs from 'node:fs';
import path from 'node:path';
const URL=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlas-person-db.vercel.app').replace(/\/$/,'');
const OUT='artifacts/vis3-05t-c-rail';
fs.mkdirSync(OUT,{recursive:true});
const css=fs.readFileSync('atlas-ui-visual-foundation.css','utf8');
const marker='/* VIS3-05T-C';
const delta=css.slice(css.indexOf(marker));
if(!delta.startsWith(marker))throw Error('Missing marked CSS delta');
const report={schema:'atlas-vis3-05t-c-live-rail/v1',sourceSha:process.env.GITHUB_HEAD_SHA,origin:URL,status:'PENDING',cases:[],screenshots:[],method:'same Production DOM with exact PR CSS delta locally injected; never PR deployed'};
const pause=n=>new Promise(r=>setTimeout(r,n));
function insist(c,msg,info){if(!c){let e=Error(msg);e.info=info;throw e;}}
class CDP{
 constructor(addr){this.ws=new WebSocket(addr);this.id=0;this.pending=new Map();}
 async ready(){await new Promise((yes,no)=>{if(this.ws.readyState===WebSocket.OPEN)return yes();this.ws.addEventListener('open',yes,{once:true});this.ws.addEventListener('error',no,{once:true})});this.ws.addEventListener('message',e=>{const data=JSON.parse(String(e.data)),p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result||{});});}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){try{this.ws.close()}catch{}}
}
async function js(c,expr){const r=await c.call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'JS browser error');return r.result?.value;}
async function until(c,expr,ms=90000){const s=Date.now();while(Date.now()-s<ms){try{if(await js(c,expr))return;}catch{}await pause(300);}throw Error('Timeout '+expr);}
function measure(){
 const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const nav=q('.nav-list'),mnav=q('.mobile-nav'),rail=q('.sidebar'),collapsed=q('.workspace-shell')?.classList.contains('sidebar-collapsed');
 const labels=all('.nav-list [data-atlas-domain]').map(b=>{
  const t=[...b.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&x.textContent.trim());
  const range=t?document.createRange():null;if(range)range.selectNodeContents(t);
  const tr=range?range.getBoundingClientRect():null,small=b.querySelector('small');
  const s=rect(small),r=rect(b),text=t?.textContent.trim()||'';
  const mid=r?document.elementFromPoint(r.x+r.width/2,Math.min(innerHeight-1,r.y+r.height/2)):null;
  return {domain:b.dataset.atlasDomain,title:text,status:small?.textContent.trim(),row:r,body:tr?{x:tr.x,y:tr.y,right:tr.right,bottom:tr.bottom,width:tr.width,height:tr.height}:null,detail:s,smallDisplay:small?getComputedStyle(small).display:null,color:small?getComputedStyle(small).color:null,hit:mid===b||b.contains(mid),docOverflow:small?small.scrollWidth>small.clientWidth+1:false};
 });
 const mobileLabels=all('.mobile-nav button[data-atlas-domain]').map(b=>({domain:b.dataset.atlasDomain,status:b.querySelector('small')?.textContent.trim(),display:getComputedStyle(b).display}));
 return {width:innerWidth,docWidth:document.documentElement.scrollWidth,sidebar:rect(rail),nav:rect(nav),drawer:rect(q('.mobile-drawer')),mobileNav:rect(mnav),collapsed,labels,mobileLabels,footerColor:getComputedStyle(q('.sidebar-foot')).color,brandColor:getComputedStyle(q('.brand span')).color,footerFont:getComputedStyle(q('.sidebar-foot')).fontSize};
}
function rel(hex){const h=hex.replace('#','');const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=rel(a),y=rel(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function screenshot(c,file){const res=(await c.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;insist(res,'Missing screenshot',{file});const buffer=Buffer.from(res,'base64');fs.writeFileSync(path.join(OUT,file),buffer);report.screenshots.push({file,bytes:buffer.length});}
async function one(c,width,height){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=760});
 await c.call('Page.navigate',{url:URL+'/?vis3_05t_c_width='+width+'#atlas-dashboard'});
 await until(c,'Boolean(window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain)',90000);
 await until(c,"document.querySelectorAll('.nav-list [data-atlas-domain]').length>=9",30000);
 await js(c,"(()=>{const shell=document.querySelector('.workspace-shell');const toggle=document.querySelector('.sidebar-collapse-toggle');if(innerWidth>760&&shell?.classList.contains('sidebar-collapsed'))toggle?.click();if(innerWidth<=760)document.querySelector('#mobileMenuButton')?.click();return true;})()");
 await pause(400);
 const before=await js(c,'('+measure.toString()+')()');await screenshot(c,'A-current-'+width+'.png');
 const inject="(()=>{const s=document.createElement('style');s.id='vis3-05t-c-branch-review';s.textContent="+JSON.stringify(delta)+";document.head.append(s);return !!s.sheet;})()";
 insist(await js(c,inject),'Could not apply reviewed CSS',{width});
 await pause(400);
 const after=await js(c,'('+measure.toString()+')()');await screenshot(c,'B-legible-'+width+'.png');
 insist(before.docWidth===after.docWidth||after.docWidth<=Math.max(before.docWidth,width)+1,'Added horizontal overflow',{width,a:before.docWidth,b:after.docWidth});
 insist(before.labels.length===after.labels.length,'Navigation count changed',{width});
 for(let i=0;i<before.labels.length;i++)insist(before.labels[i].domain===after.labels[i].domain&&before.labels[i].title===after.labels[i].title&&before.labels[i].status===after.labels[i].status,'Label/status content changed',{width,i});
 if(width<=760){
  insist(JSON.stringify(before.mobileLabels)===JSON.stringify(after.mobileLabels),'Mobile navigation status changed',{width});
  for(let i=0;i<before.labels.length;i++)insist(Math.abs(before.labels[i].row.height-after.labels[i].row.height)<1,'Hidden desktop rail geometry changed on mobile',{width,domain:before.labels[i].domain});
 }else{
  const long=['spacetime','polities','places','events','geometry'];
  for(const label of after.labels.filter(x=>long.includes(x.domain))){
   insist(label.row&&label.body&&label.detail,'Missing status/label geometry',{width,label});
   insist(label.detail.y>=label.body.bottom-1,'Status not subordinate to label',{width,label});
   insist(label.detail.right<=label.row.right+1&&label.detail.bottom<=label.row.bottom+1,'Status clipped outside button',{width,label});
   insist(label.body.height<24,'Main label wrapped on 2+ lines',{width,label});
   insist(!label.docOverflow,'Status overflowed its grid box',{width,label});
   insist(label.hit,'Button midpoint not hit-target',{width,label});
  }
  for(const label of after.labels.filter(x=>!long.includes(x.domain))) {
    const old=before.labels.find(x=>x.domain===label.domain);
    insist(Math.abs(label.row.height-old.row.height)<=1,'Short route vertical geometry changed',{width,label:label.domain,before:old.row,after:label.row});
  }
  const color='#a2a9ae',bg='#0e1114';
  insist(contrast(color,bg)>=4.5&&contrast('#99a2a8',bg)>=4.5,'Static color contrast gate failed');
  const collapsed=await js(c,"(()=>{document.querySelector('.sidebar-collapse-toggle')?.click();return document.querySelector('.workspace-shell')?.classList.contains('sidebar-collapsed')})()");
  insist(collapsed,'Collapse control failed',{width});
  const hidden=await js(c,'('+measure.toString()+')()');
  for(const row of hidden.labels)insist(row.smallDisplay==='none','Collapsed rail displays status',{width,domain:row.domain,display:row.smallDisplay});
 }
 report.cases.push({width,height,status:'PASS',before,after});
 console.log('VIS3_05T_C_CHROME_PASS '+width+'px statuses='+after.labels.length+' collapsedAndMobilePreserved=true');
}
let chrome;
try{
 const tabs=await(await fetch('http://127.0.0.1:9226/json/list')).json(),page=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);insist(page,'No Chrome page');
 chrome=new CDP(page.webSocketDebuggerUrl);await chrome.ready();await chrome.call('Page.enable');await chrome.call('Runtime.enable');
 for(const [width,height] of [[390,844],[768,950],[1000,950],[1440,1000],[1600,1100]])await one(chrome,width,height);
 report.status='PASS';console.log('VIS3_05T_C_READ_ONLY_CHROME_PASS '+report.cases.length+' cases');
}catch(e){report.status='FAIL';report.error=e.message;report.details=e.info||null;console.error('VIS3_05T_C_CHROME_FAIL',e.message,JSON.stringify(e.info||{}));process.exitCode=1;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');chrome?.close();}
