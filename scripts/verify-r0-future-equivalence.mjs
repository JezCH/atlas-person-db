import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest, MANIFEST_V1 } = require("../server/atlas-correction-manifest-service.js");

const root = process.cwd();
const manifestPath = path.join(root, "corrections", "requests", "stage2-r0-true-activity-duplicates.json");
const equivalencePath = path.join(root, "corrections", "evidence", "stage2-r0-future-semantic-equivalence.json");
const gateDocPath = path.join(root, "docs", "audits", "STAGE2_R0_FUTURE_SEMANTIC_EQUIVALENCE_GATE_2026-08-12.md");

const fail = (message) => {
  throw new Error(`ATLAS_R0_FUTURE_EQUIVALENCE_INVALID: ${message}`);
};

for (const file of [manifestPath, equivalencePath, gateDocPath]) {
  if (!fs.existsSync(file)) fail(`required file missing: ${path.relative(root, file)}`);
}

const manifestRaw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifest = requireManifest(manifestRaw);
const equivalence = JSON.parse(fs.readFileSync(equivalencePath, "utf8"));
const gateDoc = fs.readFileSync(gateDocPath, "utf8");

if (manifestRaw.schema !== MANIFEST_V1) fail("R0 correction must stay on correction v1 coalesce-only contract");
if (manifestRaw.evidence?.future_semantic_equivalence !== "corrections/evidence/stage2-r0-future-semantic-equivalence.json") {
  fail("R0 manifest must bind the reviewed future-semantic evidence file");
}
if (equivalence.schema !== "atlas-r0-future-semantic-equivalence/v1") fail(`unexpected evidence schema ${equivalence.schema}`);
if (equivalence.review_status !== "approved") fail("future semantic equivalence must be explicitly approved");
if (!Array.isArray(equivalence.pairs) || equivalence.pairs.length !== 6) fail("exactly six R0 equivalence pairs are required");
if (manifest.operations.length !== 6) fail("exactly six R0 correction operations are required");

const key = (keep, drop) => `${String(keep).toLowerCase()}|${String(drop).toLowerCase()}`;
const manifestPairs = new Map();
for (const operation of manifest.operations) {
  if (operation.type !== "coalesce_relationship") fail(`R0 operation must be coalesce_relationship, got ${operation.type}`);
  const pairKey = key(operation.keep_relationship_id, operation.drop_relationship_id);
  if (manifestPairs.has(pairKey)) fail(`duplicate manifest pair ${pairKey}`);
  manifestPairs.set(pairKey, operation);
}

const evidencePairs = new Map();
for (const pair of equivalence.pairs) {
  const pairKey = key(pair.keep_relationship_id, pair.drop_relationship_id);
  if (evidencePairs.has(pairKey)) fail(`duplicate equivalence pair ${pairKey}`);
  evidencePairs.set(pairKey, pair);

  if (!manifestPairs.has(pairKey)) fail(`equivalence pair not present in R0 manifest: ${pairKey}`);
  if (pair.relation_audit_keep !== pair.relation_audit_drop) fail(`${pair.person}: keep/drop Relation audit differs`);
  if (pair.relation_hint_conflict !== false) fail(`${pair.person}: relation hint conflict is not closed`);
  if (pair.governance_context_equivalent !== true) fail(`${pair.person}: Governance Context equivalence is not closed`);
  if (pair.full_temporal_boundary_equivalent !== true) fail(`${pair.person}: full temporal boundary equivalence is not closed`);
  if (pair.future_semantic_equivalent !== true) fail(`${pair.person}: future semantic equivalence is not approved`);
}

for (const pairKey of manifestPairs.keys()) {
  if (!evidencePairs.has(pairKey)) fail(`R0 manifest pair lacks future-equivalence evidence: ${pairKey}`);
}

const expectedEvidence = {
  normalized_inventory_artifact_id: "9104264546",
  normalized_inventory_digest: "sha256:ac1d91800412c2d79921b6ed791e6c82f94d125fc4203568f2cad4ddf5db3eb3",
  stage2_relation_audit_artifact_id: "9121986912",
  stage2_relation_audit_digest: "sha256:10469efe8d82900348de8c95a3b58286374303714a798708841c824ffb1322e7"
};
for (const [field, expected] of Object.entries(expectedEvidence)) {
  if (equivalence.basis?.[field] !== expected) fail(`evidence provenance drift for ${field}`);
}

for (const id of [...manifestPairs.values()].flatMap((op) => [op.keep_relationship_id, op.drop_relationship_id])) {
  if (!gateDoc.includes(id)) fail(`gate document missing R0 relationship UUID ${id}`);
}
if (!gateDoc.includes("pairwise semantically equivalent")) fail("gate document lost the reviewed conclusion");

console.log(JSON.stringify({
  marker: "ATLAS_R0_FUTURE_EQUIVALENCE_OK",
  manifest_schema: manifestRaw.schema,
  pairs: manifestPairs.size,
  normalized_inventory_artifact: equivalence.basis.normalized_inventory_artifact_id,
  stage2_relation_audit_artifact: equivalence.basis.stage2_relation_audit_artifact_id,
  future_semantic_equivalence: true
}, null, 2));
