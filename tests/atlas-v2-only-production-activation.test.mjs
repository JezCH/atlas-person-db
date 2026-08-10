import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const handler = fs.readFileSync(new URL("../server/atlas-vercel-mutation-handler.js", import.meta.url), "utf8");
const adapter = fs.readFileSync(new URL("../atlas-server-write-adapter.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const adminService = fs.readFileSync(new URL("../atlas-admin-write-service.js", import.meta.url), "utf8");
const adminHtml = fs.readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const productionSource = fs.readFileSync(new URL("../atlas-production-source.js", import.meta.url), "utf8");

test("production handler selects only the proven v2-authoritative persistence path", () => {
  assert.match(handler, /createV2AuthoritativeMutationService/);
  assert.match(handler, /createV2AuthoritativeTransactionFactory/);
  assert.doesNotMatch(handler, /createDualWriteTransactionFactory/);
  assert.doesNotMatch(handler, /createMutationService/);
  assert.doesNotMatch(handler, /atlas-postgres-dualwrite-transaction/);
  assert.doesNotMatch(handler, /public\.person_politics/);
});

test("browser mutation contract is explicitly v2-only and never fakes legacy commit", () => {
  assert.match(adapter, /mode:\s*"server-v2-only"/);
  assert.match(adapter, /write_mode:\s*"v2-only"/);
  assert.doesNotMatch(adapter, /server-dual-write/);
  assert.match(adapter, /legacy:\s*\{ attempted: false, committed: false/);
  assert.match(app, /outcome\?\.committed === true/);
  assert.match(app, /outcome\?\.v2\?\.committed === true/);
  assert.match(app, /outcome\.v2\.normalized_relationship_ids/);
  assert.doesNotMatch(app, /outcome\.legacy\?\.committed/);
  assert.doesNotMatch(app, /outcome\.legacy\.record_ids/);
});

test("admin exact lookup returns normalized compatibility id and has no legacy lookup", () => {
  assert.match(adminService, /\.from\("atlas_person_politics_compat_v1"\)/);
  assert.doesNotMatch(adminService, /\.from\("person_politics"\)/);
  assert.match(adminService, /\.limit\(2\)/);
  assert.match(adminService, /normalized activity lookup is ambiguous/);
  assert.match(adminService, /result\?\.v2\?\.committed === true/);
  assert.match(adminHtml, /normalized v2/);
  assert.doesNotMatch(adminHtml, /legacy \+ normalized v2/);
});

test("C5 changes writes only; compatibility read remains until C6", () => {
  assert.match(productionSource, /DATA_SOURCE:\s*"v2-shadow"/);
  assert.match(app, /fallbackToLegacy:\s*true/);
});
