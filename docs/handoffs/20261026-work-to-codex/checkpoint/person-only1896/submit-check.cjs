const fs=require('fs'),vm=require('vm'),a=require('assert/strict');
const s=fs.readFileSync(__dirname+'/atlas-admin-identity.js','utf8');
const fn=s.slice(s.indexOf('  async function submitHumanAuthoring'),s.indexOf('  insertHumanAuthoringPanel();',s.indexOf('  async function submitHumanAuthoring')));
const output={dataset:{}};let sent;
const values={humanPersonEn:'Fixture',humanPersonKo:'검증',humanTimelineDisposition:'chronology_unresolved',humanTimelineReason:'Fixture reason'};
const c={document:{getElementById:()=>output},checked:()=>true,value:id=>values[id]||'',namuwikiReference:()=>null,spatialDispositionReview:()=>{throw Error('must skip')},representativeDomainReview:()=>({representative_domain:'science'}),boundary:()=>{throw Error('must skip')},requestId:()=> 'fixture',humanRequestId:'fixture',authoringEndpoint:'/fixture',friendlyAuthoringError:x=>x,fetch:async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,json:async()=>({ok:true,committed:true,person_id:'fixture-person',source_ids:[]})}}};
vm.createContext(c);vm.runInContext(fn,c);
(async()=>{await c.submitHumanAuthoring({preventDefault(){},submitter:{}});a.equal(sent.schema,'atlas-human-person-authoring/v1');a.equal('polity' in sent,false);a.equal('activity' in sent,false);a.equal(sent.timeline_disposition.reason,'Fixture reason');a.equal(output.dataset.type,'success');a.equal(output.textContent.includes('undefined'),false);console.log('submit fixture 6 assertions PASS '+process.version)})().catch(e=>{console.error(e);process.exitCode=1});
