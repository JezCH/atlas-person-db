import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const json=(p)=>JSON.parse(read(p));
const require=createRequire(import.meta.url);
const {
  CONTRACT_SCHEMA,
  EVIDENCE_SCHEMA,
  P13_REQUIREMENT_ID,
  validateContract,
  productionGateResult,
  evaluateAcceptance,
  assertGeneratedPass
}=require("../server/atlas-core-final-acceptance.js");

const contract=json("contracts/core-final-acceptance-contract.v2.json");
const historical=json("data/core/core-v2-final-acceptance.v1.json");
const requirements=json("requirements/atlas-requirements.v1.json");
const workflow=read(".github/workflows/atlas-core-final-acceptance.yml");
const runner=read("scripts/run-core-final-acceptance.mjs");

const SHA="0123456789abcdef0123456789abcdef01234567";

function passingCommandResults() {
  return contract.gates
    .filter((gate)=>gate.kind==="command")
    .map((gate)=>({
      id:gate.id,
      kind:"command",
      status:"PASS",
      command:gate.command,
      exit_code:0,
      log_path:`artifacts/core-final-acceptance/logs/${gate.id}.log`,
      log_sha256:"a".repeat(64),
      failures:[]
    }));
}

function productionResponse(sha=SHA) {
  return {
    ok:true,
    marker:"ATLAS_AUTHORING_TRANSPORT_V2",
    transport_version:2,
    runtime_sha:sha,
    ready:true,
    bootstrap_ready:true,
    readiness:{ready:true}
  };
}

test("final acceptance contract stores topology only, never a result",()=>{
  assert.equal(contract.schema,CONTRACT_SCHEMA);
  assert.equal(contract.version,2);
  assert.equal(contract.core_version,"v2");
  const validated=validateContract(contract);
  assert.equal(validated.gate_ids.length,9);
  assert.ok(validated.gate_ids.includes("complete_current_test_suite"));
  assert.ok(validated.gate_ids.includes("human_authoring_operational_parity"));
  assert.ok(validated.gate_ids.includes("canonical_data_readiness"));
  assert.ok(validated.gate_ids.includes("production_exact_sha_readiness"));
  assert.ok(validated.invariant_ids.includes("obsolete_core_execution_code_zero"));
  assert.ok(validated.invariant_ids.includes("spatial_materialization_db_backed_pass"));
  assert.ok(validated.invariant_ids.includes("place_identity_uuid_authority_pass"));
  assert.ok(validated.invariant_ids.includes("unknown_temporal_transport_pass"));

  for(const gate of contract.gates) assert.equal(Object.hasOwn(gate,"status"),false,gate.id);
  for(const invariant of contract.invariants) assert.equal(Object.hasOwn(invariant,"status"),false,invariant.id);

  const invalid=structuredClone(contract);
  invalid.gates[0].status="PASS";
  assert.throws(()=>validateContract(invalid),/STORED_GATE_STATUS_FORBIDDEN/);
});

test("historical v1 PASS artifact cannot act as current closure authority",()=>{
  assert.equal(historical.schema,"atlas-core-final-acceptance/v1");
  assert.equal(historical.status,"PASS");
  assert.equal(historical.current_closure_authority,false);
  assert.match(historical.superseded_by,/core-final-acceptance-contract\.v2\.json/);
  assert.ok(historical.notes.some((note)=>/historical evidence only/i.test(note)));
});

test("Production readiness gate requires exact deployed SHA and all readiness read-backs",()=>{
  const pass=productionGateResult({
    response:productionResponse(),
    expectedSha:SHA,
    endpoint:contract.production_endpoint
  });
  assert.equal(pass.status,"PASS");
  assert.equal(pass.evidence.runtime_sha,SHA);

  const mismatch=productionGateResult({
    response:productionResponse("f".repeat(40)),
    expectedSha:SHA,
    endpoint:contract.production_endpoint
  });
  assert.equal(mismatch.status,"FAIL");
  assert.ok(mismatch.failures.includes("PRODUCTION_RUNTIME_SHA_MISMATCH"));

  const notReady=productionGateResult({
    response:{...productionResponse(),bootstrap_ready:false,readiness:{ready:false}},
    expectedSha:SHA,
    endpoint:contract.production_endpoint
  });
  assert.equal(notReady.status,"FAIL");
  assert.ok(notReady.failures.includes("PRODUCTION_BOOTSTRAP_NOT_READY"));
  assert.ok(notReady.failures.includes("PRODUCTION_READINESS_READBACK_NOT_READY"));
});

