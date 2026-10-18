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
const corePath = ".github/workflows/atlas-core-final-acceptance.yml";
const core = readFileSync(join(root, corePath), "utf8");
const coreLoops = [...core.matchAll(/for\s+attempt\s+in\s+\$\(seq\s+1\s+(\d+)\)/g)];
if (coreLoops.length !== 1 || Number(coreLoops[0][1]) > 12 || !core.includes("DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED")) {
  errors.push(corePath + ": CORE must stop HTTP 402 and retry at most 12 times");
}
const automaticStart = visual.indexOf("# Automatic main-deployment smoke only:");
const manualStart = visual.indexOf('if [[ "$GITHUB_EVENT_NAME" == "workflow_dispatch" ]]', automaticStart);
const manualEnd = visual.indexOf("\n          fi\n", manualStart);
if (automaticStart < 0 || manualStart < automaticStart || manualEnd < manualStart) {
  errors.push(visualPath + ": automatic smoke / manual full-suite split missing");
} else {
  const automatic = visual.slice(automaticStart, manualStart);
  const explicitRelease = visual.slice(manualStart, manualEnd);
  if ((automatic.match(/node scripts\//g) || []).length > 3 || (explicitRelease.match(/node scripts\//g) || []).length < 15) {
    errors.push(visualPath + ": automatic Production run must stay <=3 scripts, while complete manual suite is preserved");
  }
}
// Inspect the top-level GitHub Actions "on" value, not a substring of YAML.
// A single unrecognized event alongside a recognized one must fail CLOSED:
// ignoring a quoted pull_request after workflow_dispatch bypasses the quota guard.
export function workflowTriggerEvents(source) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const key = /^(?:on|"on"|'on')\s*:\s*(.*)$/;
  const index = lines.findIndex((line) => key.test(line));
  if (index < 0) return null;
  const raw = lines[index].match(key)[1].trim();
  const isEventName = (name) => /^[a-z][a-z0-9_]*$/.test(name);
  const unquote = (name) => name.replace(/^(['"])(.*)\1$/, "$2");
  if (raw && !raw.startsWith("#")) {
    if (!raw.startsWith("[")) return isEventName(unquote(raw)) ? new Set([unquote(raw)]) : null;
    const inline = raw.match(/^\[([^\]]*)\]\s*(?:#.*)?$/);
    if (!inline) return null;
    const names = inline[1].split(",").map((v) => unquote(v.trim())).filter(Boolean);
    return names.length && names.every(isEventName) && new Set(names).size === names.length
      ? new Set(names) : null;
  }
  const events = [];
  let eventIndent = null;
  let kind = null; // event map or event list; mixing is unsupported
  for (const line of lines.slice(index + 1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const whitespace = line.match(/^([ \t]+)/);
    if (!whitespace) break; // next top-level key
    const indent = whitespace[1].length;
    if (eventIndent === null) eventIndent = indent;
    if (indent < eventIndent) return null;
    if (indent > eventIndent) continue; // event configuration, not another event
    // Top-level event keys may themselves be quoted, independently of "on".
    const entry = line.slice(indent).match(/^(?:([a-z][a-z0-9_]*)|(["'])([a-z][a-z0-9_]*)\2)\s*:(?:\s|$)/);
    const item = line.slice(indent).match(/^-\s+(["']?)([a-z][a-z0-9_]*)\1\s*(?:#.*)?$/);
    if (entry && kind !== "list") {
      kind = "map";
      events.push(entry[1] || entry[3]);
    } else if (item && kind !== "map") {
      kind = "list";
      events.push(item[2]);
    } else {
      return null; // never silently skip unsupported sibling keys
    }
  }
  return events.length && new Set(events).size === events.length ? new Set(events) : null;
}

// Shared by the repository gate and synthetic offline regression fixtures.
export function workflowPrProductionViolation(source, events = workflowTriggerEvents(source)) {
  const touchesProduction = source.includes("atlas-person-db.vercel.app") || source.includes("ATLAS_PRODUCTION_ORIGIN");
  return touchesProduction && events instanceof Set &&
    (events.has("pull_request") || events.has("pull_request_target"));
}

// No PR validation may load the live Production Function or Chrome. Branch
// previews/local contract fixtures must be used for before-merge checks.
const manualHistorical = new Set([
  "atlas-audit-inventory.yml",
  "atlas-place-production-authority-audit.yml",
  "atlas-polity-p2-09-public-production-census.yml",
  "atlas-polity-russia-p2-05c-acceptance.yml",
  "atlas-polity-song-p2-08-audit.yml",
  "atlas-polity-song-p2-08e-public-readback.yml",
  "atlas-polity-sweden-p2-06-audit.yml",
  "atlas-polity-sweden-p2-06c-public-readback.yml",
  "atlas-spatial-candidate-audit.yml"
]);
for (const name of readdirSync(join(root, ".github/workflows"))) {
  if (!/\.ya?ml$/.test(name)) continue;
  const source = readFileSync(join(root, ".github/workflows", name), "utf8");
  const events = workflowTriggerEvents(source);
  if (!events) {
    errors.push(name + ": cannot audit workflow events; unsupported or missing top-level on declaration");
    continue;
  }
  if (workflowPrProductionViolation(source, events)) {
    errors.push(name + ": CI pull_request/pull_request_target must never browse Production");
  }
  if (manualHistorical.has(name)) {
    if (!events.has("workflow_dispatch") || events.has("push") || events.has("pull_request") || events.has("schedule")) {
      errors.push(name + ": legacy full-Production census must remain manual-only");
    }
  }
}
const guarded = [
  "atlas-authoring-schema-bootstrap.yml",
  "atlas-correction-apply.yml",
  "atlas-reviewed-person-merge.yml",
  "atlas-person-domain-verify.yml"
];
for (const name of guarded) {
  if (!readFileSync(join(root, ".github/workflows", name), "utf8").includes("DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED")) {
    errors.push(name + ": HTTP 402 terminal stop must be present");
  }
}

const dashboard = readFileSync(join(root, ".github/workflows/atlas-dashboard-production-acceptance.yml"), "utf8");
if (!dashboard.includes("DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED")) {
  errors.push("atlas-dashboard-production-acceptance.yml: HTTP 402 fail-fast missing");
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
