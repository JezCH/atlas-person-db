import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SAFE_SKIP_PREFIXES = Object.freeze([
  "docs/",
  ".github/workflows/", // CI configuration is not deployed runtime code
  "requirements/",
  "tests/",
  "corrections/evidence/",
  "corrections/reviewed-person-merges/",
  "research/",
  "authoring/requests/"
]);

// GitHub-only agent tooling must not produce a Vercel build when an agent
// integration is merged, even if an older deployed runtime SHA still differs.
// Strictly match known non-runtime files; never skip a mixed app/API change.
const AGENT_NON_RUNTIME = new Set([
  "agent-memory/lessons.v1.json",
  "scripts/atlas-agent-context.mjs",
  "scripts/atlas-agent-experience.mjs",
  "scripts/atlas-agent-lesson-harvest.mjs",
  "scripts/atlas-agent-dependency-map.mjs",
  "scripts/atlas-agent-lesson-suggest.mjs",
  "scripts/atlas-codex-task-runner.mjs"
]);
const AGENT_SKIP_GATE = "scripts/vercel-ignore-build.mjs";

const SAFE_SKIP_EXACT = new Set([
  ".github/workflows/atlas-integrity.yml",
  ".github/workflows/atlas-spacetime-production-visual.yml",
  "scripts/verify-vercel-resource-budget.mjs"
]);

// The deployed Human Authoring and reviewed Person merge endpoints can consume
// reviewed data manifests from a newer GitHub commit while executing against an
// older compatible Production runtime. Keep this boundary explicit and
// fail-closed: only files that cannot change those deployed endpoint contracts
// belong here.
const AUTHORING_RUNTIME_SAFE_PREFIXES = Object.freeze([
  ".github/",
  "authoring/requests/",
  "corrections/reviewed-person-merges/",
  "docs/",
  "requirements/",
  "research/",
  "tests/",
  "scripts/",
  "corrections/evidence/"
]);

const AUTHORING_RUNTIME_SAFE_EXACT = new Set([
  "server/atlas-duplicate-detector.js",
  "server/atlas-duplicate-review-service.js",
  // This registry is served as static historical display data. It does not
  // participate in /api/atlas-authoring or /api/atlas-authoring-apply.
  // Vercel still builds when it changes; only Authoring runtime compatibility
  // is allowed to proceed against the already deployed endpoint implementation.
  "non-timeline-persons.json"
]);

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizePaths(paths) {
  return [...new Set((Array.isArray(paths) ? paths : []).map(normalizePath).filter(Boolean))];
}

