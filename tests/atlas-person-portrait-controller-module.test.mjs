import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../atlas-person-portrait-controller.js",import.meta.url),"utf8");
const main=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

function api() {
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:"atlas-person-portrait-controller.js"});
  return context.window.ATLAS_PERSON_PORTRAIT_CONTROLLER;
}

function fixture() {
  const calls=[];
  let selectedPersonId="person-1";
  let portrait={
    portrait_kind:"artwork",
    evidence_level:"strong",
    sources:[
      {source_id:" source-a ",evidence_role:" facial_reference "},
      {source_id:"",evidence_role:"context_reference"},
      {source_id:"source-b",evidence_role:"context_reference"}
    ]
  };
  const writer={
    async readPersonPortraitSourceCandidates(personId) {
      calls.push(["read",personId]);
      return {committed:true,candidates:[{source_id:"source-c"}]};
    },
    async updatePersonPortraitMetadata(payload) {
      calls.push(["patch",payload]);
      return {committed:true};
    },
    async setPersonPortrait(payload) {
      calls.push(["put",payload]);
      return {committed:true,replaced_asset_cleanup:{ok:true}};
    },
    async deletePersonPortrait(personId) {
      calls.push(["delete",personId]);
      return {committed:true,storage_cleanup:{ok:true}};
    }
  };
  const controller=api().createController({
    writer,
    getSelectedPersonId:()=>selectedPersonId,
    getSelectedPortrait:()=>portrait
  });
  return {
    calls,
    controller,
    setSelectedPersonId:(value)=>{selectedPersonId=value;},
    setPortrait:(value)=>{portrait=value;}
  };
}

test("portrait controller loads before Person Main and is a required dependency",()=>{
  const controllerAsset="atlas-person-portrait-controller.js?v=20260922-controller-v1";
  const mainAsset=html.match(/atlas-person-main\.js\?v=[^"\'\s>]+/)?.[0] || "";
  assert.match(html,/atlas-person-portrait-controller\.js\?v=20260922-controller-v1/);
  assert.ok(mainAsset, "Person Main must use a cache-busted asset URL");
  assert.ok(html.indexOf(controllerAsset) < html.indexOf(mainAsset));
  assert.match(main,/const portraitControllerFactory = window\.ATLAS_PERSON_PORTRAIT_CONTROLLER/);
  assert.match(main,/portraitControllerFactory\.createController/);
});

test("controller owns portrait writes but no DOM, selected-state, refresh, confirm, or toast ownership",()=>{
  assert.doesNotMatch(source,/document\.|querySelector|addEventListener|window\.confirm|showOperationalMessage|selectPerson\(/);
  assert.doesNotMatch(source,/selectedPortraitSourceCandidates|selectedPersonDetail/);
  assert.doesNotMatch(main,/profileWriter\.(?:setPersonPortrait|updatePersonPortraitMetadata|readPersonPortraitSourceCandidates|deletePersonPortrait)/);
});

test("preserved sources are trimmed, filtered, and reused during replacement upload",async()=>{
  const fx=fixture();
  const preserved=fx.controller.preservedPortraitSources();
  assert.equal(preserved.length,2);
  assert.equal(preserved[0].source_id,"source-a");
  assert.equal(preserved[0].evidence_role,"facial_reference");

  await fx.controller.setPortrait({
    personId:"person-1",
    imageBase64:" data ",
    portraitKind:" reconstruction ",
    evidenceLevel:" contextual "
  });
  const payload=fx.calls.at(-1)[1];
  assert.equal(payload.person_id,"person-1");
  assert.equal(payload.image_base64,"data");
  assert.equal(payload.portrait_kind,"reconstruction");
  assert.equal(payload.evidence_level,"contextual");
  assert.equal(payload.sources.length,2);
  assert.equal(payload.sources[1].source_id,"source-b");
});

test("metadata and source add/edit/remove all route through the same PATCH contract",async()=>{
  const fx=fixture();

  await fx.controller.patchMetadata("person-1",{portraitKind:"archival"});
  let payload=fx.calls.at(-1)[1];
  assert.equal(payload.portrait_kind,"archival");
  assert.equal(payload.evidence_level,"strong");
  assert.equal(payload.sources.length,2);

  await fx.controller.addSource("person-1","source-c","clothing_reference");
  payload=fx.calls.at(-1)[1];
  assert.equal(payload.sources.length,3);
  assert.equal(payload.sources[2].source_id,"source-c");

  await fx.controller.editSource("person-1","source-a","facial_reference","iconography_reference");
  payload=fx.calls.at(-1)[1];
  assert.equal(payload.sources[0].evidence_role,"iconography_reference");

  await fx.controller.removeSource("person-1","source-b","context_reference");
  payload=fx.calls.at(-1)[1];
  assert.equal(payload.sources.length,1);
  assert.equal(payload.sources[0].source_id,"source-a");
});

test("source-candidate reads and delete remain writer-only controller operations",async()=>{
  const fx=fixture();
  const result=await fx.controller.loadSourceCandidates("person-1");
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].source_id,"source-c");
  assert.equal(fx.calls[0][0],"read");

  await fx.controller.deletePortrait("person-1");
  assert.equal(fx.calls.at(-1)[0],"delete");
  assert.equal(fx.calls.at(-1)[1],"person-1");
});

test("controller fails closed on stale selection and uncommitted writes",async()=>{
  const fx=fixture();
  fx.setSelectedPersonId("person-2");
  await assert.rejects(
    ()=>fx.controller.patchMetadata("person-1"),
    /현재 선택한 인물과 초상화 편집 대상이 다릅니다/
  );

  const broken=api().createController({
    writer:{async updatePersonPortraitMetadata(){return {committed:false,errors:["WRITE_FAILED"]};}},
    getSelectedPersonId:()=>"person-1",
    getSelectedPortrait:()=>({portrait_kind:"artwork",evidence_level:"strong",sources:[]})
  });
  await assert.rejects(()=>broken.patchMetadata("person-1"),/WRITE_FAILED/);
});
