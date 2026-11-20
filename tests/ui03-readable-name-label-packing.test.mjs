import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const engine = require("../atlas-person-spacetime-label-engine.js");
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const desktop = read("atlas-person-spacetime-monumental-canvas.css");
const mobile = read("atlas-person-spacetime-mobile-v8.css");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");

const start = view.indexOf("  function packTrackLabels(");
const end = view.indexOf("  function reasonLabel(", start);
assert.ok(start > 0 && end > start, "Use real production packing implementation");
const pack = new Function(
  "runtime", "text", "selectedPersonId", "PERSON_NAME_LABEL_PACK_HEIGHT",
  view.slice(start, end) + "\nreturn packTrackLabels;"
)(
  () => ({ labelEngine:engine }),
  (v) => v == null ? "" : String(v).trim(),
  "selected", 22
);

const item = (id,name,x,y) => ({
  person_id:id,x,y,
  track:{person_id:id,track_id:"track-"+id,display_name:name},
  presentation_band_code:"europe",
  label_zone_left:30,label_zone_right:210
});

test("UI-03 P0 increases actual Person name glyphs on desktop/mobile and preserves a single text-strip", () => {
  const desktopLabel = desktop.slice(desktop.indexOf('.spacetime-frame[data-spacetime-visual="chronology-v6"] .spacetime-track-label {'));
  assert.match(desktopLabel, /height: 22px/);
  assert.match(desktopLabel, /font-size: 14px/);
  assert.match(desktopLabel, /line-height: 22px/);
  assert.match(mobile, /\.spacetime-track-label \{\s*height: 21px;[\s\S]*?font-size: 12px;\s*line-height: 21px/);
  assert.match(desktopLabel, /border-left: 2px solid var\(--spacetime-person-domain-edge\)/);
  assert.doesNotMatch(desktopLabel.slice(0,550), /text-overflow: ellipsis/);
});

test("UI-03 P0 live engine allocates 14px CJK widths and 22px heights before collisions", () => {
  const results = pack([
    item("selected", "미나모토노 요시츠네", 75, 120),
    item("other", "가마쿠라 막부 인물", 84, 120),
    item("later", "폴라츠크의 브세슬라프", 115, 195)
  ], 280, 940, false, {visible_left:0,visible_top:0,visible_width:500,visible_height:280});
  assert.ok(results.placed.length >= 2);
  const selected = results.placed.find(x=>x.person_id==="selected");
  assert.ok(selected, "Selected Person is prioritized rather than hidden among dense labels");
  const expectedWidth = engine.naturalWidth({ text:"미나모토노 요시츠네" },
    {charWidth:9.4,cjkCharWidth:14,labelChromeWidth:13,labelWidthSafety:6});
  assert.equal(selected.width,expectedWidth);
  assert.equal(selected.height,22);
  assert.equal(selected.label_y,120);
  assert.equal(selected.anchor_y,120);
  assert.ok(selected.rect.left >= 0 && selected.rect.right <= 500);
  for(const entry of results.placed) {
    assert.equal(entry.label_y,entry.anchor_y, "Historical Y is never moved for typography");
    assert.equal(entry.height,22);
    assert.ok(entry.rect.left>=0 && entry.rect.right<=500);
  }
  for(let i=0;i<results.placed.length;i++)for(let j=i+1;j<results.placed.length;j++)
    assert.equal(engine.rectanglesOverlap(results.placed[i].rect,results.placed[j].rect,2),false);
});

test("UI-03 P0 impossible full-name labels defer rather than clip their identity or move them", () => {
  const name = "가".repeat(70);
  const result = pack([item("selected",name,90,100)],240,900,true,
    {visible_left:0,visible_top:0,visible_width:390,visible_height:240});
  assert.equal(result.placed.length,0);
  assert.equal(result.deferred.length,1);
  assert.equal(result.deferred[0].reason,"viewport_capacity");
  assert.equal(result.deferred[0].anchor_y,100);
  assert.ok(result.deferred[0].width>390);
});


test("UI-03 P0 viewport-edge Activity names use the same 22px half-height as the packing engine", () => {
  const begin = view.indexOf("  function visibleRailLabelItems(");
  const stop = view.indexOf("  function reasonLabel(",begin);
  assert.ok(begin > 0 && stop > begin);
  const runtime = () => ({
    labelEngine:engine,
    exploration:{ projectTrack(track){
      return { person_id:track.person_id,track,x:95,y:track.primary_segments[0].start_ordinal,
        presentation_band_code:"europe",label_zone_left:30,label_zone_right:210 };
    } },
    presentationLayout:{
      geometryForSegment(){return {rail_x:95};},
      applyTrackPresentation(projected){return projected;}
    }
  });
  const factory = new Function(
    "runtime","text","selectedPersonId","PERSON_NAME_LABEL_PACK_HEIGHT",
    view.slice(begin,stop) + "\nreturn {visibleRailLabelItems,packTrackLabels};"
  )(runtime,(v)=>String(v||"").trim(),"person-top",22);
  const tracks = [
    {person_id:"person-top",track_id:"top",display_name:"화면 위쪽 인물",primary_segments:[
      {x_anchor:0.2,start_ordinal:101,end_ordinal:103}
    ]},
    {person_id:"person-bottom",track_id:"bottom",display_name:"화면 아래쪽 인물",primary_segments:[
      {x_anchor:0.2,start_ordinal:217,end_ordinal:219}
    ]}
  ];
  const viewport={visible_left:0,visible_top:100,visible_width:400,visible_height:120};
  const projected = factory.visibleRailLabelItems([],tracks,{yForOrdinal:n=>n},{},940,viewport);
  assert.equal(projected.length,2);
  assert.deepEqual(projected.map(x=>x.y),[111,209],
    "Only the name presentation anchor is clamped to an 11px viewport inset");
  const packed=factory.packTrackLabels(projected,400,940,false,viewport);
  assert.equal(packed.placed.length,2);
  assert.equal(packed.deferred.length,0);
  for(const rect of packed.placed){
    assert.equal(rect.height,22);
    assert.ok(rect.rect.top>=100 && rect.rect.bottom<=220,
      "No selected or bottom-edge name is deferred or clipped at viewport boundary");
  }
});

test("UI-03 P0 ships both readable styles and matching JS metrics through current public lazy loader", () => {
  assert.match(view,/const PERSON_NAME_LABEL_PACK_HEIGHT = 22;/);
  assert.match(view,/labelHeight:PERSON_NAME_LABEL_PACK_HEIGHT,\s*charWidth:9\.4,\s*cjkCharWidth:14,\s*labelChromeWidth:13,\s*labelWidthSafety:6/);
  for(const resource of [
    "atlas-person-spacetime-monumental-canvas.css",
    "atlas-person-spacetime-mobile-v8.css",
    "atlas-person-spacetime-view.js"
  ]) {
    assert.ok(nav.includes(resource));
  }
  assert.equal((nav.match(/names=20261120-ui03-readable-person-label-v1/g)||[]).length,3);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&names=20261120-ui03-readable-person-label-v1/);
  assert.match(view,/forced:forceAll \|\| selectedPersonId === item\.track\.person_id/);
  assert.match(view,/preserveFullTextWidth:true/);
  assert.match(view,/borrowHorizontalSpace:true/);
  assert.doesNotMatch(view,/\.label_y\s*[+\-]=/);
});
