import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ENDPOINT = String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT || "https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const WORKFLOW_SHA = String(process.env.GITHUB_SHA || process.env.ATLAS_WORKFLOW_SHA || "").trim().toLowerCase();
const AUDIENCE = String(process.env.ATLAS_PERSON_DOMAIN_AUDIENCE || "atlas-person-domain-api").trim();
const EVIDENCE_DIR = String(process.env.ATLAS_EVIDENCE_DIR || "artifacts/person-domain-apply").trim();
const PLAN_PATH = path.join(EVIDENCE_DIR, "comment-backlog-plan.json");
const EXPECTED_ASSIGNMENTS = 412;
const EXPECTED_HOLDS = 7;
const EXPECTED_MIN_ASSIGNED = 1518;
const TOKEN_MAX_AGE_MS = 90_000;

function fail(message, details = null) {
  const error = new Error(message);
  if (details != null) error.details = details;
  throw error;
}

async function readCurrent() {
  const response = await fetch(ENDPOINT, { headers:{ accept:"application/json" }, cache:"no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true || body?.marker !== "ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V1" || !Array.isArray(body.rows)) {
    fail(`Person domain read failed: HTTP ${response.status}`, body);
  }
  return body;
}

function currentMap(body) {
  return new Map(body.rows.map((row) => [String(row.person_id).toLowerCase(), String(row.representative_domain).toLowerCase()]));
}

let cachedToken = "";
let cachedAt = 0;

async function getOidcToken(force = false) {
  if (!force && cachedToken && Date.now() - cachedAt < TOKEN_MAX_AGE_MS) return cachedToken;
  const requestToken = String(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || "").trim();
  const requestUrlRaw = String(process.env.ACTIONS_ID_TOKEN_REQUEST_URL || "").trim();
  if (!requestToken || !requestUrlRaw) fail("GitHub Actions OIDC request environment is unavailable");
  const requestUrl = new URL(requestUrlRaw);
  requestUrl.searchParams.set("audience", AUDIENCE);
  const response = await fetch(requestUrl, {
    headers:{ authorization:`bearer ${requestToken}`, accept:"application/json" },
    cache:"no-store"
  });
  const body = await response.json().catch(() => null);
  const token = String(body?.value || "").trim();
  if (!response.ok || !token) fail(`OIDC token refresh failed: HTTP ${response.status}`, body);
  cachedToken = token;
  cachedAt = Date.now();
  return cachedToken;
}

async function postEntry(entry, ordinal) {
  if (!/^[0-9a-f]{40}$/.test(WORKFLOW_SHA)) fail("GITHUB_SHA/ATLAS_WORKFLOW_SHA must be an exact 40-character commit SHA");
  const requestId = `person-domain-comment-backlog-${WORKFLOW_SHA.slice(0,12)}-${entry.person_id}-${entry.representative_domain}`;
  const payload = JSON.stringify({
    request_id:requestId,
    person_id:entry.person_id,
    representative_domain:entry.representative_domain,
    workflow_sha:WORKFLOW_SHA
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getOidcToken(attempt > 1);
    const response = await fetch(ENDPOINT, {
      method:"POST",
      headers:{ accept:"application/json", "content-type":"application/json", authorization:`Bearer ${token}` },
      body:payload
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401 && attempt === 1) {
      cachedToken = "";
      cachedAt = 0;
      continue;
    }
    if (!response.ok || body?.ok !== true || body?.committed !== true || String(body.person_id).toLowerCase() !== entry.person_id || String(body.representative_domain).toLowerCase() !== entry.representative_domain) {
      fail(`Comment backlog write failed at ${ordinal}: HTTP ${response.status}`, { entry, body });
    }
    console.log(JSON.stringify({ ordinal, person_id:entry.person_id, domain:entry.representative_domain, shard:entry.shard, replay:body.replay === true }));
    return;
  }
  fail(`Comment backlog write exhausted retries at ${ordinal}`, entry);
}

if (!fs.existsSync(PLAN_PATH)) fail(`Missing validated comment backlog plan: ${PLAN_PATH}`);
const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
if (plan?.marker !== "ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_PLAN_V1") fail("Invalid comment backlog plan marker");
if (!Array.isArray(plan.assignments) || plan.assignments.length !== EXPECTED_ASSIGNMENTS) fail("Comment backlog assignment count drift", plan?.assignments?.length);
if (!Array.isArray(plan.holds) || plan.holds.length !== EXPECTED_HOLDS) fail("Comment backlog HOLD count drift", plan?.holds?.length);

const before = await readCurrent();
const live = currentMap(before);
const conflicts = [];
const holdViolations = [];
const pending = [];
for (const entry of plan.assignments) {
  const id = String(entry.person_id).toLowerCase();
  const domain = String(entry.representative_domain).toLowerCase();
  if (!live.has(id)) pending.push({ ...entry, person_id:id, representative_domain:domain });
  else if (live.get(id) !== domain) conflicts.push({ person_id:id, expected:domain, actual:live.get(id) });
}
for (const entry of plan.holds) {
  const id = String(entry.person_id).toLowerCase();
  if (live.has(id)) holdViolations.push({ person_id:id, actual:live.get(id) });
}
if (conflicts.length) fail("Reviewed comment backlog conflicts with current Production", conflicts);
if (holdViolations.length) fail("Reviewed HOLD acquired a Production classification", holdViolations);

console.log(JSON.stringify({
  marker:"ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_RENEWABLE_DELTA_V1",
  reviewed:plan.assignments.length,
  pending:pending.length,
  skipped_unchanged:plan.assignments.length - pending.length,
  holds:plan.holds.length,
  production_assigned_before:Number(before.assigned)
}));

for (let i = 0; i < pending.length; i++) await postEntry(pending[i], i + 1);

const after = await readCurrent();
const finalMap = currentMap(after);
for (const entry of plan.assignments) {
  const id = String(entry.person_id).toLowerCase();
  const domain = String(entry.representative_domain).toLowerCase();
  if (finalMap.get(id) !== domain) fail(`Final comment backlog read-back mismatch: ${id}`, { expected:domain, actual:finalMap.get(id) || null });
}
for (const entry of plan.holds) {
  const id = String(entry.person_id).toLowerCase();
  if (finalMap.has(id)) fail(`Final HOLD must remain null: ${id}`, { actual:finalMap.get(id) });
}
if (Number(after.assigned) < EXPECTED_MIN_ASSIGNED) fail("Final Production assigned count below reviewed backlog lower bound", { expected_min:EXPECTED_MIN_ASSIGNED, actual:Number(after.assigned) });

console.log(JSON.stringify({
  marker:"ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_RENEWABLE_APPLY_V1",
  written:pending.length,
  skipped_unchanged:plan.assignments.length - pending.length,
  verified_assignments:plan.assignments.length,
  hold_unclassified:plan.holds.length,
  production_assigned:Number(after.assigned),
  counts:after.counts
}, null, 2));
