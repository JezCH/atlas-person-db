import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const PROPOSAL_DIR = path.join(ROOT, "proposals/person-representative-domain");
const ENDPOINT = String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT || "https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const WORKFLOW_SHA = String(process.env.GITHUB_SHA || process.env.ATLAS_WORKFLOW_SHA || "").trim().toLowerCase();
const OIDC_TOKEN = String(process.env.ATLAS_PERSON_DOMAIN_OIDC_TOKEN || "").trim();
const MODE = String(process.argv[2] || "verify").trim().toLowerCase();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_CODES = Object.freeze([
  "governance","military","knowledge","technology",
  "commerce","culture","religion","exploration"
]);
const CANCELLED_SEQUENCE_ORDINALS = Object.freeze({
  batch:new Set([22,27,28,29,30]),
  hold:new Set()
});

function fail(message, details = null) {
  const error = new Error(message);
  if (details != null) error.details = details;
  throw error;
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(PROPOSAL_DIR, name), "utf8"));
}

function discoverContiguous(prefix) {
  const pattern = new RegExp(`^${prefix}-(\\d{3})\\.json$`);
  const files = fs.readdirSync(PROPOSAL_DIR)
    .map((name) => ({ name, match:name.match(pattern) }))
    .filter((item) => item.match)
    .map((item) => ({ name:item.name, ordinal:Number(item.match[1]) }))
    .sort((a,b) => a.ordinal - b.ordinal);
  if (files.length === 0) fail(`No ${prefix}-NNN.json files found`);
  const cancelled = CANCELLED_SEQUENCE_ORDINALS[prefix] || new Set();
  const byOrdinal = new Map(files.map((item) => [item.ordinal, item]));
  const maxOrdinal = files.at(-1).ordinal;
  for (let expected = 1; expected <= maxOrdinal; expected++) {
    if (byOrdinal.has(expected)) {
      if (cancelled.has(expected)) {
        fail(`Cancelled ${prefix} ordinal must not have a manifest: ${String(expected).padStart(3,"0")}`);
      }
      continue;
    }
    if (cancelled.has(expected)) continue;
    fail(`Non-contiguous ${prefix} sequence: expected ${String(expected).padStart(3,"0")}, got gap`);
  }
  return Object.freeze(files.map((item) => item.name));
}

function validateEntry(entry, { allowNull = false, source }) {
  const personId = String(entry?.person_id || "").trim().toLowerCase();
  if (!UUID_RE.test(personId)) fail(`Invalid Person UUID in ${source}: ${personId}`);
  const domain = entry?.representative_domain == null ? null : String(entry.representative_domain).trim().toLowerCase();
  if (domain == null) {
    if (!allowNull) fail(`Null representative_domain is not writable in ${source}: ${personId}`);
  } else if (!CANONICAL_CODES.includes(domain)) {
    fail(`Unsupported representative_domain in ${source}: ${domain}`);
  }
  return Object.freeze({
    person_id:personId,
    representative_domain:domain,
    canonical_name_en:String(entry?.canonical_name_en || "").trim(),
    preferred_name_ko:String(entry?.preferred_name_ko || "").trim(),
    source
  });
}

function loadPlan() {
  const smokeRaw = readJson("palette-smoke-001.json");
  const smoke = smokeRaw.entries.map((entry) => validateEntry(entry, { source:"palette-smoke-001.json" }));
  if (smoke.length !== 8) fail(`Smoke set must contain exactly 8 Persons; got ${smoke.length}`);
  const smokeCodes = smoke.map((entry) => entry.representative_domain).sort();
  const expectedCodes = [...CANONICAL_CODES].sort();
  if (JSON.stringify(smokeCodes) !== JSON.stringify(expectedCodes)) fail("Smoke set must cover each canonical domain exactly once", smokeCodes);

  const batchFiles = discoverContiguous("batch");
  const holdFiles = discoverContiguous("hold");

  const batch = [];
  const batchIds = new Set();
  for (const name of batchFiles) {
    const raw = readJson(name);
    for (const item of raw.entries) {
      const entry = validateEntry(item, { source:name });
      if (batchIds.has(entry.person_id)) fail(`Duplicate reviewed batch Person: ${entry.person_id}`);
      batchIds.add(entry.person_id);
      batch.push(entry);
    }
  }

  const hold = [];
  const holdIds = new Set();
  for (const name of holdFiles) {
    const raw = readJson(name);
    for (const item of raw.entries) {
      const entry = validateEntry(item, { allowNull:true, source:name });
      if (entry.representative_domain !== null) fail(`HOLD Person must remain null in ${name}: ${entry.person_id}`);
      if (holdIds.has(entry.person_id)) fail(`Duplicate HOLD Person: ${entry.person_id}`);
      holdIds.add(entry.person_id);
      hold.push(entry);
    }
  }

  for (const personId of holdIds) {
    if (batchIds.has(personId)) fail(`HOLD Person appears in reviewed batch write set: ${personId}`);
  }

  const assignments = new Map();
  for (const entry of [...smoke, ...batch]) {
    if (holdIds.has(entry.person_id)) fail(`HOLD Person appears in write set: ${entry.person_id}`);
    const prior = assignments.get(entry.person_id);
    if (prior && prior.representative_domain !== entry.representative_domain) {
      fail(`Conflicting representative_domain for ${entry.person_id}`, { prior, current:entry });
    }
    if (!prior) assignments.set(entry.person_id, entry);
  }

  return Object.freeze({ smoke, batch, hold, assignments, batchFiles, holdFiles });
}

