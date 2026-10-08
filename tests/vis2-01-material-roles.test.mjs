import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const foundation = readFileSync(new URL("../atlas-ui-visual-foundation.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function rule(selector) {
  const start = foundation.indexOf(selector+" {");
  assert.ok(start>=0, "Missing selector: "+selector);
  const bodyStart=foundation.indexOf("{",start)+1;
  const end=foundation.indexOf("}",bodyStart);
  return foundation.slice(bodyStart,end);
}
function has(variable,alias) {
  assert.match(foundation,new RegExp("--"+variable+":\\s*var\\(--"+alias+"\\);"));
}

test("VIS2-01 M0-M3 are aliases, not a competing palette",()=>{
  has("atlas-material-m0","atlas-canvas");
  has("atlas-material-m0-deep","atlas-canvas-deep");
  has("atlas-material-m1","atlas-surface-1");
  has("atlas-material-m2","atlas-surface-2");
  has("atlas-material-m3","atlas-surface-3");
  for(const [name,value] of Object.entries({
    "--atlas-canvas":"#121518",
    "--atlas-canvas-deep":"#0e1114",
    "--atlas-surface-1":"#191d21",
    "--atlas-surface-2":"#20252a",
    "--atlas-surface-3":"#262c31",
    "--atlas-honor-metal":"#9c927d",
    "--atlas-honor-metal-strong":"#c0ae88"
  }))assert.ok(foundation.includes(name+": "+value+";"),"Protected color changed: "+name);
});

test("VIS2-01 role bindings are limited to architectural chrome",()=>{
  assert.match(rule(".workspace-shell"),/background:\s*var\(--atlas-material-m0\)/);
  assert.match(rule(".sidebar"),/background:\s*var\(--atlas-material-m0-deep\)/);
  assert.match(rule(".person-main-toolbar.card"),/background:\s*var\(--atlas-material-m1\)/);
  assert.match(rule(".btn"),/--atlas-control-fill:\s*var\(--atlas-material-m2\)/);
  assert.match(rule(".btn-primary"),/var\(--atlas-material-m3\)/);
  assert.match(rule(".person-main-actions .btn-primary"),/var\(--atlas-material-m3\)/);
  assert.match(index,/atlas-ui-visual-foundation.css\?v=20261008-vis2-01-material-roles-v1/);
});

test("VIS2-01 does not own semantic Person rails or Spacetime geometry",()=>{
  const phase=foundation.slice(foundation.indexOf("/* VIS2-01:"));
  const aliases=phase.slice(0,phase.indexOf("/* Legacy aliases"));
  assert.doesNotMatch(aliases,/--(atlas-domain|spacetime|representative-domain|person-table)/);
  assert.doesNotMatch(aliases,/(?:grid-template|width|height|top|left|transform):/);
});
