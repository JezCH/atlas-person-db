import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  validateContract,
  evaluateAcceptance,
  assertGeneratedPass,
  sha256Text
}=require("../server/atlas-core-final-acceptance.js");

const root=process.cwd();
const contractPath=path.join(root,"contracts","core-final-acceptance-contract.v2.json");
const productionPath=path.resolve(root,String(process.env.ATLAS_PRODUCTION_READINESS_JSON||"artifacts/core-final-acceptance/production-readiness.json"));
const outputPath=path.resolve(root,String(process.env.ATLAS_CORE_FINAL_ACCEPTANCE_OUTPUT||"artifacts/core-final-acceptance/core-v2-final-acceptance.generated.json"));
const logDir=path.join(path.dirname(outputPath),"logs");
const commitSha=String(process.env.GITHUB_SHA||process.env.ATLAS_ACCEPTANCE_COMMIT_SHA||"").trim().toLowerCase();

const contract=JSON.parse(fs.readFileSync(contractPath,"utf8"));
validateContract(contract);
fs.mkdirSync(logDir,{recursive:true});

let productionResponse=null;
try {
  productionResponse=JSON.parse(fs.readFileSync(productionPath,"utf8"));
} catch (error) {
  productionResponse={ok:false,code:"PRODUCTION_READINESS_EVIDENCE_UNAVAILABLE",error:String(error?.message||error)};
}

function safeLogName(id){
  return String(id).replace(/[^a-z0-9._-]+/gi,"_");
}

function runCommandGate(gate){
  const started=Date.now();
  const result=spawnSync("bash",["-lc",gate.command],{
    cwd:root,
    env:{...process.env,FORCE_COLOR:"0",CI:"true"},
    encoding:"utf8",
    maxBuffer:64*1024*1024,
    timeout:12*60*1000
  });
  const durationMs=Date.now()-started;
  const stdout=String(result.stdout||"");
  const stderr=String(result.stderr||"");
  const combined=[
    `$ ${gate.command}`,
    "",
    stdout,
    stderr,
    result.error ? `runner_error=${String(result.error?.stack||result.error)}` : ""
  ].join("\n");
  const relativeLogPath=path.posix.join("artifacts","core-final-acceptance","logs",`${safeLogName(gate.id)}.log`);
  fs.writeFileSync(path.join(root,relativeLogPath),combined);
  const exitCode=Number.isInteger(result.status) ? result.status : 1;
  const failures=[];
  if(result.error) failures.push("COMMAND_RUNNER_ERROR");
  if(exitCode!==0) failures.push(`COMMAND_EXIT_${exitCode}`);
  if(result.signal) failures.push(`COMMAND_SIGNAL_${result.signal}`);
  return Object.freeze({
    id:gate.id,
    kind:"command",
    status:failures.length===0 ? "PASS" : "FAIL",
    command:gate.command,
    exit_code:exitCode,
    signal:result.signal||null,
    duration_ms:durationMs,
    log_path:relativeLogPath,
    log_sha256:sha256Text(combined),
    failures
  });
}

const gateResults=[];
for(const gate of contract.gates){
  if(gate.kind!=="command") continue;
  const result=runCommandGate(gate);
  gateResults.push(result);
  process.stdout.write(`${gate.id}: ${result.status} (${result.duration_ms}ms)\n`);
}

const report=evaluateAcceptance({
  contract,
  commitSha,
  gateResults,
  productionResponse,
  workflow:{
    repository:process.env.GITHUB_REPOSITORY||"",
    run_id:process.env.GITHUB_RUN_ID||"",
    run_attempt:process.env.GITHUB_RUN_ATTEMPT||""
  }
});

fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+"\n");
process.stdout.write(JSON.stringify({
  schema:report.schema,
  status:report.status,
  commit_sha:report.commit_sha,
  production:report.production,
  failed_gates:report.failures.gate_ids,
  failed_invariants:report.failures.invariant_ids,
  output:path.relative(root,outputPath)
},null,2)+"\n");

try {
  assertGeneratedPass(report);
} catch (error) {
  process.stderr.write(String(error?.stack||error)+"\n");
  process.exitCode=1;
}
