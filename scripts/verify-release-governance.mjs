import fs from "node:fs";
import path from "node:path";
import {
  isSafeToSkipPath,
  shouldBuildForChangedPaths
} from "./vercel-ignore-build.mjs";

const root = process.cwd();
const fail = (message) => {
  throw new Error(`ATLAS_RELEASE_GOVERNANCE_INVALID: ${message}`);
};

const releasePath = path.join(root, "RELEASE_GOVERNANCE.md");
const executionPath = path.join(root, "WORK_EXECUTION.md");
const requirementsPath = path.join(root, "requirements", "atlas-requirements.v1.json");
const vercelPath = path.join(root, "vercel.json");
const ignoreScriptPath = path.join(root, "scripts", "vercel-ignore-build.mjs");
const correctionWorkflowPath = path.join(root, ".github", "workflows", "atlas-correction-apply.yml");
const authoringWorkflowPath = path.join(root, ".github", "workflows", "atlas-authoring-apply.yml");
const auditWorkflowPath = path.join(root, ".github", "workflows", "atlas-audit-inventory.yml");

for (const file of [
  releasePath,
  executionPath,
  requirementsPath,
  vercelPath,
  ignoreScriptPath,
  correctionWorkflowPath,
  authoringWorkflowPath,
  auditWorkflowPath
]) {
  if (!fs.existsSync(file)) fail(`required file missing: ${path.relative(root, file)}`);
}

const release = fs.readFileSync(releasePath, "utf8");
const execution = fs.readFileSync(executionPath, "utf8");
const requirements = JSON.parse(fs.readFileSync(requirementsPath, "utf8"));
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
const correctionWorkflow = fs.readFileSync(correctionWorkflowPath, "utf8");
const authoringWorkflow = fs.readFileSync(authoringWorkflowPath, "utf8");
const auditWorkflow = fs.readFileSync(auditWorkflowPath, "utf8");

const byId = new Map((requirements.requirements || []).map((item) => [item.id, item]));
for (const id of ["ATLAS-RQ-0013", "ATLAS-NO-0013"]) {
  if (!byId.has(id)) fail(`mandatory release requirement missing: ${id}`);
  if (byId.get(id).status !== "ACTIVE") fail(`${id} must stay ACTIVE`);
}

const expectedIgnore = "node scripts/vercel-ignore-build.mjs";
if (vercel.ignoreCommand !== expectedIgnore) {
  fail(`Vercel ignoreCommand drifted; expected ${expectedIgnore}`);
}
const deploymentEnabled = vercel.git?.deploymentEnabled;
if (deploymentEnabled?.main !== true || deploymentEnabled?.["**"] !== false) {
  fail("Vercel Git deployments must be main-only; all non-main branch deployments must remain disabled by the catch-all minimatch rule");
}

const safeSkipExamples = [
  "README.md",
  "docs/research/evidence.md",
  "requirements/atlas-requirements.v1.json",
  "tests/vercel-ignore-build.test.mjs",
  "corrections/evidence/reviewed.json",
  ".github/workflows/atlas-integrity.yml"
];
if (shouldBuildForChangedPaths(safeSkipExamples)) {
  fail("documentation/research/test-only change set must remain safely skippable");
}

const mustBuildExamples = [
  "api/atlas-correction-apply.js",
  "server/atlas-correction-apply-handler.js",
  "db/migrations/example.sql",
  "corrections/requests/r0.json",
  "corrections/intents/r1.json",
  ".github/workflows/atlas-correction-apply.yml",
  ".github/workflows/atlas-audit-inventory.yml",
  ".github/workflows/atlas-authoring-apply.yml",
  "vercel.json"
];
for (const file of mustBuildExamples) {
  if (isSafeToSkipPath(file) || !shouldBuildForChangedPaths([file])) {
    fail(`deployment-relevant path must force a build: ${file}`);
  }
}
if (!shouldBuildForChangedPaths(["docs/research/evidence.md", "server/atlas-correction-apply-handler.js"])) {
  fail("mixed change set must build when any deployment-relevant path exists");
}

const retiredStage2LiveTransportPaths = [
  "api/atlas-stage2-schema-release.js",
  "api/atlas-stage2-train2-release.js",
  "server/atlas-stage2-schema-release-handler.js",
  "server/atlas-stage2-schema-release-github-oidc.js",
  "server/atlas-stage2-train2-release-handler.js",
  "server/atlas-stage2-train2-github-oidc.js",
  ".github/workflows/atlas-stage2-schema-release.yml",
  ".github/workflows/atlas-stage2-train2-release.yml"
];
for (const relativePath of retiredStage2LiveTransportPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    fail(`completed Stage2 live transport must stay retired: ${relativePath}`);
  }
}
for (const route of [
  "api/atlas-stage2-schema-release.js",
  "api/atlas-stage2-train2-release.js"
]) {
  if (Object.prototype.hasOwnProperty.call(vercel.functions || {}, route)) {
    fail(`retired Stage2 route must not consume a Vercel function slot: ${route}`);
  }
}

for (const [name, workflow] of [
  ["correction", correctionWorkflow],
  ["authoring", authoringWorkflow],
  ["audit", auditWorkflow]
]) {
  if (!/push:\s*\n\s*branches:\s*\n\s*- main/m.test(workflow)) {
    fail(`${name} Production workflow must be main-push scoped`);
  }
  if (/\bpull_request\s*:/m.test(workflow)) {
    fail(`${name} Production workflow must not run on pull_request`);
  }
}

const requiredReleaseClauses = [
  "Release controls must be proportional to the actual risk of the change.",
  "Do not convert every merge or data write into a Production release train.",
  "Class 1 — ordinary content/data write through an unchanged compatible writer",
  "Do not add a second manual deployment/SHA proof beyond what the canonical writer already enforces.",
  "A newer `main` does not invalidate completed review automatically.",
  "One microbatch does not imply one PR, deployment, apply run, or read-back.",
  "Release ownership is resource-scoped.",
  "The former Stage 2 / Train 1 / Train 2 procedures are retained in Git history as evidence of that migration era.",
  "Completed migration-era release transports must not remain deployed as live Production endpoints or dispatch workflows solely to preserve history."
];
for (const clause of requiredReleaseClauses) {
  if (!release.includes(clause)) fail(`lean release policy clause missing: ${clause}`);
}

const requiredExecutionClauses = [
  "A new worker MUST NOT reconstruct the whole project before continuing a known task.",
  "Queue only at a real shared-write boundary",
  "The project does not have one global NONCORE writer.",
  "Delta-only integration",
  "Microbatch review, superbatch release",
  "Persistent tests and CI gates must verify durable invariants, not point-in-time project snapshots.",
  "Completion verification happens once",
  "full historical fold is exceptional recovery work, not normal bootstrap"
];
for (const clause of requiredExecutionClauses) {
  if (!execution.includes(clause)) fail(`lean execution policy clause missing: ${clause}`);
}

console.log(JSON.stringify({
  marker: "ATLAS_RELEASE_GOVERNANCE_OK",
  lean_execution_protocol: true,
  resource_scoped_concurrency: true,
  delta_only_integration: true,
  microbatch_review_superbatch_release: true,
  invariant_based_validation: true,
  duplicate_release_ceremony_forbidden: true,
  canonical_writer_security_preserved: true,
  vercel_non_main_branch_deployments_disabled: true,
  vercel_non_production_builds_skipped: true,
  vercel_production_builds_relevance_gated: true,
  production_workflows_main_scoped: true,
  historical_stage2_live_transport_retired: true,
  release_requirements: ["ATLAS-RQ-0013", "ATLAS-NO-0013"]
}, null, 2));
