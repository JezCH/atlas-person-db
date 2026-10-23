import test from "node:test";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  isSafeToSkipPath,
  isAgentCapabilityOnly,
  isAuthoringDataOnly,
  isSafeForDeployedAuthoringRuntimePath,
  requiresAuthoringRuntimeDeployment,
  shouldBuildForChangedPaths
} from "../scripts/vercel-ignore-build.mjs";

test("agent-only GitHub development integration never consumes a Vercel build", () => {
  const integration = [
    "AGENTS.md",
    "agent-memory/lessons.v1.json",
    "skills/atlas-code-intelligence/SKILL.md",
    "skills/atlas-experience-reuse/SKILL.md",
    "skills/atlas-polity-identity/SKILL.md",
    "scripts/atlas-agent-context.mjs",
    "scripts/atlas-agent-experience.mjs",
    "scripts/atlas-agent-lesson-harvest.mjs",
    "scripts/atlas-agent-dependency-map.mjs",
    "scripts/atlas-agent-lesson-suggest.mjs",
    "scripts/atlas-autonomous-loop-bridge.mjs",
    "scripts/atlas-autonomous-outcome-journal.mjs",
    "scripts/atlas-autonomous-outcome.mjs",
    "config/atlas-autonomous-loop.v1.json",
    "scripts/atlas-codex-task-runner.mjs",
    "scripts/vercel-ignore-build.mjs",
    "tests/atlas-agent-context.test.mjs",
    "tests/atlas-agent-experience.test.mjs",
    "tests/atlas-agent-lesson-harvest.test.mjs",
    "tests/atlas-codex-task-runner.test.mjs",
    "tests/vercel-ignore-build.test.mjs",
    ".github/workflows/atlas-agent-lesson-harvest.yml"
  ];
  assert.equal(isAgentCapabilityOnly(integration), true);
  assert.equal(isAgentCapabilityOnly(["scripts/vercel-ignore-build.mjs"]), false);
  assert.equal(isAgentCapabilityOnly([...integration, "server/atlas-authoring-service.js"]), false);
  assert.equal(isAgentCapabilityOnly(["scripts/atlas-agent-context.mjs", "index.html"]), false);
  assert.equal(isAgentCapabilityOnly(["scripts/atlas-agent-context.mjs", "vercel.json"]), false);
  assert.equal(isAgentCapabilityOnly(["scripts/atlas-agent-context.mjs", "scripts/unreviewed-agent-tool.mjs"]), false);
});

test("documentation, research evidence, reviewed authoring data and integrity-only changes are safe to skip", () => {
  for (const file of [
    "README.md",
    "ATLAS_REQUIREMENTS.md",
    "docs/audits/example.md",
    "requirements/atlas-requirements.v1.json",
    "tests/atlas-correction-transport.test.mjs",
    "corrections/evidence/reviewed.json",
    "research/sengoku/notes.json",
    "migration/phase-8/reports/evidence.json",
    "authoring/requests/new-person.json",
    ".github/workflows/atlas-integrity.yml"
  ]) {
    assert.equal(isSafeToSkipPath(file), true, file);
  }
  assert.equal(shouldBuildForChangedPaths([
    "README.md",
    "docs/audits/example.md",
    "tests/atlas-correction-transport.test.mjs",
    "authoring/requests/new-person.json"
  ]), false);
});

test("runtime, schema and deployable release-operation changes always build", () => {
  for (const file of [
    "api/atlas-correction-apply.js",
    "server/atlas-correction-apply-handler.js",
    "server/atlas-authoring-apply-handler.js",
    "server/atlas-authoring-readiness.js",
    "db/migrations/20260812_correction_manifest_v1_1.sql",
    "app.js",
    "admin.html",
    "styles.css",
    "package.json",
    "package-lock.json",
    "vercel.json",
    "corrections/requests/stage2-r0-true-activity-duplicates.json",
    "corrections/intents/stage2-r1-muhammad-pre622-medina.json",
    "non-timeline-persons.json",
    "migration/phase-8/scripts/live-operation.mjs"
  ]) {
    assert.equal(isSafeToSkipPath(file), false, file);
    assert.equal(shouldBuildForChangedPaths([file]), true, file);
  }
});

