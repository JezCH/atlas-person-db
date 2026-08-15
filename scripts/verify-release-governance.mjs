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
const stage2SchemaWorkflowPath = path.join(root, ".github", "workflows", "atlas-stage2-schema-release.yml");

for (const file of [
  releasePath,
  requirementsPath,
  vercelPath,
  ignoreScriptPath,
  correctionWorkflowPath,
  authoringWorkflowPath,
  auditWorkflowPath,
  stage2SchemaWorkflowPath
]) {
  if (!fs.existsSync(file)) fail(`required file missing: ${path.relative(root, file)}`);
}

const release = fs.readFileSync(releasePath, "utf8");
const requirements = JSON.parse(fs.readFileSync(requirementsPath, "utf8"));
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
const correctionWorkflow = fs.readFileSync(correctionWorkflowPath, "utf8");
const authoringWorkflow = fs.readFileSync(authoringWorkflowPath, "utf8");
const auditWorkflow = fs.readFileSync(auditWorkflowPath, "utf8");
const stage2SchemaWorkflow = fs.readFileSync(stage2SchemaWorkflowPath, "utf8");

const byId = new Map((requirements.requirements || []).map((item) => [item.id, item]));
for (const id of ["ATLAS-RQ-0013", "ATLAS-NO-0013"]) {
  if (!byId.has(id)) fail(`mandatory release requirement missing: ${id}`);
  if (byId.get(id).status !== "ACTIVE") fail(`${id} must stay ACTIVE`);
}

const expectedIgnore = "node scripts/vercel-ignore-build.mjs";
if (vercel.ignoreCommand !== expectedIgnore) {
  fail(`Vercel ignoreCommand drifted; expected ${expectedIgnore}`);
}
if (vercel.git?.deploymentEnabled?.["agent/*"] !== false) {
  fail("Vercel agent/* Git previews must remain disabled so branch churn cannot consume Production deployment quota");
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
  "api/atlas-stage2-schema-release.js",
  "server/atlas-correction-apply-handler.js",
  "server/atlas-stage2-schema-release-handler.js",
  "db/migrations/example.sql",
  "corrections/requests/r0.json",
  "corrections/intents/r1.json",
  ".github/workflows/atlas-correction-apply.yml",
  ".github/workflows/atlas-audit-inventory.yml",
  ".github/workflows/atlas-authoring-apply.yml",
  ".github/workflows/atlas-stage2-schema-release.yml",
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

if (!/workflow_dispatch\s*:/m.test(stage2SchemaWorkflow)) fail("Stage 2 schema release must require workflow_dispatch");
if (/^\s*push\s*:/m.test(stage2SchemaWorkflow) || /\bpull_request\s*:/m.test(stage2SchemaWorkflow)) {
  fail("Stage 2 schema release must never auto-run on push or pull_request");
}
if (!/environment:\s*production/m.test(stage2SchemaWorkflow)) fail("Stage 2 schema release must use the production environment");
if (!/id-token:\s*write/m.test(stage2SchemaWorkflow)) fail("Stage 2 schema release requires dedicated OIDC");
if (!/APPLY:\$\{REQUESTED_RELEASE_ID\}/m.test(stage2SchemaWorkflow)) fail("Stage 2 schema release must require explicit typed approval");
if (!/refs\/heads\/main/m.test(stage2SchemaWorkflow)) fail("Stage 2 schema release must fail closed outside main");
if (!/preflight/m.test(stage2SchemaWorkflow) || !/call_release apply/m.test(stage2SchemaWorkflow)) {
  fail("Stage 2 schema release must run live preflight before apply");
}

const requiredReleaseClauses = [
  "A merge to `main` is treated as a scarce Production-deployment event.",
  "Production Train 1 — Current-schema cleanup",
  "Production Train 2 — Stage 2 transition",
  "at least two Production deployments are structurally unavoidable",
  "minimum deployments consistent with correct live-data dependency ordering",
  "Any unknown path, missing previous successful deployment SHA, unavailable shallow-clone commit, or failed diff **builds rather than skips**.",
  "Mixed commits build if even one changed path is deployment-relevant.",
  "Stage 2 additive schema release is never triggered automatically"
];
for (const clause of requiredReleaseClauses) {
  if (!release.includes(clause)) fail(`release policy clause missing: ${clause}`);
}

console.log(JSON.stringify({
  marker: "ATLAS_RELEASE_GOVERNANCE_OK",
  vercel_agent_branch_previews_disabled: true,
  vercel_non_production_builds_skipped: true,
  vercel_production_builds_relevance_gated: true,
  vercel_unknown_state_fails_open_to_build: true,
  production_workflows_main_scoped: true,
  stage2_schema_release_manual_dispatch_only: true,
  stage2_schema_release_explicit_typed_approval: true,
  stage2_schema_release_live_preflight_required: true,
  exact_sha_operation_inputs_force_build: true,
  minimum_pre_stage2_dependency_deployments: 2,
  release_requirements: ["ATLAS-RQ-0013", "ATLAS-NO-0013"]
}, null, 2));
