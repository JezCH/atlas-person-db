import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
function fixture(){
  let now=1_000_000, periodic=null, interval=0, queueRequests=0, pending=2, queueHttpStatus=200;
  const calls=[],listeners={},elements=new Map();
  const document={visibilityState:"visible"};
  const element=(selector)=>{
    if(!elements.has(selector))elements.set(selector,{
      dataset:{state:"ready"},textContent:"",innerHTML:"",value:"",
      disabled:false,handlers:{},
      addEventListener(type,handler){this.handlers[type]=handler;}
    });
    return elements.get(selector);
  };
  const root={isConnected:true,innerHTML:"",
    querySelector:element};
  class ClockDate extends Date {
    constructor(...args){super(...(args.length?args:[now]));}
    static now(){return now;}
  }
  const window={
    ATLAS_CLIENT_DATA_STORE:{
      loadPersons({force}={}){
        calls.push(force===true);
        return Promise.resolve({persons:[
          {historicity:"historical",activity_count:1}
        ],summary:{total:1}});
      }
    },
    ATLAS_PERSON_DOMAIN_REGISTRY:{LABELS:{}},
    addEventListener(type,handler){listeners[type]=handler;}
  };
  const fetch=async()=>{queueRequests++;return {
    ok:queueHttpStatus===200,status:queueHttpStatus,
    json:async()=>({ok:queueHttpStatus===200,summary:{pending_count:pending},candidates:[]})
  };};
  vm.runInNewContext(source,{
    window,document,fetch,Date:ClockDate,Promise,
    setInterval(handler,ms){periodic=handler;interval=ms;return 1;},
    clearInterval(){},console:{error(){}}
  },{filename:"atlas-registration-review.js"});
  window.ATLAS_REGISTRATION_REVIEW.mount(root);
  return {
    root,element,calls,listeners,
    get queueRequests(){return queueRequests;},
    get interval(){return interval;},
    advance(ms){now+=ms;periodic();},
    setPending(n){pending=n;},
    setQueueStatus(n){queueHttpStatus=n;},
    setVisibility(value){document.visibilityState=value;},
    manual(){element("#registrationReviewRefresh").handlers.click();},
    focus(){listeners.focus();},
    drain:()=>new Promise(resolve=>setImmediate(resolve))
  };
}

test("VIS-05 refreshes the queue every 10s but not the entire Person roster",async()=>{
  const x=fixture();
  await x.drain();
  assert.equal(x.interval,10000);
  assert.deepEqual(x.calls,[true]);
  assert.equal(x.queueRequests,1);
  x.advance(10000);await x.drain();
  x.advance(10000);await x.drain();
  assert.deepEqual(x.calls,[true,false,false]);
  assert.equal(x.queueRequests,3);
  assert.match(x.element("#registrationReviewStatus").textContent,
    /대기열 최신 조회 · 인물 명부 재사용/);
  x.advance(100000);await x.drain();
  assert.deepEqual(x.calls,[true,false,false,true],
    "Full-roster freshness is restored at the 120-second boundary");
  assert.equal(x.queueRequests,4);
});

test("manual refresh and window focus still force the fresh Person roster",async()=>{
  const x=fixture();await x.drain();
  x.advance(10000);await x.drain();
  x.manual();await x.drain();
  x.focus();await x.drain();
  assert.deepEqual(x.calls,[true,false,true,true]);
  assert.equal(x.queueRequests,4);
  assert.match(x.element("#registrationReviewStatus").textContent,
    /인물·대기열 최신 조회/);
});

test("pending registration counts remain live during cached-roster interval reads",async()=>{
  const x=fixture();await x.drain();
  assert.match(x.element("#registrationRegisteredStats").innerHTML,/등록대기열/);
  x.setPending(7);
  x.advance(10000);await x.drain();
  const stats=x.element("#registrationRegisteredStats").innerHTML;
  assert.match(stats,/>7<\/strong><span>등록대기열/);
  assert.equal(x.calls.at(-1),false);
  assert.equal(x.queueRequests,2);
});

test("hidden registration tab makes no queue or full-roster requests and resumes on focus",async()=>{
  const x=fixture();await x.drain();
  assert.equal(x.queueRequests,1);
  x.setVisibility("hidden");
  x.advance(10000);await x.drain();
  x.advance(120000);await x.drain();
  x.advance(20000);await x.drain();
  assert.deepEqual(x.calls,[true],"Do not refresh even the large roster in a background tab");
  assert.equal(x.queueRequests,1,"10-second queue polling must pause for hidden tabs");
  x.setVisibility("visible");
  x.focus();await x.drain();
  assert.deepEqual(x.calls,[true,true],"Return focus restores an immediate fresh roster");
  assert.equal(x.queueRequests,2);
  x.advance(10000);await x.drain();
  assert.deepEqual(x.calls,[true,true,false],"Foreground queue cadence resumes normally");
  assert.equal(x.queueRequests,3);
});

test("HTTP 402 quota response halts automated and interactive retry until full page reload",async()=>{
  const x=fixture();await x.drain();
  x.setQueueStatus(402);
  x.advance(10000);await x.drain();
  assert.equal(x.queueRequests,2,"Exactly one 402 was observed");
  assert.match(x.element("#registrationReviewStatus").textContent,/HTTP 402.*자동 갱신을 중단/);
  x.advance(10000);await x.drain();
  x.advance(120000);await x.drain();
  x.focus();await x.drain();
  x.manual();await x.drain();
  assert.equal(x.queueRequests,2,"Do not retry quota-exhausted endpoint automatically or on focus/click");
  assert.equal(x.calls.length,2,"Do not repeatedly reload the Person roster after a 402");
});
