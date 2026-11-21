import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../atlas-person-main.js',import.meta.url),'utf8');
const id='11111111-2222-4333-8444-555555555555';
const emptyFacets=()=>({polities:[],relations:[],roles:[],period_bases:[]});
const person=Object.freeze({
  id, display_name:'Test Person', canonical_name_en:'Test Person',
  person_type:'historical', historicity:'historical', names:[],
  descriptions:[], sources:[], activity_count:0,activities:[],activity_summaries:[],
  facets:emptyFacets(),first_activity_year:1700,last_activity_year:1750,representative_domain:'science'
});

function harness(initialHash,detailPerson=person,options={}) {
  const state={listCalls:0,detailCalls:0,portraitCalls:0,events:new Map(),groupMarkup:[],details:'',domainsPassedToPortrait:[],emitted:[],detailClickListener:null,rowSelectionChanges:[],portraitPatch:null,editorPatch:null};
  const node=(extra={})=>({
    addEventListener(){},setAttribute(){},insertAdjacentElement(){},
    append(){},remove(){},removeAttribute(){},querySelector(){return null;},
    ...extra
  });
  const groups=node({
    children:[],
    addEventListener(type,cb){state.groupsListener=cb;},
    insertAdjacentHTML(_where,html){state.groupMarkup.push(html);},
    querySelector(selector){
      if (selector.includes(`[data-person-id="${id}"]`)) return {classList:{toggle(_name,selected){state.rowSelectionChanges.push(selected);}}};
      return null;
    }
  });
  const detail=node({
    addEventListener(type,cb){if(type==='click')state.detailClickListener=cb;},
    querySelector(selector) {
      if (selector === '.person-chronicle-hero > .person-detail-portrait') return {set outerHTML(value){state.portraitPatch=value;}};
      if (selector === '.person-detail-authoring .person-portrait-editor') return {set outerHTML(value){state.editorPatch=value;}};
      return null;
    }
  });
  Object.defineProperty(detail,'innerHTML',{
    get(){return state.details;},
    set(value){state.details=value;}
  });
  const heading=node({append(){}});
  const topbar=node({querySelector(){return node();}});
  const mainArea=node({querySelector(){return topbar;}});
  const refresh=node();
  const exportButton=node();
  const sort=node({value:'start-asc'});
  const lookup=new Map([
    ['personMainGroups',groups],['personMainDetail',detail],
    ['personMainRefresh',refresh],['personMainExcelExport',exportButton],
    ['personMainSort',sort],['connectionStatus',node()]
  ]);
  const document={
    querySelector(selector){return selector==='.main-area'?mainArea:null;},
    createElement(){return node({querySelector:()=>heading});},
    getElementById(id){return lookup.get(id)||null;}
  };
  const routeModel={parseHash(hash){
    const match=String(hash||'').match(/^#atlas-persons\/person\/([0-9a-f-]+)$/i);
    return match ? {domain:'persons',entity_type:'person',entity_id:match[1]}
      : {domain:String(hash||'').startsWith('#atlas-dashboard')?'dashboard':'persons',entity_type:null,entity_id:null};
  }};
  const reader={
    UUID_PATTERN:/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    readPerson:async()=>{state.detailCalls++;return {person:detailPerson};},
    readPortrait:async()=>{state.portraitCalls++;return options.portraitPromise || {portrait:null};},
    personMatchesQuery:()=>true,
    personMatchesFacets:()=>true,
    preparePersonGroups:(persons)=>({historical:persons,other_or_uncertain:[]}),
    comparePersons:()=>0,facetCatalog:()=>emptyFacets()
  };
  const dataStore={
    loadPersons:async()=>{state.listCalls++;return {persons:options.listPersons || [person],facet_catalog:emptyFacets()};},
    loadPersonDomains:async()=>({by_person_id:{}})
  };
  const events=new Map();
  const window={
    location:{hash:initialHash,href:'https://example.org/index.html'+initialHash},
    ATLAS_ENTITY_ROUTE:routeModel,
    ATLAS_PERSON_BROWSER_READER:reader,
    ATLAS_CLIENT_DATA_STORE:dataStore,
    ATLAS_PERSON_DOMAIN_REGISTRY:{LABELS:{},CODES:[],DEFINITIONS:[]},
    ATLAS_UI_I18N:{enumLabel:(_kind,_value,{fallback})=>fallback},
    ATLAS_PERSON_EXTERNAL_REFERENCES:{},
    ATLAS_PERSON_PORTRAIT_VIEW:{createRenderer:()=>({portraitEditorHtml:(_person,result)=>result?.loading
      ? '<div class="person-portrait-editor is-loading">초상화 정보를 불러오는 중입니다.</div>'
      : `<div class="person-portrait-editor">${result?.portrait?'초상 교체':'초상 업로드'}</div>`})},
    ATLAS_PERSON_PORTRAIT_CONTROLLER:{createController:()=>({})},
    ATLAS_PERSON_PORTRAIT_PRESENTATION:{presentationFor:(_person,domain)=>{
      state.domainsPassedToPortrait.push(domain);
      return {
        era_label:'History',domain_label:'Science',era_code:'modern',domain_code:domain,
        background_url:domain ? './portrait-assets/backgrounds/'+domain+'.png' : null
      };
    }},
    ATLAS_PERSON_PROFILE_EDITOR:{createEditor:()=>({profileEditorHtml:(_person,{portraitHtml})=>portraitHtml})},
    ATLAS_PERSON_EVIDENCE_VIEW:{createRenderer:()=>({activityEvidenceHtml:()=>''})},
    addEventListener(name,cb){events.set(name,cb);},
    dispatchEvent(event){state.emitted.push(event);}
  };
  vm.runInNewContext(source,{
    window,document,URL,console,
    CustomEvent:class{constructor(type,props){this.type=type;this.detail=props?.detail;}},
    clearTimeout:options.clock?.clearTimeout || clearTimeout,
    setTimeout:options.clock?.setTimeout || setTimeout
  });
  return {state,window,groups,events};
}

async function settle() {
  for(let i=0;i<8;i++) await Promise.resolve();
}

test('direct Person link reads only the bounded Person detail and portrait, not the entire register',async()=>{
  const h=harness('#atlas-persons/person/'+id);
  await settle();
  assert.equal(h.state.listCalls,0);
  // The real authority router sends this event before invoking openPerson.
  h.events.get('atlas-authority-domain-changed')({detail:{domain:'persons'}});
  await settle();
  assert.equal(h.state.listCalls,0);
  assert.equal(await h.window.ATLAS_PERSON_MAIN.openPerson(id),true);
  assert.equal(h.state.detailCalls,1);
  assert.equal(h.state.portraitCalls,1);
  assert.equal(h.state.listCalls,0);
  assert.match(h.state.details,/Test Person/);
  assert.deepEqual(h.state.domainsPassedToPortrait,['science']);
  assert.match(h.state.details,/portrait-assets\/backgrounds\/science\.png/);
  assert.ok(h.state.groupMarkup.some(text=>text.includes('data-person-list-load')));
  assert.equal(h.window.ATLAS_PERSON_MAIN.getSelectedPersonId(),id);
});

test('Person register loads when explicitly requested from a direct link, preserving selected detail',async()=>{
  const h=harness('#atlas-persons/person/'+id);
  await h.window.ATLAS_PERSON_MAIN.openPerson(id);
  h.state.groupsListener({target:{closest(selector){
    return selector==='[data-person-list-load]' ? {} : null;
  }}});
  await settle();
  assert.equal(h.state.listCalls,1);
  assert.equal(h.window.ATLAS_PERSON_MAIN.getSelectedPersonId(),id);
  // An event on an entity link does not issue a second full-register request.
  h.events.get('atlas-authority-domain-changed')({detail:{domain:'persons'}});
  await settle();
  assert.equal(h.state.listCalls,1);
});

test('ordinary Person home, or navigation out of a deep link, still fetches the full searchable registry',async()=>{
  const home=harness('#atlas-persons');
  await settle();
  assert.equal(home.state.listCalls,1);
  const deep=harness('#atlas-persons/person/'+id);
  deep.window.location.hash='#atlas-persons';
  deep.events.get('atlas-authority-domain-changed')({detail:{domain:'persons'}});
  await settle();
  assert.equal(deep.state.listCalls,1);
});

test('searching on direct link opts into full register once; non-Person route keeps lazy loading',async()=>{
  const deep=harness('#atlas-persons/person/'+id);
  deep.window.ATLAS_PERSON_MAIN.setSearchQuery('Test');
  await settle();
  assert.equal(deep.state.listCalls,1);
  const dashboard=harness('#atlas-dashboard');
  await settle();
  assert.equal(dashboard.state.listCalls,0);
  dashboard.events.get('atlas-authority-domain-changed')({detail:{domain:'dashboard'}});
  await settle();
  assert.equal(dashboard.state.listCalls,0);
});


test('Person detail offers a UUID-scoped Spacetime link and dispatches only the selected Person',async()=>{
  const h=harness('#atlas-persons/person/'+id);
  assert.equal(await h.window.ATLAS_PERSON_MAIN.openPerson(id),true);
  assert.match(h.state.details,/data-person-open-spacetime="11111111-2222-4333-8444-555555555555"/);
  assert.match(h.state.details,/시공간 인물도에서 찾기/);
  const trigger=(personId)=>h.state.detailClickListener({target:{closest(selector){return selector==='[data-person-open-spacetime]'?{dataset:{personOpenSpacetime:personId}}:null;}}});
  trigger('11111111-2222-4333-8444-000000000000');
  trigger('not-a-uuid');
  assert.equal(h.state.emitted.filter(e=>e.type==='atlas-person-open-spacetime').length,0);
  trigger(id);
  const events=h.state.emitted.filter(e=>e.type==='atlas-person-open-spacetime');
  assert.equal(events.length,1);
  assert.equal(events[0].detail.personId,id);
});


test('Activity-specific contemporaries action selects only a real Activity belonging to the active Person',async()=>{
  const activityId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const anotherId='aaaaaaaa-bbbb-4ccc-8ddd-000000000000';
  const fixture={...person,activity_count:1,activities:[{
    id:activityId,
    role:{display_name:'기록상 활동'},
    relation:{code:'served'},
    polity:{display_name:'기록상 정치체'},
    period_basis:'activity',
    start:{},end:{}
  }]};
  const h=harness('#atlas-persons/person/'+id,fixture);
  assert.equal(await h.window.ATLAS_PERSON_MAIN.openPerson(id),true);
  assert.match(h.state.details,/data-person-open-activity="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"/);
  assert.match(h.state.details,/동시대 세계/);
  const click=(value)=>h.state.detailClickListener({target:{closest(selector){
    return selector==='[data-person-open-activity]' ? {dataset:{personOpenActivity:value}} : null;
  }}});
  click(anotherId);
  click('not-uuid');
  assert.equal(h.state.emitted.filter(x=>x.type==='atlas-person-open-activity-spacetime').length,0);
  click(activityId);
  const emitted=h.state.emitted.filter(x=>x.type==='atlas-person-open-activity-spacetime');
  assert.equal(emitted.length,1);
  assert.equal(emitted[0].detail.personId,id);
  assert.equal(emitted[0].detail.activityId,activityId);
  assert.equal(h.state.listCalls,0);
});


test('slow portrait never blocks factual Person detail; late result patches only portrait and editor',async()=>{
  let resolvePortrait;
  const delayed = new Promise(resolve=>{resolvePortrait=resolve;});
  const h=harness('#atlas-persons/person/'+id,person,{portraitPromise:delayed});
  assert.equal(await h.window.ATLAS_PERSON_MAIN.openPerson(id),true);
  assert.match(h.state.details,/Test Person/);
  assert.match(h.state.details,/초상화 조회 중/);
  assert.match(h.state.details,/초상화 정보를 불러오는 중입니다/);
  assert.equal(h.state.portraitPatch,null);
  const detailSnapshot=h.state.details;
  resolvePortrait({portrait:{asset_url:'https://example.org/portrait.webp',portrait_kind:'photo'}});
  await settle();
  assert.equal(h.state.details,detailSnapshot,'late portrait must not rerender detail form or chronology');
  assert.match(h.state.portraitPatch,/portrait.webp/);
  assert.match(h.state.editorPatch,/초상 교체/);
  assert.equal(h.state.portraitCalls,1);
});

test('late portrait after clearing selection cannot overwrite the new detail state',async()=>{
  let resolvePortrait;
  const delayed=new Promise(resolve=>{resolvePortrait=resolve;});
  const h=harness('#atlas-persons/person/'+id,person,{portraitPromise:delayed});
  await h.window.ATLAS_PERSON_MAIN.openPerson(id);
  h.window.ATLAS_PERSON_MAIN.clearSelection();
  resolvePortrait({portrait:{asset_url:'https://example.org/stale.webp'}});
  await settle();
  assert.equal(h.state.portraitPatch,null);
  assert.match(h.state.details,/왼쪽에서 인물을 선택/);
});

test('selecting and clearing Person only toggles row selection, not the full rendered register',async()=>{
  const h=harness('#atlas-persons');
  await settle();
  const renderCount=h.state.groupMarkup.length;
  assert.equal(await h.window.ATLAS_PERSON_MAIN.openPerson(id),true);
  assert.equal(h.state.groupMarkup.length,renderCount);
  assert.equal(h.state.rowSelectionChanges.at(-1),true);
  h.window.ATLAS_PERSON_MAIN.clearSelection();
  assert.equal(h.state.groupMarkup.length,renderCount);
  assert.equal(h.state.rowSelectionChanges.at(-1),false);
});


test('typing search batches full-register rerenders; programmatic queries and filter renders stay immediate',async()=>{
  const callbacks=new Map();
  let nextId=0;
  const clock={
    setTimeout(callback){const id=++nextId;callbacks.set(id,callback);return id;},
    clearTimeout(id){callbacks.delete(id);}
  };
  const h=harness('#atlas-persons',person,{clock});
  await settle();
  const before=h.state.groupMarkup.length;
  const input=(query,composing=false)=>h.events.get('atlas-person-search-change')({detail:{query,composing}});
  input('A');input('Al');input('Ale');
  assert.equal(h.window.ATLAS_PERSON_MAIN.getSearchQuery(),'Ale');
  assert.equal(h.state.groupMarkup.length,before,'rapid input must not rebuild thousands of rows');
  assert.equal(callbacks.size,1,'only one trailing render is scheduled');
  const pending=[...callbacks.values()][0];callbacks.clear();pending();
  assert.equal(h.state.groupMarkup.length,before+1);
  input('Alex');
  assert.equal(callbacks.size,1);
  h.window.ATLAS_PERSON_MAIN.renderGroups();
  assert.equal(h.state.groupMarkup.length,before+2,'other render must consume newest query immediately');
  assert.equal(callbacks.size,0,'no stale render may run after a filter/sort rerender');
  input('Alexander');
  assert.equal(callbacks.size,1);
  h.window.ATLAS_PERSON_MAIN.setSearchQuery('Socrates');
  assert.equal(h.window.ATLAS_PERSON_MAIN.getSearchQuery(),'Socrates');
  assert.equal(callbacks.size,0);
  assert.equal(h.state.groupMarkup.length,before+3,'programmatic search remains immediate');
  input('So');
  input('',false);
  assert.equal(callbacks.size,0,'clearing search flushes immediately');
  assert.equal(h.state.groupMarkup.length,before+4);
});

test('Person card markup is reused for repeated filters and refreshed only for selected variant',async()=>{
  let activityReads=0;
  const mutable={...person};
  Object.defineProperty(mutable,'activity_summaries',{
    get(){activityReads+=1;return [];}
  });
  const h=harness('#atlas-persons',person,{listPersons:[mutable]});
  await settle();
  assert.ok(activityReads>0);
  const firstReads=activityReads;
  const firstHtml=h.state.groupMarkup.at(-1);
  h.window.ATLAS_PERSON_MAIN.renderGroups();
  assert.equal(activityReads,firstReads,'same immutable Person snapshot must reuse rendered activities');
  assert.equal(h.state.groupMarkup.at(-1),firstHtml);
  await h.window.ATLAS_PERSON_MAIN.openPerson(id);
  h.window.ATLAS_PERSON_MAIN.renderGroups();
  const selectedReads=activityReads;
  assert.ok(selectedReads>firstReads,'selected variant is computed once when needed');
  assert.match(h.state.groupMarkup.at(-1),/is-selected/);
  h.window.ATLAS_PERSON_MAIN.renderGroups();
  assert.equal(activityReads,selectedReads,'repeat selected render must reuse cached card');
  h.window.ATLAS_PERSON_MAIN.clearSelection();
  h.window.ATLAS_PERSON_MAIN.renderGroups();
  assert.equal(activityReads,selectedReads,'returning to normal variant must reuse cached card');
});


test('large Person register defers offscreen Activity DOM without losing full Person identity or search results',async()=>{
  const rows=Array.from({length:125},(_,index)=>({
    ...person,
    id:'11111111-2222-4333-8444-'+String(index+1).padStart(12,'0'),
    display_name:'Person '+index,
    canonical_name_en:'Person '+index,
    first_activity_year:index<60?-900:1900,
    activity_count:2,
    activity_summaries:[{id:'activity-'+index,polity:{display_name:'Test Polity'},relation:{code:'rules'},start:{year:1900},end:{year:1901}}]
  }));
  const h=harness('#atlas-persons',person,{listPersons:rows});
  await settle();
  const list=h.state.groupMarkup.at(-1);
  assert.ok(list,'list must render');
  const deferred=(list.match(/data-person-deferred="true"/g)||[]).length;
  const full=(list.match(/class="person-card-top"/g)||[]).length;
  assert.equal(full,48,'first screen retains fully rendered Persons');
  assert.equal(deferred,77,'every remaining Person still has a lightweight row');
  assert.match(list,/Person 124/,'end of the register must remain navigable');
  assert.match(list,/data-person-range="AD 1900/,'deferred era classification preserves exact chronology');
  const lastId=rows[124].id;
  const hydrated=h.window.ATLAS_PERSON_MAIN.personCardMarkup(lastId);
  assert.match(hydrated,/Person 124/);
  assert.match(hydrated,/person-card-activity/,'the full Activity subtree can be restored without a new read');
  assert.equal(h.state.listCalls,1);
  h.window.ATLAS_PERSON_MAIN.setSearchQuery('Test');
  assert.equal(h.state.listCalls,1,'search never fetches a separate Person snapshot');
  assert.equal(h.window.ATLAS_PERSON_MAIN.personCardMarkup('not-a-uuid'),null);
});
