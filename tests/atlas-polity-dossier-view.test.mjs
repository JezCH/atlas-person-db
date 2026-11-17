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
  assert.match(html,/활동 기록에서 확인된 시대 명칭/);
  assert.match(html,/명칭 자체의 존속기간이 아니라/);
  assert.match(html,/동일 인물의 여러 활동을 한 묶음/);
  assert.match(html,new RegExp(`data-polity-person-id="${PERSON_A}"`));
  assert.match(html,/2 활동/);
  assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|\/api\//);
});

test("Polity reader and dossier preserve Activity date precision, uncertainty and calendar",()=>{
  const reader=require("../server/atlas-polity-read-service.js");
  const raw={
    id:"a1",person_id:PERSON_A,person_name_ko:"인물 A",
    activity_start:-44,activity_end:14,
    activity_start_month:3,activity_start_day:15,
    activity_start_granularity:"day",activity_start_certainty:"uncertain",activity_start_calendar:"julian",
    activity_end_granularity:"year",activity_end_certainty:"approximate",activity_end_calendar:"gregorian"
  };
  const before=JSON.stringify(raw);
  const activity=reader.normalizeActivities([raw])[0];
  for(const side of ["start","end"]) for(const field of ["month","day","granularity","certainty","calendar"]){
    const key=`activity_${side}_${field}`;
    assert.equal(activity[key],raw[key]??null,key);
    assert.ok(reader.POLITY_SELECT_SQL.includes(`'${key}', pp.${key}`),key);
  }
  const cases=[
    [activity,"기원전 44 3월 15일? (율리우스력)–약 14"],
    [{...activity,activity_start_granularity:"month"},"기원전 44 3월? (율리우스력)–약 14"],
    [{...activity,activity_start_granularity:"year"},"기원전 44? (율리우스력)–약 14"],
    [{activity_start:1900,activity_end:null},"1900–종료 미상"],
    [{activity_start:null,chronology_status:"ongoing"},"시작 미상–현재"],
    [{activity_start:1900,activity_end:1901,activity_start_calendar:"unknown_calendar"},"1900 (달력 확인 필요)–1901"]
  ];
  for(const [value,expected] of cases) assert.equal(dossier.activitySpan(value),expected);
  const polity={...polityFixture(),activities:[activity]};
  const html=dossier.createRenderer({
    escapeHtml:value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")
  }).dossierHtml(polity);
  assert.ok(html.includes(cases[0][1]),"actual Activity row renders preserved temporal evidence");
  assert.equal(dossier.dossierForPolity(polity).people[0].activities[0].id,raw.id);
  assert.equal(JSON.stringify(raw),before);
});

test("Polity direct bibliography is visible, escapes text, and rejects unsafe source URLs",()=>{
  const renderer=dossier.createRenderer({escapeHtml:value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")});
  const data={...polityFixture(),direct_sources:[
    {title:"Archive <title>",canonical_url:"https://example.org/record",citation_text:"Original citation",author_creator:"A. Author",institution:"Archive",publisher:"Press",publication_year:1901,external_identifier:"cat:1"},
    {title:"Unsafe URL",canonical_url:"javascript:alert(1)",citation_text:"<img src=x>"},
    {title:"Text-only record",canonical_url:null}
  ]};
  const before=JSON.stringify(data);
  const html=renderer.dossierHtml(data);
  assert.match(html,/정치체 직접 출처/);
  assert.match(html,/href="https:\/\/example\.org\/record"/);
  assert.match(html,/Archive &lt;title&gt;/);
  assert.match(html,/저자: A\. Author/);
  assert.match(html,/기관: Archive/);
  assert.match(html,/출판: Press/);
  assert.match(html,/발행: 1901/);
  assert.match(html,/식별자: cat:1/);
  assert.match(html,/Original citation/);
  assert.match(html,/Text-only record/);
  assert.match(html,/&lt;img src=x&gt;/);
  assert.doesNotMatch(html,/href="javascript:|<img src=x>/);
  assert.equal(JSON.stringify(data),before);
  assert.match(renderer.dossierHtml(polityFixture()),/이 정치체에 직접 연결된 출처 없음/);
});

test("Governance interval never promotes residual month/day beyond canonical granularity; notes are displayed",()=>{
  const data={...polityFixture(),governance_periods:[{
    id:"historical-regime",name_ko:"통치 체제",governance_type:"government",
    valid_from_year:1900,valid_from_month:1,valid_from_day:2,valid_from_granularity:"year",
    valid_to_year:1910,valid_to_month:4,valid_to_day:5,valid_to_granularity:"month",
    notes:"근거 기록 <not html>"
  }]};
  assert.equal(dossier.dossierForPolity(data).governance_periods[0].period_label,"1900–1910-04");
  const renderer=dossier.createRenderer({escapeHtml:value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")});
  const html=renderer.dossierHtml(data);
  assert.match(html,/1900–1910-04/);
  assert.match(html,/근거 기록 &lt;not html&gt;/);
  assert.doesNotMatch(html,/1900-01-02|1910-04-05/);
});
