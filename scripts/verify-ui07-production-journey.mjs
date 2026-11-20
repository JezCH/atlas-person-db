// Execute inside the existing Production Chromium/CDP acceptance session.
// Real Person and Activity IDs are discovered from the rendered registered data.
const COMPARE = "[data-spacetime-meanwhile-compare]";
const capture = "(() => {const s=window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.();const sc=document.querySelector('.spacetime-scroll');return {route:location.hash,personId:s?.selectedPersonId||null,activityId:s?.selectedActivityId||null,moment:s?.meanwhileOrdinal??null,zoom:s?.zoom??null,x:sc?.scrollLeft??null,y:sc?.scrollTop??null,peers:[...document.querySelectorAll('[data-spacetime-meanwhile-compare]')].map(b=>b.dataset.spacetimeMeanwhileCompare)}})()";
const dossier = "(() => {const p=document.querySelector('#personComparePanel:not([hidden])');const people=[...document.querySelectorAll('#personComparePanel .atlas-compare-person')];const rect=e=>{const r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null};return {route:location.hash,ids:[...document.querySelectorAll('#personComparePanel [data-compare-remove]')].map(b=>b.dataset.compareRemove),rows:p?.querySelectorAll('.atlas-compare-activity').length||0,period:Boolean(p?.querySelector('#atlasComparePeriodsTitle')),sources:p?.querySelectorAll('.atlas-compare-source-details').length||0,returnButton:Boolean(p?.querySelector('[data-compare-return-spacetime]')),snapshot:history.state?.atlasPersonCompareV1||null,origin:history.state?.atlasSpacetimeReturnV1?.routeHash||null,viewport:innerWidth,bodyWidth:document.documentElement.scrollWidth,first:rect(people[0]),second:rect(people[1]),panel:rect(p)}})()";

