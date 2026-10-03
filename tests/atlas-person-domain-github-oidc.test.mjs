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
test("final cutover OIDC is isolated to its dedicated workflow",()=>{
  const cutover=fs.readFileSync(path.join(root,"server/atlas-person-domain-v2-cutover-github-oidc.js"),"utf8");
  assert.match(cutover,/atlas-person-domain-v2-cutover/);
  assert.match(cutover,/atlas-person-domain-v2-cutover\.yml/);
  assert.doesNotMatch(cutover,/atlas-person-domain-apply\.yml/);
});
