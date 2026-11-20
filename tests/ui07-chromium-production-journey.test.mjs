import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {verifyUi07DesktopJourney, verifyUi07MobileJourney} from "../scripts/verify-ui07-production-journey.mjs";

const read=(name)=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const smoke=read("scripts/verify-spacetime-production-visual.mjs");
const journey=read("scripts/verify-ui07-production-journey.mjs");
const css=read("atlas-person-spacetime-compare-crosslink.css");
const nav=read("atlas-main-authority-nav.js");
const html=read("index.html");

test("UI-07 Chromium acceptance runs in the existing Production smoke without extra workflow",()=>{
  assert.equal(typeof verifyUi07DesktopJourney,"function");
  assert.equal(typeof verifyUi07MobileJourney,"function");
  assert.match(smoke,/import \{ verifyUi07DesktopJourney, verifyUi07MobileJourney \} from "\.\/verify-ui07-production-journey\.mjs"/);
  assert.match(smoke,/const ui07Desktop = await verifyUi07DesktopJourney\(client, ui07Helpers\)/);
  assert.match(smoke,/const ui07Mobile = await verifyUi07MobileJourney\(client, ui07Helpers, ui07Desktop\.pair, PRODUCTION_URL\)/);
  assert.match(smoke,/ui06b_roundtrip:ui06bRoundtrip/);
  assert.match(smoke,/ui07_desktop_roundtrip:ui07Desktop/);
  assert.match(smoke,/ui07_mobile_roundtrip:ui07Mobile/);
  assert.match(smoke,/ui07-desktop-compare\.png/);
  assert.match(smoke,/ui07-mobile-390-compare\.png/);
});

test("UI-07 browser journey validates real registered Persons and Activity without invented fixture IDs",()=>{
  assert.match(journey,/captureExplorationState/);
  assert.match(journey,/document\.querySelectorAll\('\[data-spacetime-meanwhile-compare\]'\)/);
  assert.match(journey,/Number\.isInteger\(s\.moment\)/);
  assert.match(journey,/inspectPair\(client,h/);
  assert.match(journey,/row\.snapshot\.personIds\.join\(","\)/);
  assert.match(journey,/atlasSpacetimeReturnV1/);
  assert.match(journey,/Page\.reload/);
  assert.match(journey,/history\.back\(\)/);
  assert.match(journey,/history\.forward\(\)/);
  assert.match(journey,/data-compare-return-spacetime/);
  assert.match(journey,/Math\.abs\(row\.zoom-pair\.zoom\)/);
  assert.match(journey,/document\.querySelector\('#atlasComparePeriodsTitle'\)/);
  assert.doesNotMatch(journey,/function makeFakePerson|fixturePerson|newPersonFixture/);
});

test("UI-07 fail-closed: empty or same-Person Meanwhile cannot claim live acceptance",async()=>{
  const a="11111111-1111-4111-8111-111111111111";
  for(const peers of [[],[a]]){
    const helpers={
      evaluate:async(_client,expression)=>{
        if(expression.includes("const sc=document.querySelector"))return {
          route:"#atlas-spacetime/person/"+a,personId:a,activityId:"22222222-2222-4222-8222-222222222222",
          moment:1592,zoom:5,x:200,y:300,peers
        };
        return null;
      },
      assert(condition,message,detail){if(!condition)throw Object.assign(new Error(message),{detail});},
      waitFor:async()=>{},
      sleep:async()=>{},
      screenshot:async()=>{}
    };
    await assert.rejects(verifyUi07DesktopJourney({},helpers),/No two real same-year Activity Persons/);
  }
});

test("UI-07 mobile compare touch target is at least 44px, with one CSS and JS cache version",()=>{
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\[data-spacetime-meanwhile-compare\][^{]*\{\s*width: 56px;\s*min-height: 44px;/);
  assert.match(nav,/atlas-person-spacetime-compare-crosslink\.css\?v=20261120-ui07-spacetime-v1&ui07touch=20261120-44px-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&ui07touch=20261120-44px-v1/);
  assert.match(journey,/click\.width>=44&&click\.height>=44/);
  assert.match(journey,/document\.elementFromPoint/);
  assert.match(journey,/Input\.dispatchMouseEvent/);
  assert.match(journey,/row\.second\.top>=row\.first\.bottom-1/);
  assert.match(journey,/row\.bodyWidth<=392/);
});


test("UI-07 mobile direct Activity hash waits for settled Person, Activity, year and actual source-backed peer",async()=>{
  const a="11111111-1111-4111-8111-111111111111";
  const b="22222222-2222-4222-8222-222222222222";
  const activityId="33333333-3333-4333-8333-333333333333";
  const begin=journey.indexOf("export async function verifyUi07MobileJourney(");
  assert.ok(begin>0);
  const body=journey.slice(begin);
  const order=[body.indexOf("Boolean(document.querySelector('#personSpacetimeMount .spacetime-frame'))"),
    body.indexOf("s?.selectedPersonId==="),
    body.indexOf("s?.selectedActivityId==="),
    body.indexOf("s?.meanwhileOrdinal==="),
    body.indexOf("data-spacetime-meanwhile-compare"),
    body.indexOf("const pair=await inspectPair(client,h,desktopPair)")];
  assert.ok(order.every(x=>x>=0), "Mobile readiness gate must require real exact Person/Activity/moment/peer");
  assert.deepEqual([...order].sort((x,y)=>x-y),order, "Cannot inspect the interim shell before the actual peer is loaded");
  const calls=[];
  const helpers={
    waitFor:async(_client,expression)=>{
      calls.push(expression);
      if(calls.length===3)throw new Error("Mobile Activity peer not actually loaded");
    }
  };
  const client={call:async()=>{}};
  await assert.rejects(verifyUi07MobileJourney(client,helpers,{
    route:"#atlas-spacetime/person/"+a+"/activity/"+activityId,
    personId:a,activityId,moment:1592,personB:b
  },"https://atlas-person-db.vercel.app/"),/Mobile Activity peer not actually loaded/);
  assert.equal(calls.length,3,"A missing real contemporary Person must fail closed, not invent a pair");
  assert.match(calls[2],new RegExp(a));
  assert.match(calls[2],new RegExp(b));
  assert.match(calls[2],/s\?\.meanwhileOrdinal/);
});
