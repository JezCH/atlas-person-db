import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fail = (message) => {
  throw new Error(`ATLAS_RELEASE_GOVERNANCE_INVALID: ${message}`);
};

const releasePath = path.join(root, "RELEASE_GOVERNANCE.md");
const requirementsPath = path.join(root, "requirements", "atlas-requirements.v1.json");
const vercelPath = path.join(root, "vercel.json");
const correctionWorkflowPath = path.join(root, ".github", "workflows", "atlas-correction-apply.yml");
const authoringWorkflowPath = path.join(root, ".github", "workflows", "atlas-authoring-apply.yml");

for (const file of [releasePath, requirementsPath, vercelPath, correctionWorkflowPath, authoringWorkflowPath]) {
  if (!fs.existsSync(file)) fail(`required file missing: ${path.relative(root, file)}`);
}

const release = fs.readFileSync(releasePath, "utf8");
const requirements = JSON.parse(fs.readFileSync(requirementsPath, "utf8"));
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
const correctionWorkflow = fs.readFileSync(correctionWorkflowPath, "utf8");
const authoringWorkflow = fs.readFileSync(authoringWorkflowPath, "utf8");

const byId = new Map((requirements.requirements || []).map((item) => [item.id, item]));
for (const id of ["ATLAS-RQ-0013", "ATLAS-NO-0013"]) {
  if (!byId.has(id)) fail(`mandatory release requirement missing: ${id}`);
  if (byId.get(id).status !== "ACTIVE") fail(`${id} must stay ACTIVE`);
}

const expectedIgnore = 'test "$VERCEL_ENV" != "production"';
if (vercel.ignoreCommand !== expectedIgnore) {
  fail(`Vercel ignoreCommand drifted; expected ${expectedIgnore}`);
}

for (const [name, workflow] of [["correction", correctionWorkflow], ["authoring", authoringWorkflow]]) {
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
  "minimum deployments consistent with correct live-data dependency ordering"
];
for (const clause of requiredReleaseClauses) {
  if (!release.includes(clause)) fail(`release policy clause missing: ${clause}`);
}

if (!release.includes('ignoreCommand = test "$VERCEL_ENV" != "production"')) {
  fail("release policy must document the branch/Preview skip contract");
}

console.log(JSON.stringify({
  marker: "ATLAS_RELEASE_GOVERNANCE_OK",
  vercel_non_production_builds_skipped: true,
  production_workflows_main_scoped: true,
  minimum_pre_stage2_dependency_deployments: 2,
  release_requirements: ["ATLAS-RQ-0013", "ATLAS-NO-0013"]
}, null, 2));
