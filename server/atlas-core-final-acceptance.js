"use strict";

const crypto = require("node:crypto");

const CONTRACT_SCHEMA = "atlas-core-final-acceptance-contract/v2";
const EVIDENCE_SCHEMA = "atlas-core-final-acceptance-evidence/v2";
const P13_REQUIREMENT_ID = "ATLAS-RQ-0223";
const SHA_RE = /^[0-9a-f]{40}$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeSha(value) {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA_RE.test(sha)) throw new Error("CORE_FINAL_ACCEPTANCE_COMMIT_SHA_REQUIRED");
  return sha;
}

function validateContract(contract) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) throw new Error("CORE_FINAL_ACCEPTANCE_CONTRACT_OBJECT_REQUIRED");
  if (contract.schema !== CONTRACT_SCHEMA) throw new Error("CORE_FINAL_ACCEPTANCE_CONTRACT_SCHEMA_INVALID");
  if (Number(contract.version) !== 2) throw new Error("CORE_FINAL_ACCEPTANCE_CONTRACT_VERSION_INVALID");
  if (contract.core_version !== "v2") throw new Error("CORE_FINAL_ACCEPTANCE_CORE_VERSION_INVALID");
  if (!Array.isArray(contract.gates) || contract.gates.length === 0) throw new Error("CORE_FINAL_ACCEPTANCE_GATES_REQUIRED");
  if (!Array.isArray(contract.invariants) || contract.invariants.length === 0) throw new Error("CORE_FINAL_ACCEPTANCE_INVARIANTS_REQUIRED");

  const gateIds = new Set();
  let productionGateCount = 0;
  for (const gate of contract.gates) {
    const id = String(gate?.id || "").trim();
    if (!id || gateIds.has(id)) throw new Error("CORE_FINAL_ACCEPTANCE_GATE_ID_INVALID");
    gateIds.add(id);
    if (Object.prototype.hasOwnProperty.call(gate, "status")) throw new Error(`CORE_FINAL_ACCEPTANCE_STORED_GATE_STATUS_FORBIDDEN:${id}`);
    if (gate.kind === "command") {
      if (!String(gate.command || "").trim()) throw new Error(`CORE_FINAL_ACCEPTANCE_GATE_COMMAND_REQUIRED:${id}`);
    } else if (gate.kind === "production_readiness") {
      productionGateCount += 1;
      if (gate.command != null) throw new Error(`CORE_FINAL_ACCEPTANCE_PRODUCTION_GATE_COMMAND_FORBIDDEN:${id}`);
    } else {
      throw new Error(`CORE_FINAL_ACCEPTANCE_GATE_KIND_INVALID:${id}`);
    }
  }
  if (productionGateCount !== 1) throw new Error("CORE_FINAL_ACCEPTANCE_EXACTLY_ONE_PRODUCTION_GATE_REQUIRED");

  const invariantIds = new Set();
  for (const invariant of contract.invariants) {
    const id = String(invariant?.id || "").trim();
    if (!id || invariantIds.has(id)) throw new Error("CORE_FINAL_ACCEPTANCE_INVARIANT_ID_INVALID");
    invariantIds.add(id);
    if (Object.prototype.hasOwnProperty.call(invariant, "status")) throw new Error(`CORE_FINAL_ACCEPTANCE_STORED_INVARIANT_STATUS_FORBIDDEN:${id}`);
    if (!Array.isArray(invariant.gate_ids) || invariant.gate_ids.length === 0) throw new Error(`CORE_FINAL_ACCEPTANCE_INVARIANT_GATES_REQUIRED:${id}`);
    for (const gateId of invariant.gate_ids) {
      if (!gateIds.has(gateId)) throw new Error(`CORE_FINAL_ACCEPTANCE_INVARIANT_GATE_UNKNOWN:${id}:${gateId}`);
    }
  }
  return Object.freeze({ gate_ids:[...gateIds], invariant_ids:[...invariantIds] });
}

function productionGateResult({ response, expectedSha, endpoint }) {
  const sha = normalizeSha(expectedSha);
  const failures = [];
  if (!response || typeof response !== "object" || Array.isArray(response)) failures.push("PRODUCTION_RESPONSE_OBJECT_REQUIRED");
  else {
    if (response.ok !== true) failures.push("PRODUCTION_RESPONSE_NOT_OK");
    if (response.marker !== "ATLAS_AUTHORING_TRANSPORT_V2") failures.push("PRODUCTION_MARKER_MISMATCH");
    if (Number(response.transport_version) !== 2) failures.push("PRODUCTION_TRANSPORT_VERSION_MISMATCH");
    if (String(response.runtime_sha || "").trim().toLowerCase() !== sha) failures.push("PRODUCTION_RUNTIME_SHA_MISMATCH");
    if (response.ready !== true) failures.push("PRODUCTION_AUTHORING_NOT_READY");
    if (response.bootstrap_ready !== true) failures.push("PRODUCTION_BOOTSTRAP_NOT_READY");
    if (response.readiness?.ready !== true) failures.push("PRODUCTION_READINESS_READBACK_NOT_READY");
  }
  return Object.freeze({
    id:"production_exact_sha_readiness",
    kind:"production_readiness",
    status:failures.length === 0 ? "PASS" : "FAIL",
    failures,
    evidence:Object.freeze({
      endpoint:String(endpoint || ""),
      runtime_sha:response?.runtime_sha || null,
      ready:response?.ready === true,
      bootstrap_ready:response?.bootstrap_ready === true,
      readiness_ready:response?.readiness?.ready === true
    })
  });
}

