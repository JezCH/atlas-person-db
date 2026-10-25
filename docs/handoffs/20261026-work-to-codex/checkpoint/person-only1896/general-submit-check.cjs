const fs=require('fs'),vm=require('vm'),a=require('assert/strict');
const s=fs.readFileSync(__dirname+'/atlas-admin-identity.js','utf8');
const fn=s.slice(s.indexOf('  async function submitHumanAuthoring'),s.indexOf('  insertHumanAuthoringPanel();',s.indexOf('  async function submitHumanAuthoring')));
const output={dataset:{}};let sent;
const values={humanPersonEn:'Fixture',humanPersonKo:'검증',humanTimelineDisposition:'chronology_unresolved',humanTimelineReason:'Fixture reason'};
const c={document:{getElementById:()=>output},checked:()=>false,value:id=>values[id]||'',namuwikiReference:()=>null,spatialDispositionReview:()=>null,representativeDomainReview:()=>({representative_domain:'science'}),boundary:()=>({}),requestId:()=> 'fixture',humanRequestId:'fixture',authoringEndpoint:'/fixture',friendlyAuthoringError:x=>x,fetch:async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,json:async()=>({ok:true,committed:true,person_id:'fixture-person',source_ids:[]})}}};
vm.createContext(c);vm.runInContext(fn,c);
(async()=>{await c.submitHumanAuthoring({preventDefault(){},submitter:{}});a.equal(sent.schema,'atlas-human-authoring/v1');a.equal('polity' in sent,true);a.equal('activity' in sent,true);a.equal(output.dataset.type,'success');console.log('general mode fixture 4 assertions PASS '+process.version)})().catch(e=>{console.error(e);process.exitCode=1});
