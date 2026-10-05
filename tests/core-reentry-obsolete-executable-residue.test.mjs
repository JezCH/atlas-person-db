import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const require=createRequire(import.meta.url);

test("obsolete Activity create/update/import planner and writer paths are absent",()=>{
  assert.equal(fs.existsSync(path.join(root,"atlas-v2-command-planner.js")),false);
  assert.equal(fs.existsSync(path.join(root,"tests/atlas-v2-command-planner.test.mjs")),false);

  const p9=read("server/atlas-p9-mutation-planner.js");
  assert.doesNotMatch(p9,/atlas-v2-command-planner/);
  assert.match(p9,/RETIRED_ACTIVITY_WRITE_OPERATIONS/);
  assert.match(p9,/DELETE_PERSON_POLITICS_V2_BY_ID/);

  const tx=read("server/atlas-postgres-v2-authoritative-transaction.js");
  assert.doesNotMatch(tx,/insert\s+into\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(tx,/update\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(tx,/operation\s*===\s*["']import["']/);
  assert.doesNotMatch(tx,/resolvePayload|createOne|updateOne/);
  assert.match(tx,/delete\s+from\s+atlas_v2\.person_politics_v2/i);
});

test("retired Activity mutations are blocked before planner or transaction execution",async()=>{
  const {
    createV2AuthoritativeMutationService,
    RETIRED_ACTIVITY_WRITE_CODE
  }=require("../server/atlas-v2-authoritative-mutation-service.js");

  let plannerCalls=0;
  let transactionCalls=0;
  const service=createV2AuthoritativeMutationService({
    planner:{plan(){plannerCalls+=1;return {blockers:[],normalized_payload:{}};}},
    transactionFactory:async()=>{transactionCalls+=1;throw new Error("must not execute");}
  });

  for(const operation of ["create","update","import","reconcile"]){
    const result=await service.mutate({operation,payload:{}});
    assert.equal(result.committed,false);
    assert.equal(result.validation_failures[0]?.code,RETIRED_ACTIVITY_WRITE_CODE);
  }
  assert.equal(plannerCalls,0);
  assert.equal(transactionCalls,0);
});

test("public mutation transport no longer accepts retired Activity write operations",()=>{
  const {validateRequest,ALLOWED_OPERATIONS}=require("../server/atlas-mutation-transport.js");
  for(const operation of ["create","update","import","reconcile"]){
    assert.equal(ALLOWED_OPERATIONS.has(operation),false);
    assert.equal(validateRequest({operation,payload:{}}).valid,false);
  }
  assert.equal(ALLOWED_OPERATIONS.has("delete"),true);
});

test("legacy authoring manifests are replay-only and cannot re-enter the retired Activity writer",()=>{
  const legacy=read("server/atlas-authoring-manifest-service.js");
  assert.doesNotMatch(legacy,/createV2AuthoritativeTx|executeV2Authoritative|createPerson\(|createPolity\(|createRole\(/);
  assert.match(legacy,/AUTHORING_LEGACY_MANIFEST_NEW_WRITE_RETIRED_USE_NATIVE_V2/);

  const dispatch=read("server/atlas-authoring-manifest-dispatch-service.js");
  assert.match(dispatch,/AUTHORING_MANIFEST_V1_NEW_WRITE_RETIRED/);
  assert.match(dispatch,/createNativeAuthoringManifestV2Service/);
});

test("operational launchers do not reference removed scripts",()=>{
  const pkg=JSON.parse(read("package.json"));
  assert.equal(Object.prototype.hasOwnProperty.call(pkg.scripts,"portrait:backfill-history"),false);

  const workflow=read(".github/workflows/atlas-audit-inventory.yml");
  for(const retired of [
    "scripts/build-person-necessity-audit-export.mjs",
    "scripts/build-p9-completeness-repair-plan.mjs"
  ]) assert.equal(workflow.includes(retired),false);
});


test("closed one-shot production mutation surfaces stay retired",()=>{
  for(const retired of [
    ".github/workflows/atlas-namuwiki-link.yml",
    ".github/workflows/atlas-person-domain-v2-cutover.yml",
    ".github/workflows/atlas-place-authority-backfill.yml",
    "scripts/parse-namuwiki-command.mjs",
    "server/atlas-namuwiki-link-github-oidc.js",
    "server/atlas-namuwiki-link-handler.js",
    "server/atlas-person-domain-v2-cutover-github-oidc.js",
    "server/atlas-person-domain-v2-cutover-handler.js",
    "server/atlas-person-domain-v2-cutover-service.js",
    "server/atlas-polity-place-function-authority-backfill.js",
    "tests/atlas-namuwiki-batch-command.test.mjs",
    "tests/atlas-namuwiki-link-automation.test.mjs",
    "tests/atlas-namuwiki-link-workflow-contract.test.mjs",
    "tests/atlas-person-domain-v2-cutover.test.mjs"
  ]) assert.equal(fs.existsSync(path.join(root,retired)),false,retired);

  const vercel=JSON.parse(read("vercel.json"));
  assert.equal(vercel.rewrites.some((row)=>row.source==="/api/atlas-namuwiki-link"),false);
  assert.equal(vercel.rewrites.some((row)=>row.source==="/api/atlas-person-domain-v2-cutover"),false);

  const authoring=read("api/atlas-authoring.js");
  assert.doesNotMatch(authoring,/namuwiki-link|createNamuWikiLinkHandler/);

  const mutate=read("api/atlas-mutate.js");
  assert.doesNotMatch(mutate,/person-domain-v2-cutover|createPersonDomainV2CutoverHandler/);

  const apply=read("server/atlas-authoring-apply-handler.js");
  assert.doesNotMatch(apply,/backfill_polity_place_function_authority|OPERATION_PLACE_AUTHORITY_BACKFILL|applyPolityPlaceFunctionAuthorityBackfill/);

  const bootstrap=read(".github/workflows/atlas-authoring-schema-bootstrap.yml");
  assert.doesNotMatch(bootstrap,/PERSON_DOMAIN_V2_CUTOVER_ENDPOINT|atlas-person-domain-v2-cutover/);

  const domainVerify=read(".github/workflows/atlas-person-domain-apply.yml");
  assert.doesNotMatch(domainVerify,/ATLAS_CUTOVER_ENDPOINT|atlas-person-domain-v2-cutover/);
});
