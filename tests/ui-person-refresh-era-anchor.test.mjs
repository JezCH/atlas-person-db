import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const main = read("atlas-person-main.js");
const status = read("status-summary.js");
const era = read("atlas-person-era-navigation.js");
const css = read("atlas-person-era-navigation.css");
const html = read("index.html");

function refreshHarness(load) {
  const start = main.indexOf("  let refreshInFlight = false;");
  const end = main.indexOf("  function showOperationalMessage", start);
  assert.ok(start > 0 && end > start);
  const button = {
    disabled: false, textContent: "↻ 새로고침", busy: null,
    setAttribute(name, value) { if (name === "aria-busy") this.busy = value; },
    removeAttribute(name) { if (name === "aria-busy") this.busy = null; }
  };
  const events = [], messages = [];
  const context = {
    window: { dispatchEvent(event) { events.push(event); } },
    document: { getElementById(id) { return id === "personMainRefresh" ? button : null; } },
    loadPersons: load,
    showOperationalMessage(value) { messages.push(value); },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    String
  };
  const refresh = vm.runInNewContext(main.slice(start, end) + "\nrefreshPersons", context);
  return { refresh, button, events, messages };
}

test("manual refresh forces authoritative reload and reports real completion", async () => {
  const calls = [];
  const h = refreshHarness(async (args) => {
    calls.push(args);
    assert.equal(h.button.disabled, true);
    assert.equal(h.button.busy, "true");
    return { ok: true, count: 2145 };
  });
  assert.equal(await h.refresh(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ keepSelection: true, force: true }]);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.busy, null);
  assert.equal(h.button.textContent, "↻ 새로고침");
  assert.deepEqual(h.events.map(e => e.detail.state), ["loading","success"]);
  assert.match(h.messages[0], /2,145명 새로고침 완료/);
});

test("failed refresh reports the error and keeps the old register rather than wiping it", async () => {
  const h = refreshHarness(async () => ({ ok: false, error: new Error("SOURCE_UNAVAILABLE") }));
  assert.equal(await h.refresh(), false);
  assert.equal(h.button.disabled, false);
  assert.deepEqual(h.events.map(e => e.detail.state), ["loading","error"]);
  assert.equal(h.events[1].detail.message, "SOURCE_UNAVAILABLE");
  assert.match(h.messages[0], /새로고침 실패/);
  assert.match(main, /if \(groups && !persons\.length\) groups\.innerHTML/);
  assert.match(status, /window\.addEventListener\("atlas-person-refresh-state", onPersonRefreshState\)/);
  assert.match(status, /state === "success"[\s\S]*?verifySummary\(\)/);
  assert.match(status, /state === "error"[\s\S]*?setConnectionStatus\("error", "새로고침 실패"/);
});

test("repeated refresh clicks do not start duplicate simultaneous reads", async () => {
  let resolves;
  let calls = 0;
  const pending = new Promise(resolve => { resolves = resolve; });
  const h = refreshHarness(async () => { calls += 1; return pending; });
  const first = h.refresh();
  assert.equal(await h.refresh(), false);
  assert.equal(calls, 1);
  resolves({ ok: true, count: 1 });
  assert.equal(await first, true);
  assert.equal(h.button.disabled, false);
});

test("era jump and active-era viewport sampling use the same measured pinned header", () => {
  assert.match(era, /return visibleRegisterEdge\(\) \+ 24/);
  assert.match(era, /function pinnedRegisterEdge\(\)/);
  assert.match(era, /window\.scrollTo\(\{ top: destination/);
  assert.match(era, /elementFromPoint\?\.\(x, y\)/);
  assert.doesNotMatch(era, /activeButton\?\.scrollIntoView/);
  assert.match(era, /--person-table-head-height/);
  assert.match(css, /\.person-era-group\{scroll-margin-top:calc\(var\(--person-table-sticky-top,122px\) \+ var\(--person-table-head-height,36px\) \+ 2px\)\}/);
  assert.match(era, /target\.scrollIntoView\?\.\(\{ behavior: reducedMotion\(\) \? "auto" : "smooth", block: "start" \}\)/);
  assert.match(html, /atlas-person-era-navigation\.js\?v=/);
  assert.match(html, /atlas-person-era-navigation\.css\?v=/);
});
