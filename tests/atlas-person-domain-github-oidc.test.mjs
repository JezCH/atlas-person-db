import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { authorizePersonDomainPost }=require("../server/atlas-person-domain-handler.js");
const root=path.resolve(new URL("..",import.meta.url).pathname);

test("normal Person Domain writes no longer accept retired batch OIDC",async()=>{
  const auth=await authorizePersonDomainPost({req:{method:"POST",headers:{authorization:"Bearer github-oidc-token"}},env:{}});
  assert.equal(auth.authorized,false);
  assert.equal(auth.mode,"auth_not_configured");
  const handler=fs.readFileSync(path.join(root,"server/atlas-person-domain-handler.js"),"utf8");
  assert.doesNotMatch(handler,/verifyPersonDomainGithubOidc|workflow_sha|github_oidc/);
});
test("completed Person Domain cutover OIDC and workflow stay retired",()=>{
  assert.equal(fs.existsSync(path.join(root,"server/atlas-person-domain-v2-cutover-github-oidc.js")),false);
  assert.equal(fs.existsSync(path.join(root,"server/atlas-person-domain-v2-cutover-handler.js")),false);
  assert.equal(fs.existsSync(path.join(root,".github/workflows/atlas-person-domain-v2-cutover.yml")),false);
  const verify=fs.readFileSync(path.join(root,".github/workflows/atlas-person-domain-verify.yml"),"utf8");
  assert.doesNotMatch(verify,/id-token:\s*write|atlas-person-domain-v2-cutover/);
});
