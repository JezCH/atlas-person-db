import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../atlas-person-portrait-controller.js",import.meta.url),"utf8");

function api() {
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:"atlas-person-portrait-controller.js"});
  return context.window.ATLAS_PERSON_PORTRAIT_CONTROLLER;
}

test("portrait controller exposes only set and delete operations",async()=>{
  const calls=[];
  const writer={
    async setPersonPortrait(payload){calls.push(["put",payload]);return {committed:true};},
    async deletePersonPortrait(id){calls.push(["delete",id]);return {committed:true};}
  };
  const controller=api().createController({writer,getSelectedPersonId:()=>"person-1"});
  assert.deepEqual(Object.keys(controller).sort(),["deletePortrait","setPortrait"]);
  await controller.setPortrait({personId:"person-1",imageBase64:" data "});
  assert.equal(JSON.stringify(calls[0]),JSON.stringify(["put",{person_id:"person-1",image_base64:"data"}]));
  await controller.deletePortrait("person-1");
  assert.equal(JSON.stringify(calls[1]),JSON.stringify(["delete","person-1"]));
});

test("portrait controller rejects stale selection",async()=>{
  const controller=api().createController({writer:{},getSelectedPersonId:()=>"person-2"});
  await assert.rejects(()=>controller.setPortrait({personId:"person-1",imageBase64:"x"}),/현재 선택한 인물/);
});

test("obsolete portrait taxonomy and provenance operations are absent",()=>{
  for(const token of ["portraitKind","evidenceLevel","patchMetadata","addSource","editSource","removeSource","loadSourceCandidates","preservedPortraitSources"]) assert.equal(source.includes(token),false);
});
