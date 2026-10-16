import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sendJson } = require("../server/atlas-read-http.js");
const read = (file) => fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("Origin JSON diagnostics preserve response bytes without logging query params or payload", () => {
  const headers = {};
  const original = console.warn;
  const messages = [];
  let written = null;
  const body = { persons: ["한글".repeat(110000)], key: "SECRET_BODY" };
  const res = {
    req: { url: "/api/atlas-person-read?person_id=SECRET_QUERY" },
    setHeader: (key, value) => { headers[key.toLowerCase()] = value; },
    end: (text) => { written = text; }
  };
  try {
    console.warn = (...args) => messages.push(args.join(" "));
    sendJson(res, 200, body);
  } finally { console.warn = original; }
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(written), body);
  assert.equal(headers["cache-control"], "no-store");
  assert.equal(Number(headers["x-atlas-json-bytes"]), Buffer.byteLength(written, "utf8"));
  assert.equal(messages.length, 1);
  assert.match(messages[0], /ATLAS_LARGE_ORIGIN_JSON.*route=\/api\/atlas-person-read/);
  assert.doesNotMatch(messages[0], /SECRET_QUERY|SECRET_BODY/);
});

test("Non-Person initial routes do not eagerly trigger canonical full-list fetch", () => {
  const src = read("atlas-person-main.js");
  assert.match(src, /function ensurePersonsLoaded\(\)/);
  assert.match(src, /initialDomain === "persons"\) void ensurePersonsLoaded\(\)/);
  assert.match(src, /atlas-authority-domain-changed/);
  assert.match(src, /event\?\.detail\?\.domain === "persons"\) void ensurePersonsLoaded\(\)/);
  assert.match(src, /const loaded = await ensurePersonsLoaded\(\)/);
  assert.doesNotMatch(src, /installShell\(\);\s*initialLoadPromise = loadPersons/);
});

test("Automatic visual Production smoke is bounded, with the complete release suite preserved", () => {
  const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
  const suiteStart = workflow.indexOf("# Automatic main-deployment smoke only:");
  const fullStart = workflow.indexOf('if [[ "$GITHUB_EVENT_NAME" == "workflow_dispatch" ]]', suiteStart);
  const endFull = workflow.indexOf("\n          fi\n", fullStart);
  assert.ok(suiteStart > 0 && fullStart > suiteStart && endFull > fullStart);
  const automatic = workflow.slice(suiteStart, fullStart);
  assert.equal((automatic.match(/node scripts\//g) || []).length, 3);
  assert.match(automatic, /verify-spacetime-production-visual\.mjs/);
  assert.match(automatic, /verify-ui-v10-production-visual\.mjs/);
  assert.match(automatic, /verify-polity-production-visual\.mjs/);
  const full = workflow.slice(fullStart, endFull);
  assert.ok((full.match(/node scripts\//g) || []).length >= 15);
  assert.match(workflow, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
});

test("CORE and Dashboard Production checks stop immediately on suspended Hobby instead of blind polling", () => {
  const core = read(".github/workflows/atlas-core-final-acceptance.yml");
  const dashboard = read(".github/workflows/atlas-dashboard-production-acceptance.yml");
  assert.match(core, /for attempt in \$\(seq 1 12\)/);
  assert.doesNotMatch(core, /for attempt in \$\(seq 1 90\)/);
  assert.match(core, /\[\[ "\$status" == "402" \]\]/);
  assert.match(dashboard, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
  assert.match(dashboard, /status.*402/);
});
