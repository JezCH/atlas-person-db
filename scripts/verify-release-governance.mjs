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
const requirementsPath = path.join(root, "requirements", "atlas-requirements.v1.json");
const vercelPath = path.join(root, "vercel.json");
const ignoreScriptPath = path.join(root, "scripts", "vercel-ignore-build.mjs");
const correctionWorkflowPath = path.join(root, ".github", "workflows", "atlas-correction-apply.yml");
const authoringWorkflowPath = path.join(root, ".github", "workflows", "atlas-authoring-apply.yml");
const auditWorkflowPath = path.join(root, ".github", "workflows", "atlas-audit-inventory.yml");

for (const file of [
  releasePath,
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
  "A merge to `main` is treated as a scarce Production-deployment event.",
  "Production Train 1 — Current-schema cleanup",
  "Production Train 2 — Stage 2 transition",
  "at least two Production deployments are structurally unavoidable",
  "minimum deployments consistent with correct live-data dependency ordering",
  "Any unknown path, missing previous successful deployment SHA, unavailable shallow-clone commit, or failed diff **builds rather than skips**.",
  "Mixed commits build if even one changed path is deployment-relevant."
];
for (const clause of requiredReleaseClauses) {
  if (!release.includes(clause)) fail(`release policy clause missing: ${clause}`);
}

console.log(JSON.stringify({
  marker: "ATLAS_RELEASE_GOVERNANCE_OK",
  vercel_non_production_builds_skipped: true,
  vercel_production_builds_relevance_gated: true,
  vercel_unknown_state_fails_open_to_build: true,
  production_workflows_main_scoped: true,
  exact_sha_operation_inputs_force_build: true,
  minimum_pre_stage2_dependency_deployments: 2,
  release_requirements: ["ATLAS-RQ-0013", "ATLAS-NO-0013"]
}, null, 2));
