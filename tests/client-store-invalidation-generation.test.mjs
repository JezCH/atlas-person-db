import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");

function fixture() {
  const requests = [];
  const window = {
    ATLAS_PERSON_BROWSER_READER: {
      ENDPOINT:"/api/atlas-person-read",
      listPersons() {
        return new Promise((resolve, reject) => requests.push({resolve,reject}));
      }
    },
    dispatchEvent() {}
  };
  vm.runInNewContext(source, { window, console }, { filename:"atlas-client-data-store.js" });
  return { store:window.ATLAS_CLIENT_DATA_STORE, requests };
}

test("out-of-order completion after invalidation never resurrects an old Person snapshot", async () => {
  const {store,requests}=fixture();
  const old=store.loadPersons();
  await Promise.resolve();
  assert.equal(requests.length,1);
  store.invalidate("persons");
  assert.equal(store.getSourceState("persons").status,"idle");
  const current=store.loadPersons();
  await Promise.resolve();
  assert.equal(requests.length,2);
  requests[1].resolve({persons:[{id:"new"}]});
  assert.equal((await current).persons[0].id,"new");
  requests[0].resolve({persons:[{id:"stale"}]});
  assert.equal((await old).persons[0].id,"stale");
  assert.equal((await store.loadPersons()).persons[0].id,"new");
  assert.equal(requests.length,2,"A cached new snapshot avoids a third network read");
  assert.equal(store.getSourceState("persons").status,"ready");
});

test("late failure of an invalidated request cannot mark fresh Person data as failed", async () => {
  const {store,requests}=fixture();
  const rejected=store.loadPersons().catch((err) => err.message);
  await Promise.resolve();
  store.invalidate();
  const latest=store.loadPersons();
  await Promise.resolve();
  requests[1].resolve({persons:[{id:"current"}]});
  await latest;
  requests[0].reject(new Error("obsolete request failed"));
  assert.equal(await rejected,"obsolete request failed");
  assert.equal(store.getSourceState("persons").status,"ready");
  assert.equal((await store.loadPersons()).persons[0].id,"current");
  assert.equal(requests.length,2);
});

test("force refresh still coalesces active calls without erasing the old cache first", async () => {
  const {store,requests}=fixture();
  const initial=store.loadPersons();
  await Promise.resolve();
  requests[0].resolve({persons:[{id:"first"}]});
  await initial;
  const a=store.loadPersons({force:true});
  const b=store.loadPersons({force:true});
  await Promise.resolve();
  assert.equal(requests.length,2);
  requests[1].resolve({persons:[{id:"second"}]});
  assert.equal((await a).persons[0].id,"second");
  assert.equal((await b).persons[0].id,"second");
  assert.equal((await store.loadPersons()).persons[0].id,"second");
});