test("Workflow-only changes never consume a Vercel deploy; runtime edits still do", () => {
  const workflows = [
    ".github/workflows/atlas-correction-apply.yml",
    ".github/workflows/atlas-audit-inventory.yml",
    ".github/workflows/atlas-authoring-apply.yml",
    ".github/workflows/atlas-place-production-authority-audit.yml",
    ".github/workflows/atlas-core-final-acceptance.yml"
  ];
  for (const path of workflows) assert.equal(isSafeToSkipPath(path), true, path);
  assert.equal(shouldBuildForChangedPaths(workflows), false);
  assert.equal(shouldBuildForChangedPaths([...workflows,"server/atlas-read-http.js"]), true);
});

test("authoring runtime compatibility allows only proven non-authoring drift", () => {
  const safe = [
    ".github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml",
    "authoring/requests/new-person.json",
    "scripts/rehearse-p10-person-duplicate-v2-revalidation.mjs",
    "tests/p10-person-duplicate-v2-revalidation.test.mjs",
    "server/atlas-duplicate-detector.js",
    "server/atlas-duplicate-review-service.js",
    "non-timeline-persons.json"
  ];
  for (const file of safe) assert.equal(isSafeForDeployedAuthoringRuntimePath(file), true, file);
  assert.equal(requiresAuthoringRuntimeDeployment(safe), false);
});

test("authoring runtime compatibility remains fail-closed for its actual dependency surface", () => {
  for (const file of [
    "api/atlas-authoring.js",
    "api/atlas-authoring-apply.js",
    "server/atlas-human-authoring-handler.js",
    "server/atlas-human-authoring-service.js",
    "server/atlas-authoring-apply-handler.js",
    "server/atlas-authoring-readiness.js",
    "server/atlas-postgres-client.js",
    "server/atlas-stage2-native-activity-service.js",
    "server/atlas-activity-semantic-key-v2.js",
    "db/migrations/20260812_stage2_schema.sql",
    "package.json",
    "package-lock.json",
    "vercel.json"
  ]) {
    assert.equal(isSafeForDeployedAuthoringRuntimePath(file), false, file);
    assert.equal(requiresAuthoringRuntimeDeployment([file]), true, file);
  }
});

test("ATLAS Authoring Apply keeps Vercel build policy strict while using its narrower compatibility boundary", () => {
  const before = process.env.GITHUB_WORKFLOW;
  try {
    process.env.GITHUB_WORKFLOW = "ATLAS Authoring Apply";
    assert.equal(shouldBuildForChangedPaths([
      "server/atlas-duplicate-detector.js",
      "server/atlas-duplicate-review-service.js",
      "scripts/rehearse-p10-person-duplicate-v2-revalidation.mjs",
      "authoring/requests/new-person.json"
    ]), false);
    assert.equal(shouldBuildForChangedPaths(["server/atlas-human-authoring-service.js"]), true);
  } finally {
    if (before == null) delete process.env.GITHUB_WORKFLOW;
    else process.env.GITHUB_WORKFLOW = before;
  }

  assert.equal(shouldBuildForChangedPaths(["server/atlas-duplicate-detector.js"]), true);
});

test("one deployment-relevant path makes a mixed commit build", () => {
  assert.equal(shouldBuildForChangedPaths([
    "authoring/requests/new-person.json",
    "docs/research/sengoku.md",
    "server/atlas-authoring-apply-handler.js"
  ]), true);
  assert.equal(isAuthoringDataOnly([
    "authoring/requests/new-person.json",
    "server/atlas-authoring-apply-handler.js"
  ]), false);
});

test("authoring request commits alone can be proven as data-only fast-skip commits", () => {
  const paths = [
    "authoring/requests/person-a.json",
    "authoring/requests/person-b.json"
  ];
  assert.equal(isAuthoringDataOnly(paths), true);
  assert.equal(shouldBuildForChangedPaths(paths), false);
  assert.equal(isAuthoringDataOnly(["authoring/README.md"]), false);
  assert.equal(isAuthoringDataOnly([]), false);
});

test("empty diff does not request a build", () => {
  assert.equal(shouldBuildForChangedPaths([]), false);
  assert.equal(shouldBuildForChangedPaths(["", "./"]), false);
});

test("leading whitespace in real Git paths cannot disguise unsafe files as approved prefixes", () => {
  for (const path of [
    " docs/runtime.js",
    " .github/workflows/unsafe.yml",
    "\tdocs/audit.js",
    " ./docs/runtime.js"
  ]) {
    assert.equal(isSafeToSkipPath(path), false, path);
    assert.equal(isSafeForDeployedAuthoringRuntimePath(path), false, path);
    assert.equal(shouldBuildForChangedPaths([path]), true, path);
  }
  assert.equal(isSafeToSkipPath("docs/runtime.js"), true);
  assert.equal(isSafeToSkipPath(".github/workflows/atlas-integrity.yml"), true);
});


