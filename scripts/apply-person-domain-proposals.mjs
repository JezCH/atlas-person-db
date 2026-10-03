import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validateHumanAuthoringOrigin } from "./person-domain-authoring-origin.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const PROPOSAL_DIR = path.join(ROOT, "proposals/person-representative-domain");
const ENDPOINT = String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT || "https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const WORKFLOW_SHA = String(process.env.GITHUB_SHA || process.env.ATLAS_WORKFLOW_SHA || "").trim().toLowerCase();
const OIDC_TOKEN = String(process.env.ATLAS_PERSON_DOMAIN_OIDC_TOKEN || "").trim();
const MODE = String(process.argv[2] || "verify").trim().toLowerCase();
const TARGET = String(process.argv[3] || "").trim();
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

function discoverRepairBatches() {
  const pattern = /^batch-repair-(\d{3})\.json$/;
  const files = fs.readdirSync(PROPOSAL_DIR)
    .map((name) => ({ name, match:name.match(pattern) }))
    .filter((item) => item.match)
    .map((item) => ({ name:item.name, ordinal:Number(item.match[1]) }))
    .sort((a,b) => a.ordinal - b.ordinal);
  if (files.length === 0) return Object.freeze([]);
  const maxOrdinal = files.at(-1).ordinal;
  for (let expected = 1; expected <= maxOrdinal; expected++) {
    const actual = files[expected - 1];
    if (!actual || actual.ordinal !== expected) {
      fail(`Non-contiguous batch-repair sequence: expected ${String(expected).padStart(3,"0")}`);
    }
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
  const previousDomain = entry?.previous_representative_domain == null
    ? null
    : String(entry.previous_representative_domain).trim().toLowerCase();
  if (previousDomain != null && !CANONICAL_CODES.includes(previousDomain)) {
    fail(`Unsupported previous_representative_domain in ${source}: ${previousDomain}`);
  }
  const supersedesSource = String(entry?.supersedes_source || "").trim();
  const supersedesOrigin = entry?.supersedes_origin == null
    ? null
    : String(entry.supersedes_origin).trim().toLowerCase();
  const supersedesRequestId = entry?.supersedes_request_id == null
    ? null
    : String(entry.supersedes_request_id).trim();
  if ((previousDomain == null) !== (supersedesSource === "")) {
    fail(`Reviewed domain correction must provide both previous_representative_domain and supersedes_source in ${source}: ${personId}`);
  }
  if (supersedesOrigin != null && supersedesOrigin !== "human_authoring") {
    fail(`Unsupported supersedes_origin in ${source}: ${supersedesOrigin}`);
  }
  if ((supersedesOrigin === "human_authoring") !== Boolean(supersedesRequestId)) {
    fail(`Human-authoring correction must provide both supersedes_origin=human_authoring and supersedes_request_id in ${source}: ${personId}`);
  }
  if (previousDomain == null && (supersedesOrigin != null || supersedesRequestId != null)) {
    fail(`New reviewed assignment cannot declare a supersedes origin in ${source}: ${personId}`);
  }
  if (previousDomain != null && previousDomain === domain) {
    fail(`Reviewed domain correction must change the domain in ${source}: ${personId}`);
  }
  return Object.freeze({
    person_id:personId,
    representative_domain:domain,
    previous_representative_domain:previousDomain,
    supersedes_source:supersedesSource || null,
    supersedes_origin:supersedesOrigin,
    supersedes_request_id:supersedesRequestId,
    canonical_name_en:String(entry?.canonical_name_en || "").trim(),
    preferred_name_ko:String(entry?.preferred_name_ko || "").trim(),
    source
  });
}

function validateScienceTarget(item, { source, batchIds }) {
  const personId = String(item?.person_id || "").trim().toLowerCase();
  if (!UUID_RE.test(personId)) fail(`Invalid science-target Person UUID in ${source}: ${personId}`);
  const targetDomain = String(item?.target_domain || "").trim().toLowerCase();
  const storedDomain = String(item?.stored_domain || "").trim().toLowerCase();
  if (targetDomain !== "science") fail(`Science review target_domain must be science in ${source}: ${personId}`);
  if (storedDomain !== "knowledge") fail(`Science review stored_domain must remain knowledge before cutover in ${source}: ${personId}`);
  const assignmentSource = String(item?.current_assignment_source || "").trim();
  if (!assignmentSource) fail(`Science review requires current_assignment_source in ${source}: ${personId}`);
  const assignmentOrigin = item?.current_assignment_origin == null
    ? null
    : String(item.current_assignment_origin).trim().toLowerCase();
  const assignmentRequestId = item?.current_assignment_request_id == null
    ? null
    : String(item.current_assignment_request_id).trim();
  const prior = batchIds.get(personId);
  if (prior) {
    if (prior.representative_domain !== "knowledge") {
      fail(`Science review latest numbered assignment is not knowledge in ${source}: ${personId}`, prior);
    }
    if (assignmentSource !== prior.source) {
      fail(`Science review must cite latest numbered assignment in ${source}: ${personId}`, { expected:prior.source, actual:assignmentSource });
    }
    if (assignmentOrigin != null || assignmentRequestId != null) {
      fail(`Science review with numbered assignment must not cite Human Authoring origin in ${source}: ${personId}`);
    }
  } else {
    if (assignmentOrigin !== "human_authoring" || !assignmentRequestId) {
      fail(`Science review without numbered assignment requires verified Human Authoring origin in ${source}: ${personId}`);
    }
    try {
      validateHumanAuthoringOrigin({
        root:ROOT,
        entry:{
          person_id:personId,
          canonical_name_en:String(item?.canonical_name_en || "").trim(),
          preferred_name_ko:String(item?.preferred_name_ko || "").trim(),
          representative_domain:"science",
          previous_representative_domain:"knowledge",
          supersedes_origin:"human_authoring",
          supersedes_source:assignmentSource,
          supersedes_request_id:assignmentRequestId
        }
      });
    } catch (error) {
      fail(`Invalid science-review Human Authoring provenance for ${personId}: ${String(error?.message || error)}`);
    }
  }
  return Object.freeze({
    person_id:personId,
    target_domain:"science",
    stored_domain:"knowledge",
    current_assignment_source:assignmentSource,
    current_assignment_origin:assignmentOrigin,
    current_assignment_request_id:assignmentRequestId,
    canonical_name_en:String(item?.canonical_name_en || "").trim(),
    preferred_name_ko:String(item?.preferred_name_ko || "").trim(),
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
  const repairFiles = discoverRepairBatches();
  const holdFiles = discoverContiguous("hold");

  const batch = [];
  const batchIds = new Map();
  const rawByBatch = new Map();
  for (const name of [...batchFiles, ...repairFiles]) {
    const raw = readJson(name);
    rawByBatch.set(name, raw);
    for (const item of raw.entries) {
      const entry = validateEntry(item, { source:name });
      const prior = batchIds.get(entry.person_id);
      if (prior) {
        const validCorrection = entry.previous_representative_domain === prior.representative_domain
          && entry.supersedes_source === prior.source
          && entry.supersedes_origin == null
          && entry.supersedes_request_id == null;
        if (!validCorrection) fail(`Duplicate reviewed batch Person without explicit supersede chain: ${entry.person_id}`, { prior, current:entry });
      } else if (entry.previous_representative_domain != null || entry.supersedes_source != null) {
        if (entry.supersedes_origin !== "human_authoring") {
          fail(`Reviewed domain correction has no prior batch assignment or approved Human Authoring origin: ${entry.person_id}`, entry);
        }
        try {
          validateHumanAuthoringOrigin({ root:ROOT, entry });
        } catch (error) {
          fail(`Invalid Human Authoring correction provenance for ${entry.person_id}: ${String(error?.message || error)}`, entry);
        }
      }
      batchIds.set(entry.person_id, entry);
      batch.push(entry);
    }
  }

  const scienceTargets = [];
  const scienceTargetIds = new Set();
  for (const name of [...batchFiles, ...repairFiles]) {
    const raw = rawByBatch.get(name);
    const items = Array.isArray(raw?.science_targets) ? raw.science_targets : [];
    for (const item of items) {
      const target = validateScienceTarget(item, { source:name, batchIds });
      if (scienceTargetIds.has(target.person_id)) {
        fail(`Duplicate reviewed science target: ${target.person_id}`);
      }
      scienceTargetIds.add(target.person_id);
      scienceTargets.push(target);
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
    if (scienceTargetIds.has(personId)) fail(`HOLD Person appears in reviewed science-target set: ${personId}`);
  }

  const assignments = new Map();
  for (const entry of [...smoke, ...batch]) {
    if (holdIds.has(entry.person_id)) fail(`HOLD Person appears in write set: ${entry.person_id}`);
    const prior = assignments.get(entry.person_id);
    if (prior && prior.representative_domain !== entry.representative_domain) {
      const validCorrection = entry.previous_representative_domain === prior.representative_domain
        && entry.supersedes_source === prior.source;
      if (!validCorrection) {
        fail(`Conflicting representative_domain for ${entry.person_id}`, { prior, current:entry });
      }
      assignments.set(entry.person_id, entry);
    } else if (!prior) {
      assignments.set(entry.person_id, entry);
    }
  }

  return Object.freeze({ smoke, batch, scienceTargets, hold, assignments, batchFiles, repairFiles, holdFiles });
}

function selectBatchFile(plan, target) {
  const name = String(target || "").trim();
  const standard = /^batch-\d{3}\.json$/.test(name);
  const repair = /^batch-repair-\d{3}\.json$/.test(name);
  if ((!standard && !repair) || path.basename(name) !== name) {
    fail(`Bounded batch mode requires an exact batch-NNN.json or batch-repair-NNN.json basename: ${name || "<empty>"}`);
  }
  const allowed = standard ? plan.batchFiles.includes(name) : plan.repairFiles.includes(name);
  if (!allowed) fail(`Reviewed batch manifest is not in the canonical plan: ${name}`);
  const entries = plan.batch.filter((entry) => entry.source === name);
  const scienceTargets = plan.scienceTargets.filter((entry) => entry.source === name);
  if (entries.length === 0 && scienceTargets.length === 0) {
    fail(`Reviewed batch manifest has no writable entries or science-review dispositions: ${name}`);
  }
  return Object.freeze({ name, entries:Object.freeze(entries), scienceTargets:Object.freeze(scienceTargets) });
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
  const conflicts = [];
  const pending = [];
  for (const entry of entries) {
    const hasCurrent = current.has(entry.person_id);
    const actual = hasCurrent ? current.get(entry.person_id) : null;
    if (actual === entry.representative_domain) continue;
    if (entry.previous_representative_domain != null) {
      if (actual === entry.previous_representative_domain) {
        pending.push(entry);
        continue;
      }
      conflicts.push({
        person_id:entry.person_id,
        expected:entry.representative_domain,
        expected_previous:entry.previous_representative_domain,
        actual
      });
      continue;
    }
    if (!hasCurrent) {
      pending.push(entry);
      continue;
    }
    conflicts.push({ person_id:entry.person_id, expected:entry.representative_domain, actual });
  }
  if (conflicts.length) fail("Reviewed Person domain conflicts with live Production; re-review required", conflicts);
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

function verifyScienceTargets(body, scienceTargets) {
  const current = currentDomainMap(body);
  for (const target of scienceTargets) {
    const actual = current.get(target.person_id) || null;
    if (actual !== "knowledge") {
      fail(`Reviewed science target must remain stored as knowledge before cutover: ${target.person_id}`, { actual });
    }
  }
  return scienceTargets.length;
}

function verifyExpected(body, expectedEntries, holdEntries, scienceTargets = []) {
  const current = currentDomainMap(body);
  for (const entry of expectedEntries) {
    if (current.get(entry.person_id) !== entry.representative_domain) {
      fail(`Production read-back mismatch for ${entry.person_id}`, { expected:entry.representative_domain, actual:current.get(entry.person_id) || null });
    }
  }
  for (const entry of holdEntries) {
    if (current.has(entry.person_id)) fail(`HOLD Person must remain unclassified: ${entry.person_id}`, { actual:current.get(entry.person_id) });
  }
  const verifiedScienceTargets = verifyScienceTargets(body, scienceTargets);
  return Object.freeze({
    production_assigned:Number(body.assigned),
    verified_assignments:expectedEntries.length,
    verified_science_targets:verifiedScienceTargets,
    hold_unclassified:holdEntries.length,
    counts:body.counts
  });
}

const plan = loadPlan();
if (!["smoke","batch","file","verify"].includes(MODE)) fail(`Unsupported mode: ${MODE}`);

if (MODE === "smoke") {
  await applyOnlyChanged(plan.smoke, MODE);
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, plan.smoke, plan.hold) }, null, 2));
} else if (MODE === "batch") {
  await applyOnlyChanged([...plan.assignments.values()], MODE);
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, [...plan.assignments.values()], plan.hold, plan.scienceTargets) }, null, 2));
} else if (MODE === "file") {
  const selected = selectBatchFile(plan, TARGET);
  await applyOnlyChanged(selected.entries, `${MODE}:${selected.name}`);
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, source:selected.name, ...verifyExpected(body, selected.entries, [], selected.scienceTargets) }, null, 2));
} else {
  const body = await readCurrent();
  console.log(JSON.stringify({ marker:"ATLAS_PERSON_DOMAIN_APPLY_V1", mode:MODE, ...verifyExpected(body, [...plan.assignments.values()], plan.hold) }, null, 2));
}
