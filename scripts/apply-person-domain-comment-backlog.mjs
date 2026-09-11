import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MODE = String(process.argv[2] || "plan").trim().toLowerCase();
const ENDPOINT = String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT || "https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const WORKFLOW_SHA = String(process.env.GITHUB_SHA || process.env.ATLAS_WORKFLOW_SHA || "").trim().toLowerCase();
const OIDC_TOKEN = String(process.env.ATLAS_PERSON_DOMAIN_OIDC_TOKEN || "").trim();
const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || "").trim();
const EVIDENCE_DIR = String(process.env.ATLAS_EVIDENCE_DIR || "artifacts/person-domain-apply").trim();
const PLAN_PATH = path.join(EVIDENCE_DIR, "comment-backlog-plan.json");
const ISSUE_REPO = "JezCH/atlas-person-db";
const ISSUE_NUMBER = 977;
const WINDOW_START = "2026-09-11T10:20:00Z";
const WINDOW_END = "2026-09-11T22:53:00Z";
const EXPECTED_MIN_PRODUCTION_ASSIGNED = 1518;
const EXPECTED = Object.freeze({
  "4": Object.freeze({ assignments:83, holds:3 }),
  "5": Object.freeze({ assignments:35, holds:1 }),
  "7": Object.freeze({ assignments:68, holds:1 }),
  "9": Object.freeze({ assignments:73, holds:1 }),
  "c": Object.freeze({ assignments:70, holds:1 }),
  "d": Object.freeze({ assignments:83, holds:0 })
});
const RELEVANT_TASK_MARKERS = Object.freeze([
  "PERSON-DOMAIN-SHARD4-MICROBATCH-",
  "PERSON-DOMAIN-SHARD5-MICROBATCH-",
  "PERSON-DOMAIN-SHARD7-MICROBATCH-",
  "PERSON-DOMAIN-SHARD9-MICROBATCH-",
  "PERSON-DOMAIN-SHARD-9-PARALLEL-REVIEW-",
  "PERSON-DOMAIN-SHARD-C-MICROBATCH-",
  "PERSON-DOMAIN-SHARDC-MICROBATCH-",
  "PERSON-DOMAIN-SHARDD-MICROBATCH-"
]);
const DOMAINS = Object.freeze(["governance","military","knowledge","technology","commerce","culture","religion","exploration"]);
const DOMAIN_SOURCE = DOMAINS.join("|");
const UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const PERSON_ID_RE = new RegExp(`person_id:\\s*(${UUID_SOURCE})`, "i");
const INLINE_ASSIGNMENT_RE = new RegExp(`person_id:\\s*(${UUID_SOURCE})[^}\\n]*representative_domain:\\s*(${DOMAIN_SOURCE})`, "i");
const BRACKET_ASSIGNMENT_RE = new RegExp(`\\[\\s*(${UUID_SOURCE})\\s*,[^\\]]*,\\s*(${DOMAIN_SOURCE})\\s*\\]`, "i");

function fail(message, details = null) {
  const error = new Error(message);
  if (details != null) error.details = details;
  throw error;
}

function shardFor(personId) {
  return crypto.createHash("sha1").update(personId.toLowerCase()).digest("hex")[0];
}

function relevantBody(body) {
  return RELEVANT_TASK_MARKERS.some((marker) => body.includes(marker));
}

