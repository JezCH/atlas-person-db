import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {extractPatchComment, validateEnvelope, validatePlan, applyPlan, TASK_ID, PATCH_MARKER} from "../scripts/atlas-codex-patch-relay.mjs";

const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const after = s => Buffer.from(s).toString("base64");
function plan(src = "export const n = 1;\n", tst = "import test from 'node:test';\n") {
  return {
    version: 1, task_id: TASK_ID, base_sha: "a".repeat(40),
    files:[
      {path:"scripts/example.mjs", before_sha256:sha(src), after_base64:after("export const n = 2;\n")},
      {path:"tests/example.test.mjs", before_sha256:sha(tst), after_base64:after("import test from 'node:test';\ntest('ok', () => {});\n")}
    ]
  };
}
function eventOf(payload, author = "chatgpt-codex-connector[bot]") {
  return {
    action:"created", repository:{full_name:"JezCH/atlas-person-db"},
    issue:{number:2560, pull_request:{url:"https://api.github.com/"}},
    comment:{id:123456, user:{login:author, type:"Bot", id:199175422},
      body:PATCH_MARKER + "\n" + JSON.stringify(payload) + "\nEND-" + PATCH_MARKER}
  };
}
function tempRepo() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(), "atlas-relay-"));
  fs.mkdirSync(path.join(root,"scripts"));
  fs.mkdirSync(path.join(root,"tests"));
  fs.writeFileSync(path.join(root,"scripts/example.mjs"),"export const n = 1;\n");
  fs.writeFileSync(path.join(root,"tests/example.test.mjs"),"import test from 'node:test';\n");
  return root;
}
test("valid GitHub Codex bot comment carries a strict one-shot two-file bundle", () => {
  const p=plan();
  assert.deepEqual(validateEnvelope(eventOf(p)),p);
  assert.deepEqual(validatePlan(extractPatchComment(eventOf(p).comment.body)),p);
});
test("reject spoofed senders, other repositories, wrong PRs, edited actions and malformed comments", () => {
  const samples=[
    (() => {const e=eventOf(plan(),"JezCH"); return e;})(),
    (() => {const e=eventOf(plan()); e.comment.user.id=7; return e;})(),
    (() => {const e=eventOf(plan()); e.repository.full_name="fork/repo"; return e;})(),
    (() => {const e=eventOf(plan()); e.issue.number=2443; return e;})(),
    (() => {const e=eventOf(plan()); e.issue.pull_request=null; return e;})(),
    (() => {const e=eventOf(plan()); e.action="edited"; return e;})(),
    (() => {const e=eventOf(plan()); e.comment.body=PATCH_MARKER+" corrupted"; return e;})()
  ];
  for(const e of samples)assert.throws(()=>validateEnvelope(e),/ATLAS_PATCH_REJECTED/);
});
test("reject unauthorized paths, dangerous semantics, schema drift and oversized payloads", () => {
  const invalid=[
    ".github/workflows/evil.yml","scripts/../api/index.mjs","scripts/evil\\file.mjs",
    "api/atlas-authoring.mjs","scripts/apply-data.mjs","scripts/atlas-codex-self.mjs",
    "/scripts/evil.mjs","scripts/.hidden.mjs","scripts/script.sh"
  ];
  for(const name of invalid) {
    const p=plan();p.files[0].path=name;
    assert.throws(()=>validatePlan(p),/ATLAS_PATCH_REJECTED/,name);
  }
  for(const field of ["task_id","base_sha","version"]) {
    const p=plan();p[field]="invalid";
    assert.throws(()=>validatePlan(p),/ATLAS_PATCH_REJECTED/,field);
  }
  const p=plan();p.files[1].path="scripts/test.mjs";
  assert.throws(()=>validatePlan(p),/ATLAS_PATCH_REJECTED/);
  const q=plan();q.files[0].after_base64=after("x".repeat(24001));
  assert.throws(()=>validatePlan(q),/ATLAS_PATCH_REJECTED/);
});
test("apply both replacements atomically after verifying hashes; wrong hash changes neither", () => {
  const root=tempRepo();
  try {
    const p=plan();
    const out=applyPlan(p,root,{skipGitCheck:true});
    assert.deepEqual(out.changed_paths,["scripts/example.mjs","tests/example.test.mjs"]);
    assert.equal(fs.readFileSync(path.join(root,"scripts/example.mjs"),"utf8"),"export const n = 2;\n");
  } finally {fs.rmSync(root,{recursive:true,force:true});}
  const other=tempRepo();
  try {
    const p=plan();p.files[1].before_sha256="b".repeat(64);
    assert.throws(()=>applyPlan(p,other,{skipGitCheck:true}),/stale original file/);
    assert.equal(fs.readFileSync(path.join(other,"scripts/example.mjs"),"utf8"),"export const n = 1;\n");
  } finally {fs.rmSync(other,{recursive:true,force:true});}
});
test("reject symbolic links and unchanged source before any writes", () => {
  const root=tempRepo();
  try {
    fs.unlinkSync(path.join(root,"scripts/example.mjs"));
    fs.symlinkSync(path.join(root,"tests/example.test.mjs"),path.join(root,"scripts/example.mjs"));
    assert.throws(()=>applyPlan(plan(),root,{skipGitCheck:true}),/missing or symlink source/);
    const other=plan();other.files[0].after_base64=after("export const n = 1;\n");
    assert.throws(()=>applyPlan(other,root,{skipGitCheck:true}),/missing or symlink source/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test("accept one embedded payload with the connector's View task footer; reject ambiguity", () => {
  const e=eventOf(plan());
  e.comment.body="## Codex Cloud patch report\n\n"+e.comment.body+"\n\n[View task →](https://chatgpt.com/s/example)";
  assert.deepEqual(validateEnvelope(e),plan());
  e.comment.body+="\n"+PATCH_MARKER+"\n{}\nEND-"+PATCH_MARKER;
  assert.throws(()=>validateEnvelope(e),/unique complete markers required/);
});
