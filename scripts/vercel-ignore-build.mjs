import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SAFE_SKIP_PREFIXES = Object.freeze([
  "docs/",
  "requirements/",
  "tests/",
  "corrections/evidence/",
  "research/",
  "authoring/requests/"
]);

const SAFE_SKIP_EXACT = new Set([
  ".github/workflows/atlas-integrity.yml"
]);

function normalizePath(value) {
  return String(value || "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isSafeToSkipPath(value) {
  const file = normalizePath(value);
  if (!file) return true;
  if (SAFE_SKIP_EXACT.has(file)) return true;
  if (SAFE_SKIP_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  if (file.endsWith(".md")) return true;
  if (/^migration\/[^/]+\/(?:reports|evidence)\//.test(file)) return true;
  return false;
}

export function isAuthoringDataOnly(paths) {
  const normalized = [...new Set((Array.isArray(paths) ? paths : []).map(normalizePath).filter(Boolean))];
  return normalized.length > 0 && normalized.every((file) => file.startsWith("authoring/requests/") && file.endsWith(".json"));
}

export function shouldBuildForChangedPaths(paths) {
  const normalized = [...new Set((Array.isArray(paths) ? paths : []).map(normalizePath).filter(Boolean))];
  if (normalized.length === 0) return false;
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
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function parsePaths(output) {
  return output ? output.split(/\r?\n/).map(normalizePath).filter(Boolean) : [];
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

  // Authoring manifests are reviewed data, not deployable runtime code. Prove the
  // current commit itself is authoring-data-only before relying on the older
  // successful-deployment SHA. This prevents a harmless registration commit from
  // consuming a Vercel build merely because an older SHA is absent from a shallow
  // clone. Any inability to prove the current commit delta falls back to the
  // conservative build path below.
  try {
    const currentOutput = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "-m", "--first-parent", currentSha, "--"]);
    const currentPaths = parsePaths(currentOutput);
    if (isAuthoringDataOnly(currentPaths)) {
      exitSkip(`current commit contains only reviewed authoring request data (${currentPaths.length} path${currentPaths.length === 1 ? "" : "s"})`);
      for (const file of currentPaths) console.log(`[atlas-vercel-ignore]   ${file}`);
      return;
    }
  } catch {
    logDecision("INFO", "could not prove current commit as authoring-data-only; falling back to deployment-diff gate");
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
    changedPaths = parsePaths(git(["diff", "--name-only", "--diff-filter=ACDMRTUXB", previousSha, currentSha, "--"]));
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
