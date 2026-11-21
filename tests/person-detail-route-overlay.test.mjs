import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shell = fs.readFileSync(new URL("../atlas-responsive-shell.js", import.meta.url), "utf8");

test("canonical Person route opens the overlay without clicking a roster row", () => {
  const listeners = new Map();
  const bodyClasses = new Set();
  let onDetailMutation;
  const detail = { setAttribute() {}, addEventListener() {},
    querySelector() { return this.closeButton; },
    prepend(button) { this.closeButton = button; } };
  const groups = { addEventListener() {} };
  const document = {
    querySelector: () => null,
    getElementById: (id) => id === "personMainDetail" ? detail : groups,
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
    addEventListener() {},
    body: { append(node) { this.backdrop = node; },
      classList: { toggle(name, enabled) { if (enabled) bodyClasses.add(name); else bodyClasses.delete(name); } } }
  };
  const window = { matchMedia: () => ({ matches: false }),
    addEventListener: (type, listener) => listeners.set(type, listener) };
  class MutationObserver {
    constructor(callback) { onDetailMutation = callback; }
    observe() {}
  }
  vm.runInNewContext(shell, { window, document, MutationObserver });
  const onRoute = (detail) => listeners.get("atlas-authority-domain-changed")({ detail });
  assert.equal(detail.hidden, true);
  onRoute({ domain: "persons", route: { entity_type: "person", entity_id: "person-one" } });
  onDetailMutation();
  assert.equal(detail.hidden, false);
  assert.equal(document.body.backdrop.hidden, false);
  assert.equal(bodyClasses.has("person-detail-overlay-open"), true);
  onRoute({ domain: "persons", route: { entity_type: null, entity_id: null } });
  assert.equal(detail.hidden, true);
  assert.equal(document.body.backdrop.hidden, true);
  assert.equal(bodyClasses.has("person-detail-overlay-open"), false);
});

test("domain router publishes its canonical route to the responsive shell", () => {
  const router = fs.readFileSync(new URL("../atlas-main-authority-nav.js", import.meta.url), "utf8");
  assert.match(router, /new CustomEvent\("atlas-authority-domain-changed", \{ detail: \{ domain: next, route: resolvedRoute \} \}\)/);
});
