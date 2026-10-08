import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const reader=require("../server/atlas-polity-read-service.js");
const dossier=require("../atlas-polity-dossier-view.js");

const FRANCE="1eaa48b6-dc60-49d6-91c4-49db556f4ddf";
const REPUBLIC="b138f5e4-ff83-40f6-bdb1-83b08c0256cb";
const name=(id)=>id===FRANCE?"France":"French Republic";
const sourceRow=(id)=>({
  id, canonical_key:id===FRANCE?"France":"stage2:french-republic",
  canonical_name_en:name(id),preferred_name_ko:id===FRANCE?"프랑스":"프랑스 공화국",
  polity_type:"historical_polity",historicity:"historical",names:[],activities:[]
});
const govRow=(id,key,type,ko,from,to)=>({
  id,governance_context_id:id,governance_context_key:key,governance_type:type,
  historicity:"historical",name_en:key,name_fr:null,name_ko:ko,
  valid_from_year:from[0],valid_from_month:from[1],valid_from_day:from[2],
  valid_from_granularity:"day",valid_to_year:to?.[0]??null,
  valid_to_month:to?.[1]??null,valid_to_day:to?.[2]??null,
  valid_to_granularity:to?"day":null,confidence:"reviewed",notes:"original sourced statement"
});
const vichy=govRow("be34df5e-f43f-4645-bf04-1aaf4b213867","stage2:vichy-etat-francais-de-facto-regime-1940-1944","governing_regime","비시 정권(사실상 프랑스국 정부)",[1940,7,10],[1944,8,20]);
const republicPeriods=[
  govRow("aeeeef67-3e31-4b4c-8e3e-e5b458136a72","stage2:free-french-national-committee-1941-1943","government","프랑스 국민위원회",[1941,9,24],[1943,6,2]),
  govRow("27c1f5aa-2194-4e09-9c82-fb5d0f08187d","stage2:french-committee-of-national-liberation-1943-1944","government","프랑스 민족해방위원회",[1943,6,3],[1944,6,2]),
  govRow("d62d6cb9-4f36-4e7e-aa36-9c99a8b417cd","stage2:french-provisional-government-1944-1946","government","프랑스 공화국 임시정부",[1944,6,3],[1946,12,24]),
  govRow("ce3e52df-59d7-470d-be1e-18e6198f8690","stage2:french-fourth-republic","constitutional_regime","프랑스 제4공화국",[1946,12,24],[1958,10,3]),
  govRow("078c50b9-4a15-46b4-9181-567cf07ee838","stage2:french-fifth-republic","constitutional_regime","프랑스 제5공화국",[1958,10,4],null)
];

test("P2-01H detail queries ONLY matching Polity UUID, never fabricates a country⇄Republic edge",async()=>{
  const calls=[];
  const client={async query(sql,args){
    calls.push({sql,args});
    if(sql===reader.POLITY_DETAIL_SQL){return {rowCount:1,rows:[sourceRow(args[0])]};}
    if(sql===reader.POLITY_GOVERNANCE_PERIODS_SQL){
      return {rows:args[0]===FRANCE?[vichy]:republicPeriods};
    }
    throw Error("Unexpected Polity query");
  }};
  const [france,republic]=await Promise.all([
    reader.readPolityDetail({client,polityId:FRANCE}),
    reader.readPolityDetail({client,polityId:REPUBLIC})
  ]);
  assert.match(reader.POLITY_GOVERNANCE_PERIODS_SQL,/where gp.polity_id=\$1::uuid/);
  assert.doesNotMatch(reader.POLITY_GOVERNANCE_PERIODS_SQL,/polity_relations|polity_identity_relations/);
  assert.equal(calls.filter(x=>x.sql===reader.POLITY_GOVERNANCE_PERIODS_SQL).length,2);
  assert.deepEqual(calls.filter(x=>x.sql===reader.POLITY_GOVERNANCE_PERIODS_SQL).map(x=>x.args[0]).sort(),[FRANCE,REPUBLIC].sort());
  assert.equal(france.governance_periods.length,1);
  assert.equal(republic.governance_periods.length,5);
  assert.equal(france.governance_periods[0].governance_type,"governing_regime");
  assert.equal(france.governance_periods[0].name_ko,"비시 정권(사실상 프랑스국 정부)");
  assert.ok(republic.governance_periods.every(x=>x.governance_type!=="governing_regime"));
  assert.equal(france.activity_count,0);
  assert.equal(republic.activity_count,0);
  assert.ok(Object.isFrozen(france.governance_periods));
  assert.ok(Object.isFrozen(france.governance_periods[0]));
  assert.doesNotMatch(reader.POLITY_LIST_SQL,/POLITY_GOVERNANCE_PERIODS_SQL/);
});

test("P2-01H dossier shows only direct typed governance and precise dates without inventing legal legitimacy",()=>{
  const france=dossier.dossierForPolity({...sourceRow(FRANCE),governance_periods:[vichy]});
  const republic=dossier.dossierForPolity({...sourceRow(REPUBLIC),governance_periods:republicPeriods});
  assert.equal(france.governance_periods.length,1);
  assert.equal(republic.governance_periods.length,5);
  assert.match(france.governance_periods[0].title,/사실상/);
  assert.equal(france.governance_periods[0].period_label,"1940-07-10–1944-08-20");
  assert.equal(republic.governance_periods.at(-1).period_label,"1958-10-04–종료일 미등록");
  assert.ok(republic.governance_periods.every(x=>!x.title.includes("비시")));
  assert.equal(france.activity_count,0);
  assert.equal(republic.activity_count,0);
  const escapeHtml=(x)=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const render=dossier.createRenderer({escapeHtml});
  const franceHtml=render.dossierHtml({...sourceRow(FRANCE),governance_periods:[vichy]});
  const repHtml=render.dossierHtml({...sourceRow(REPUBLIC),governance_periods:republicPeriods});
  assert.match(franceHtml,/비시 정권/);
  assert.doesNotMatch(franceHtml,/프랑스 제5공화국/);
  assert.match(repHtml,/프랑스 국민위원회/);
  assert.match(repHtml,/프랑스 제5공화국/);
  assert.doesNotMatch(repHtml,/비시 정권/);
  assert.match(franceHtml,/법적 정통성을 추정하지 않습니다/);
  assert.match(repHtml,/종료일 미등록은 현재까지 존속했다는 보증이 아닙니다/);
  assert.match(render.dossierHtml({...sourceRow(FRANCE),governance_periods:[{...vichy,name_ko:"<script>bad</script>"}]}),/&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(render.dossierHtml({...sourceRow(FRANCE),governance_periods:[{...vichy,name_ko:"<script>bad</script>"}]}),/<script>/);
});

test("P2-01H has conservative defaults for historical Polities with no governance period",()=>{
  const p=dossier.dossierForPolity(sourceRow(FRANCE));
  assert.deepEqual(p.governance_periods,[]);
  assert.equal(p.activity_count,0);
  assert.deepEqual(reader.normalizeGovernancePeriods(null),[]);
  const html=dossier.createRenderer({escapeHtml:String}).dossierHtml(sourceRow(FRANCE));
  assert.match(html,/이 정치체에 직접 연결된 통치체계 기록 없음/);
  assert.match(html,/관측 활동 범위/);
});
