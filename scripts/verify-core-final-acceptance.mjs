import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const acceptance = JSON.parse(fs.readFileSync(path.join(root, "data/core/core-v2-final-acceptance.v1.json"), "utf8"));

const expectedCriteria = [
  "requirements_contradictions_zero",
  "canonical_multi_writer_zero",
  "duplicate_truth_registries_zero",
  "reachable_legacy_writer_runtime_zero",
  "retired_identity_resurrection_path_zero",
  "fake_date_sentinel_dependency_zero",
  "unresolved_silent_runtime_publish_zero",
  "manual_semantic_runtime_refresh_zero",
  "registration_followup_completeness_debt_zero",
  "runtime_reproducibility_pass",
  "compiler_determinism_pass",
  "writer_idempotency_pass",
  "destructive_lifecycle_pass",
  "provenance_preservation_pass",
  "ai_authoritative_bypass_zero",
  "obsolete_core_execution_code_zero",
  "task_level_single_writer_dependency_zero",
  "stale_authoritative_overwrite_paths_zero",
  "active_task_keys_multiple_artifacts_zero"
];

const probes = Object.freeze({
  requirements:Object.freeze({
    command:[process.execPath, "scripts/verify-atlas-requirements.mjs"]
  }),
  release_governance:Object.freeze({
    command:[process.execPath, "scripts/verify-release-governance.mjs"]
  }),
  authority_residue:Object.freeze({
    command:[process.execPath, "--test",
      "tests/core-authority-ownership.test.mjs",
      "tests/core-residue-cleanup.test.mjs"
    ]
  }),
  identity_registration:Object.freeze({
    command:[process.execPath, "--test",
      "tests/atlas-polity-identity-resolver.test.mjs",
      "tests/atlas-core-unit7-registration-writer-integration.test.mjs",
      "tests/core-unit13-reviewed-candidate-boundary.test.mjs",
      "tests/core-reentry-reviewed-candidate-production-lifecycle.test.mjs"
    ]
  }),
  temporal_authoring:Object.freeze({
    command:[process.execPath, "--test",
      "tests/atlas-human-authoring-service.test.mjs",
      "tests/person-timeline-disposition.test.mjs"
    ]
  }),
  runtime:Object.freeze({
    command:[process.execPath, "scripts/verify-runtime-integrity.mjs"]
  }),
  runtime_contract:Object.freeze({
    command:[process.execPath, "--test",
      "tests/atlas-runtime-compile-service.test.mjs",
      "tests/atlas-runtime-publication-workflow.test.mjs"
    ]
  }),
  destructive_provenance:Object.freeze({
    command:[process.execPath, "--test",
      "tests/core-unit14-destructive-lifecycle.test.mjs",
      "tests/core-unit9-source-bibliographic.test.mjs",
      "tests/atlas-correction-v2-provenance-executor-contract.test.mjs"
    ]
  }),
  current_schema:Object.freeze({
    command:[process.execPath, "scripts/verify-schema-baseline.mjs"],
    database:true
  }),
  product_lifecycle:Object.freeze({
    command:[process.execPath, "scripts/rehearse-human-authoring-operational-parity.mjs"],
    database:true
  })
});

const criterionProbes = Object.freeze({
  requirements_contradictions_zero:["requirements"],
  canonical_multi_writer_zero:["authority_residue"],
  duplicate_truth_registries_zero:["authority_residue"],
  reachable_legacy_writer_runtime_zero:["authority_residue","runtime"],
  retired_identity_resurrection_path_zero:["identity_registration"],
  fake_date_sentinel_dependency_zero:["temporal_authoring","current_schema"],
  unresolved_silent_runtime_publish_zero:["runtime","runtime_contract"],
  manual_semantic_runtime_refresh_zero:["runtime_contract"],
  registration_followup_completeness_debt_zero:["identity_registration","product_lifecycle"],
  runtime_reproducibility_pass:["runtime_contract"],
  compiler_determinism_pass:["runtime_contract"],
  writer_idempotency_pass:["identity_registration","runtime_contract","product_lifecycle"],
  destructive_lifecycle_pass:["destructive_provenance","product_lifecycle"],
  provenance_preservation_pass:["destructive_provenance","product_lifecycle"],
  ai_authoritative_bypass_zero:["identity_registration","product_lifecycle"],
  obsolete_core_execution_code_zero:["authority_residue","runtime"],
  task_level_single_writer_dependency_zero:["release_governance","authority_residue"],
  stale_authoritative_overwrite_paths_zero:["identity_registration","destructive_provenance"],
  active_task_keys_multiple_artifacts_zero:["release_governance","authority_residue"]
});

function assertDescriptor() {
  if (acceptance?.schema !== "atlas-core-final-acceptance/v1") throw new Error("CORE_FINAL_ACCEPTANCE_SCHEMA_INVALID");
  if (acceptance?.p14_content_implementation_in_scope !== false) throw new Error("CORE_FINAL_ACCEPTANCE_P14_SCOPE_DRIFT");
  const actual = Array.isArray(acceptance?.criteria) ? acceptance.criteria.map((item) => item.id) : [];
  if (JSON.stringify(actual) !== JSON.stringify(expectedCriteria)) {
    throw new Error(`CORE_FINAL_ACCEPTANCE_CRITERIA_DRIFT:${JSON.stringify(actual)}`);
  }
  for (const id of expectedCriteria) {
    const mapped = criterionProbes[id];
    if (!Array.isArray(mapped) || mapped.length === 0) throw new Error(`CORE_FINAL_ACCEPTANCE_PROBE_MAPPING_MISSING:${id}`);
    for (const probeId of mapped) {
      if (!probes[probeId]) throw new Error(`CORE_FINAL_ACCEPTANCE_UNKNOWN_PROBE:${id}:${probeId}`);
    }
  }
}

function runProbe(id, probe) {
  if (probe.database && !/^postgres(?:ql)?:\/\//.test(String(process.env.DATABASE_URL || ""))) {
    throw new Error(`CORE_FINAL_ACCEPTANCE_DATABASE_URL_REQUIRED:${id}`);
  }
  const [command, ...args] = probe.command;
  const result = spawnSync(command, args, {
    cwd:root,
    env:process.env,
    encoding:"utf8",
    maxBuffer:64 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stdout = String(result.stdout || "").slice(-12000);
    const stderr = String(result.stderr || "").slice(-12000);
    throw new Error(`CORE_FINAL_ACCEPTANCE_PROBE_FAILED:${id}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }
  return Object.freeze({
    id,
    status:"PASS",
    command:[command,...args].map((value) => path.relative(root,value) || value).join(" "),
    stdout_tail:String(result.stdout || "").trim().slice(-2000)
  });
}

assertDescriptor();

const probeResults = new Map();
for (const [id, probe] of Object.entries(probes)) {
  probeResults.set(id, runProbe(id, probe));
}

const criteria = expectedCriteria.map((id) => Object.freeze({
  id,
  status:"PASS",
  probes:Object.freeze([...criterionProbes[id]])
}));

console.log(JSON.stringify({
  marker:"ATLAS_CORE_FINAL_ACCEPTANCE_EXECUTABLE_V2",
  status:"PASS",
  accepted_as_of:"2026-10-01",
  criteria,
  probes:[...probeResults.values()],
  p14_content_implementation_in_scope:false
}, null, 2));
