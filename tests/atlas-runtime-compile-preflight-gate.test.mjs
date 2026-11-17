import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workflow = readFileSync(new URL("../.github/workflows/atlas-runtime-compile.yml", import.meta.url), "utf8");

test("read-only Authoring preflight cannot trigger a Runtime publication", () => {
  assert.match(workflow, /id: readonly_preflight/);
  assert.match(workflow, /ATLAS_PRODUCER_NAME.*workflow_run\.name/);
  assert.match(workflow, /ATLAS_PRODUCER_EVENT.*workflow_run\.event/);
  assert.match(workflow, /ATLAS_PRODUCER_SHA.*workflow_run\.head_sha/);
  assert.match(workflow, /git diff-tree.*\.github\/atlas-authoring-preflight\.txt/);
  assert.match(workflow, /\^preflight\[\[:space:\]\]\+\(authoring\/requests\//);
  assert.match(workflow, /echo "skip=\$skip" >> "\$GITHUB_OUTPUT"/);
  for (const name of [
    "Resolve compatible deployed Runtime",
    "Compile and atomically publish Runtime projection",
    "Verify active publication and explicit dispositions"
  ]) {
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const step = new RegExp("- name: " + safe + "\\n        if: steps\\.readonly_preflight\\.outputs\\.skip != 'true'");
    assert.match(workflow, step);
  }
});

test("only exact main push preflight producer may suppress compile", () => {
  for (const source of [
    'ATLAS_TRIGGER_EVENT: ${{ github.event_name }}',
    'ATLAS_PRODUCER_NAME: ${{ github.event.workflow_run.name }}',
    'ATLAS_PRODUCER_EVENT: ${{ github.event.workflow_run.event }}',
    'ATLAS_PRODUCER_SHA: ${{ github.event.workflow_run.head_sha }}'
  ]) assert.ok(workflow.includes(source));
  assert.match(workflow, /"\$\{ATLAS_PRODUCER_NAME\}" == "ATLAS Authoring Apply"/);
  assert.match(workflow, /"\$\{ATLAS_PRODUCER_EVENT\}" == "push"/);
  assert.match(workflow, /git cat-file -e/);
});


test("actual Runtime gate accepts distinct read-only batch but not apply or mixed controls", () => {
  const section = workflow.split("- name: Detect read-only Authoring preflight producer")[1].split("- name: Resolve compatible deployed Runtime")[0];
  const script = section.split("run: |\n")[1].trimEnd().split("\n").map(line => line.replace(/^ {10}/, "")).join("\n");
  const dir = mkdtempSync(join(tmpdir(), "atlas-preflight-gate-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding:"utf8", stdio:["ignore","pipe","pipe"] }).trim();
  try {
    git("init","-q"); git("config","user.email","test@example.test"); git("config","user.name","Atlas Test");
    mkdirSync(join(dir,".github"));
    const selector = join(dir,".github","atlas-authoring-preflight.txt");
    writeFileSync(selector,"initial\n"); git("add","."); git("commit","-qm","initial");
    for (const [value, expected] of [
      ["preflight authoring/requests/a.json\n","true"],
      ["preflight authoring/requests/a.json\npreflight authoring/requests/b.json\n","true"],
      ["apply authoring/requests/a.json\npreflight authoring/requests/b.json\n","false"],
      ["preflight authoring/requests/a.json\npreflight authoring/requests/a.json\n","false"],
      [Array.from({length:6},(_,i)=>"preflight authoring/requests/p"+i+".json").join("\n")+"\n","false"]
    ]) {
      writeFileSync(selector,value); git("add",".github"); git("commit","-qm","selector");
      const sha=git("rev-parse","HEAD"), output=join(dir,"output");
      writeFileSync(output,"");
      execFileSync("bash",["-c",script],{cwd:dir,env:{...process.env,ATLAS_TRIGGER_EVENT:"workflow_run",ATLAS_PRODUCER_NAME:"ATLAS Authoring Apply",ATLAS_PRODUCER_EVENT:"push",ATLAS_PRODUCER_SHA:sha,GITHUB_OUTPUT:output},stdio:"pipe"});
      assert.equal(readFileSync(output,"utf8").trim(),"skip="+expected);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
