import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "requirements", "atlas-requirements.v1.json");
const documentPath = path.join(root, "ATLAS_REQUIREMENTS.md");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const document = fs.readFileSync(documentPath, "utf8");

const fail = (message) => {
  throw new Error(`ATLAS_REQUIREMENTS_INVALID: ${message}`);
};

if (registry.schema !== "atlas-requirements/v1") fail(`unexpected schema ${registry.schema}`);
if (registry.version !== 1) fail(`unexpected version ${registry.version}`);
if (registry.finalized !== true) fail("registry must be finalized");
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(registry.as_of || ""))) fail("as_of must be YYYY-MM-DD");

const expectedRoadmap = Array.from({ length: 15 }, (_, index) => `P${index}`);
if (JSON.stringify(registry.roadmap) !== JSON.stringify(expectedRoadmap)) {
  fail(`roadmap drift: expected ${expectedRoadmap.join(",")}, got ${(registry.roadmap || []).join(",")}`);
}

const allowedStatuses = new Set(["ACTIVE", "COMPLETED", "PENDING", "SUPERSEDED"]);
if (!Array.isArray(registry.requirements) || registry.requirements.length === 0) fail("requirements must be non-empty");

const byId = new Map();
for (const requirement of registry.requirements) {
  const id = String(requirement.id || "");
  if (!/^ATLAS-(RQ|NO)-\d{4}$/.test(id)) fail(`invalid requirement id ${id}`);
  if (byId.has(id)) fail(`duplicate requirement id ${id}`);
  byId.set(id, requirement);
  if (!allowedStatuses.has(requirement.status)) fail(`${id} has invalid status ${requirement.status}`);
  if (!String(requirement.title || "").trim()) fail(`${id} requires title`);
  if (!document.includes(id)) fail(`${id} is missing from ATLAS_REQUIREMENTS.md`);

  if (requirement.status === "PENDING" && !expectedRoadmap.includes(requirement.phase)) {
    fail(`${id} pending requirement must bind to P0..P14`);
  }
  if (requirement.status === "COMPLETED") {
    if (!Array.isArray(requirement.evidence_paths) || requirement.evidence_paths.length === 0) {
      fail(`${id} completed requirement requires evidence_paths`);
    }
    for (const evidencePath of requirement.evidence_paths) {
      if (!fs.existsSync(path.join(root, evidencePath))) fail(`${id} evidence path missing: ${evidencePath}`);
    }
  }
  if (requirement.status === "SUPERSEDED" && (!Array.isArray(requirement.superseded_by) || requirement.superseded_by.length === 0)) {
    fail(`${id} superseded requirement requires superseded_by`);
  }
}

for (const requirement of registry.requirements) {
  for (const replacementId of requirement.superseded_by || []) {
    const replacement = byId.get(replacementId);
    if (!replacement) fail(`${requirement.id} references missing replacement ${replacementId}`);
    if (replacement.status === "SUPERSEDED") fail(`${requirement.id} points to superseded replacement ${replacementId}`);
  }
}

const mandatoryIds = [
  "ATLAS-RQ-0001", "ATLAS-RQ-0002", "ATLAS-RQ-0003", "ATLAS-RQ-0004", "ATLAS-RQ-0005", "ATLAS-RQ-0006",
  "ATLAS-RQ-0010", "ATLAS-RQ-0011", "ATLAS-RQ-0201", "ATLAS-RQ-0202", "ATLAS-RQ-0203", "ATLAS-RQ-0206",
  "ATLAS-RQ-0207", "ATLAS-RQ-0215", "ATLAS-RQ-0218", "ATLAS-RQ-0219", "ATLAS-RQ-0220", "ATLAS-RQ-0221",
  "ATLAS-RQ-0222", "ATLAS-RQ-0223", "ATLAS-RQ-0224", "ATLAS-NO-0001", "ATLAS-NO-0002", "ATLAS-NO-0004",
  "ATLAS-NO-0005", "ATLAS-NO-0006", "ATLAS-NO-0007", "ATLAS-NO-0011"
];
for (const id of mandatoryIds) if (!byId.has(id)) fail(`mandatory requirement missing: ${id}`);

if (!document.includes("100% traceable") || !document.includes("0 known contradictions") || !document.includes("unknown stays unknown")) {
  fail("human-readable completion principles drifted");
}

const statusCounts = Object.fromEntries([...allowedStatuses].map((status) => [status, registry.requirements.filter((item) => item.status === status).length]));
console.log(JSON.stringify({
  schema: registry.schema,
  as_of: registry.as_of,
  requirements: registry.requirements.length,
  status_counts: statusCounts,
  roadmap_phases: registry.roadmap.length,
  mandatory_ids_verified: mandatoryIds.length,
  finalized: true
}, null, 2));
