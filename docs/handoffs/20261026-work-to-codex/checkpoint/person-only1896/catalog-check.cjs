const fs=require('fs'),vm=require('vm'),a=require('assert/strict');
const s=fs.readFileSync(__dirname+'/atlas-admin-identity.js','utf8');
const load=s.slice(s.indexOf('  async function loadHumanCatalogs()'),s.indexOf('  let humanRequestId'));
const sync=s.slice(s.indexOf('  function syncPersonOnlyFields()'),s.indexOf('  async function submitHumanAuthoring'));
let resolve;const pending=new Promise(r=>resolve=r);let only=false;
const elements=new Proxy({}, {get(t,id){return t[id] ||= {dataset:{},required:id==='humanPolityEn',disabled:false,value:''}}});
const c={document:{getElementById:id=>elements[id],querySelector:()=>null},checked:()=>only,fetch:()=>pending,authoringEndpoint:'/fixture',appendCatalogOptions(){},populateRepresentativeDomains(){},populateSpatialStates(){},relationLabels:{},periodBasisLabels:{},syncSpatialDispositionFields(){elements.humanSpatialDispositionEvidence.disabled=false}};
vm.createContext(c);vm.runInContext(sync+load,c);
(async()=>{const done=c.loadHumanCatalogs();only=true;c.syncPersonOnlyFields();resolve({ok:true,json:async()=>({ok:true,ready:true,catalogs:{relation_types:['active_in'],period_bases:['general_activity'],representative_domains:[{code:'science'}],spatial_registration_states:['reviewed_hold']}})});await done;a.equal(elements.humanPolityEn.disabled,true);a.equal(elements.humanPolityEn.required,false);a.equal(elements.humanSpatialDispositionEvidence.disabled,true);a.equal(elements.humanAuthoringResult.dataset.type,'success');console.log('delayed catalog 4 assertions PASS '+process.version)})().catch(e=>{console.error(e);process.exitCode=1});
