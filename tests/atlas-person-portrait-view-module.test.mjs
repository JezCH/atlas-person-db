import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../atlas-person-portrait-view.js",import.meta.url),"utf8");
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function renderer(){const context={window:{}};vm.runInNewContext(source,context);return context.window.ATLAS_PERSON_PORTRAIT_VIEW.createRenderer({escapeHtml});}
test("portrait UI exposes upload replace and delete",()=>{
 const view=renderer();
 const empty=view.portraitEditorHtml({id:"person-1"},{portrait:null});
 assert.match(empty,/초상 업로드/);
 const present=view.portraitEditorHtml({id:"person-1"},{portrait:{asset_sha256:"a".repeat(64)}});
 assert.match(present,/초상 교체/);
 assert.match(present,/data-person-portrait-delete/);
});
test("portrait UI has no taxonomy or provenance editor",()=>{
 const out=renderer().portraitEditorHtml({id:"person-1"},{portrait:{asset_sha256:"a".repeat(64)}});
 for(const token of ["portrait_kind","evidence_level","초상 유형","근거 수준","metadata","source-add","source-edit"]) assert.equal(out.includes(token),false);
});
test("portrait renderer fails closed on read error",()=>{
 const out=renderer().portraitEditorHtml({id:"person-1"},{error:new Error("read")});
 assert.match(out,/업로드·삭제를 비활성화/);
});