test("generated acceptance cannot PASS when any executable gate fails",()=>{
  const results=passingCommandResults();
  results[0]={...results[0],status:"FAIL",exit_code:1,failures:["COMMAND_EXIT_1"]};
  const report=evaluateAcceptance({
    contract,
    commitSha:SHA,
    gateResults:results,
    productionResponse:productionResponse(),
    generatedAt:"2026-10-02T00:00:00Z",
    workflow:{repository:"JezCH/atlas-person-db",run_id:"1",run_attempt:"1"}
  });
  assert.equal(report.schema,EVIDENCE_SCHEMA);
  assert.equal(report.status,"FAIL");
  assert.ok(report.failures.gate_ids.includes(contract.gates[0].id));
  assert.ok(report.failures.invariant_ids.length>0);
  assert.throws(()=>assertGeneratedPass(report),/CORE_FINAL_ACCEPTANCE_FAILED/);
});

test("generated acceptance cannot PASS against a different Production SHA",()=>{
  const report=evaluateAcceptance({
    contract,
    commitSha:SHA,
    gateResults:passingCommandResults(),
    productionResponse:productionResponse("f".repeat(40)),
    generatedAt:"2026-10-02T00:00:00Z"
  });
  assert.equal(report.status,"FAIL");
  assert.ok(report.failures.gate_ids.includes("production_exact_sha_readiness"));
  assert.throws(()=>assertGeneratedPass(report),/CORE_FINAL_ACCEPTANCE_FAILED/);
});

test("generated acceptance PASS is derived only from all executable gates plus exact Production readiness",()=>{
  const report=evaluateAcceptance({
    contract,
    commitSha:SHA,
    gateResults:passingCommandResults(),
    productionResponse:productionResponse(),
    generatedAt:"2026-10-02T00:00:00Z",
    workflow:{repository:"JezCH/atlas-person-db",run_id:"123",run_attempt:"2"}
  });
  assert.equal(report.schema,EVIDENCE_SCHEMA);
  assert.equal(report.requirement_id,P13_REQUIREMENT_ID);
  assert.equal(report.requirement_id,"ATLAS-RQ-0223");
  assert.equal(report.generated,true);
  assert.equal(report.status,"PASS");
  assert.equal(report.commit_sha,SHA);
  assert.equal(report.production.runtime_sha,SHA);
  assert.deepEqual(report.failures,{gate_ids:[],invariant_ids:[]});
  assert.ok(report.gates.every((gate)=>gate.status==="PASS"));
  assert.ok(report.criteria.every((criterion)=>criterion.status==="PASS"));
  assert.equal(assertGeneratedPass(report),true);
});

test("runner executes every command gate and hashes durable logs before evaluating status",()=>{
  assert.match(runner,/spawnSync\("bash",\["-lc",gate\.command\]/);
  assert.match(runner,/fs\.writeFileSync\(path\.join\(root,relativeLogPath\),combined\)/);
  assert.match(runner,/log_sha256:sha256Text\(combined\)/);
  assert.match(runner,/evaluateAcceptance\(/);
  assert.match(runner,/assertGeneratedPass\(report\)/);
  assert.doesNotMatch(runner,/status\s*:\s*["']PASS["']/);
});

test("main workflow waits for exact Production SHA, generates evidence, uploads it, and posts commit status",()=>{
  assert.match(workflow,/push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow,/runtime_sha == \$sha/);
  assert.match(workflow,/\.ready == true/);
  assert.match(workflow,/\.bootstrap_ready == true/);
  assert.match(workflow,/\.readiness\.ready == true/);
  assert.match(workflow,/node scripts\/run-core-final-acceptance\.mjs/);
  assert.match(workflow,/actions\/upload-artifact@v4/);
  assert.match(workflow,/ATLAS CORE Final Acceptance/);
  assert.match(workflow,/statuses: write/);
  assert.match(workflow,/core-final-acceptance-contract\.v2\.json/);
  assert.match(workflow,/\$\{\{ github\.token \}\}/);
  assert.match(workflow,/\$\{\{ steps\.generated\.outcome \}\}/);
  assert.doesNotMatch(workflow,/\\\$\{\{/);
  assert.doesNotMatch(workflow,/\\\$\{GITHUB_/);
});

test("P13 lifecycle requirement is completed only with generated acceptance authority and recorded Production proof",()=>{
  const item=requirements.requirements.find((entry)=>entry.id===P13_REQUIREMENT_ID);
  assert.ok(item);
  assert.equal(item.status,"COMPLETED");
  for(const evidence of [
    "contracts/core-final-acceptance-contract.v2.json",
    "server/atlas-core-final-acceptance.js",
    "scripts/run-core-final-acceptance.mjs",
    ".github/workflows/atlas-core-final-acceptance.yml",
    "tests/core-final-acceptance.test.mjs"
  ]) assert.ok(item.evidence_paths.includes(evidence),evidence);

  const closure=read("docs/core/CORE_V2_FINAL_ACCEPTANCE.md");
  assert.match(closure,/0ed0f0de849972ebda1eab618ce6112f5d5cb135/);
  assert.match(closure,/36960727475/);
  assert.match(closure,/11207792140/);
  assert.match(closure,/dpl_GbgrFxDR32VLH7z6sjga6MxrbEb9/);
  assert.match(closure,/9 \/ 9 PASS/);
  assert.match(closure,/26 \/ 26 PASS/);
});