export function isSafeToSkipPath(value) {
  const file = normalizePath(value);
  if (!file) return true;
  // Git paths are literal. Suspicious edge whitespace must never become safe.
  if (/^\s|\s$/u.test(file)) return false;
  if (SAFE_SKIP_EXACT.has(file)) return true;
  if (SAFE_SKIP_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  if (file.endsWith(".md")) return true;
  if (/^migration\/[^/]+\/(?:reports|evidence)\//.test(file)) return true;
  return false;
}

export function isAgentCapabilityOnly(paths) {
  const normalized = normalizePaths(paths);
  // The skip-gate file alone must never bypass the normal deployment check.
  return normalized.some((file) => AGENT_NON_RUNTIME.has(file)) &&
    normalized.every((file) => AGENT_NON_RUNTIME.has(file) ||
      file === AGENT_SKIP_GATE || isSafeToSkipPath(file));
}

export function isAuthoringDataOnly(paths) {
  const normalized = normalizePaths(paths);
  return normalized.length > 0 && normalized.every((file) => file.startsWith("authoring/requests/") && file.endsWith(".json"));
}

export function isReviewedMergeDataOnly(paths) {
  const normalized = normalizePaths(paths);
  return normalized.length > 0 && normalized.every((file) => file.startsWith("corrections/reviewed-person-merges/") && file.endsWith(".json"));
}

export function isRuntimeDataOnly(paths) {
  const normalized = normalizePaths(paths);
  return isAuthoringDataOnly(normalized) || isReviewedMergeDataOnly(normalized);
}

export function isSafeForDeployedAuthoringRuntimePath(value) {
  const file = normalizePath(value);
  if (!file) return true;
  if (/^\s|\s$/u.test(file)) return false;
  if (AUTHORING_RUNTIME_SAFE_EXACT.has(file)) return true;
  if (AUTHORING_RUNTIME_SAFE_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  if (file.endsWith(".md")) return true;
  return false;
}

export function requiresAuthoringRuntimeDeployment(paths) {
  const normalized = normalizePaths(paths);
  if (normalized.length === 0) return false;
  return normalized.some((file) => !isSafeForDeployedAuthoringRuntimePath(file));
}

export function shouldBuildForChangedPaths(paths) {
  const normalized = normalizePaths(paths);
  if (normalized.length === 0) return false;

  // atlas-authoring-apply.yml historically imports this function. Preserve that
  // interface while making its compatibility decision specific to the deployed
  // Authoring dependency surface. Other workflows and Vercel retain the normal
  // deployment classifier below.
  if (String(process.env.GITHUB_WORKFLOW || "").trim() === "ATLAS Authoring Apply") {
    return requiresAuthoringRuntimeDeployment(normalized);
  }

  return normalized.some((file) => !isSafeToSkipPath(file));
}

function logDecision(kind, detail) {
  console.log(`[atlas-vercel-ignore] ${kind}: ${detail}`);
}

function exitBuild(reason) {
  logDecision("BUILD", reason);
  process.exitCode = 1;
}

function exitSkip(reason) {
  logDecision("SKIP", reason);
  process.exitCode = 0;
}

function git(args) {
  // Never trim Git filenames: leading/trailing whitespace is significant.
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function parsePaths(output) {
  if (!output) return [];
  // Both callers use -z. Any truncated/lossy response must force BUILD.
  if (!output.endsWith("\0")) throw Error("unterminated Git -z path output");
  const paths = output.slice(0, -1).split("\0");
  // Literal backslashes/control characters and malformed UTF-8 fail closed;
  // converting them into directory separators could incorrectly authorize SKIP.
  if (paths.some(file => !file || /[\\\u0001-\u001f\u007f\ufffd]/u.test(file))) {
    throw Error("unsafe or lossy Git path encoding");
  }
  return paths;
}

export function main(env = process.env) {
  const vercelEnv = String(env.VERCEL_ENV || "").trim().toLowerCase();
  if (vercelEnv !== "production") {
    exitSkip(`non-Production environment (${vercelEnv || "unset"})`);
    return;
  }

  const currentSha = String(env.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  const previousSha = String(env.VERCEL_GIT_PREVIOUS_SHA || "").trim().toLowerCase();
  const shaRe = /^[0-9a-f]{40}$/;

  if (!shaRe.test(currentSha)) {
    exitBuild("current Production SHA unavailable or invalid");
    return;
  }

  // Reviewed request/merge manifests are data, not deployable runtime code.
  // Prove the current commit itself is data-only before relying on the older
  // successful-deployment SHA. This prevents harmless reviewed-data commits from
  // consuming a Vercel build merely because an older SHA is absent from a shallow
  // clone. Any inability to prove the current commit delta falls back to the
  // conservative build path below.
  try {
    const currentOutput = git(["diff-tree", "--no-commit-id", "--name-only", "-z", "-r", "-m", "--first-parent", currentSha, "--"]);
    const currentPaths = parsePaths(currentOutput);
    if (isRuntimeDataOnly(currentPaths)) {
      exitSkip(`current commit contains only reviewed runtime-safe data (${currentPaths.length} path${currentPaths.length === 1 ? "" : "s"})`);
      for (const file of currentPaths) console.log(`[atlas-vercel-ignore]   ${file}`);
      return;
    }
    if (isAgentCapabilityOnly(currentPaths)) {
      exitSkip(`current commit contains only GitHub agent tooling (${currentPaths.length} path${currentPaths.length === 1 ? "" : "s"})`);
      for (const file of currentPaths) console.log(`[atlas-vercel-ignore]   ${file}`);
      return;
    }
  } catch {
    logDecision("INFO", "could not prove current commit as runtime-safe data-only; falling back to deployment-diff gate");
  }

  // Fail open to a real build whenever the last successfully deployed SHA cannot
  // be proven. Skipping is an optimization; deployment correctness has priority.
  if (!shaRe.test(previousSha)) {
    exitBuild("previous successful Production SHA unavailable or invalid");
    return;
  }
  if (currentSha === previousSha) {
    exitSkip("current SHA already equals previous successful deployment SHA");
    return;
  }

  try {
    git(["cat-file", "-e", `${previousSha}^{commit}`]);
    git(["cat-file", "-e", `${currentSha}^{commit}`]);
  } catch {
    exitBuild("required diff commits are not available in the Vercel shallow clone");
    return;
  }

  let changedPaths;
  try {
    changedPaths = parsePaths(git(["diff", "--name-only", "-z", "--diff-filter=ACDMRTUXB", previousSha, currentSha, "--"]));
  } catch {
    exitBuild("git diff failed");
    return;
  }

  if (!shouldBuildForChangedPaths(changedPaths)) {
    exitSkip(`only non-deployable files changed (${changedPaths.length} path${changedPaths.length === 1 ? "" : "s"})`);
    for (const file of changedPaths) console.log(`[atlas-vercel-ignore]   ${file}`);
    return;
  }

  const deployable = changedPaths.filter((file) => !isSafeToSkipPath(file));
  exitBuild(`deployment-relevant change detected (${deployable.length} path${deployable.length === 1 ? "" : "s"})`);
  for (const file of deployable) console.log(`[atlas-vercel-ignore]   ${file}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
