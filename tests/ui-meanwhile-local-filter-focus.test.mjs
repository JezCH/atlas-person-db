import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
const view=read("atlas-person-spacetime-view.js");
const nav=read("atlas-main-authority-nav.js");
const html=read("index.html");

const start=view.indexOf("    const bindMeanwhileControls = () => {");
const stop=view.indexOf('    mount.querySelector("#spacetimeCameraZoomOut")',start);
assert.ok(start>=0 && stop>start,"Missing scoped Meanwhile-only interaction binding");
const bindingSource=view.slice(start,stop);
const createBinder=new Function(
  "mount","meanwhileSummary","renderMeanwhile","clearMeanwhile","selectPerson","meanwhileRegionCode","scheduleExplorationSnapshot",
  "let meanwhilePolityId = \"\"; const text = (value) => value == null ? \"\" : String(value).trim();\n" + bindingSource+"\nreturn () => meanwhileRegionCode;"
);

test("UI-06A region interaction updates only Meanwhile DOM and restores keyboard focus",()=>{
  let regionButtons=[];
  let activeButtons=[];
  let clearClicks=0;
  let selectedPerson=null;
  let focused=null;
  const clearButton={};
  const panel={markup:"",set outerHTML(value){
    this.markup=value;
    // Mimic newly created region buttons after replacing panel.outerHTML.
    makeButtons();
  }};
  const makeButton=(region)=>({
    dataset:{spacetimeMeanwhileRegion:region},
    addEventListener(type,listener){ assert.equal(type,"click"); this.click=listener; },
    focus(options){assert.deepEqual(options,{preventScroll:true});focused=region;}
  });
  const makeButtons=()=>{
    regionButtons=["","east_asia","europe"].map(makeButton);
    activeButtons=[{
      dataset:{spacetimeMeanwhilePerson:"person-1"},
      addEventListener(type,listener){assert.equal(type,"click");this.click=listener;}
    }];
  };
  makeButtons();
  const mount={
    querySelector(selector){
      if(selector==="#spacetimeMeanwhileClear")return {
        addEventListener(type,listener){assert.equal(type,"click");clearButton.click=listener;}
      };
      if(selector===".spacetime-meanwhile")return panel;
      return null;
    },
    querySelectorAll(selector){
      if(selector==="[data-spacetime-meanwhile-region]")return regionButtons;
      if(selector==="[data-spacetime-meanwhile-person]")return activeButtons;
      if(selector==="[data-spacetime-meanwhile-compare]")return [];
      throw new Error("Unexpected selector: "+selector);
    }
  };
  const summary={unique_person_count:30,activity_count:30};
  const getRegion=createBinder(mount,summary,(_summary,region)=>"region="+region,
    ()=>{clearClicks++;},(_mount,id,opts)=>{selectedPerson={id,opts};},"",()=>{});
  assert.equal(getRegion(),"");
  regionButtons[1].click();
  assert.equal(getRegion(),"east_asia");
  assert.equal(panel.markup,"region=east_asia");
  assert.equal(focused,"east_asia");
  activeButtons[0].click();
  assert.deepEqual(selectedPerson,{id:"person-1",opts:{focus:true}});
  regionButtons[0].click();
  assert.equal(getRegion(),"");
  assert.equal(panel.markup,"region=");
  assert.equal(focused,"");
  clearButton.click();
  assert.equal(clearClicks,1);
});

test("UI-06A filter does not reconstruct historical Spacetime or bypass asset freshness",()=>{
  assert.doesNotMatch(bindingSource,/renderInto\(mount\)/);
  assert.match(bindingSource,/panel\.outerHTML = renderMeanwhile\(meanwhileSummary, regionCode, meanwhilePolityId\)/);
  assert.match(bindingSource,/nextButton\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(view,/meanwhile\.summarize\(\s*compiled\.partitioned\.tracks/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=20261119-meanwhile-all-activities-v1&region=20261119-ui06a-v1&fix=meanwhile-panel-only-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&fix=meanwhile-panel-only-v1/);
});
