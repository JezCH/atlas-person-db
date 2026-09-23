import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../atlas-person-profile-editor.js",import.meta.url),"utf8");
const main=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function api() {
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:"atlas-person-profile-editor.js"});
  return context.window.ATLAS_PERSON_PROFILE_EDITOR;
}

test("profile editor loads before Person Main and is an explicit dependency",()=>{
  const asset="atlas-person-profile-editor.js?v=20260922-profile-editor-v1";
  const mainAsset=html.match(/atlas-person-main\.js\?v=[^"\'\s>]+/)?.[0] || "";
  assert.match(html,/atlas-person-profile-editor\.js\?v=20260922-profile-editor-v1/);
  assert.ok(mainAsset, "Person Main must use a cache-busted asset URL");
  assert.ok(html.indexOf(asset) < html.indexOf(mainAsset));
  assert.match(main,/const profileEditorFactory = window\.ATLAS_PERSON_PROFILE_EDITOR/);
  assert.match(main,/!profileEditorFactory\?\.createEditor/);
  assert.match(main,/profileEditorFactory\.createEditor/);
});

test("profile editor module owns no DOM, selected state, refresh, toast, or portrait internals",()=>{
  assert.doesNotMatch(source,/document\.|querySelector|addEventListener|selectedPerson|loadPersons\(|showOperationalMessage|selectPerson\(/);
  assert.doesNotMatch(source,/ATLAS_PERSON_PORTRAIT|portraitRenderer|selectedPortrait/);
  assert.match(source,/portraitHtml/);
});

test("profile editor preserves Korean-name and NamuWiki forms and accepts injected portrait markup",()=>{
  const editor=api().createEditor({
    escapeHtml,
    writer:{},
    outcomeError:()=> "failed"
  });
  const out=editor.profileEditorHtml({
    id:"person-1",
    preferred_name_ko:"이름 <테스트>",
    external_references:{
      namuwiki:{
        status:"linked",
        url:"https://namu.wiki/w/Test?x=<tag>",
        document_title:"문서 <제목>"
      }
    }
  },{portraitHtml:'<div data-portrait-slot="ok"></div>'});

  assert.match(out,/data-person-profile-operation="set_person_korean_name"/);
  assert.match(out,/name="korean_name"/);
  assert.match(out,/이름 &lt;테스트&gt;/);
  assert.match(out,/data-person-profile-operation="set_person_external_reference"/);
  assert.match(out,/name="namuwiki_reference"/);
  assert.match(out,/문서 &lt;제목&gt;/);
  assert.match(out,/data-portrait-slot="ok"/);
});

test("profile write dispatch routes through existing writer methods and returns Main orchestration metadata",async()=>{
  const calls=[];
  const writer={
    async setPersonKoreanName(id,value){
      calls.push(["name",id,value]);
      return {committed:true};
    },
    async setPersonExternalReference(id,provider,value){
      calls.push(["external",id,provider,value]);
      return {committed:true};
    }
  };
  const editor=api().createEditor({
    escapeHtml,
    writer,
    outcomeError:(outcome,fallback)=>outcome?.errors?.[0] || fallback
  });

  const nameResult=await editor.dispatchWrite({
    operation:"set_person_korean_name",
    personId:" person-1 ",
    koreanName:"홍길동"
  });
  assert.deepEqual(calls[0],["name","person-1","홍길동"]);
  assert.equal(nameResult.reloadExternalReferences,false);
  assert.equal(nameResult.successMessage,"한국어 이름을 전체 화면에 반영했습니다.");

  const refResult=await editor.dispatchWrite({
    operation:"set_person_external_reference",
    personId:"person-1",
    namuwikiReference:"문서명"
  });
  assert.deepEqual(calls[1],["external","person-1","namuwiki","문서명"]);
  assert.equal(refResult.reloadExternalReferences,true);
  assert.equal(refResult.successMessage,"나무위키 문서를 연결했습니다.");
});

test("profile write dispatch fails closed for unsupported or uncommitted writes",async()=>{
  const editor=api().createEditor({
    escapeHtml,
    writer:{
      async setPersonKoreanName(){ return {committed:false,errors:["WRITE_FAILED"]}; }
    },
    outcomeError:(outcome,fallback)=>outcome?.errors?.[0] || fallback
  });
  await assert.rejects(
    ()=>editor.dispatchWrite({operation:"unknown",personId:"person-1"}),
    /지원하지 않는 Person 편집 작업입니다/
  );
  await assert.rejects(
    ()=>editor.dispatchWrite({operation:"set_person_korean_name",personId:"person-1",koreanName:"x"}),
    /WRITE_FAILED/
  );
});
