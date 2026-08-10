import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const readService = fs.readFileSync(new URL("../server/atlas-normalized-read-service.js", import.meta.url), "utf8");
const readHandler = fs.readFileSync(new URL("../server/atlas-normalized-read-handler.js", import.meta.url), "utf8");
const readApi = fs.readFileSync(new URL("../api/atlas-read.js", import.meta.url), "utf8");
const reader = fs.readFileSync(new URL("../atlas-reader.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const adminHtml = fs.readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const admin = fs.readFileSync(new URL("../admin.js", import.meta.url), "utf8");
const adminService = fs.readFileSync(new URL("../atlas-admin-write-service.js", import.meta.url), "utf8");
const reconciliationBootstrap = fs.readFileSync(new URL("../atlas-reconciliation-bootstrap.js", import.meta.url), "utf8");
const mutationHandler = fs.readFileSync(new URL("../server/atlas-vercel-mutation-handler.js", import.meta.url), "utf8");

const activeReadRuntime = [readService, readHandler, readApi, reader, app, index, adminHtml, admin, adminService, reconciliationBootstrap].join("\n");

test("active read runtime has no legacy table, compatibility view, or fallback dependency", () => {
  assert.doesNotMatch(activeReadRuntime, /public\.person_politics(?:\s|["'`;])/);
  assert.doesNotMatch(activeReadRuntime, /atlas_person_politics_compat_v1/);
  assert.doesNotMatch(reader, /fallbackToLegacy|fallback to legacy/);
  assert.doesNotMatch(app, /ATLAS_DATA_SOURCE|SUPABASE_URL|SUPABASE_ANON_KEY|window\.supabase/);
  assert.doesNotMatch(admin + adminService, /SUPABASE_URL|SUPABASE_ANON_KEY|window\.supabase|\.from\(/);
});

test("server read projection is direct normalized and browser consumes only public GET API", () => {
  assert.match(readService, /atlas_v2\.person_politics_v2/);
  assert.match(readService, /atlas_v2\.person_names/);
  assert.match(readService, /atlas_v2\.polity_names/);
  assert.match(readService, /atlas_v2\.roles/);
  assert.match(readService, /atlas_v2\.period_bases/);
  assert.match(reader, /ATLAS_READER_V2_DIRECT/);
  assert.match(reader, /\/api\/atlas-read/);
  assert.match(reader, /method: "GET"/);
  assert.doesNotMatch(reader, /\.from\(|atlas_v2\./);
});

test("authoring pages no longer load Supabase, source-switch, or reconciliation legacy runtime", () => {
  assert.doesNotMatch(index, /supabase-js/);
  assert.doesNotMatch(adminHtml, /supabase-js/);
  assert.doesNotMatch(index, /atlas-production-source\.js|atlas-source-control\.js/);
  assert.doesNotMatch(index, /atlas-legacy-reconciliation-executor\.js|atlas-reconciliation-integration\.js|atlas-reconciliation-bootstrap\.js/);
  assert.doesNotMatch(index, /atlas-reconciliation-planner\.js|atlas-reconciliation-controller\.js/);
  assert.match(reconciliationBootstrap, /retired-from-page-load/);
  assert.doesNotMatch(reconciliationBootstrap, /SUPABASE|person_politics|ATLAS_LEGACY_RECONCILIATION_EXECUTOR/);
});

test("C6 does not regress C5 production v2-only writes", () => {
  assert.match(mutationHandler, /createV2AuthoritativeTransactionFactory/);
  assert.match(mutationHandler, /createV2AuthoritativeMutationService/);
  assert.doesNotMatch(mutationHandler, /createDualWriteTransactionFactory/);
  assert.match(app, /writeAdapter\.createActivity/);
  assert.match(app, /writeAdapter\.updateActivity/);
  assert.match(app, /writeAdapter\.deleteActivity/);
  assert.match(app, /writeAdapter\.importActivities/);
  assert.match(adminService, /server-v2-only|v2-only/);
});