async function readCurrent() {
  const response = await fetch(ENDPOINT, { headers:{ accept:"application/json" }, cache:"no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true || body?.marker !== "ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V1" || !Array.isArray(body.rows)) {
    fail(`Person domain read failed: HTTP ${response.status}`, body);
  }
  const codes = Array.isArray(body.definitions) ? body.definitions.map((item) => item?.code).sort() : [];
  if (JSON.stringify(codes) !== JSON.stringify([...CANONICAL_CODES].sort())) fail("Production domain definition drift", codes);
  return body;
}

function currentDomainMap(body) {
  return new Map(body.rows.map((row) => [String(row.person_id).toLowerCase(), String(row.representative_domain)]));
}

async function writeEntry(entry, ordinal) {
  if (!OIDC_TOKEN) fail("ATLAS_PERSON_DOMAIN_OIDC_TOKEN is required for write mode");
  if (!/^[0-9a-f]{40}$/.test(WORKFLOW_SHA)) fail("GITHUB_SHA/ATLAS_WORKFLOW_SHA must be an exact 40-character commit SHA");
  const requestId = `person-domain-${WORKFLOW_SHA.slice(0,12)}-${entry.person_id}-${entry.representative_domain}`;
  const response = await fetch(ENDPOINT, {
    method:"POST",
    headers:{
      accept:"application/json",
      "content-type":"application/json",
      authorization:`Bearer ${OIDC_TOKEN}`
    },
    body:JSON.stringify({
      request_id:requestId,
      person_id:entry.person_id,
      representative_domain:entry.representative_domain,
      workflow_sha:WORKFLOW_SHA
    })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true || body?.committed !== true || body?.person_id !== entry.person_id || body?.representative_domain !== entry.representative_domain) {
    fail(`Person domain write failed at ${ordinal}: HTTP ${response.status}`, { entry, body });
  }
  console.log(JSON.stringify({ ordinal, person_id:entry.person_id, domain:entry.representative_domain, replay:body.replay === true }));
}

async function applyOnlyChanged(entries, label) {
  const before = await readCurrent();
  const current = currentDomainMap(before);
  const conflicts = entries
    .filter((entry) => current.has(entry.person_id) && current.get(entry.person_id) !== entry.representative_domain)
    .map((entry) => ({ person_id:entry.person_id, expected:entry.representative_domain, actual:current.get(entry.person_id) }));
  if (conflicts.length) fail("Reviewed Person domain conflicts with live Production; re-review required", conflicts);
  const pending = entries.filter((entry) => !current.has(entry.person_id));
  console.log(JSON.stringify({
    marker:"ATLAS_PERSON_DOMAIN_DELTA_V1",
    mode:label,
    reviewed:entries.length,
    pending:pending.length,
    skipped_unchanged:entries.length - pending.length
  }));
  for (let i = 0; i < pending.length; i++) await writeEntry(pending[i], i + 1);
  return pending.length;
}

function verifyExpected(body, expectedEntries, holdEntries) {
  const current = currentDomainMap(body);
  for (const entry of expectedEntries) {
    if (current.get(entry.person_id) !== entry.representative_domain) {
      fail(`Production read-back mismatch for ${entry.person_id}`, { expected:entry.representative_domain, actual:current.get(entry.person_id) || null });
    }
  }
  for (const entry of holdEntries) {
    if (current.has(entry.person_id)) fail(`HOLD Person must remain unclassified: ${entry.person_id}`, { actual:current.get(entry.person_id) });
  }
  return Object.freeze({
    production_assigned:Number(body.assigned),
    verified_assignments:expectedEntries.length,
    hold_unclassified:holdEntries.length,
    counts:body.counts
  });
}

const plan = loadPlan();
if (!["smoke","batch","verify"].includes(MODE)) fail(`Unsupported mode: ${MODE}`);

if (MODE === "smoke") {
  await applyOnlyChanged(plan.smoke, MODE);
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, plan.smoke, plan.hold) }, null, 2));
} else if (MODE === "batch") {
  await applyOnlyChanged(plan.batch, MODE);
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, [...plan.assignments.values()], plan.hold) }, null, 2));
} else {
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, [...plan.assignments.values()], plan.hold) }, null, 2));
}
