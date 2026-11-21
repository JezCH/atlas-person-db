import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../atlas-person-external-references.js",import.meta.url),"utf8");
const PERSON_ID="11111111-1111-4111-8111-111111111111";

function fixture(){
  const pending=[];
  let label="인물 이름",anchor=null;
  const name={
    get textContent(){return anchor?anchor.textContent:label;},
    set textContent(value){label=String(value);anchor=null;},
    querySelector(){return anchor;},
    append(node){anchor=node;}
  };
  const row={dataset:{personId:PERSON_ID},querySelector:()=>name};
  const listeners=new Map();
  class CustomEvent {constructor(type,opts={}){this.type=type;this.detail=opts.detail;}}
  const window={
    location:{href:"https://atlas-person-db.vercel.app/"},
    ATLAS_CLIENT_DATA_STORE:{
      getSourceState:()=>({status:"idle"}),
      loadPersons:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))
    },
    addEventListener:(type,fn)=>{
      if(!listeners.has(type))listeners.set(type,[]);
      listeners.get(type).push(fn);
    },
    dispatchEvent:(ev)=>{
      for(const fn of listeners.get(ev.type)||[])fn(ev);
    },
    CustomEvent
  };
  const document={
    querySelectorAll:()=>[row],
    createElement:()=>({addEventListener(){}})
  };
  vm.runInNewContext(source,{window,document,CustomEvent,URL,console,queueMicrotask},
    {filename:"atlas-person-external-references.js"});
  const payload=(url,status="linked")=>({persons:[{id:PERSON_ID,external_references:{
    namuwiki:status==="linked"?
      {status,url,document_title:"역사 출처",checked_at:"2026-11-21"}:
      {status:"not_found",checked_at:"2026-11-21"}
  }}]});
  return {api:window.ATLAS_PERSON_EXTERNAL_REFERENCES,pending,
    payload, name,row, get anchor(){return anchor;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test("corrected Source URL updates the already-rendered Person anchor",async()=>{
  const f=fixture();
  const first=f.api.reload();f.pending.shift().resolve(f.payload("https://namu.wiki/w/old"));
  await first;await settle();
  assert.equal(f.anchor.href,"https://namu.wiki/w/old");
  const next=f.api.reload();f.pending.shift().resolve(f.payload("https://namu.wiki/w/new"));
  await next;await settle();
  assert.equal(f.anchor.href,"https://namu.wiki/w/new");
  assert.equal(f.name.textContent,"인물 이름");
  assert.equal(f.row.dataset.namuwikiStatus,"linked");
});

test("reviewed absence removes the previous external link but preserves Person name",async()=>{
  const f=fixture();
  const init=f.api.reload();f.pending.shift().resolve(f.payload("https://namu.wiki/w/old"));
  await init;await settle();
  const absent=f.api.reload();f.pending.shift().resolve(f.payload(null,"not_found"));
  await absent;await settle();
  assert.equal(f.anchor,null);
  assert.equal(f.name.textContent,"인물 이름");
  assert.equal(f.row.dataset.namuwikiStatus,"not_found");
  const missing=f.api.reload();f.pending.shift().resolve({persons:[{id:PERSON_ID}]});
  await missing;await settle();
  assert.equal(f.anchor,null);
  assert.equal(Object.hasOwn(f.row.dataset,"namuwikiStatus"),false);
});

test("late obsolete reference response cannot restore overwritten Source links",async()=>{
  const f=fixture();
  const old=f.api.reload(),fresh=f.api.reload();
  assert.equal(f.pending.length,2);
  f.pending[1].resolve(f.payload("https://namu.wiki/w/fresh"));
  assert.equal(await fresh,true);
  await settle();
  f.pending[0].resolve(f.payload("https://namu.wiki/w/stale"));
  assert.equal(await old,false);
  await settle();
  assert.equal(f.anchor.href,"https://namu.wiki/w/fresh");
});