const VERCEL_IGNORE_CLI = fileURLToPath(new URL("../scripts/vercel-ignore-build.mjs", import.meta.url));
function gitFixture(changedFiles, {previousMissing=false, workflow=""}={}) {
  const root=mkdtempSync(join(tmpdir(),"atlas-vercel-cli-"));
  const gitEnv={...process.env,GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"};
  const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8",env:gitEnv}).trim();
  try {
    git("init","-q");
    git("-c","user.name=ATLAS Test","-c","user.email=atlas@example.invalid",
      "commit","-q","--allow-empty","-m","baseline");
    const previous=git("rev-parse","HEAD");
    for(const [name,body] of Object.entries(changedFiles)) {
      const file=join(root,name);
      mkdirSync(dirname(file),{recursive:true});
      writeFileSync(file,body);
    }
    git("add","-A");
    git("-c","user.name=ATLAS Test","-c","user.email=atlas@example.invalid",
      "commit","-q","-m","tracked path regression");
    const current=git("rev-parse","HEAD");
    const result=spawnSync(process.execPath,[VERCEL_IGNORE_CLI],{
      cwd:root,encoding:"utf8",
      env:{...gitEnv,VERCEL_ENV:"production",VERCEL_GIT_COMMIT_SHA:current,
        VERCEL_GIT_PREVIOUS_SHA:previousMissing?"":previous,GITHUB_WORKFLOW:workflow}
    });
    assert.equal(result.error,undefined);
    return result;
  } finally { rmSync(root,{recursive:true,force:true}); }
}
test("real Git CLI preserves a leading-space unsafe path and BUILDs",()=>{
  const v=gitFixture({" docs/runtime.js":"unsafe"});
  assert.equal(v.status,1,v.stdout+"\n"+v.stderr);
  assert.match(v.stdout,/BUILD: deployment-relevant change detected/);
  assert.match(v.stdout,/  docs\/runtime\.js/);
});
test("unsafe leading-space authoring path cannot use current-commit data-only fast skip",()=>{
  const v=gitFixture({" authoring/requests/person.json":"{}"},{previousMissing:true});
  assert.equal(v.status,1,v.stdout);
  assert.doesNotMatch(v.stdout,/SKIP: current commit contains only reviewed runtime-safe data/);
});
test("trailing-whitespace Git path and whitespace-prefixed Markdown fail closed",()=>{
  for(const name of ["docs/readme.md "," docs/readme.md"]) {
    const v=gitFixture({[name]:"doc"});
    assert.equal(v.status,1,name+": "+v.stdout);
  }
});
test("Git filename with newline/quote/control bytes forces build rather than truncated names",()=>{
  const v=gitFixture({'docs/quoted"\ncontrol.md':"doc"});
  assert.equal(v.status,1,v.stdout);
  assert.match(v.stdout,/BUILD/);
});
test("ordinary docs and workflow-only commit still skips",()=>{
  const v=gitFixture({"docs/readme.md":"doc",".github/workflows/check.yml":"name: check"});
  assert.equal(v.status,0,v.stdout);
  assert.match(v.stdout,/SKIP: only non-deployable files changed/);
});
test("reviewed runtime-data-only commit still skips without previous Production SHA",()=>{
  const v=gitFixture({"authoring/requests/person.json":"{}"},{previousMissing:true});
  assert.equal(v.status,0,v.stdout);
  assert.match(v.stdout,/SKIP: current commit contains only reviewed runtime-safe data/);
});
test("mixed docs plus runtime code requires build",()=>{
  const v=gitFixture({"docs/readme.md":"doc","server/runtime.js":"code"});
  assert.equal(v.status,1,v.stdout);
  assert.match(v.stdout,/BUILD: deployment-relevant change detected/);
});
test("missing previous Production SHA still fails to build on non-data-only changes",()=>{
  const v=gitFixture({"docs/readme.md":"doc"},{previousMissing:true});
  assert.equal(v.status,1,v.stdout);
  assert.match(v.stdout,/BUILD: previous successful Production SHA unavailable/);
});
test("unusual literal whitespace is not an approved direct-helper path",()=>{
  for(const name of [" docs/readme.md"," docs/runtime.js","docs/readme.md ","\tdocs/readme.md"]){
    assert.equal(isSafeToSkipPath(name),false,name);
    assert.equal(isSafeForDeployedAuthoringRuntimePath(name),false,name);
    assert.equal(shouldBuildForChangedPaths([name]),true,name);
  }
});