function evaluateAcceptance({
  contract,
  commitSha,
  gateResults,
  productionResponse,
  generatedAt,
  workflow = {}
}) {
  const validated = validateContract(contract);
  const sha = normalizeSha(commitSha);
  const byId = new Map();

  for (const result of gateResults || []) {
    const id = String(result?.id || "").trim();
    if (!id || byId.has(id)) throw new Error("CORE_FINAL_ACCEPTANCE_GATE_RESULT_ID_INVALID");
    if (!validated.gate_ids.includes(id)) throw new Error(`CORE_FINAL_ACCEPTANCE_GATE_RESULT_UNKNOWN:${id}`);
    byId.set(id, Object.freeze({ ...result, status:result.status === "PASS" ? "PASS" : "FAIL" }));
  }

  const productionId = contract.gates.find((gate) => gate.kind === "production_readiness").id;
  if (byId.has(productionId)) throw new Error("CORE_FINAL_ACCEPTANCE_PRODUCTION_GATE_RESULT_MUST_BE_DERIVED");
  byId.set(productionId, productionGateResult({
    response:productionResponse,
    expectedSha:sha,
    endpoint:contract.production_endpoint
  }));

  const gates = contract.gates.map((gate) => {
    const result = byId.get(gate.id);
    if (!result) return Object.freeze({
      id:gate.id,
      kind:gate.kind,
      status:"FAIL",
      failures:["GATE_RESULT_MISSING"]
    });
    return result;
  });

  const criteria = contract.invariants.map((invariant) => {
    const failed = invariant.gate_ids.filter((gateId) => byId.get(gateId)?.status !== "PASS");
    return Object.freeze({
      id:invariant.id,
      gate_ids:[...invariant.gate_ids],
      status:failed.length === 0 ? "PASS" : "FAIL",
      failed_gate_ids:failed
    });
  });

  const failedGates = gates.filter((gate) => gate.status !== "PASS").map((gate) => gate.id);
  const failedCriteria = criteria.filter((criterion) => criterion.status !== "PASS").map((criterion) => criterion.id);
  const status = failedGates.length === 0 && failedCriteria.length === 0 ? "PASS" : "FAIL";
  const timestamp = new Date(generatedAt || Date.now()).toISOString();

  return Object.freeze({
    schema:EVIDENCE_SCHEMA,
    version:2,
    core_version:"v2",
    requirement_id:P13_REQUIREMENT_ID,
    generated:true,
    status,
    commit_sha:sha,
    generated_at:timestamp,
    contract_sha256:sha256Text(JSON.stringify(stable(contract))),
    workflow:Object.freeze({
      repository:String(workflow.repository || ""),
      run_id:String(workflow.run_id || ""),
      run_attempt:String(workflow.run_attempt || "")
    }),
    production:byId.get(productionId).evidence,
    gates,
    criteria,
    failures:Object.freeze({
      gate_ids:failedGates,
      invariant_ids:failedCriteria
    })
  });
}

function assertGeneratedPass(report) {
  if (report?.schema !== EVIDENCE_SCHEMA || report?.generated !== true) throw new Error("CORE_FINAL_ACCEPTANCE_GENERATED_EVIDENCE_REQUIRED");
  if (report.status !== "PASS") throw new Error(`CORE_FINAL_ACCEPTANCE_FAILED:${(report.failures?.gate_ids || []).join(",")}`);
  if (!SHA_RE.test(String(report.commit_sha || ""))) throw new Error("CORE_FINAL_ACCEPTANCE_EVIDENCE_SHA_INVALID");
  if (report.production?.runtime_sha !== report.commit_sha) throw new Error("CORE_FINAL_ACCEPTANCE_PRODUCTION_SHA_NOT_EXACT");
  if (report.production?.ready !== true || report.production?.bootstrap_ready !== true || report.production?.readiness_ready !== true) {
    throw new Error("CORE_FINAL_ACCEPTANCE_PRODUCTION_NOT_READY");
  }
  return true;
}

module.exports = Object.freeze({
  CONTRACT_SCHEMA,
  EVIDENCE_SCHEMA,
  P13_REQUIREMENT_ID,
  validateContract,
  productionGateResult,
  evaluateAcceptance,
  assertGeneratedPass,
  sha256Text,
  stable
});
