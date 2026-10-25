const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'atlas-admin-identity.js'),'utf8');
const submit=source.slice(source.indexOf('  async function submitHumanAuthoring'),source.indexOf('  insertHumanAuthoringPanel();',source.indexOf('  async function submitHumanAuthoring')));
function fixture(disposition, personOnly=true) {
 const output={dataset:{}}; let sent;
 const values={humanPersonEn:'Fixture',humanPersonKo:'검증',humanTimelineDisposition:disposition,humanTimelineReason:'검토 근거'};
 const c={document:{getElementById:()=>output},checked:()=>personOnly,value:id=>values[id]||'',namuwikiReference:()=>null,spatialDispositionReview:()=>null,representativeDomainReview:()=>({representative_domain:'science'}),boundary:()=>({}),requestId:()=> 'fixture',humanRequestId:'fixture',authoringEndpoint:'/fixture',friendlyAuthoringError:x=>x,fetch:async(u,o)=>{sent=JSON.parse(o.body);return {ok:true,json:async()=>({ok:true,committed:true,person_id:'fixture',source_ids:[]})}}};
 vm.createContext(c);vm.runInContext(submit,c);
 return {output,run:()=>c.submitHumanAuthoring({preventDefault(){},submitter:{}}),sent:()=>sent};
}
for(const disposition of ['', 'timeline', 'unknown']) test(`reject ${disposition||'empty'} disposition before network`,async()=>{
 const f=fixture(disposition);await f.run();assert.equal(f.sent(),undefined);assert.equal(f.output.dataset.type,'error');
});
for(const disposition of ['chronology_unresolved','legendary','mythical','other_reviewed_exclusion']) test(`explicit ${disposition} person-only submission`,async()=>{
 const f=fixture(disposition);await f.run();assert.equal(f.sent().timeline_disposition.disposition,disposition);assert.equal(f.sent().schema,'atlas-human-person-authoring/v1');assert.equal('activity' in f.sent(),false);assert.match(f.output.textContent,/활동 생성 없음/);
});
test('general response missing relationship does not claim non-timeline',async()=>{
 const f=fixture('',false);await f.run();assert.equal(f.sent().schema,'atlas-human-authoring/v1');assert.doesNotMatch(f.output.textContent,/비연대표/);assert.match(f.output.textContent,/응답에서 확인되지 않음/);
});
test('mode controls require explicit decision and restore Korean name requirement',()=>{
 const controls=new Map();const get=id=>{if(!controls.has(id))controls.set(id,{dataset:{},required:false});return controls.get(id)};get('humanPolityEn').required=true;
 let only=false;const button={};const c={checked:()=>only,document:{getElementById:get,querySelector:()=>button},syncSpatialDispositionFields(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  function syncPersonOnlyFields'),source.indexOf('  async function submitHumanAuthoring')),c);
 c.syncPersonOnlyFields();assert.equal(get('humanTimelineReason').disabled,true);
 only=true;c.syncPersonOnlyFields();assert.equal(get('humanTimelineReason').required,true);assert.equal(get('humanTimelineDisposition').required,true);assert.equal(get('humanPersonKo').required,true);assert.equal(get('humanPolityEn').required,false);assert.match(button.textContent,/비연대표/);
 only=false;c.syncPersonOnlyFields();assert.equal(get('humanPersonKo').required,false);assert.equal(get('humanPolityEn').required,true);assert.equal(get('humanTimelineDisposition').disabled,true);
});
