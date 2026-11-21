import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");
const PERSON = "11111111-1111-4111-8111-111111111111";

function fixture() {
  const requests=[];
  const window = {
    ATLAS_PERSON_BROWSER_READER: {
      ENDPOINT:"/api/atlas-person-read",
      listPersons:async()=>({persons:[]})
    },
    dispatchEvent(){}
  };
  const fetch=(url)=>new Promise((resolve,reject)=>requests.push({url,resolve,reject}));
  vm.runInNewContext(source,{window,fetch,console,Date},{filename:"atlas-client-data-store.js"});
  const payload=(domain)=>({
    ok:true,marker:"ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V2",
    schema:"atlas-person-domain/v2",
    rows:[{person_id:PERSON,representative_domain:domain}]
  });
  const resolve=(request,domain)=>request.resolve({ok:true,json:async()=>payload(domain)});
  return {store:window.ATLAS_CLIENT_DATA_STORE,requests,resolve};
}

test("confirmed domain patch wins over late successful pre-edit forced read", async()=>{
  const {store,requests,resolve}=fixture();
  const initial=store.loadPersonDomains();
  await Promise.resolve();
  assert.equal(requests.length,1);
  resolve(requests[0],"culture");
  await initial;
  const stale=store.loadPersonDomains({force:true});
  await Promise.resolve();
  assert.equal(requests.length,2);
  assert.equal(store.patchPersonDomain(PERSON,"science"),true);
  assert.equal(store.getSourceState("personDomains").status,"ready");
  resolve(requests[1],"culture");
  assert.equal((await stale).by_person_id[PERSON],"culture",
    "Original waiter is allowed to receive the old response");
  assert.equal((await store.loadPersonDomains()).by_person_id[PERSON],"science",
    "The shared cache must preserve the confirmed edit");
  assert.equal(store.getSourceState("personDomains").status,"ready");
  assert.equal(requests.length,2);
});

test("late failure cannot revert confirmed domain patch into an error state",async()=>{
  const {store,requests,resolve}=fixture();
  const init=store.loadPersonDomains();
  await Promise.resolve();
  resolve(requests[0],"culture");
  await init;
  const obsolete=store.loadPersonDomains({force:true}).catch(err=>err.message);
  await Promise.resolve();
  assert.equal(store.patchPersonDomain(PERSON,"science"),true);
  requests[1].reject(new Error("obsolete domain read"));
  assert.equal(await obsolete,"obsolete domain read");
  assert.equal(store.getSourceState("personDomains").status,"ready");
  assert.equal((await store.loadPersonDomains()).by_person_id[PERSON],"science");
});

test("fresh forced refresh after patch does not coalesce with superseded request",async()=>{
  const {store,requests,resolve}=fixture();
  const init=store.loadPersonDomains();
  await Promise.resolve();
  resolve(requests[0],"culture");
  await init;
  const old=store.loadPersonDomains({force:true});
  await Promise.resolve();
  store.patchPersonDomain(PERSON,"science");
  const fresh=store.loadPersonDomains({force:true});
  await Promise.resolve();
  assert.equal(requests.length,3);
  resolve(requests[2],"science");
  assert.equal((await fresh).by_person_id[PERSON],"science");
  resolve(requests[1],"culture");
  await old;
  assert.equal((await store.loadPersonDomains()).by_person_id[PERSON],"science");
  assert.equal(store.getSourceState("personDomains").status,"ready");
});
