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



test("Full-history Production census workflows are explicitly dispatched, not triggered by a code push", () => {
  for (const workflow of [
    ".github/workflows/atlas-audit-inventory.yml",
    ".github/workflows/atlas-polity-p2-09-public-production-census.yml",
    ".github/workflows/atlas-place-production-authority-audit.yml"
  ]) {
    const source = read(workflow);
    const triggers = source.split(/\non:\n/)[1]?.split(/\npermissions:\n/)[0] || "";
    assert.match(source, /\n  workflow_dispatch:/, workflow);
    assert.doesNotMatch(triggers, /\n  push:/, workflow);
  }
});

test("CORE Production SHA gate is triggered by runtime files, not tests and operation-only changes", () => {
  const source = read(".github/workflows/atlas-core-final-acceptance.yml");
  const push = source.split("  push:")[1]?.split("  workflow_dispatch:")[0] || "";
  assert.match(push, /api\/\*\*/);
  assert.match(push, /server\/\*\*/);
  assert.doesNotMatch(push, /tests\/\*\*|requirements\/\*\*|scripts\/\*\*/);
  assert.doesNotMatch(push, /atlas-core-final-acceptance\.yml/);
});

test("Canonical Authoring retains its safety window but stops a paused Production before write", () => {
  const source = read(".github/workflows/atlas-authoring-apply.yml");
  assert.match(source, /for attempt in \$\(seq 1 60\)/);
  assert.match(source, /if \[\[ "\$status" == "402" \]\]; then/);
  assert.match(source, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED: stop Authoring apply before any mutation/);
});

test("Place Production audit has a terminal 402 guard and bounded readiness window", () => {
  const source = read(".github/workflows/atlas-place-production-authority-audit.yml");
  assert.match(source, /for attempt in \$\(seq 1 12\)/);
  assert.doesNotMatch(source, /for attempt in \$\(seq 1 75\)/);
  assert.match(source, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
});

test("Historical one-shot audit evidence is manual-only, never a Production push side-effect", () => {
  for (const file of [
    "atlas-polity-russia-p2-05c-acceptance.yml",
    "atlas-polity-song-p2-08-audit.yml",
    "atlas-polity-song-p2-08e-public-readback.yml",
    "atlas-polity-sweden-p2-06-audit.yml",
    "atlas-polity-sweden-p2-06c-public-readback.yml",
    "atlas-spatial-candidate-audit.yml"
  ]) {
    const source = read(".github/workflows/" + file);
    const trigger = source.split(/\non:\n/)[1]?.split(/\n(?:permissions|concurrency|jobs):\n/)[0] || "";
    assert.match(trigger, /^\s*workflow_dispatch:/m, file);
    assert.doesNotMatch(trigger, /^\s*(?:push|pull_request|schedule):/m, file);
  }
});

test("Canonical writes retain safety with a terminal Vercel Hobby quota gate", () => {
  for (const file of [
    "atlas-authoring-schema-bootstrap.yml",
    "atlas-correction-apply.yml",
    "atlas-reviewed-person-merge.yml",
    "atlas-person-domain-verify.yml"
  ]) {
    assert.match(read(".github/workflows/" + file), /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/, file);
  }
  assert.match(read(".github/workflows/atlas-reviewed-person-merge.yml"), /for attempt in \$\(seq 1 75\)/);
  assert.match(read(".github/workflows/atlas-correction-apply.yml"), /for attempt in \$\(seq 1 60\)/);
});

test("Only Production UI changes trigger automatic live-browser acceptance", () => {
  for (const file of [
    "atlas-spacetime-production-visual.yml",
    "atlas-dashboard-production-acceptance.yml",
    "atlas-person-domain-verify.yml"
  ]) {
    const src = read(".github/workflows/" + file);
    const push = src.split("  push:")[1]?.split("  workflow_dispatch:")[0] || "";
    assert.doesNotMatch(push, /scripts\/(?:verify|capture)[^\n]*/, file);
  }
});
