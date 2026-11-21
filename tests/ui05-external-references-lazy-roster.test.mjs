import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function fixture(initialStatus = "idle") {
  const listeners = new Map();
  let calls = 0;
  const personId = "11111111-1111-4111-8111-111111111111";
  const persons = [{
    id: personId,
    external_references: {
      namuwiki: { status: "linked", checked_at: "2026-11-21",
        url: "https://namu.wiki/w/test", document_title: "검증된 인물" }
    }
  }];
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const state = { status: initialStatus };
  const store = {
    getSourceState: () => state,
    async loadPersons() { calls++; return { persons }; }
  };
  const win = {
    ATLAS_CLIENT_DATA_STORE: store,
    location: { href: "https://atlas-person-db.vercel.app/#atlas-persons/person/" + personId },
    CustomEvent,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  vm.runInNewContext(source, {
    window:win,
    document:{ querySelectorAll: () => [] },
    CustomEvent,
    URL,
    console:{ error: () => {} },
    queueMicrotask
  }, { filename:"atlas-person-external-references.js" });
  return {
    api: win.ATLAS_PERSON_EXTERNAL_REFERENCES,
    personId,
    get calls() { return calls; },
    send(key, status) { state.status = status; win.dispatchEvent(new CustomEvent(
      "atlas-client-data-source-updated", { detail:{key,state:{status}} })); }
  };
}
const drain = () => new Promise((resolve) => setImmediate(resolve));

test("a Person detail deep link does not force the full Person registry download", async () => {
  const app = fixture();
  await drain();
  assert.equal(app.calls, 0);
  assert.equal(app.api.liveReferencesLoaded(), false);
  const detail = {
    id: app.personId, external_references: {
      namuwiki: { status:"linked", url:"https://namu.wiki/w/detail",
        document_title:"독립 상세 조회" }
    }
  };
  assert.equal(app.api.linkForPerson(detail, "namuwiki").url, "https://namu.wiki/w/detail");
  app.send("personDomains", "ready");
  app.send("persons", "loading");
  await drain();
  assert.equal(app.calls, 0);
});

test("reference links hydrate from the shared roster only after it is ready", async () => {
  const app = fixture();
  app.send("persons", "ready");
  await drain();
  assert.equal(app.calls, 1);
  assert.equal(app.api.liveReferencesLoaded(), true);
  assert.equal(app.api.linkForPerson({id:app.personId}, "namuwiki").url, "https://namu.wiki/w/test");
  assert.equal(app.api.statusForPerson({id:app.personId}).status, "linked");
});

test("late module initialization reuses an already loaded Person roster", async () => {
  const app = fixture("ready");
  await drain();
  assert.equal(app.calls, 1);
  assert.equal(app.api.liveReferencesLoaded(), true);
  assert.match(html, /atlas-person-external-references\.js\?v=20261121-lazy-roster-v1/);
});
