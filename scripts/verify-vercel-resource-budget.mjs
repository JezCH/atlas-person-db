#!/usr/bin/env node
// Offline, read-only repository gate for Vercel Hobby quota regressions.
// This cannot intercept external tooling or the Vercel dashboard; see docs/VERCEL_HOBBY_QUOTA_GUARD.md.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [".github/workflows", "scripts", "server", "api", "package.json"];
const errors = [];
const sourceExt = /\.(?:[cm]?js|ya?ml|json|sh|py)$/i;
function scan(location) {
  let entries;
  try { entries = readdirSync(location, { withFileTypes: true }); }
  catch (error) { errors.push(`Missing required guard target ${relative(root, location)}: ${error.code}`); return; }
  for (const item of entries) {
    const full = join(location, item.name);
    if (item.isDirectory()) { scan(full); continue; }
    if (!item.isFile() || !sourceExt.test(item.name)) continue;
    const file = relative(root, full).replaceAll("\\", "/");
    if (file === "scripts/verify-vercel-resource-budget.mjs") continue;
    const body = readFileSync(full, "utf8");
    // Block executable Sandbox starts. Avoid a generic "sandbox" match because
    // Chromium's --no-sandbox and historical test fixtures are unrelated.
    const banned = [
      /\bmcp__Vercel__create_sandboxes(?:_v\d+)?\b/i,
      /\bvercel\s+sandbox\s+(?:create|run|start)\b/i,
      /(?:require\s*\(\s*|from\s*)["']@vercel\/sandbox["']/i,
      /\b(?:POST|post)\s+\/?v2\/sandboxes\b/i
    ];
    if (banned.some((pattern) => pattern.test(body))) {
      errors.push(`${file}: Vercel Sandbox execution is forbidden in this production repository; use an independent research runner.`);
    }
  }
}
for (const target of targets) {
  if (target === "package.json") {
    const body = readFileSync(join(root, target), "utf8");
    if (/\bvercel\s+sandbox\s+(?:create|run|start)\b/i.test(body)) errors.push("package.json: Sandbox runner forbidden");
  } else scan(join(root, target));
}

const visualPath = ".github/workflows/atlas-spacetime-production-visual.yml";
const visual = readFileSync(join(root, visualPath), "utf8");
const loops = [...visual.matchAll(/for\s+attempt\s+in\s+\$\(seq\s+1\s+(\d+)\)/g)];
if (loops.length !== 1 || Number(loops[0][1]) > 12) {
  errors.push(`${visualPath}: exact-SHA Production retry count must be explicit and <=12`);
}
if (!visual.includes("DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED")) {
  errors.push(`${visualPath}: fail-fast HTTP 402 guard is missing`);
}
const integrity = readFileSync(join(root, ".github/workflows/atlas-integrity.yml"), "utf8");
if (!integrity.includes("node scripts/verify-vercel-resource-budget.mjs")) {
  errors.push("atlas-integrity.yml: resource guard must run in mandatory CI");
}
const policy = readFileSync(join(root, "WORK_EXECUTION.md"), "utf8");
if (!policy.includes("Vercel Sandbox")) {
  errors.push("WORK_EXECUTION.md: canonical prohibition is missing");
}
if (errors.length) {
  console.error("ATLAS_VERCEL_HOBBY_BUDGET_GUARD_FAILED");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("ATLAS_VERCEL_HOBBY_BUDGET_GUARD_PASS: no executable Vercel Sandbox starts; bounded Production visual retries; CI + policy present");
}
