import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../atlas-person-portrait-view.js",import.meta.url),"utf8");
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

function renderer() {
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:"atlas-person-portrait-view.js"});
  return context.window.ATLAS_PERSON_PORTRAIT_VIEW.createRenderer({escapeHtml});
}

test("portrait view module loads before Person Main and is an explicit required dependency",()=>{
  const viewAsset="atlas-person-portrait-view.js?v=20260922-portrait-view-v1";
  const mainAsset="atlas-person-main.js?v=20260922-portrait-controller-split-v1";
  assert.match(html,/atlas-person-portrait-view\.js\?v=20260922-portrait-view-v1/);
  assert.match(html,/atlas-person-main\.js\?v=20260922-portrait-controller-split-v1/);
  assert.ok(html.indexOf(viewAsset) < html.indexOf(mainAsset));
  assert.match(main,/const portraitView = window\.ATLAS_PERSON_PORTRAIT_VIEW/);
  assert.match(main,/!portraitView\?\.createRenderer/);
  assert.match(main,/const portraitRenderer = portraitView\.createRenderer\(\{ escapeHtml \}\)/);
});

test("Person Main delegates portrait markup and injects only current source-candidate state",()=>{
  const start=main.indexOf("function portraitEditorHtml(");
  const end=main.indexOf("function profileEditorHtml(",start);
  const block=main.slice(start,end);
  assert.match(block,/portraitRenderer\.portraitEditorHtml\(person, portraitResult/);
  assert.match(block,/sourceCandidates:selectedPortraitSourceCandidates/);
  assert.doesNotMatch(main,/function portraitKindOptions|function portraitEvidenceOptions|function portraitEvidenceRoleOptions|function portraitProvenanceHtml|function portraitSourceCandidates/);
  assert.doesNotMatch(main,/facial_reference:"얼굴 근거"|context_reference:"맥락 참고"/);
});

test("portrait renderer preserves upload, metadata, and provenance controls",()=>{
  const view=renderer();
  const person={id:"person-1"};
  const portrait={
    portrait_kind:"artwork",
    evidence_level:"strong",
    sources:[{
      source_id:"source-a",
      evidence_role:"facial_reference",
      source:{title:"Source <A>"}
    }]
  };
  const out=view.portraitEditorHtml(person,{portrait},{sourceCandidates:[
    {source_id:"source-b",title:"Source B"},
    {source_id:"source-a",title:"Duplicate A"}
  ]});

  assert.match(out,/data-person-portrait-operation="upload"/);
  assert.match(out,/name="portrait_file" accept="image\/\*"/);
  assert.match(out,/value="artwork" selected/);
  assert.match(out,/value="strong" selected/);
  assert.match(out,/data-person-portrait-operation="metadata"/);
  assert.match(out,/data-person-portrait-operation="source-edit"/);
  assert.match(out,/data-person-portrait-operation="source-add"/);
  assert.match(out,/data-person-portrait-source-remove/);
  assert.match(out,/Source &lt;A&gt;/);
  assert.match(out,/Source B/);
  assert.match(out,/Duplicate A/);
  assert.equal((out.match(/<option value="source-a">/g) || []).length,1);
});

test("source-candidate state keeps the load button distinct from a loaded empty result",()=>{
  const view=renderer();
  const person={id:"person-1"};
  const portrait={portrait_kind:"artwork",evidence_level:"strong",sources:[]};

  const notLoaded=view.portraitEditorHtml(person,{portrait},{sourceCandidates:null});
  assert.match(notLoaded,/data-person-portrait-load-sources/);

  const loadedEmpty=view.portraitEditorHtml(person,{portrait},{sourceCandidates:[]});
  assert.doesNotMatch(loadedEmpty,/data-person-portrait-load-sources/);
  assert.match(loadedEmpty,/canonical Source가 없습니다/);
});

test("portrait renderer remains fail-closed when portrait read fails",()=>{
  const view=renderer();
  const out=view.portraitEditorHtml({id:"person-1"},{error:new Error("read failed")},{sourceCandidates:null});
  assert.match(out,/person-portrait-editor is-error/);
  assert.match(out,/업로드·삭제를 비활성화했습니다/);
  assert.doesNotMatch(out,/data-person-portrait-operation="upload"/);
});

test("portrait evidence vocabularies remain owned by the view module",()=>{
  const view=renderer();
  assert.match(view.portraitKindOptions("archival"),/value="archival" selected>사진·동시대 기록/);
  assert.match(view.portraitEvidenceOptions("direct"),/value="direct" selected>직접 근거/);
  assert.match(view.portraitEvidenceRoleOptions("context_reference"),/value="context_reference" selected>맥락 참고/);
});
