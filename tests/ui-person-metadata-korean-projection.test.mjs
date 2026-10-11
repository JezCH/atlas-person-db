import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const main=read("atlas-person-main.js");
const i18nSrc=read("atlas-ui-localization.js");
const evidenceSrc=read("atlas-person-evidence-view.js");

function displayHelpers(){
  const ctx={window:{}};
  vm.runInNewContext(i18nSrc,ctx);
  const start=main.indexOf("  function metaLabel(");
  const end=main.indexOf("  function safeHttpUrl(",start);
  assert.ok(start>=0 && end>start);
  return vm.runInNewContext("const i18n=window.ATLAS_UI_I18N;\n"+main.slice(start,end)+"\n({metaLabel,historicityLabel,basisLabel})",ctx);
}

test("Person metadata uses reviewed labels rather than API identifiers",()=>{
  const {metaLabel,historicityLabel,basisLabel}=displayHelpers();
  assert.equal(metaLabel("person_type","historical"),"역사 인물");
  assert.equal(metaLabel("name_type","canonical"),"기준 이름");
  assert.equal(metaLabel("locale_name","en"),"영어");
  assert.equal(metaLabel("source_type","web_bibliographic_reference"),"온라인 서지 자료");
  assert.equal(metaLabel("relation","rules"),"통치");
  assert.equal(metaLabel("relation_category","authority"),"통치·권한 관계");
  assert.equal(metaLabel("granularity","day"),"일 단위");
  assert.equal(metaLabel("calendar","source_calendar"),"출처 기록의 역법");
  assert.equal(historicityLabel({historicity:"historical"}),"역사적 실존");
  assert.equal(historicityLabel({historicity:"mythical"}),"신화");
  assert.equal(historicityLabel({historicity:"legendary",historicity_display_ko:"검토된 한국어 표기"}),"검토된 한국어 표기");
  assert.equal(basisLabel({display_name:"Reign",code:"reign"}),"재위");
  assert.equal(basisLabel({display_name:"재위 기간",code:"reign"}),"재위 기간");
});

test("Unreviewed values remain unresolved in Korean, without fabricated translations",()=>{
  const {metaLabel,historicityLabel,basisLabel}=displayHelpers();
  assert.equal(metaLabel("source_type","unknown_class","출처 유형 확인 필요"),"출처 유형 확인 필요");
  assert.equal(metaLabel("relation","unknown_relation","관계 유형 확인 필요"),"관계 유형 확인 필요");
  assert.equal(metaLabel("name_type","undocumented","이름 유형 확인 필요"),"이름 유형 확인 필요");
  assert.equal(historicityLabel({historicity:"future_not_reviewed"}),"역사성 확인 필요");
  assert.equal(basisLabel({code:"not_a_basis"}),"기간 기준 확인 필요");
});

test("List, detail, sources and chronology share the display layer and preserve raw data contracts",()=>{
  for(const literal of [
    'const rawHistoricity = historicityLabel(person);',
    'metaLabel("person_type", person.person_type',
    'metaLabel("name_type", row.name_type',
    'metaLabel("locale_name", row.locale',
    'metaLabel("source_type", source.source_type',
    'metaLabel("relation", activity?.relation?.code',
    'metaLabel("relation_category", activity.relation.category',
    'metaLabel("calendar", boundary.calendar',
    'metaLabel("granularity", boundary.granularity',
    'basisLabel(activity.period_basis)',
    'basisLabel(activity?.period_basis)'
  ])assert.ok(main.includes(literal),"missing display projection: "+literal);
  for(const leak of ['relation category:', '"historicity 미상"', '"relation 미상"', 'escapeHtml(source.source_type)', 'escapeHtml(row.name_type)'])
    assert.ok(!main.includes(leak),"untranslated UI code: "+leak);
  for(const protectedContract of [
    "reader.readPerson(personId)","reader.readPortrait(personId)",
    "dataStore.loadPersons({ force })","dataStore.loadPersonDomains({ force })",
    "person.id", "activity.id", 'data-activity-id=',
    "profileEditor.dispatchWrite(", "profileWriter.deleteActivity(activityId)"
  ])assert.ok(main.includes(protectedContract),"lost contract: "+protectedContract);
});

test("Evidence data semantics stay unmodified while UI hides unknown raw codes",()=>{
  assert.match(evidenceSrc,/return EVIDENCE_LABELS\[kind\]\?\.\[raw\] \|\| "표시 확인 필요"/);
  assert.match(evidenceSrc,/period_basis:periodBasis\|\|null/);
  assert.doesNotMatch(evidenceSrc,/title="\$\{escapeHtml\(raw\)\}"/);
});