async function fetchComments() {
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const url = new URL(`https://api.github.com/repos/${ISSUE_REPO}/issues/${ISSUE_NUMBER}/comments`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("since", WINDOW_START);
    const headers = {
      accept:"application/vnd.github+json",
      "user-agent":"atlas-person-domain-backlog-release"
    };
    if (GITHUB_TOKEN) headers.authorization = `Bearer ${GITHUB_TOKEN}`;
    const response = await fetch(url, { headers, cache:"no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(body)) fail(`GitHub issue comment read failed: HTTP ${response.status}`, body);
    if (body.length === 0) break;
    let allPastWindow = true;
    for (const comment of body) {
      const created = String(comment?.created_at || "");
      if (created <= WINDOW_END) allPastWindow = false;
      if (created < WINDOW_START || created > WINDOW_END) continue;
      const text = String(comment?.body || "");
      if (!relevantBody(text)) continue;
      out.push({ id:Number(comment.id), created_at:created, body:text });
    }
    if (body.length < 100 || allPastWindow) break;
  }
  out.sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  return out;
}

function parseFinalDispositions(comments) {
  const dispositions = new Map();
  let ordinal = 0;
  const setAssignment = (personId, domain, source) => {
    const id = personId.toLowerCase();
    const normalized = domain.toLowerCase();
    if (!DOMAINS.includes(normalized)) fail(`Unsupported parsed domain: ${normalized}`, source);
    dispositions.set(id, { person_id:id, representative_domain:normalized, disposition:"assignment", source, ordinal:++ordinal });
  };
  const setHold = (personId, source) => {
    const id = personId.toLowerCase();
    dispositions.set(id, { person_id:id, representative_domain:null, disposition:"hold", source, ordinal:++ordinal });
  };

  for (const comment of comments) {
    const lines = comment.body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const source = { comment_id:comment.id, created_at:comment.created_at, line:i + 1 };
      const inline = line.match(INLINE_ASSIGNMENT_RE);
      if (inline) {
        setAssignment(inline[1], inline[2], source);
        continue;
      }
      const bracket = line.match(BRACKET_ASSIGNMENT_RE);
      if (bracket) {
        setAssignment(bracket[1], bracket[2], source);
        continue;
      }
      const idMatch = line.match(PERSON_ID_RE);
      if (!idMatch) continue;
      const context = lines.slice(i, Math.min(lines.length, i + 8)).join("\n");
      if (/disposition:\s*HOLD|representative_domain:\s*null|HOLD_(?:NULL|CURRENT|UNCLASSIFIED|POLICY|DOMAIN|EVIDENCE|CLAIMS)/i.test(context)) {
        setHold(idMatch[1], source);
      }
    }
  }
  return dispositions;
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

function assertExpectedCounts(assignments, holds) {
  const actual = Object.fromEntries(Object.keys(EXPECTED).map((key) => [key, { assignments:0, holds:0 }]));
  for (const item of assignments) actual[item.shard].assignments++;
  for (const item of holds) actual[item.shard].holds++;
  const mismatches = [];
  for (const [shard, expected] of Object.entries(EXPECTED)) {
    if (actual[shard].assignments !== expected.assignments || actual[shard].holds !== expected.holds) {
      mismatches.push({ shard, expected, actual:actual[shard] });
    }
  }
  if (mismatches.length) fail("Comment-backed reviewed backlog count mismatch; refusing Production mutation", mismatches);
  return actual;
}

async function buildPlan() {
  const comments = await fetchComments();
  const dispositions = parseFinalDispositions(comments);
  const current = await readCurrent();
  const live = currentMap(current);
  const assignments = [];
  const holds = [];
  const conflicts = [];
  const holdViolations = [];

  for (const item of dispositions.values()) {
    const shard = shardFor(item.person_id);
    if (!Object.hasOwn(EXPECTED, shard)) continue;
    if (item.disposition === "hold") {
      if (live.has(item.person_id)) holdViolations.push({ person_id:item.person_id, shard, actual:live.get(item.person_id), source:item.source });
      else holds.push({ person_id:item.person_id, representative_domain:null, shard, source:item.source });
      continue;
    }
    if (live.has(item.person_id)) {
      if (live.get(item.person_id) !== item.representative_domain) {
        conflicts.push({ person_id:item.person_id, shard, expected:item.representative_domain, actual:live.get(item.person_id), source:item.source });
      }
      continue;
    }
    assignments.push({ person_id:item.person_id, representative_domain:item.representative_domain, shard, source:item.source });
  }

  if (conflicts.length) fail("Reviewed comment backlog conflicts with current Production", conflicts);
  if (holdViolations.length) fail("Reviewed HOLD is already classified in Production", holdViolations);
  assignments.sort((a,b) => a.shard.localeCompare(b.shard) || a.person_id.localeCompare(b.person_id));
  holds.sort((a,b) => a.shard.localeCompare(b.shard) || a.person_id.localeCompare(b.person_id));
  const counts = assertExpectedCounts(assignments, holds);
  const plan = {
    marker:"ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_PLAN_V1",
    issue:`${ISSUE_REPO}#${ISSUE_NUMBER}`,
    window:{ start:WINDOW_START, end:WINDOW_END },
    production_assigned_before:Number(current.assigned),
    relevant_comment_count:comments.length,
    assignment_count:assignments.length,
    hold_count:holds.length,
    counts,
    assignments,
    holds
  };
  fs.mkdirSync(EVIDENCE_DIR, { recursive:true });
  fs.writeFileSync(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(JSON.stringify({ marker:plan.marker, production_assigned_before:plan.production_assigned_before, relevant_comment_count:comments.length, assignment_count:assignments.length, hold_count:holds.length, counts }, null, 2));
  return plan;
}

async function writeEntry(entry, ordinal) {
  if (!OIDC_TOKEN) fail("ATLAS_PERSON_DOMAIN_OIDC_TOKEN is required for apply mode");
  if (!/^[0-9a-f]{40}$/.test(WORKFLOW_SHA)) fail("GITHUB_SHA/ATLAS_WORKFLOW_SHA must be an exact 40-character commit SHA");
  const requestId = `person-domain-comment-backlog-${WORKFLOW_SHA.slice(0,12)}-${entry.person_id}-${entry.representative_domain}`;
  const response = await fetch(ENDPOINT, {
    method:"POST",
    headers:{ accept:"application/json", "content-type":"application/json", authorization:`Bearer ${OIDC_TOKEN}` },
    body:JSON.stringify({ request_id:requestId, person_id:entry.person_id, representative_domain:entry.representative_domain, workflow_sha:WORKFLOW_SHA })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true || body?.committed !== true || String(body.person_id).toLowerCase() !== entry.person_id || String(body.representative_domain).toLowerCase() !== entry.representative_domain) {
    fail(`Comment backlog Person-domain write failed at ${ordinal}: HTTP ${response.status}`, { entry, body });
  }
  console.log(JSON.stringify({ ordinal, person_id:entry.person_id, domain:entry.representative_domain, shard:entry.shard, replay:body.replay === true }));
}

async function applyPlan() {
  if (!fs.existsSync(PLAN_PATH)) fail(`Missing validated comment backlog plan: ${PLAN_PATH}`);
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
  if (plan?.marker !== "ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_PLAN_V1" || !Array.isArray(plan.assignments) || !Array.isArray(plan.holds)) fail("Invalid comment backlog plan artifact");
  if (plan.assignments.length !== Object.values(EXPECTED).reduce((sum, item) => sum + item.assignments, 0)) fail("Plan assignment count drift");
  if (plan.holds.length !== Object.values(EXPECTED).reduce((sum, item) => sum + item.holds, 0)) fail("Plan HOLD count drift");

  const before = await readCurrent();
  const live = currentMap(before);
  const conflicts = plan.assignments.filter((entry) => live.has(entry.person_id) && live.get(entry.person_id) !== entry.representative_domain)
    .map((entry) => ({ person_id:entry.person_id, expected:entry.representative_domain, actual:live.get(entry.person_id) }));
  const holdViolations = plan.holds.filter((entry) => live.has(entry.person_id)).map((entry) => ({ person_id:entry.person_id, actual:live.get(entry.person_id) }));
  if (conflicts.length) fail("Validated comment backlog now conflicts with Production", conflicts);
  if (holdViolations.length) fail("Validated HOLD acquired a Production classification", holdViolations);
  const pending = plan.assignments.filter((entry) => !live.has(entry.person_id));
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_DELTA_V1", reviewed:plan.assignments.length, pending:pending.length, skipped_unchanged:plan.assignments.length - pending.length, holds:plan.holds.length }));
  for (let i = 0; i < pending.length; i++) await writeEntry(pending[i], i + 1);

  const after = await readCurrent();
  const finalMap = currentMap(after);
  for (const entry of plan.assignments) {
    if (finalMap.get(entry.person_id) !== entry.representative_domain) fail(`Final comment backlog read-back mismatch: ${entry.person_id}`, { expected:entry.representative_domain, actual:finalMap.get(entry.person_id) || null });
  }
  for (const entry of plan.holds) {
    if (finalMap.has(entry.person_id)) fail(`Final HOLD must remain null: ${entry.person_id}`, { actual:finalMap.get(entry.person_id) });
  }
  if (Number(after.assigned) < EXPECTED_MIN_PRODUCTION_ASSIGNED) fail("Final Production assigned count below reviewed backlog lower bound", { expected_min:EXPECTED_MIN_PRODUCTION_ASSIGNED, actual:Number(after.assigned) });
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_COMMENT_BACKLOG_APPLY_V1", written:pending.length, skipped_unchanged:plan.assignments.length - pending.length, verified_assignments:plan.assignments.length, hold_unclassified:plan.holds.length, production_assigned:Number(after.assigned), counts:after.counts }, null, 2));
}

if (!new Set(["plan","apply"]).has(MODE)) fail(`Unsupported mode: ${MODE}`);
if (MODE === "plan") await buildPlan();
else await applyPlan();
