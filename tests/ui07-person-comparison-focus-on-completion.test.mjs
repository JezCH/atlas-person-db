import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(name)=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const person=read("atlas-person-main.js");
const html=read("index.html");
const begin=person.indexOf("  function focusComparisonPanel(panel) {");
const end=person.indexOf("  async function renderComparisonPanel(",begin);
assert.ok(begin>0 && end>begin,"Actual Person panel focus function must exist");

function makeFocus(personHidden=false) {
  const actions=[];
  const document={getElementById(id) {assert.equal(id,"personMainView");return {hidden:personHidden};}};
  const focus=new Function("document",person.slice(begin,end)+"\nreturn focusComparisonPanel;")(document);
  function panel(overrides={}) {
    return {
      isConnected:true,hidden:false,
      setAttribute(key,value){actions.push(["attribute",key,value]);},
      scrollIntoView(options){actions.push(["scroll",options]);},
      focus(options){actions.push(["focus",options]);},
      ...overrides
    };
  }
  return {actions,focus,panel};
}

test("UI-07 comparison completion moves actual scroll and screen-reader focus to the result",()=>{
  const h=makeFocus();assert.equal(h.focus(h.panel()),true);
  assert.deepEqual(h.actions,[
    ["attribute","tabindex","-1"],
    ["scroll",{block:"start",behavior:"auto"}],
    ["focus",{preventScroll:true}]
  ]);
});

test("UI-07 suppresses focus stealing when panel is hidden, detached or another domain is active",()=>{
  for(const state of [{hidden:true},{isConnected:false}]){
    const h=makeFocus();
    assert.equal(h.focus(h.panel(state)),false);
    assert.deepEqual(h.actions,[]);
  }
  const other=makeFocus(true);
  assert.equal(other.focus(other.panel()),false);
  assert.deepEqual(other.actions,[]);
});

test("UI-07 focuses only completed explicit pair, never restore/reload or partial selection",()=>{
  assert.match(person,/async function renderComparisonPanel\(\{ focusOnComplete = false \} = \{\}\)/);
  assert.match(person,/if \(focusOnComplete\) focusComparisonPanel\(panel\)/);
  assert.match(person,/const completing = comparisonIds\.length === 1 && !comparisonIds\.includes\(id\)/);
  assert.match(person,/void renderComparisonPanel\(\{ focusOnComplete:completing \}\)/);
  assert.match(person,/void renderComparisonPanel\(\{ focusOnComplete:true \}\)/);
  assert.match(person,/function restoreComparisonFromHistory\(\)[\s\S]*?void renderComparisonPanel\(\);/);
  assert.match(html,/atlas-person-main\.js\?v=[^"]+&ui07focus=20261120-comparison-v1/);
  assert.doesNotMatch(person.slice(begin,end),/document\.body\.innerHTML|window\.location|history\.pushState/);
});
