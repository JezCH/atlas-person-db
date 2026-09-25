import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const dossier=require("../atlas-polity-dossier-view.js");

const POLITY_ID="00000000-0000-4000-8000-000000000201";
const PERSON_A="00000000-0000-4000-8000-000000000001";
const PERSON_B="00000000-0000-4000-8000-000000000002";

function polityFixture(){
  return {
    id:POLITY_ID,
    canonical_key:"japan",
    polity_type:"historical_polity",
    historicity:"historical",
    canonical_name_en:"Japan",
    preferred_name_ko:"일본",
    display_name:"일본",
    names:[
      {locale:"ko",name:"일본",name_type:"display",is_preferred:true},
      {locale:"en",name:"Japan",name_type:"canonical",is_preferred:true}
    ],
    unresolved_activity_count:1,
    activities:[
      {
        id:"a1",person_id:PERSON_A,person_display_name:"인물 A",
        polity_designation_name_ko:"일본 제국",polity_designation_name_en:"Empire of Japan",
        activity_start:1868,activity_end:1890,chronology_status:"reviewed",
        relation_code:"rules",role_name:"천황",period_basis:"reign",confidence:"high"
      },
      {
        id:"a2",person_id:PERSON_A,person_display_name:"인물 A",
        polity_designation_name_ko:"일본 제국",polity_designation_name_en:"Empire of Japan",
        activity_start:1890,activity_end:1912,chronology_status:"reviewed",
        relation_code:"rules",role_name:"천황",period_basis:"reign",confidence:"high"
      },
      {
        id:"a3",person_id:PERSON_B,person_display_name:"인물 B",
        activity_start:1946,activity_end:null,chronology_status:"ongoing",
        relation_code:"serves",role_name:"공직",period_basis:"term",confidence:"high"
      }
    ]
  };
}

test("Polity dossier groups repeated Activities under distinct Persons",()=>{
  const view=dossier.dossierForPolity(polityFixture());
  assert.equal(view.person_count,2);
  assert.equal(view.activity_count,3);
  assert.equal(view.people.length,2);
  assert.equal(view.people[0].person_id,PERSON_A);
  assert.equal(view.people[0].activity_count,2);
  assert.equal(view.people[0].observed_span.label,"1868–1912");
  assert.equal(view.people[1].person_id,PERSON_B);
  assert.equal(view.people[1].observed_span.label,"1946–현재");
});

test("Polity dossier treats temporal designation range as observed Activity coverage only",()=>{
  const view=dossier.dossierForPolity(polityFixture());
  assert.equal(view.designations.length,1);
  assert.equal(view.designations[0].display_name,"일본 제국");
  assert.equal(view.designations[0].canonical_name_en,"Empire of Japan");
  assert.equal(view.designations[0].person_count,1);
  assert.equal(view.designations[0].activity_count,2);
  assert.equal(view.designations[0].observed_span.label,"1868–1912");
});

test("Polity dossier preserves identity and exact unresolved/ongoing counts without synthetic scores",()=>{
  const view=dossier.dossierForPolity(polityFixture());
  assert.equal(view.identity.id,POLITY_ID);
  assert.equal(view.identity.canonical_key,"japan");
  assert.equal(view.identity.polity_type,"historical_polity");
  assert.equal(view.observed_span.label,"1868–현재");
  assert.equal(view.unresolved_activity_count,1);
  assert.equal(view.ongoing_activity_count,1);
  assert.equal("score" in view,false);
  assert.equal("importance" in view,false);
});

test("Polity dossier renderer exposes exact Person deep-link targets and explicit designation caveat",()=>{
  const renderer=dossier.createRenderer({
    escapeHtml:(value)=>String(value??"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
  });
  const html=renderer.dossierHtml(polityFixture());
  assert.match(html,/정치체 식별 정보/);
  assert.match(html,/Activity에서 관측된 시대 명칭/);
  assert.match(html,/명칭 자체의 존속기간이 아니라/);
  assert.match(html,/동일 인물의 여러 Activity를 한 묶음/);
  assert.match(html,new RegExp(`data-polity-person-id="${PERSON_A}"`));
  assert.match(html,/2 Activity/);
  assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|\/api\//);
});
