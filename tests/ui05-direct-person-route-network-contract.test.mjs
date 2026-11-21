import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const s=fs.readFileSync(new URL("../scripts/verify-ui-v10-production-visual.mjs",import.meta.url),"utf8");
const begin=s.indexOf("function personReadRequestKind(rawUrl) {");
const end=s.indexOf("\n}\n",begin);

test("The real Chrome URL classifier distinguishes bounded Person reads from any roster projection",()=>{
  assert.ok(begin>=0&&end>begin,"Missing real Production request classifier");
  const scope={URL,PRODUCTION_ORIGIN:"https://atlas-person-db.vercel.app"};
  const classify=vm.runInNewContext(s.slice(begin,end+2)+"\npersonReadRequestKind",scope);
  assert.equal(classify("https://atlas-person-db.vercel.app/api/atlas-person-read?person_id=41e1a330-cd23-41a7-a026-357a6856113f"),"detail");
  assert.equal(classify("https://atlas-person-db.vercel.app/api/atlas-person-read?projection=compact"),"roster");
  assert.equal(classify("https://atlas-person-db.vercel.app/api/atlas-person-read?view=identity"),"roster");
  assert.equal(classify("https://atlas-person-db.vercel.app/api/atlas-person-read"),"roster");
  assert.equal(classify("https://example.com/api/atlas-person-read?projection=compact"),null);
  assert.equal(classify("https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=person-portrait"),null);
  assert.equal(classify("broken url"),null);
});

test("Existing Production Chrome observes fresh deep-link network only, and fails a roster request",()=>{
  const p=s.slice(s.indexOf("async function verifyDirectPersonDetailRoute"),s.indexOf("async function main()",begin));
  assert.match(p,/Network\.enable/);
  assert.match(p,/client\.ws\.addEventListener\("message",onNetworkEvent\)/);
  assert.match(p,/Network\.requestWillBeSent/);
  assert.ok(p.indexOf('Network.enable')<p.indexOf('Page.navigate'));
  assert.match(p,/network\.boundedDetailRequests>=1 && network\.rosterRequests===0/);
  assert.match(p,/return \{opened,listRoute,network\};/);
  assert.match(p,/client\.ws\.removeEventListener\("message",onNetworkEvent\)/);
  assert.match(p,/Network\.disable/);
  assert.match(s,/const directPersonRoute=await verifyDirectPersonDetailRoute\(client,mobileComparison\.selected\[0\]\.id\)/);
});