async function scene(client,h) { return h.evaluate(client,capture); }
async function readDossier(client,h) { return h.evaluate(client,dossier); }
function checkDossier(row,pair,h,mobile=false) {
  h.assert(row.ids.join(",")===pair.personId+","+pair.personB && row.rows>0&&row.period&&row.sources>0&&row.returnButton,
    "UI-07 actual canonical pair, Activity, evidence or return button missing",{row,pair});
  h.assert(row.snapshot?.version===1&&row.snapshot.routeHash===row.route
    && row.snapshot.personIds.join(",")===row.ids.join(",")&&row.origin===pair.route,
    "UI-07 History entry failed to preserve both persons and original Spacetime route",{row,pair});
  if (mobile) {
    h.assert(row.viewport===390&&row.bodyWidth<=392,
      "UI-07 mobile document overflow or unexpected viewport",row);
    h.assert(row.first&&row.second&&row.second.top>=row.first.bottom-1,
      "UI-07 390px comparison columns must stack vertically",row);
    h.assert(row.panel&&row.panel.left>=-1&&row.panel.right<=391,
      "UI-07 390px comparison panel escapes viewport",row);
  }
}
async function inspectPair(client,h,selectedPair=null) {
  for(let i=0;i<12;i++) {
    const s=await scene(client,h);
    const personB=selectedPair?.personB || s.peers.find(id=>id&&id!==s.personId);
    if(s.personId&&s.activityId&&Number.isInteger(s.moment)&&s.peers.includes(personB))
      return {...s,personB,tries:i+1};
    if(selectedPair)break;
    const before=await h.evaluate(client,"(() => {const a=window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.()?.selectedPersonId;const button=document.querySelector('#spacetimeNextPerson:not([disabled])');if(!button)return null;button.click();return a||null})()");
    if(!before)break;
    await h.waitFor(client,"window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.()?.selectedPersonId!=="+JSON.stringify(before),20000);
    const clicked=await h.evaluate(client,"(() => {const b=[...document.querySelectorAll('[data-spacetime-inspector-activity]')].find(b=>!b.disabled);if(!b)return false;b.click();return true})()");
    h.assert(clicked,"UI-07 searched Person has no real selectable Activity",{previous:s});
    await h.waitFor(client,"Number.isInteger(window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.()?.meanwhileOrdinal)",30000);
    await h.sleep(250);
  }
  h.assert(false,"No two real same-year Activity Persons available in bounded Production inspector traversal",{selectedPair});
}
async function clickCompare(client,h,pair,mobile=false) {
  const click=await h.evaluate(client,"(() => {const b=[...document.querySelectorAll('"+COMPARE+"')].find(e=>e.dataset.spacetimeMeanwhileCompare==="+JSON.stringify(pair.personB)+");if(!b)return null;b.scrollIntoView({block:'nearest',inline:'nearest'});const r=b.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const top=document.elementFromPoint(x,y);return {width:r.width,height:r.height,x,y,hit:top===b||b.contains(top),inside:x>=0&&x<innerWidth&&y>=0&&y<innerHeight}})()");
  h.assert(click?.width>0&&click.height>0&&click.hit&&click.inside,"UI-07 compare button not reachable by a real pointer hit test",{pair,click});
  if(mobile)h.assert(click.width>=44&&click.height>=44,"UI-07 mobile compare touch target below 44px",{pair,click});
  await client.call("Input.dispatchMouseEvent",{type:"mousePressed",x:click.x,y:click.y,button:"left",clickCount:1});
  await client.call("Input.dispatchMouseEvent",{type:"mouseReleased",x:click.x,y:click.y,button:"left",clickCount:1});
  await h.waitFor(client,"(() => {const ids=[...document.querySelectorAll('#personComparePanel [data-compare-remove]')].map(e=>e.dataset.compareRemove);return ids.length===2&&ids[0]==="+JSON.stringify(pair.personId)+"&&ids[1]==="+JSON.stringify(pair.personB)+"&&Boolean(document.querySelector('#atlasComparePeriodsTitle'))})()",90000);
  const row=await readDossier(client,h);checkDossier(row,pair,h,mobile);return row;
}
async function reloadDossier(client,h,pair,mobile) {
  await client.call("Page.reload",{ignoreCache:false});
  await h.waitFor(client,"document.readyState==='complete'",45000);
  await h.waitFor(client,"document.querySelectorAll('#personComparePanel .atlas-compare-person').length===2&&Boolean(document.querySelector('#atlasComparePeriodsTitle'))",90000);
  const row=await readDossier(client,h);checkDossier(row,pair,h,mobile);return row;
}
async function backToScene(client,h,pair,useButton=false) {
  if(useButton)await h.evaluate(client,"document.querySelector('[data-compare-return-spacetime]')?.click()");
  else await h.evaluate(client,"history.back()");
  await h.waitFor(client,"(() => {const s=window.ATLAS_PERSON_SPACETIME_VIEW?.captureExplorationState?.();return location.hash==="+JSON.stringify(pair.route)+"&&s?.selectedPersonId==="+JSON.stringify(pair.personId)+"&&s?.selectedActivityId==="+JSON.stringify(pair.activityId)+"&&s?.meanwhileOrdinal==="+JSON.stringify(pair.moment)+"})()",90000);
  const row=await scene(client,h);
  h.assert(Math.abs(row.zoom-pair.zoom)<.001&&Math.abs(row.x-pair.x)<=45&&Math.abs(row.y-pair.y)<=45,
    "UI-07 did not restore original camera/zoom/History",{pair,row});
  return row;
}
export async function verifyUi07DesktopJourney(client,h) {
  const pair=await inspectPair(client,h);
  h.assert(pair.route.includes("/person/"),"UI-07 test was not launched from a real Person canonical route",pair);
  const initial=await clickCompare(client,h,pair);
  await h.screenshot(client,"ui07-desktop-compare.png");
  const reloaded=await reloadDossier(client,h,pair,false);
  const back=await backToScene(client,h,pair);
  await h.evaluate(client,"history.forward()");
  await h.waitFor(client,"document.querySelectorAll('#personComparePanel .atlas-compare-person').length===2",90000);
  const forwarded=await readDossier(client,h);checkDossier(forwarded,pair,h);
  const returned=await backToScene(client,h,pair,true);
  await h.screenshot(client,"ui07-desktop-return.png");
  return {pair,initial,reloaded,back,forwarded,returned,status:"PASS"};
}
export async function verifyUi07MobileJourney(client,h,desktopPair,productionUrl) {
  const url=new URL(desktopPair.route,productionUrl).href;
  await client.call("Page.navigate",{url:"about:blank"});
  await h.waitFor(client,"document.readyState==='complete'",15000);
  await client.call("Page.navigate",{url});
  await h.waitFor(client,"document.readyState==='complete'",45000);
  await h.waitFor(client,"Boolean(document.querySelector('#personSpacetimeMount .spacetime-frame'))",90000);
  // The frame is mounted before the direct Activity route and its peers finish loading.
  const expected = JSON.stringify({
    personId: desktopPair.personId,
    activityId: desktopPair.activityId,
    moment: desktopPair.moment,
    personB: desktopPair.personB
  });
  await h.waitFor(client, `(() => {
    const state = ${capture};
    const expected = ${expected};
    return state.personId === expected.personId &&
      state.activityId === expected.activityId &&
      state.moment === expected.moment &&
      state.peers.includes(expected.personB);
  })()`,90000);
  const pair=await inspectPair(client,h,desktopPair);
  const initial=await clickCompare(client,h,pair,true);
  await h.screenshot(client,"ui07-mobile-390-compare.png");
  const reloaded=await reloadDossier(client,h,pair,true);
  const returned=await backToScene(client,h,pair,true);
  await h.screenshot(client,"ui07-mobile-390-return.png");
  return {pair,initial,reloaded,returned,status:"PASS"};
}
